import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function scanRealStatApi() {
  console.log('🔍 Scanning Naver blog stat endpoints with session...');
  const blogId = 'nocodelife';
  const sessionPath = path.join(process.cwd(), 'scripts', 'naver_session.json');

  const browser = await chromium.launch({ headless: true });
  const context = fs.existsSync(sessionPath)
    ? await browser.newContext({ storageState: sessionPath })
    : await browser.newContext();

  const page = await context.newPage();

  // 네트워크 요청 감지
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('stat') || url.includes('count') || url.includes('views') || url.includes('read')) {
      try {
        const text = await res.text();
        if (text.length > 20 && text.includes('log') || text.includes('view') || text.includes('count')) {
          console.log(`\n🌐 Captured Response from: ${url.slice(0, 100)}`);
          console.log('Snippet:', text.slice(0, 300));
        }
      } catch (e) {}
    }
  });

  console.log('Navigating to stat.blog.naver.com...');
  await page.goto(`https://stat.blog.naver.com/stat/post/time?blogId=${blogId}`, { waitUntil: 'networkidle' }).catch(() => {});

  await page.waitForTimeout(3000);
  await browser.close();
}

scanRealStatApi().catch(console.error);
