import { env } from 'cloudflare:workers';

export type StoredPage = {
  id: string;
  slug: string;
  title: string;
  status: string;
  blocks: unknown[];
  seo: Record<string, string>;
  revision: number;
  createdAt: number;
  updatedAt: number;
};
export type PageVersion = {
  revision: number;
  action: string;
  actorId: string;
  tokenId: string | null;
  source: string;
  createdAt: number;
  snapshot: StoredPage;
};
type Row = Omit<StoredPage, 'blocks' | 'seo'> & { blocks: string; seo: string };
const columns =
  'id, slug, title, status, blocks, seo, revision, created_at AS createdAt, updated_at AS updatedAt';
const decode = (row: Row): StoredPage => ({
  ...row,
  blocks: JSON.parse(row.blocks),
  seo: JSON.parse(row.seo),
});

// All persistence for page operations lives here, not in HTTP/MCP handlers.
export function pageStore() {
  const db = env.DB;
  function event(
    page: StoredPage,
    action: string,
    actorId: string,
    tokenId: string | null,
    source: string,
    mutation: string,
  ) {
    return db
      .prepare(`INSERT INTO page_revisions (page_id, revision, action, actor_id, token_id, source, snapshot, created_at)
      SELECT id, revision, ?, ?, ?, ?, ?, ? FROM pages WHERE id = ? AND mutation_id = ?`)
      .bind(
        action,
        actorId,
        tokenId,
        source,
        JSON.stringify(page),
        page.updatedAt,
        page.id,
        mutation,
      );
  }
  return {
    async list(privateRead: boolean) {
      const result = await db
        .prepare(
          `SELECT ${columns} FROM pages ${privateRead ? '' : "WHERE status = 'published'"} ORDER BY slug LIMIT 200`,
        )
        .all<Row>();
      return result.results.map(decode);
    },
    async get(id: string) {
      const row = await db
        .prepare(`SELECT ${columns} FROM pages WHERE id = ?`)
        .bind(id)
        .first<Row>();
      return row ? decode(row) : null;
    },
    async history(id: string, before = Number.MAX_SAFE_INTEGER) {
      const result = await db
        .prepare(`SELECT revision, action, actor_id AS actorId, token_id AS tokenId, source, created_at AS createdAt
        FROM page_revisions WHERE page_id = ? AND revision < ? ORDER BY revision DESC LIMIT 50`)
        .bind(id, before)
        .all<Omit<PageVersion, 'snapshot'>>();
      return result.results;
    },
    async version(id: string, revision: number) {
      const row = await db
        .prepare(
          'SELECT snapshot FROM page_revisions WHERE page_id = ? AND revision = ?',
        )
        .bind(id, revision)
        .first<{ snapshot: string }>();
      return row ? (JSON.parse(row.snapshot) as StoredPage) : null;
    },
    async save(
      next: StoredPage,
      current: StoredPage | null,
      actorId: string,
      tokenId: string | null,
      source: string,
      action: string,
    ) {
      const mutation = crypto.randomUUID();
      if (!current) {
        await db.batch([
          db
            .prepare(
              `INSERT INTO pages (id, slug, title, status, blocks, seo, revision, mutation_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
            )
            .bind(
              next.id,
              next.slug,
              next.title,
              next.status,
              JSON.stringify(next.blocks),
              JSON.stringify(next.seo),
              mutation,
              next.createdAt,
              next.updatedAt,
            ),
          event(next, action, actorId, tokenId, source, mutation),
        ]);
        return true;
      }
      const result = await db.batch([
        // Preserve the pre-upgrade state of existing pages on their first mutation.
        db
          .prepare(`INSERT INTO page_revisions (page_id, revision, action, actor_id, token_id, source, snapshot, created_at)
          SELECT id, revision, 'baseline', 'system', NULL, 'migration', ?, ? FROM pages WHERE id = ? AND revision = 0 AND revision = ?
          ON CONFLICT(page_id, revision) DO NOTHING`)
          .bind(
            JSON.stringify(current),
            current.updatedAt,
            current.id,
            current.revision,
          ),
        db
          .prepare(
            `UPDATE pages SET slug = ?, title = ?, status = ?, blocks = ?, seo = ?, revision = revision + 1, mutation_id = ?, updated_at = ? WHERE id = ? AND revision = ?`,
          )
          .bind(
            next.slug,
            next.title,
            next.status,
            JSON.stringify(next.blocks),
            JSON.stringify(next.seo),
            mutation,
            next.updatedAt,
            current.id,
            current.revision,
          ),
        event(next, action, actorId, tokenId, source, mutation),
      ]);
      // D1 batch is atomic; losing a compare-and-swap never emits a revision.
      return result[1].meta.changes === 1;
    },
  };
}
