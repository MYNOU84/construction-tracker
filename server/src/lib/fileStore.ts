import prisma from './prisma';

/**
 * Database-backed storage for uploaded files (UPLOAD_STORAGE=database, the default on Vercel, whose
 * filesystem is not persistent). Files are kept as bytes in a table outside the Prisma schema, so the
 * schema, migrations and the local dev.db are untouched:
 *   PostgreSQL: schema "buildtrack_files", table "stored_file" (a separate schema, so `prisma db push`
 *               never sees or drops it). Free within Neon's 1 GB storage.
 *   SQLite:     table "bt_stored_file" (only used if database storage is chosen explicitly locally).
 * The table is created with IF NOT EXISTS on first use, and also by `npm run db:prod-init`.
 */
const isPostgres = () => /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || '');
const TABLE = () => (isPostgres() ? 'buildtrack_files.stored_file' : 'bt_stored_file');

let ready: Promise<void> | null = null;
export function ensureFileStore(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      if (isPostgres()) {
        await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS buildtrack_files');
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS buildtrack_files.stored_file (
          id TEXT PRIMARY KEY, kind TEXT NOT NULL, data BYTEA NOT NULL, mime TEXT, size INTEGER,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
      } else {
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS bt_stored_file (
          id TEXT PRIMARY KEY, kind TEXT NOT NULL, data BLOB NOT NULL, mime TEXT, size INTEGER,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
      }
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

const key = (kind: string, file: string) => `${kind}/${file}`;
/** Positional parameter n (1-based): $n for PostgreSQL, ? for SQLite. Values are always bound, never inlined. */
const p = (n: number) => (isPostgres() ? `$${n}` : '?');

export async function saveStoredFile(kind: string, file: string, data: Buffer, mime: string): Promise<void> {
  await ensureFileStore();
  await prisma.$executeRawUnsafe(`INSERT INTO ${TABLE()} (id, kind, data, mime, size) VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)})`,
    key(kind, file), kind, data, mime, data.length);
}

export async function readStoredFile(kind: string, file: string): Promise<Buffer | null> {
  await ensureFileStore();
  const rows = await prisma.$queryRawUnsafe<{ data: Buffer | Uint8Array }[]>(`SELECT data FROM ${TABLE()} WHERE id = ${p(1)}`, key(kind, file));
  if (!rows.length) return null;
  const d = rows[0].data;
  return Buffer.isBuffer(d) ? d : Buffer.from(d);
}

export async function deleteStoredFile(kind: string, file: string): Promise<void> {
  await ensureFileStore();
  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE()} WHERE id = ${p(1)}`, key(kind, file));
}
