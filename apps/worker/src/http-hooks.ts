import type { AttemptContext, ExecutionHooks } from './executor.js';

/** API-backed hooks keep fencing enforcement in the coordinator. */
export class HttpExecutionHooks implements ExecutionHooks {
  constructor(private readonly apiBaseUrl: string, private readonly apiToken?: string) {}
  private headers() { const headers: Record<string,string> = {'content-type':'application/json'}; if (this.apiToken) headers.authorization=`Bearer ${this.apiToken}`; return headers; }
  private url(ctx: AttemptContext) { return `${this.apiBaseUrl}/v1/attempts/${ctx.attemptId}`; }
  async heartbeat(ctx: AttemptContext, sequence: number) {
    const r = await fetch(`${this.url(ctx)}/heartbeat`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ fencingToken: ctx.fencingToken, sequence }) });
    if (!r.ok) throw new Error(`HEARTBEAT_FAILED_${r.status}`);
    const state = (await r.json().catch(() => ({}))) as { state?: string };
    if (state.state === 'cancel_requested' || state.state === 'cancelled') throw new Error('CANCELLED');
  }
  async commit(ctx: AttemptContext, output: unknown) {
    const candidate = output && typeof output === 'object' ? output as Record<string, unknown> : {};
    const rawOutputs = Array.isArray(candidate.outputs) ? candidate.outputs : [];
    const outputs = [];
    for (const raw of rawOutputs) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      if (typeof item.contentBase64 !== 'string') { outputs.push(item); continue; }
      const bytes = Uint8Array.from(Buffer.from(item.contentBase64, 'base64'));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
      const upload = await fetch(`${this.url(ctx)}/assets`, { method:'POST', headers:this.headers(), body: JSON.stringify({ fencingToken:ctx.fencingToken, logicalName:item.logicalName, mimeType:item.mimeType ?? 'application/octet-stream', sha256, contentBase64:item.contentBase64 }) });
      if (!upload.ok) throw new Error(`ASSET_UPLOAD_FAILED_${upload.status}`);
      const asset = await upload.json() as { assetVersionId:string };
      const { contentBase64: _content, ...descriptor } = item;
      outputs.push({ ...descriptor, assetVersionId: asset.assetVersionId, sha256 });
    }
    const manifest = rawOutputs.length ? { ...candidate, outputs } : output;
    const r = await fetch(`${this.url(ctx)}/commit`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ fencingToken: ctx.fencingToken, manifest }) });
    if (!r.ok) throw new Error(`COMMIT_FAILED_${r.status}`);
  }
  async fail(ctx: AttemptContext, error: unknown) {
    await fetch(`${this.url(ctx)}/cancel`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ fencingToken: ctx.fencingToken, error: String(error) }) });
  }
}
