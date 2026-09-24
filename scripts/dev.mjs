import { spawn } from 'node:child_process';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const tasks = [
  ['API', ['run', 'dev', '-w', 'server']],
  ['REACT', ['run', 'dev', '-w', 'client']],
];
const children = tasks.map(([label, args]) => {
  const child = spawn(npm, args, { cwd: process.cwd(), shell: process.platform === 'win32', stdio: ['inherit', 'pipe', 'pipe'] });
  child.stdout.on('data', chunk => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on('data', chunk => process.stderr.write(`[${label}] ${chunk}`));
  return child;
});
let closing = false;
function shutdown(signal = 'SIGTERM') {
  if (closing) return;
  closing = true;
  for (const child of children) if (child.pid) child.kill(signal);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
for (const child of children) child.on('error', error => { console.error(error); shutdown(); process.exitCode = 1; });
