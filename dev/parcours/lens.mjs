// A person at a lens-based explorer: they click criteria from the catalogue into the query,
// press Search and read the results. Shared by every suite here; a suite extends it with
// what its own app wraps around lens (e.g. the button that shows the catalogue).
//
// Lens components live in open shadow roots, which Playwright's CSS and role locators pierce
// (XPath does not, except relative to an element inside the same root).

import { Device } from "/runtime/index.mjs"

/**
 * Lens writes the query, random ids included, into the URL. URL-encoded, an id sits between
 * `%22`s, which the runtime's \b-bounded uuid pattern misses (the `2` joins the word).
 */
export const volatile = [[/%22[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}%22/g, "%22<uuid>%22"]]

const exact = (text) =>
  new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`)

export class Lens extends Device {
  static env = { origin: "http://localhost:3000" }

  /**
   * Nobody signs in to a local stack: no passkey device. The clock starts at the anchor but
   * runs: Chart.js times its animations with Date.now(), so on a fixed clock every chart
   * stays empty.
   */
  static async open(browser, name, options = {}) {
    const device = await super.open(browser, name, { passkeys: false, ...options })
    await device.context.clock.setSystemTime(this.env.anchor)
    return device
  }

  get catalogue() {
    return this.page.locator("lens-catalogue")
  }

  /** The tree node for a category or criterion, by the name on its toggle. */
  node(name) {
    return this.catalogue
      .locator("[part~=data-tree-element]")
      .filter({
        has: this.page.getByRole("button", { name, exact: true }),
      })
      .last()
  }

  /** Open the catalogue tree along a path of names; nodes already open stay open. */
  async expand(...path) {
    for (const name of path) {
      const toggle = this.node(name)
        .locator("[part~=lens-data-tree-element-name]")
        .first()
      const open = await toggle
        .locator("[part~=lens-data-tree-element-toggle-icon-open]")
        .count()
      if (!open) await toggle.click()
    }
  }

  /** Single-select: the add button beside one option. */
  async addOption(criterion, option) {
    await this.node(criterion)
      .locator("[part~=lens-single-select-wrapper] > *", {
        hasText: exact(option),
      })
      .first()
      .locator("xpath=following-sibling::button[1]")
      .click()
  }

  /** Single-select: every option at once ("Add all"). */
  async addAll(criterion) {
    await this.node(criterion)
      .getByRole("button", { name: "Add all" })
      .click()
  }

  /** Number or date criterion: either bound may be left open (null), which clears it. */
  async addRange(criterion, from, to) {
    const node = this.node(criterion)
    await node.locator("input").nth(0).fill(from == null ? "" : String(from))
    await node.locator("input").nth(1).fill(to == null ? "" : String(to))
    await node.getByRole("button", { name: "Add to query" }).click()
  }

  /**
   * What a refused range tells the person: lens reports it through the browser's own
   * validation bubble, which is in neither snapshot, so read it from the input.
   */
  async refusal(criterion) {
    return this.node(criterion).locator("input").first().evaluate((e) => e.validationMessage)
  }

  /** Autocomplete criterion: type, then click the suggestion whose name matches exactly. */
  async addSuggestion(criterion, typed, option) {
    const node = this.node(criterion)
    await node.locator("[part~=lens-autocomplete-formfield-input]").fill(typed)
    await node
      .locator("[part~=autocomplete-options-item]")
      .filter({
        has: this.page.locator("[part~=autocomplete-options-item-name]", {
          hasText: exact(option),
        }),
      })
      .click()
  }

  /** Remove a whole criterion from the query bar by its chip's name ("Gender"). */
  async removeChip(name) {
    await this.page
      .locator("[part~=lens-searchbar-chip]")
      .filter({
        has: this.page.locator("[part~=lens-searchbar-chip-name]", {
          hasText: exact(`${name}:`),
        }),
      })
      .getByRole("button", { name: "Delete" })
      .last()
      .click()
  }

  /** The query bar's chips as read: "Gender: male female". */
  async chips() {
    return (await this.page.locator("[part~=lens-searchbar-chip]").allInnerTexts()).map((c) =>
      c.replace(/\s+/g, " ").trim()
    )
  }

  /** Open every node of the catalogue tree. */
  async expandAll() {
    const closed = this.catalogue
      .locator("[part~=lens-data-tree-element-name]")
      .filter({ hasNot: this.page.locator("[part~=lens-data-tree-element-toggle-icon-open]") })
    while (await closed.count()) await closed.first().click()
  }

  /**
   * The open catalogue as an indented outline, each criterion with its kind (the input lens
   * renders for it) and, for a single-select, its options: [{ depth, name, kind, options }].
   */
  async outline() {
    return this.catalogue.evaluate((host) => {
      const kinds = {
        "lens-single-select-wrapper": "single-select",
        "lens-autocomplete-formfield": "autocomplete",
        "lens-number-input-form": "number",
        "lens-date-input-form": "date",
        "lens-string-form": "string",
      }
      const nodes = [...host.shadowRoot.querySelectorAll("[part~=data-tree-element]")]
      return nodes.map((node) => {
        let depth = 0
        for (let e = node.parentElement; e; e = e.parentElement)
          if (e.part.contains("data-tree-element")) depth++
        const own = node.querySelector(":scope > [part~=lens-data-tree-element-last-child-options]")
        const found = own && Object.keys(kinds).find((part) => own.querySelector(`[part~=${part}]`))
        const options = found === "lens-single-select-wrapper"
          ? [...own.querySelectorAll("[part~=lens-single-select-wrapper] > :is(span, abbr)")]
              .map((e) => e.textContent.trim())
              .filter((text) => text && !/^\d+$/.test(text))
          : []
        const name = node.querySelector("[part~=lens-data-tree-element-name]").textContent.trim()
        return { depth, name, kind: found ? kinds[found] : "group", options }
      })
    })
  }

  /** Whether the app says the results no longer match the query. */
  async stale() {
    return this.page.getByText("The query has been modified").isVisible()
  }

  /** Press Search and wait until every site that claimed the query has answered. */
  async search() {
    await this.page.getByRole("button", { name: "Search", exact: true }).click()
    await this.answered()
  }

  async answered(timeout = 60_000) {
    const summary = this.page.locator("lens-result-summary [part~=lens-result-summary]")
    const deadline = Date.now() + timeout
    for (;;) {
      const text = await summary.innerText({ timeout: 1_000 }).catch(() => "")
      const sites = text.match(/Sites:\s*(\d+)\s*\/\s*(\d+)/)
      if (sites && sites[1] === sites[2] && sites[1] !== "0" && !(await this.stale())) break
      if (Date.now() > deadline)
        throw new Error(`no answer within ${timeout / 1000}s: ${text.trim()}`)
      await this.page.waitForTimeout(250)
    }
    await this.settle()
    await this.chartsDrawn()
  }

  /** Until every chart canvas (each in its own shadow root) looks the same twice running. */
  async chartsDrawn(timeout = 10_000) {
    const pixels = () =>
      this.page.evaluate(() => {
        const canvases = (root) =>
          [...root.querySelectorAll("*")].flatMap((e) => [
            ...(e instanceof HTMLCanvasElement ? [e] : []),
            ...(e.shadowRoot ? canvases(e.shadowRoot) : []),
          ])
        return canvases(document).map((c) => c.toDataURL()).join()
      })
    const deadline = Date.now() + timeout
    let before = await pixels()
    for (;;) {
      await this.page.waitForTimeout(300)
      const now = await pixels()
      if (now === before || Date.now() > deadline) return
      before = now
    }
  }

  /** The results table: { site: [patients, specimens] } as the cells show them. */
  async results() {
    const out = {}
    for (const row of await this.page
      .locator("lens-result-table")
      .getByRole("row")
      .all()) {
      const cells = (await row.getByRole("cell").allInnerTexts()).map((c) => c.trim())
      if (cells.length) out[cells[1]] = cells.slice(2)
    }
    return out
  }
}
