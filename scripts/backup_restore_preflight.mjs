import pg from 'pg';
const pool = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : new pg.Pool({ host: '/var/run/postgresql', user: 'la6', database: 'qwendirector' });
try { const row=(await pool.query('select current_user as user, rolcreatedb from pg_roles where rolname=current_user')).rows[0]; if(!row) throw new Error('POSTGRES_ROLE_NOT_FOUND'); console.log(JSON.stringify({user:row.user,canCreateDatabase:row.rolcreatedb,restoreRehearsal:row.rolcreatedb?'ready':'requires-admin-role'},null,2)); } finally { await pool.end(); }
