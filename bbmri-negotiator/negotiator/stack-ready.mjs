// Checks once that the stack the handoff test drives is up, for retry.sh to
// repeat: the Locator, the Negotiator behind its gateway, and a Spot query
// that every site answers. The test waits this way instead of with
// depends_on, so that `test` creates no containers of its own and cannot race
// the `up` that is still starting the stack.
//
//   node stack-ready.mjs <locator url> <gateway url> <spot url>
const [locator, gateway, spot] = process.argv.slice(2);
if (!spot) {
  console.error('Usage: node stack-ready.mjs <locator url> <gateway url> <spot url>');
  process.exit(2);
}

// fetch's own message is just "fetch failed"; name the URL and the cause
async function request(url, options = {}) {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(10_000), ...options });
  } catch (error) {
    throw new Error(`${url}: ${error.cause?.code ?? error.cause?.message ?? error.message}`);
  }
}

async function get(url) {
  const response = await request(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
}

// Like lib/tests/spot-query.sh: an empty AST query must end its result stream
// by itself, with every site's answer succeeded.
async function spotQuery() {
  const id = crypto.randomUUID();
  const ast = { ast: { operand: 'OR', children: [] }, id };
  const payload = Buffer.from(JSON.stringify(ast)).toString('base64');
  const query = Buffer.from(JSON.stringify({ lang: 'ast', payload })).toString('base64');
  const posted = await request(`${spot}/beam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, id }),
  });
  if (!posted.ok) throw new Error(`${spot}/beam: HTTP ${posted.status}`);
  const stream = await request(`${spot}/beam/${id}`, { signal: AbortSignal.timeout(60_000) });
  const text = await stream.text().catch((error) => {
    throw new Error(`${spot}/beam/${id}: ${error.name === 'TimeoutError' ? 'no answer from every site within 60s' : error.message}`);
  });
  const answers = [...text.matchAll(/"from":"([^"]*)",.*"status":"([a-z]+)"/g)]
    .map(([, from, status]) => ({ from, status }))
    .filter(({ status }) => status !== 'claimed');
  if (answers.length === 0) throw new Error('No site answered');
  const failed = answers.filter(({ status }) => status !== 'succeeded');
  if (failed.length > 0) {
    throw new Error(`Not succeeded: ${failed.map(({ from, status }) => `${from} ${status}`).join(', ')}`);
  }
}

try {
  await get(`${locator}/search`);
  await get(`${gateway}/`);
  await get(`${gateway}/api/actuator/health`);
  await spotQuery();
  console.log('Stack ready');
} catch (error) {
  console.log(error.message);
  process.exit(1);
}
