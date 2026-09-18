import { env } from 'cloudflare:workers';
export type DocumentState<T> = { revision: number; value: T };
export type DocumentEvent = {
  revision: number;
  action: string;
  actorId: string;
  tokenId: string | null;
  source: string;
  createdAt: number;
  restoredFrom: number | null;
};

// Small versioned documents, shared by administrative settings modules.
export function documentStore<T>(key: string, fallback: T) {
  const db = env.DB;
  return {
    async read(): Promise<DocumentState<T>> {
      const row = await db
        .prepare('SELECT revision, value FROM site_documents WHERE key = ?')
        .bind(key)
        .first<{ revision: number; value: string }>();
      return row
        ? { revision: row.revision, value: JSON.parse(row.value) }
        : { revision: 0, value: fallback };
    },
    async history(before = Number.MAX_SAFE_INTEGER) {
      return (
        await db
          .prepare(`SELECT revision, action, actor_id AS actorId, token_id AS tokenId, source, created_at AS createdAt, restored_from AS restoredFrom
        FROM site_document_revisions WHERE document_key = ? AND revision < ? ORDER BY revision DESC LIMIT 50`)
          .bind(key, before)
          .all<DocumentEvent>()
      ).results;
    },
    async version(revision: number): Promise<T | null> {
      const row = await db
        .prepare(
          'SELECT value FROM site_document_revisions WHERE document_key = ? AND revision = ?',
        )
        .bind(key, revision)
        .first<{ value: string }>();
      return row ? JSON.parse(row.value) : null;
    },
    async save(
      current: DocumentState<T>,
      value: T,
      actorId: string,
      tokenId: string | null,
      source: string,
      restoredFrom: number | null,
    ) {
      const mutation = crypto.randomUUID(),
        now = Math.floor(Date.now() / 1000);
      const results = await db.batch([
        db
          .prepare(
            'INSERT INTO site_documents (key, revision, value) VALUES (?, 0, ?) ON CONFLICT(key) DO NOTHING',
          )
          .bind(key, JSON.stringify(fallback)),
        db
          .prepare(`INSERT INTO site_document_revisions (document_key, revision, value, action, actor_id, source, created_at)
          SELECT key, 0, value, 'baseline', 'system', 'default', ? FROM site_documents WHERE key = ? AND revision = 0
          ON CONFLICT(document_key, revision) DO NOTHING`)
          .bind(now, key),
        db
          .prepare(
            'UPDATE site_documents SET value = ?, revision = revision + 1, mutation_id = ? WHERE key = ? AND revision = ?',
          )
          .bind(JSON.stringify(value), mutation, key, current.revision),
        db
          .prepare(`INSERT INTO site_document_revisions (document_key, revision, value, action, actor_id, token_id, source, created_at, restored_from)
          SELECT key, revision, value, ?, ?, ?, ?, ?, ? FROM site_documents WHERE key = ? AND mutation_id = ?`)
          .bind(
            restoredFrom === null ? 'update' : 'restore',
            actorId,
            tokenId,
            source,
            now,
            restoredFrom,
            key,
            mutation,
          ),
      ]);
      return results[2].meta.changes === 1;
    },
  };
}
