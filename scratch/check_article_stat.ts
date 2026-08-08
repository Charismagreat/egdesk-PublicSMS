import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function checkArticleStat() {
  console.log('🔍 Navigating to Naver Blog Article Stat Page...');
  const targetUrl = 'https://blog.stat.naver.com/blog/article/224369240422/cv';
  const sessionPath = path.join(process.cwd(), 'scripts', 'naver_session.json');

  const browser = await chromium.launch({ headless: true });
  const context = fs.existsSync(sessionPath)
    ? await browser.newContext({ storageState: sessionPath })
    : await browser.newContext();

  const page = await context.newPage();

  // XHR 응답 수집
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('api') || url.includes('stat') || url.includes('views') || url.includes('count') || url.includes('cv')) {
      try {
        const text = await res.text();
        console.log(`\n🌐 XHR RES (${res.status()}): ${url.slice(0, 120)}`);
        console.log('  Payload:', text.slice(0, 400));
      } catch (e) {}
    }
  });

  console.log(`Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(4000);

  const title = await page.title();
  console.log('Page Title:', title);

  const text = await page.evaluate(() => document.body.innerText || document.body.textContent || '');
  console.log('\n📄 Rendered Text Snippet (0~1000):');
  console.log(text.slice(0, 1000));

  await browser.close();
}

checkArticleStat().catch(console.error);
