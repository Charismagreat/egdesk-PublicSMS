import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function fetchRealNaverStats() {
  console.log('🔍 Testing real Naver blog owner stats page fetching...');
  const blogId = 'nocodelife';
  const sessionPath = path.join(process.cwd(), 'scripts', 'naver_session.json');

  const browser = await chromium.launch({ headless: true });
  const context = fs.existsSync(sessionPath)
    ? await browser.newContext({ storageState: sessionPath })
    : await browser.newContext();

  const page = await context.newPage();

  // 1. 네이버 메인 또는 통계 페이지 방문
  console.log('Navigating to Naver Admin Post List...');
  await page.goto(`https://blog.naver.com/PostList.naver?blogId=${blogId}`, { waitUntil: 'domcontentloaded' });
  
  // 2. 글관리/통계페이지 접근
  const statUrl = `https://blog.naver.com/PostTitleListAsync.naver?blogId=${blogId}&viewdate=&currentPage=1&categoryNo=0&parentCategoryNo=0&countPerPage=50`;
  const res = await page.goto(statUrl);
  const text = await page.evaluate(() => document.body.innerText || document.body.textContent || '');

  console.log('Response text length:', text.length);
  console.log('Text snippet:', text.slice(0, 400));

  // 네이버 통계 센터(stat.blog.naver.com) URL 시도
  console.log('Navigating to stat.blog.naver.com...');
  await page.goto(`https://stat.blog.naver.com/stat/post/time?blogId=${blogId}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  const statText = await page.evaluate(() => document.body.innerText || document.body.textContent || '').catch(() => '');
  console.log('Stat text snippet:', statText.slice(0, 400));

  await browser.close();
}

fetchRealNaverStats().catch(console.error);
