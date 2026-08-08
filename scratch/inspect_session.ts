import fs from 'fs';
import path from 'path';

const SESSION_FILE_PATH = path.join(process.cwd(), 'scripts', 'naver_session.json');

if (fs.existsSync(SESSION_FILE_PATH)) {
  const content = fs.readFileSync(SESSION_FILE_PATH, 'utf-8');
  console.log('--- FILE CONTENT LENGTH ---', content.length);
  try {
    const parsed = JSON.parse(content);
    console.log('--- COOKIES ---');
    (parsed.cookies || []).forEach((c: any) => {
      console.log(`Name: ${c.name}, Domain: ${c.domain}, Expires: ${c.expires} (${c.expires > 0 ? new Date(c.expires * 1000).toISOString() : 'session'})`);
    });
  } catch (e: any) {
    console.error('JSON Parse Error:', e.message);
  }
} else {
  console.log('File does NOT exist.');
}
