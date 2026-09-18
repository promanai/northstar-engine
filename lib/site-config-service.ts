import { env } from 'cloudflare:workers';
import { isAdministrator, type ContentActor } from '@/lib/access-policy';
import { documentStore } from '@/lib/document-store';
import { isLite } from '@/lib/engine-mode';
import { liteSite } from '@/lib/lite-content';
import { isThemeId } from '@/lib/themes';
import { RequestFailure } from '@/lib/request-security';
import {
  defaultSiteConfig,
  importLegacySiteConfig,
  managedSettingKeys,
  legacySiteSettings,
  validateSiteConfig,
  type SiteConfig,
} from '@/lib/site-config-policy';

export function requireSiteConfigAccess(
  actor: ContentActor | null,
  write = false,
) {
  if (
    !actor ||
    !isAdministrator(actor.role) ||
    (actor.tokenId &&
      !actor.scopes?.includes('*') &&
      !actor.scopes?.includes(write ? 'site:write' : 'site:read'))
  )
    throw new RequestFailure('Недостаточно прав для настроек сайта', 403);
  return actor;
}
async function store() {
  const rows = await env.DB.prepare(
    `SELECT key, value FROM site_settings WHERE key IN (${managedSettingKeys.map(() => '?').join(',')})`,
  )
    .bind(...managedSettingKeys)
    .all<{ key: string; value: string }>();
  const legacy = importLegacySiteConfig([
    ...rows.results.map((row) => {
      try {
        return { key: row.key, value: JSON.parse(row.value) as unknown };
      } catch {
        return { key: row.key, value: null };
      }
    }),
    ...(liteSite.businessType === 'dental'
      ? legacySiteSettings({
          name: liteSite.name,
          description: liteSite.description,
          locale: liteSite.locale,
          theme: 'northstar',
          backgroundImage: liteSite.backgroundImage,
        })
      : []),
  ]);
  return {
    store: documentStore<SiteConfig>('site-config', legacy.value),
    warnings: legacy.warnings,
  };
}
export async function readSiteConfig(actor: ContentActor | null) {
  requireSiteConfigAccess(actor);
  const result = await store();
  const state = await result.store.read();
  return { ...state, warnings: state.revision === 0 ? result.warnings : [] };
}
export async function publicSiteConfig(): Promise<SiteConfig> {
  if (isLite())
    // Lite has its own build-time contract (including descriptions up to 500 chars).
    return {
      ...defaultSiteConfig,
      ...liteSite,
      theme: isThemeId(liteSite.theme)
        ? liteSite.theme
        : defaultSiteConfig.theme,
    };
  return validateSiteConfig((await (await store()).store.read()).value);
}
function revision(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new RequestFailure('Требуется целая revision >= 0');
  return value;
}
export async function siteConfigHistory(
  actor: ContentActor | null,
  before?: number,
) {
  requireSiteConfigAccess(actor);
  if (before !== undefined) revision(before);
  return (await store()).store.history(before);
}
export async function changeSiteConfig(
  actor: ContentActor | null,
  body: Record<string, unknown>,
  source: 'rest' | 'mcp',
) {
  const user = requireSiteConfigAccess(actor, true);
  const restore = Object.hasOwn(body, 'targetRevision');
  const allowed = restore
    ? ['revision', 'targetRevision', 'confirm']
    : ['revision', 'value', 'confirm'];
  if (Object.keys(body).some((key) => !allowed.includes(key)))
    throw new RequestFailure('Неизвестное поле');
  if (body.confirm !== true)
    throw new RequestFailure(
      'Изменения сразу появятся на сайте. Требуется confirm: true',
    );
  const expected = revision(body.revision);
  const { store: documents } = await store();
  const current = await documents.read();
  const conflict = () =>
    new RequestFailure(
      'Настройки уже изменены. Загрузите актуальную версию; ваши правки не сохранены.',
      409,
    );
  if (expected !== current.revision) throw conflict();
  let value = body.value;
  const target = restore ? revision(body.targetRevision) : null;
  if (target !== null) {
    requireSiteConfigAccess(actor);
    value = await documents.version(target);
    if (!value) throw new RequestFailure('Версия не найдена', 404);
  }
  let config: SiteConfig;
  try {
    config = validateSiteConfig(value);
  } catch (error) {
    throw new RequestFailure(
      error instanceof Error ? error.message : 'Некорректные настройки',
    );
  }
  if (
    !(await documents.save(
      current,
      config,
      user.id,
      user.tokenId ?? null,
      source,
      target,
    ))
  )
    throw conflict();
  return { revision: current.revision + 1, value: config, warnings: [] };
}
