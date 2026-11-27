import { readFileSync } from 'node:fs';

process.env.PUBLIC_LENS_OPTIONS = readFileSync('/fixtures/locator-options.json', 'utf8');
await import('./build/index.js');
