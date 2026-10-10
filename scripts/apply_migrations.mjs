import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : new pg.Pool({ host: '/var/run/postgresql', user: process.env.PGUSER ?? 'la6', database: process.env.PGDATABASE ?? 'qwendirector' });
const files = (await readdir('packages/storage/migrations')).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
const client = await pool.connect();
try {
  await client.query('create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())');
  for (const file of files) {
    const applied = await client.query('select 1 from schema_migrations where version=$1', [file]);
    if (applied.rowCount) continue;
    await client.query('begin');
    try {
      await client.query(await readFile(join('packages/storage/migrations', file), 'utf8'));
      await client.query('insert into schema_migrations(version) values($1)', [file]);
      await client.query('commit');
      console.log(`applied ${file}`);
    } catch (error) { await client.query('rollback'); throw error; }
  }
  console.log(`OK: migrations current (${files.length} files)`);
} finally { client.release(); await pool.end(); }
