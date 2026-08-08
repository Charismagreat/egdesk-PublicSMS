import { exec } from 'child_process';
import path from 'path';

async function triggerRpaDaemonNow() {
  console.log('🚀 Triggering RPA daemon for pending 7:45 post (ID 10)...');
  const daemonPath = path.join(process.cwd(), 'scripts', 'naver_rpa_daemon.js');
  const nodePath = process.execPath;
  
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

triggerRpaDaemonNow().catch(console.error);
