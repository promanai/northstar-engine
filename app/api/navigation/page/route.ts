import { publicNavigationPage } from '@/lib/navigation-service';
import { failureResponse, RequestFailure } from '@/lib/request-security';
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))
      throw new RequestFailure('Укажите ID страницы');
    return Response.json(await publicNavigationPage(id), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
