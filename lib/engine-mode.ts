import { env } from 'cloudflare:workers';

// Preserve existing deployments; a new installation without DB defaults to Lite.
export function engineMode(): 'lite' | 'standard' {
  if (env.ENGINE_MODE === 'lite') return 'lite';
  if (env.ENGINE_MODE === 'standard') return 'standard';
  if (env.ENGINE_MODE) throw new Error('Invalid ENGINE_MODE');
  return env.DB ? 'standard' : 'lite';
}
export const isLite = () => engineMode() === 'lite';
