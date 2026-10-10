import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

export interface NodeRegistration { nodeId?: string; instanceId: string; capabilities: Record<string, unknown>; }

export class PgNodeRepository {
  constructor(private readonly pool: Pool) {}
  async list() { return (await this.pool.query("select id,instance_id,capabilities,status,heartbeat_at from nodes order by case when status='online' then 0 else 1 end, heartbeat_at desc, id")).rows; }
  async register(input: NodeRegistration) {
    const id = input.nodeId ?? randomUUID();
    try { const result = await this.pool.query(`insert into nodes(id,instance_id,capabilities,status,heartbeat_at)
      values($1,$2,$3,'online',now())
      on conflict(id) do update set instance_id=excluded.instance_id, capabilities=excluded.capabilities,
      status='online', heartbeat_at=now() returning id,instance_id,capabilities,status,heartbeat_at`,
    [id,input.instanceId,input.capabilities]);
    return result.rows[0]; } catch (error:any) { if (error?.code === '23505' && error?.constraint === 'one_online_worker_instance') throw new Error('NODE_INSTANCE_ALREADY_ONLINE'); throw error; }
  }
  async heartbeat(nodeId: string, instanceId: string, capabilities?: Record<string, unknown>) {
    const result = await this.pool.query(`update nodes set heartbeat_at=now(), status='online',
      capabilities=coalesce($3,capabilities) where id=$1 and instance_id=$2 returning id,status,heartbeat_at`,
    [nodeId,instanceId,capabilities ?? null]);
    if (!result.rowCount) throw new Error('NODE_NOT_FOUND_OR_INSTANCE_MISMATCH');
    return result.rows[0];
  }
  async markStale(staleSeconds = 30) {
    return this.pool.query(`update nodes set status='stale' where status='online' and heartbeat_at < now()-($1 * interval '1 second')`,[staleSeconds]);
  }
}
