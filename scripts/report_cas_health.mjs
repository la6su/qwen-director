import pg from 'pg';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
const pool = new pg.Pool({ host:'/var/run/postgresql', user:process.env.PGUSER ?? 'la6', database:process.env.PGDATABASE ?? 'qwendirector' });
const root = process.env.QWEN_ASSET_ROOT ?? '.data/assets';
try {
  const rows = (await pool.query('select id,storage_key,sha256,asset_kind from asset_versions order by created_at')).rows;
  const missing = [];
  for (const row of rows) {
    if (!existsSync(join(root, row.storage_key))) {
      const links = (await pool.query('select count(*)::int as n from attempt_assets where asset_version_id=$1', [row.id])).rows[0].n;
      const selected = (await pool.query('select count(*)::int as n from job_selected_outputs where asset_version_id=$1', [row.id])).rows[0].n;
      missing.push({ id: row.id, assetKind: row.asset_kind, storageKey: row.storage_key, attemptLinks: links, selectedLinks: selected });
    }
  }
  const report = { root, total: rows.length, present: rows.length - missing.length, missingCount: missing.length, missing };
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--strict') && missing.length) process.exitCode = 1;
} finally { await pool.end(); }
