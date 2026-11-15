const llamaUrl = process.env.QWEN_LLAMA_URL ?? 'http://127.0.0.1:8081';
const llamaKey = process.env.QWEN_LLAMA_API_KEY ?? '';
const llamaHeaders = llamaKey ? { authorization: `Bearer ${llamaKey}` } : undefined;
const targets = [
  { id: 'llama.cpp', url: llamaUrl, headers: llamaHeaders, checks: [['health', '/health'], ['models', '/v1/models']] },
  { id: 'comfyui', url: process.env.COMFYUI_URL ?? 'http://127.0.0.1:8188', checks: [['system_stats', '/system_stats']] },
];

for (const target of targets) {
  const result = { id: target.id, baseUrl: target.url, reachable: false, checks: {} };
  for (const [name, path] of target.checks) {
    try {
      const response = await fetch(target.url + path, { headers: target.headers });
      const body = await response.json();
      result.checks[name] = { ok: response.ok, status: response.status };
      if (name === 'models') result.models = (body.data ?? body.models ?? []).map((m) => m.id ?? m.name ?? m.model);
      if (name === 'health' && target.id === 'llama.cpp') result.backendVersion = body.service ?? 'llama.cpp';
      if (name === 'system_stats') { result.backendVersion = body.system?.comfyui_version; result.devices = body.devices?.map((d) => ({ name: d.name, vramTotal: d.vram_total, vramFree: d.vram_free })); }
      result.reachable ||= response.ok;
    } catch (error) { result.checks[name] = { ok: false, error: error.code ?? error.message }; }
  }
  console.log(JSON.stringify(result));
}
