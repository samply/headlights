// The BBMRI-ERIC Locator on its local stack (bbmri-sample-locator/compose.local.yaml): a
// researcher builds a query by clicking criteria in the catalogue, presses Search and reads
// the counts. The data is test-data-loader's 256 synthetic patients behind one site, proxy2;
// stories only read it, so they share it. Counts match playwright.spec.ts, which reaches the
// same queries through the URL. Donor age (relative to today) is left out for the same
// reason as there: the patients grow older and the counts move.
//
// Stand-ins, named in every step's label: a local Beam network and one synthetic site take
// the place of the real bridgeheads. The lens server still asks the real BBMRI Directory for
// the names of its configured collections; proxy2 is none of them, so no step shows the
// answer.

import { chromium } from "/runtime/node_modules/playwright/index.mjs"
import { story } from "/runtime/index.mjs"
import { Lens, volatile } from "../lens.mjs"

export const snapshots = { volatile }

export class Device extends Lens {
  /** The Locator hides the catalogue behind its "Full Parameter Search" toggle. */
  async showCatalogue() {
    await this.page.getByRole("button", { name: /Full Parameter Search/ }).click()
  }
}

/** The stack is up, but Beam, Focus and Blaze may not answer yet: wait for a first answer. */
export async function setup() {
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage"] })
  const deadline = Date.now() + 5 * 60_000
  try {
    for (;;) {
      const d = await Device.open(browser, "warm-up")
      try {
        await d.open("/search/")
        await d.answered(30_000)
        return {}
      } catch (error) {
        if (Date.now() > deadline) throw new Error(`the stack never answered: ${error.message}`)
        console.log(`waiting for the stack: ${error.message}`)
      } finally {
        await d.close()
      }
    }
  } finally {
    await browser.close()
  }
}

// ---- vocabulary --------------------------------------------------------------------------

/**
 * A snap once the charts have caught up with the last click (a reflow redraws them), from the
 * top of the page: the search bar is sticky, so a full-page shot draws it wherever the last
 * click left the scroll. Scrolling also dismisses the browser's own validation bubble, which
 * renders a little differently every time; S13 records its message as text instead.
 */
async function snap(t, d, slug) {
  await d.page.evaluate(() => scrollTo(0, 0))
  await d.chartsDrawn()
  await t.snap(d.page, slug, { title: `${slug} (stand-in: local Beam, synthetic site proxy2)` })
}

/** Which story clicks each kind of criterion; S10 fails on a kind the catalogue gains. */
const covered = { "single-select": "S2", autocomplete: "S4", number: "S3", date: "S5" }

/** A researcher at the search page, everything answered, catalogue shown. */
async function researcher(t) {
  const d = await t.pc("researcher")
  await d.open("/search/")
  await d.answered()
  await d.showCatalogue()
  return d
}

/** proxy2's row reads [patients, specimens]. */
async function counts(t, d, [patients, specimens], claim) {
  const shown = (await d.results()).proxy2
  t.expect(
    shown?.[0] === String(patients) && shown?.[1] === String(specimens),
    `${claim}: ${patients} patients, ${specimens} specimens`,
    `table shows ${JSON.stringify(shown)}`
  )
}

/**
 * The shape of most stories: click criteria in, see the query marked as modified while the
 * old counts still stand, press Search, read the new counts.
 */
async function query(t, d, click, want, claim) {
  await click(d)
  t.expect(await d.stale(), "the results are marked as out of date until Search is pressed")
  await snap(t, d, "query-built")
  await d.search()
  t.expect(!(await d.stale()), "Search clears the out-of-date notice")
  await counts(t, d, want, claim)
  await snap(t, d, "results")
}

// ---- stories -----------------------------------------------------------------------------

story("S1", "Without criteria the search covers every patient", async (t) => {
  const d = await t.pc("researcher")
  await d.open("/search/")
  await d.answered()
  await counts(t, d, [256, 2556], "the empty query counts everything")
  await snap(t, d, "landing")
  await d.showCatalogue()
  await d.expand("Donor/Clinical Information", "Sample")
  await snap(t, d, "catalogue-open")
})

story("S2", "One option from a single-select: gender male", async (t) => {
  const d = await researcher(t)
  await query(
    t,
    d,
    async (d) => {
      await d.expand("Donor/Clinical Information", "Gender")
      await d.addOption("Gender", "male")
    },
    [118, 1190],
    "male donors"
  )
})

story("S3", "Two criteria are combined with AND: male, diagnosed aged 30-50", async (t) => {
  const d = await researcher(t)
  await query(
    t,
    d,
    async (d) => {
      await d.expand("Donor/Clinical Information", "Gender", "Diagnosis age donor (years)")
      await d.addOption("Gender", "male")
      await d.addRange("Diagnosis age donor (years)", 30, 50)
    },
    [53, 527],
    "male donors diagnosed aged 30-50"
  )
})

