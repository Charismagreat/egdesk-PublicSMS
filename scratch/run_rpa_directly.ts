import { exec } from 'child_process';
import path from 'path';

async function runRpaDirectly() {
  console.log('🚀 Running naver_rpa_daemon.js directly via node CLI...');
  const daemonPath = path.join(process.cwd(), 'scripts', 'naver_rpa_daemon.js');
  
  const child = exec(`node "${daemonPath}"`, { cwd: process.cwd() });
  
  child.stdout?.on('data', (data) => console.log(`[RPA STDOUT] ${data.trim()}`));
  child.stderr?.on('data', (data) => console.log(`[RPA STDERR] ${data.trim()}`));
  
  child.on('exit', (code) => {
    console.log(`[RPA EXIT] Code: ${code}`);
  });
}

runRpaDirectly().catch(console.error);
