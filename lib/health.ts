import { publicBuildStamp } from '@/lib/build-info';

// Liveness only: no database, object storage or paid provider request.
export function healthPayload(mode: 'lite' | 'standard') {
  return {
    status: 'ok',
    service: 'northstar-engine',
    mode,
    storage: mode === 'lite' ? 'none' : 'd1',
    version: publicBuildStamp.version,
    build: publicBuildStamp,
  };
}
