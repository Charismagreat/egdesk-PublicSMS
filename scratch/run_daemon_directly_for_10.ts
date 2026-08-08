import { exec } from 'child_process';
import path from 'path';

async function runDaemonDirectlyFor10() {
  console.log('🚀 Running RPA Daemon in foreground to log execution for Post 10...');
  const daemonPath = path.join(process.cwd(), 'scripts', 'naver_rpa_daemon.js');
  const nodePath = process.execPath;

  const child = exec(`"${nodePath}" "${daemonPath}"`, { cwd: process.cwd() });

  child.stdout?.on('data', (data) => console.log('[RPA Daemon]', data.toString()));
  child.stderr?.on('data', (data) => console.error('[RPA Daemon Err]', data.toString()));

  child.on('exit', (code) => console.log(`RPA Daemon exited with code ${code}`));
}

runDaemonDirectlyFor10().catch(console.error);
