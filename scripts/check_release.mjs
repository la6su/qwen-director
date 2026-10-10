import { spawn } from 'node:child_process';

const steps = [
  ['typecheck', ['run', '-s', 'typecheck']],
  ['web-build', ['run', '-s', 'build:web']],
  ['migration-gate', ['run', '-s', 'check:migrations']],
  ['domain-contract', ['run', '-s', 'check:domain']],
  ['skeleton-contract', ['run', '-s', 'check:skeleton']],
  ['api-bind-guard', ['run', '-s', 'smoke:api-bind-guard']],
  ['web-proxy', ['run', '-s', 'smoke:web-proxy']],
  ['systemd-hardening', ['run', '-s', 'check:systemd']],
];

for (const [name, args] of steps) {
  console.log(`== ${name} ==`);
  await new Promise((resolve, reject) => {
    const child = spawn('npm', args, { stdio: 'inherit', env: process.env });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${name} failed (${code})`)));
  });
}
console.log('OK: release checks passed');
