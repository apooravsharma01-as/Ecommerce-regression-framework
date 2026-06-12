#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const ROOT_DIR =
    path.resolve(__dirname, '..');

function run(command, args, cwd) {
  return spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
}

const api = run(
  process.execPath,
  [path.join(ROOT_DIR, 'server/dashboardServer.js')],
  ROOT_DIR
);

const ui = run(
  'npm',
  ['run', 'dev'],
  path.join(ROOT_DIR, 'dashboard')
);

function shutdown() {
  api.kill();
  ui.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

api.on('exit', (code) => {
  if (code) {
    ui.kill();
    process.exit(code);
  }
});

ui.on('exit', (code) => {
  if (code) {
    api.kill();
    process.exit(code);
  }
});

console.log('\n🚀 Dashboard starting...');
console.log('   UI:  http://localhost:5173 (or 5174 if port busy)');
console.log('   API: http://localhost:3847');
console.log('   If you see JSON errors, restart with Ctrl+C then npm run dashboard\n');
