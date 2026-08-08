import { chromium } from 'playwright';

async function testPostTitleListV2() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // 네이버 모바일 블로그 글목록 또는 PC 글목록 진입
  console.log('Navigating to blog list page...');
  await page.goto('https://blog.naver.com/PostTitleListAsync.naver?blogId=nocodelife&viewdate=&currentPage=1&categoryNo=0&parentCategoryNo=0&countPerPage=50');
  
  const content = await page.content();
  console.log('Content length:', content.length);
  
  // readCount 추출
  const matches = [...content.matchAll(/"logNo"\s*:\s*"?(\d+)"?[\s\S]*?"readCount"\s*:\s*(\d+)/g)];
  console.log('Regex Matches:', matches.length);
  
  const stats = [];
  for (const m of matches) {
    stats.push({ logNo: m[1], views: Number(m[2]) });
  }

  // 또 다른 regex 패턴
  const matches2 = [...content.matchAll(/"logNo"\s*:\s*"?(\d+)"?/g)];
  const matches3 = [...content.matchAll(/"readCount"\s*:\s*(\d+)/g)];
  console.log('LogNo matches:', matches2.length, 'ReadCount matches:', matches3.length);

  for (let i = 0; i < Math.min(matches2.length, matches3.length); i++) {
    stats.push({ logNo: matches2[i][1], views: Number(matches3[i][1]) });
  }

  console.log('Final Stats Sample:', stats.slice(0, 10));

  if (stats.length > 0) {
    const patchRes = await fetch('http://localhost:4002/api/naver-blog/posts/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stats })
    });
    console.log('Patch Status:', patchRes.status, await patchRes.json());
  }

  await browser.close();
}

testPostTitleListV2().catch(console.error);
