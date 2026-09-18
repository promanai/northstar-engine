import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateOpenApi, validatePublicCatalog } from './contract-policy.mjs';

const BASE_URL = process.env.CONTRACT_BASE_URL ?? 'http://127.0.0.1:8787';

async function request(route) {
  const response = await fetch(new URL(route, BASE_URL), {
    signal: AbortSignal.timeout(5000),
    headers: { accept: 'application/json' },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${route} returned HTTP ${response.status}: ${body.slice(0, 200)}`);
  return { response, body };
}

async function main() {
  const openapi = JSON.parse((await request('/api/openapi')).body);
  const errors = validateOpenApi(openapi);
  const catalog = JSON.parse((await request('/api/products')).body);
  errors.push(...validatePublicCatalog(catalog));
  const health = JSON.parse((await request('/api/health')).body);
  if (health.status !== 'ok') errors.push('health status is not ok');
  const llms = (await request('/llms.txt')).body;
  for (const marker of ['/api/openapi', '/api/mcp', '/api/content'])
    if (!llms.includes(marker)) errors.push(`llms.txt misses ${marker}`);
  if (errors.length) throw new Error(errors.join('; '));
  console.log(`Contract OK: ${Object.keys(openapi.paths).length} OpenAPI paths, public catalog safe, health and llms checked`);
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(`Contract check failed: ${error.message}`);
    process.exitCode = 1;
  });
