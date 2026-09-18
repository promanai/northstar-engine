import { markdownResponse } from '@/lib/public-markdown';
export async function GET(request: Request) {
  return markdownResponse(new URL(request.url).searchParams.get('slug') || '/');
}
