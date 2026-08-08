import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function scanRealStatV2() {
  console.log('🔍 Scanning admin pages with session...');
  const blogId = 'nocodelife';
  const sessionPath = path.join(process.cwd(), 'scripts', 'naver_session.json');

  const browser = await chromium.launch({ headless: true });
  const context = fs.existsSync(sessionPath)
    ? await browser.newContext({ storageState: sessionPath })
    : await browser.newContext();

  const page = await context.newPage();

  console.log('Navigating to AdminMain.naver...');
  await page.goto(`https://admin.blog.naver.com/AdminMain.naver?blogId=${blogId}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  
  const title = await page.title();
  console.log('Admin Page Title:', title);

  const bodyText = await page.evaluate(() => document.body.innerText || '');
  console.log('Body snippet:', bodyText.slice(0, 300));

  await browser.close();
}

scanRealStatV2().catch(console.error);
