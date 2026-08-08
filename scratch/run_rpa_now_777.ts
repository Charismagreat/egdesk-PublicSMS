import { queryTable } from '../egdesk-helpers';
import { exec } from 'child_process';
import path from 'path';

async function runRpaNow777() {
  console.log('🚀 Running RPA Automation for Post ID 8 (777)...');
  
  // 1. ID 8 레코드 확인
  const res = await queryTable('crm_naver_blog_posts', { filters: { id: '8' } });
  const post = res.rows[0];
  console.log('Target Post:', post);

  if (!post) {
    console.error('Post 8 not found');
    return;
  }

  // 2. RPA 데몬 실행
  const daemonPath = path.join(process.cwd(), 'scripts', 'naver_rpa_daemon.js');
  const nodePath = process.execPath;
  const cmd = `"${nodePath}" "${daemonPath}"`;

  console.log('Running RPA Daemon directly:', cmd);
  exec(cmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
    console.log('RPA stdout:', stdout);
    if (stderr) console.error('RPA stderr:', stderr);
  });
}

runRpaNow777().catch(console.error);