story("S4", "A diagnosis picked from the autocomplete: C50.% (breast)", async (t) => {
  const d = await researcher(t)
  await query(
    t,
    d,
    async (d) => {
      await d.expand("Donor/Clinical Information", "Diagnosis ICD-10")
      await d.addSuggestion("Diagnosis ICD-10", "C50", "C50.%")
    },
    [1, 5],
    "donors with a C50 diagnosis"
  )
})

story("S5", "A closed date range: sampled 2010-01-01 to 2015-01-01", async (t) => {
  const d = await researcher(t)
  await query(
    t,
    d,
    async (d) => {
      await d.expand("Sample", "Sampling date")
      await d.addRange("Sampling date", "2010-01-01", "2015-01-01")
    },
    [72, 705],
    "samples taken 2010-2015"
  )
})

story("S6", "An open number range: diagnosed aged 50 or older", async (t) => {
  const d = await researcher(t)
  await query(
    t,
    d,
    async (d) => {
      await d.expand("Donor/Clinical Information", "Diagnosis age donor (years)")
      await d.addRange("Diagnosis age donor (years)", 50, null)
    },
    [47, 479],
    "donors diagnosed aged 50 or older"
  )
})

story("S7", "A sample criterion: stored in liquid nitrogen", async (t) => {
  const d = await researcher(t)
  await query(
    t,
    d,
    async (d) => {
      await d.expand("Sample", "Storage temperature")
      await d.addOption("Storage temperature", "Liquid nitrogen")
    },
    [179, 348],
    "samples in liquid nitrogen"
  )
})

story("S8", "Add all genders: the options are ORed, so nobody drops out", async (t) => {
  const d = await researcher(t)
  await query(
    t,
    d,
    async (d) => {
      await d.expand("Donor/Clinical Information", "Gender")
      await d.addAll("Gender")
    },
    [256, 2556],
    "every gender together is everyone"
  )
})

story("S9", "Removing the only criterion and searching again restores the totals", async (t) => {
  const d = await researcher(t)
  await d.expand("Donor/Clinical Information", "Gender")
  await d.addOption("Gender", "male")
  await d.search()
  await counts(t, d, [118, 1190], "male donors first")
  await d.removeChip("Gender")
  t.expect(await d.stale(), "removing a criterion marks the results as out of date")
  await snap(t, d, "criterion-removed")
  await d.search()
  await counts(t, d, [256, 2556], "the empty query again counts everything")
  await snap(t, d, "results")
})

story("S10", "Every kind of criterion in the catalogue has a story", async (t) => {
  const d = await researcher(t)
  await d.expandAll()
  const outline = await d.outline()
  t.record(
    "outline",
    outline
      .map(({ depth, name, kind, options }) =>
        `${"  ".repeat(depth)}${name}: ${kind}${options.length ? ` (${options.join(", ")})` : ""}`
      )
      .join("\n"),
    { title: "the catalogue as configured, each criterion with its kind" }
  )
  for (const kind of new Set(outline.map((n) => n.kind).filter((k) => k !== "group")))
    t.expect(kind in covered, `${kind} criteria are clicked by ${covered[kind] ?? "no story"}`)
  await snap(t, d, "all-open")
})

story("S11", "A query nobody matches still lists the site, with zeros", async (t) => {
  const d = await researcher(t)
  await query(
    t,
    d,
    async (d) => {
      await d.expand("Donor/Clinical Information", "Diagnosis ICD-10", "Gender")
      await d.addSuggestion("Diagnosis ICD-10", "C50", "C50.%")
      await d.addOption("Gender", "male")
    },
    [0, 0],
    "the one C50 donor is not male"
  )
})

story("S12", "Options of one criterion share a chip and are ORed; a repeat adds nothing", async (t) => {
  const d = await researcher(t)
  await query(
    t,
    d,
    async (d) => {
      await d.expand("Donor/Clinical Information", "Gender")
      await d.addOption("Gender", "male")
      await d.addOption("Gender", "male")
      await d.addOption("Gender", "female")
      const chips = await d.chips()
      t.expect(
        chips.length === 1 && chips[0] === "Gender: male female",
        "one chip: Gender: male female",
        `chips are ${JSON.stringify(chips)}`
      )
    },
    [256, 2556],
    "male or female donors: everyone, as every synthetic patient is one or the other"
  )
})

story("S13", "A range is refused when it is inverted or empty", async (t) => {
  const d = await researcher(t)
  const age = "Diagnosis age donor (years)"
  await d.expand("Donor/Clinical Information", age)
  for (const [slug, from, to, message] of [
    ["inverted", 60, 30, "min must be less than max"],
    ["empty", null, null, "cannot both be empty"],
  ]) {
    await d.addRange(age, from, to)
    const refusal = await d.refusal(age)
    t.expect(refusal.toLowerCase().includes(message), `${slug}: refused with "${message}"`, `says "${refusal}"`)
    t.expect(!(await d.chips()).length && !(await d.stale()), `${slug}: the query stays empty`)
    t.record(`${slug}-refusal`, refusal, { title: `${slug} range: the browser's validation message` })
  }
  await snap(t, d, "refused")
})
