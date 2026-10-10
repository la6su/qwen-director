import pg from 'pg';

const pool = new pg.Pool({ host: '/var/run/postgresql', user: process.env.PGUSER ?? 'la6', database: process.env.PGDATABASE ?? 'qwendirector' });
const fixtureNames = ['smoke', 'e2e', 'failure', 'reconcile', 'resolve', 'retry', 'workflow', 'result', 'select', 'binding-guard', 'multi-node smoke', 'attempts-smoke', 'asset smoke', 'profile-source', 'API integration smoke'];
try {
  const result = await pool.query(`
    select j.id, j.state, j.origin, j.created_at, p.name as project
    from jobs j join shots sh on sh.id=j.shot_id join scenes sc on sc.id=sh.scene_id join projects p on p.id=sc.project_id
    where p.name = any($1::text[])
    order by j.created_at desc
  `, [fixtureNames]);
  console.log(JSON.stringify({ dryRun: true, count: result.rowCount, jobs: result.rows }, null, 2));
} finally { await pool.end(); }
