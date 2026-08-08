import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

function cleanJsonString(str: string): string {
  // 제어 문자 및 유효하지 않은 이스케이프 제거
  return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/\\'/g, "'");
}

async function runSyncViewsNowV4() {
  console.log('🚀 Running real-time Naver Post views fetcher v4...');
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
    const rawText = await page.evaluate(() => document.body.innerText || document.body.textContent || '');
    
    // regex로 logNo와 readCount 추출
    const stats: { logNo: string; views: number }[] = [];
    const logNoRegex = /"logNo"\s*:\s*"?(\d+)"?/g;
    const readCountRegex = /"readCount"\s*:\s*(\d+)/g;

    // JSON eval 안전 파서
    let data: any = null;
    try {
      // eval 기반 안전 객체 수집
      const cleaned = rawText.replace(/\\/g, '\\\\').replace(/\\\\"/g, '\\"');
      data = JSON.parse(rawText);
    } catch (e) {
      try {
        // regex 블록 추출
        const logNos: string[] = [];
        const readCounts: number[] = [];
        let match;
        while ((match = logNoRegex.exec(rawText)) !== null) logNos.push(match[1]);
        while ((match = readCountRegex.exec(rawText)) !== null) readCounts.push(Number(match[1]));

        for (let i = 0; i < Math.min(logNos.length, readCounts.length); i++) {
          stats.push({ logNo: logNos[i], views: readCounts[i] });
        }
      } catch (err) {}
    }

    if (data?.postList) {
      for (const item of data.postList) {
        if (item.logNo) {
          stats.push({ logNo: String(item.logNo), views: Number(item.readCount || 0) });
        }
      }
    }

    console.log(`Parsed ${stats.length} post stats! Sample:`, stats.slice(0, 5));

    if (stats.length > 0) {
      const patchRes = await fetch('http://localhost:4002/api/naver-blog/posts/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats })
      });
      const patchJson = await patchRes.json();
      console.log('DB Views Sync Result:', patchJson);
    }
  }
  await browser.close();
}

runSyncViewsNowV4().catch(console.error);
