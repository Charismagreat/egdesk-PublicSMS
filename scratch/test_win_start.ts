import { exec } from 'child_process';
import path from 'path';

async function testWinStart() {
  console.log('Testing exact Windows start command...');
  const daemonScriptPath = path.join(process.cwd(), 'scripts', 'naver_rpa_daemon.js');
  const nodeExe = process.execPath;
  
  const cmd = `start "EGDesk Naver RPA" "${nodeExe}" "${daemonScriptPath}"`;
  console.log('Command:', cmd);
  
  exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
    if (error) {
      console.error('Exec Error:', error.message);
    } else {
      console.log('Successfully launched start command!');
    }
  });
}

testWinStart().catch(console.error);
