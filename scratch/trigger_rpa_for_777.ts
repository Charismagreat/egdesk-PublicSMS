import { exec } from 'child_process';
import path from 'path';

async function triggerRpaFor777() {
  console.log('🚀 Triggering RPA daemon for pending post ID 8 (777)...');
  const daemonPath = path.join(process.cwd(), 'scripts', 'naver_rpa_daemon.js');
  const nodePath = process.execPath;
  
  // Windows start command execution
  const cmd = `start "" /min "${nodePath}" "${daemonPath}"`;
  console.log('Executing command:', cmd);

  exec(cmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
    if (err) {
      console.error('Exec error:', err);
    } else {
      console.log('RPA daemon started successfully!');
    }
  });
}

triggerRpaFor777().catch(console.error);
