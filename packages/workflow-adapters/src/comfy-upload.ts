export async function uploadComfyReference(baseUrl: string, content: Uint8Array, filename: string, type: 'image' | 'audio' | 'video' = 'image', subfolder = ''): Promise<{ name: string; subfolder: string; type: string }> {
  if (!filename || /[\\/]/.test(filename)) throw new Error('INVALID_REFERENCE_FILENAME');
  if (subfolder && (subfolder.startsWith('/') || subfolder.split(/[\\/]/).some((part) => !part || part === '.' || part === '..' || !/^[a-zA-Z0-9_-]+$/.test(part)))) throw new Error('INVALID_REFERENCE_SUBFOLDER');
  const form = new FormData(); form.append('image', new Blob([content as unknown as BlobPart]), filename);
  // ComfyUI's `type` is a storage target (input/temp/output), not a media MIME.
  // Passing `image`/`audio` makes the endpoint return HTTP 500 on current PVE.
  form.append('type', 'input'); form.append('overwrite', 'true');
  if (subfolder) form.append('subfolder', subfolder);
  const response = await fetch(`${baseUrl}/upload/image`, { method:'POST', body:form, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 500);
    throw new Error(`COMFY_REFERENCE_UPLOAD_${response.status}${detail ? `:${detail}` : ''}`);
  }
  const result = await response.json() as { name?: string; subfolder?: string; type?: string };
  if (!result.name) throw new Error('COMFY_REFERENCE_UPLOAD_INVALID_RESPONSE');
  return { name: result.name, subfolder: result.subfolder ?? '', type: result.type ?? type };
}

/** Give every immutable reference binding an attempt-scoped ComfyUI input path.
 * ComfyUI's upload endpoint overwrites matching names, so source basenames alone
 * are unsafe when two references come from different directories or jobs.
 */
export function comfyReferenceUploadTarget(input: {
  attemptId: string;
  assetVersionId: string;
  role: string;
  index: number;
  filename: string;
}): { filename: string; subfolder: string } {
  if (!/^[a-zA-Z0-9_-]+$/.test(input.attemptId) || !/^[a-zA-Z0-9_-]+$/.test(input.assetVersionId)) throw new Error('INVALID_COMFY_REFERENCE_ID');
  if (!Number.isSafeInteger(input.index) || input.index < 0) throw new Error('INVALID_COMFY_REFERENCE_INDEX');
  if (!input.filename || /[\\/]/.test(input.filename)) throw new Error('INVALID_REFERENCE_FILENAME');
  const extension = input.filename.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0]?.toLowerCase() ?? '';
  const stem = (extension ? input.filename.slice(0, -extension.length) : input.filename).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 72) || 'reference';
  const role = input.role.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24) || 'reference';
  return {
    filename: `qd-${input.index}-${input.assetVersionId.slice(0, 12)}-${role}-${stem}${extension}`,
    subfolder: `qwendirector_refs/${input.attemptId}`,
  };
}
