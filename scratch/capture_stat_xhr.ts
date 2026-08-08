import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function captureStatXhr() {
  console.log('🔍 Capturing stat.blog.naver.com XHR requests...');
  const blogId = 'nocodelife';
  const sessionPath = path.join(process.cwd(), 'scripts', 'naver_session.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: sessionPath });
  const page = await context.newPage();

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('stat') || url.includes('api') || url.includes('json') || url.includes('post')) {
      console.log('📡 REQ:', url);
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('stat') || url.includes('api') || url.includes('views') || url.includes('read')) {
      try {
        const text = await res.text();
        console.log(`\n📥 RES (${res.status()}): ${url}`);
        console.log('Data:', text.slice(0, 300));
      } catch (e) {}
    }
  });

  console.log('Navigating to stat.blog.naver.com...');
  await page.goto(`https://stat.blog.naver.com/stat/post/time?blogId=${blogId}`, { waitUntil: 'networkidle' }).catch(() => {});
  
  await page.waitForTimeout(4000);
  await browser.close();
}

captureStatXhr().catch(console.error);
