const targets = [
  { id: 'llama.cpp', url: 'http://127.0.0.1:8081', checks: [['health', '/health'], ['models', '/v1/models']] },
  { id: 'comfyui', url: 'http://192.168.10.103:8188', checks: [['system_stats', '/system_stats']] },
];

for (const target of targets) {
  const result = { id: target.id, baseUrl: target.url, reachable: false, checks: {} };
  for (const [name, path] of target.checks) {
    try {
      const response = await fetch(target.url + path);
      const body = await response.json();
      result.checks[name] = { ok: response.ok, status: response.status };
      if (name === 'models') result.models = (body.data ?? body.models ?? []).map((m) => m.id ?? m.name ?? m.model);
      if (name === 'system_stats') { result.backendVersion = body.system?.comfyui_version; result.devices = body.devices?.map((d) => ({ name: d.name, vramTotal: d.vram_total, vramFree: d.vram_free })); }
      result.reachable ||= response.ok;
    } catch (error) { result.checks[name] = { ok: false, error: error.code ?? error.message }; }
  }
  console.log(JSON.stringify(result));
}
