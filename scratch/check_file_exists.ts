import fs from 'fs';
import path from 'path';

const sessionPath = path.join(process.cwd(), 'scripts', 'naver_session.json');
console.log('Session file exists?', fs.existsSync(sessionPath));
if (fs.existsSync(sessionPath)) {
  const content = fs.readFileSync(sessionPath, 'utf-8');
  console.log('Content length:', content.length);
}
