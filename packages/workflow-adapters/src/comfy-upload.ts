export async function uploadComfyReference(baseUrl: string, content: Uint8Array, filename: string, type: 'image' | 'audio' = 'image'): Promise<{ name: string; subfolder: string; type: string }> {
  if (!filename || /[\\/]/.test(filename)) throw new Error('INVALID_REFERENCE_FILENAME');
  const form = new FormData(); form.append('image', new Blob([content as unknown as BlobPart]), filename);
  // ComfyUI's `type` is a storage target (input/temp/output), not a media MIME.
  // Passing `image`/`audio` makes the endpoint return HTTP 500 on current PVE.
  form.append('type', 'input'); form.append('overwrite', 'true');
  const response = await fetch(`${baseUrl}/upload/image`, { method:'POST', body:form, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 500);
    throw new Error(`COMFY_REFERENCE_UPLOAD_${response.status}${detail ? `:${detail}` : ''}`);
  }
  const result = await response.json() as { name?: string; subfolder?: string; type?: string };
  if (!result.name) throw new Error('COMFY_REFERENCE_UPLOAD_INVALID_RESPONSE');
  return { name: result.name, subfolder: result.subfolder ?? '', type: result.type ?? type };
}
