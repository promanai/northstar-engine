import { healthPayload } from '@/lib/health';
import { isLite } from '@/lib/engine-mode';

export async function GET() {
  return Response.json(healthPayload(isLite() ? 'lite' : 'standard'), {
    headers: { 'cache-control': 'no-store' },
  });
}
