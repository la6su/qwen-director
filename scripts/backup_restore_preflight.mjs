import pg from 'pg';
import databaseUrl from './lib/require-database-url.mjs';
const pool = new pg.Pool({ connectionString: databaseUrl });
try { const row=(await pool.query('select current_user as user, rolcreatedb from pg_roles where rolname=current_user')).rows[0]; if(!row) throw new Error('POSTGRES_ROLE_NOT_FOUND'); console.log(JSON.stringify({user:row.user,canCreateDatabase:row.rolcreatedb,restoreRehearsal:row.rolcreatedb?'ready':'requires-admin-role'},null,2)); } finally { await pool.end(); }
