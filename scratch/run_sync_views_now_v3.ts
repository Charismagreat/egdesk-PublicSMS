import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function runSyncViewsNow() {
  console.log('🚀 Running real-time Naver Post views fetcher...');
  const blogId = 'nocodelife';
  const sessionPath = path.join(process.cwd(), 'scripts', 'naver_session.json');

  const browser = await chromium.launch({ headless: true });
  const context = fs.existsSync(sessionPath)
    ? await browser.newContext({ storageState: sessionPath })
    : await browser.newContext();

  const page = await context.newPage();
  const listUrl = `https://blog.naver.com/PostTitleListAsync.naver?blogId=${blogId}&viewdate=&currentPage=1&categoryNo=0&parentCategoryNo=0&countPerPage=50`;
  
  console.log(`Fetching ${listUrl}...`);
  const res = await page.goto(listUrl, { waitUntil: 'domcontentloaded' });
  if (res && res.ok()) {
    const jsonText = await page.evaluate(() => document.body.innerText || document.body.textContent);
    try {
      const data = JSON.parse(jsonText || '{}');
      const postList = data.postList || [];
      console.log(`Found ${postList.length} posts in Naver Title List!`);

      const stats = postList.map((item: any) => ({
        logNo: String(item.logNo),
        views: Number(item.readCount || item.hit || 0)
      }));

      console.log('Parsed stats count:', stats.length);
      
      const patchRes = await fetch('http://localhost:4002/api/naver-blog/posts/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats })
      });
      const patchJson = await patchRes.json();
      console.log('Update result:', patchJson);
    } catch (e: any) {
      console.error('JSON parse error:', e.message);
    }
  }
  await browser.close();
}

runSyncViewsNow().catch(console.error);
