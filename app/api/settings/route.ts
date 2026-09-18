import { publicSiteConfig } from '@/lib/site-config-service';
import {
  legacySiteSettings,
  managedSettingKeys,
} from '@/lib/site-config-policy';
import { readJson, failureResponse } from '@/lib/request-security';
import { isAdministrator } from '@/lib/access-policy';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { siteSettings } from '@/db/schema';
import { getRequestUser } from '@/lib/auth';
import { discardBody } from '@/lib/security-policy';

async function admin(request: Request) {
  const user = await getRequestUser(request);
  return user && isAdministrator(user.role) ? user : null;
}
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const publicSettings = legacySiteSettings(await publicSiteConfig());
    if (!user || !isAdministrator(user.role))
      return Response.json(
        {
          settings: publicSettings,
        },
        { headers: { 'cache-control': 'no-store' } },
      );
    const rows = await getDb()
      .select()
      .from(siteSettings)
      .orderBy(asc(siteSettings.key));
    return Response.json(
      {
        settings: [
          ...rows.filter((row) => !managedSettingKeys.includes(row.key)),
          ...publicSettings,
        ],
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return failureResponse(error);
  }
}
export async function PUT(request: Request) {
  if (!(await admin(request))) {
    await discardBody(request);
    return Response.json(
      { error: 'Требуется роль администратора' },
      { status: 403 },
    );
  }
  let body: { key?: string; value?: Record<string, unknown> };
  try {
    body = (await readJson(request, 8000)) as typeof body;
  } catch (error) {
    return failureResponse(error);
  }
  if (typeof body.key !== 'string' || !body.key.includes('.'))
    return Response.json(
      { error: 'key должен иметь namespace, например public.siteName' },
      { status: 400 },
    );
  if (managedSettingKeys.includes(body.key))
    return Response.json(
      { error: 'Используйте /api/site-config с revision' },
      { status: 400, headers: { 'cache-control': 'no-store' } },
    );
  if (body.key === 'public.navigation')
    return Response.json(
      { error: 'Используйте /api/navigation с revision' },
      { status: 400, headers: { 'cache-control': 'no-store' } },
    );
  const now = new Date();
  await getDb()
    .insert(siteSettings)
    .values({
      key: body.key,
      value: body.value ?? {},
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: body.value ?? {}, updatedAt: now },
    });
  const setting = await getDb()
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, body.key))
    .get();
  return Response.json({ setting });
}
