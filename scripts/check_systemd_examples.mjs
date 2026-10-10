import { readFile } from 'node:fs/promises';

const root = new URL('../deploy/systemd/', import.meta.url);
const required = {
  'qwendirector-api.service.example': ['After=network-online.target', 'ExecStart=', 'ProtectSystem=strict', 'ProtectHome=read-only', 'ReadWritePaths=', 'TimeoutStopSec='],
  'qwendirector-worker.service.example': ['After=network-online.target qwendirector-api.service', 'ExecStart=', 'ProtectSystem=strict', 'ProtectHome=read-only', 'ReadWritePaths=', 'TimeoutStopSec='],
  'qwendirector-web.service.example': ['After=network-online.target qwendirector-api.service', 'ExecStart=', 'ProtectSystem=strict', 'ProtectHome=read-only', 'ReadWritePaths=', 'TimeoutStopSec='],
  'llama-server.service.example': ['After=network-online.target', 'ExecStart=', 'ProtectSystem=strict', 'ProtectHome=read-only', 'ReadWritePaths='],
};

for (const [file, directives] of Object.entries(required)) {
  const source = await readFile(new URL(file, root), 'utf8');
  for (const directive of directives) {
    if (!source.split('\n').some((line) => line.trim().startsWith(directive))) throw new Error(`${file}: missing ${directive}`);
  }
  if (!source.includes('[Unit]') || !source.includes('[Service]') || !source.includes('[Install]')) throw new Error(`${file}: incomplete unit sections`);
}
console.log(`OK: ${Object.keys(required).length} systemd example units pass hardening contract`);
