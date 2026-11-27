import { createServer } from 'node:http';
import { directoryCollections } from './fixtures.mjs';

// Only the Directory metadata lookup is a fixture; search and negotiation use real services.
createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.end('ok');
    return;
  }
  if (request.method !== 'POST' || request.url !== '/graphql') {
    response.writeHead(404).end();
    return;
  }
  try {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks));
    if (!Array.isArray(body.variables?.ids)) throw new Error('Missing collection IDs');
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: { Collections: directoryCollections(body.variables.ids) } }));
  } catch {
    response.writeHead(400).end('Invalid Directory query');
  }
}).listen(8070, '0.0.0.0');
