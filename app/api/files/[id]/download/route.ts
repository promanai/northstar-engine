import { getRequestUser } from '@/lib/auth';
import { downloadFile } from '@/lib/file-service';
import { failureResponse } from '@/lib/request-security';
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await downloadFile(
      await getRequestUser(request),
      (await context.params).id,
    );
  } catch (error) {
    return failureResponse(error);
  }
}
