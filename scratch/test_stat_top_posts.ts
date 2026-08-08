import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function testStatTopPosts() {
  console.log('🔍 Fetching Naver blog stat top posts with session...');
  const blogId = 'nocodelife';
  const sessionPath = path.join(process.cwd(), 'scripts', 'naver_session.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: sessionPath });
  const page = await context.newPage();

  // 1. 관리자 통계 페이지 진입
  await page.goto(`https://admin.blog.naver.com/AdminMain.naver?blogId=${blogId}`, { waitUntil: 'domcontentloaded' });
  
  // 2. NBlogStatStatTimeTopPost.naver 또는 stat.blog.naver.com API 호출
  const statUrl = `https://blog.naver.com/NBlogStatStatTimeTopPost.naver?blogId=${blogId}`;
  console.log('Fetching:', statUrl);
  const res = await page.goto(statUrl);
  const text = await page.evaluate(() => document.body.innerText || document.body.textContent || '');

  console.log('Stat Response Length:', text.length);
  console.log('Stat Content Snippet:', text.slice(0, 500));

  // 3. stat.blog.naver.com/stat/post API 호출
  const statUrl2 = `https://stat.blog.naver.com/api/v1/stat/views/posts?blogId=${blogId}`;
  const res2 = await page.goto(statUrl2).catch(() => null);
  if (res2) {
    const text2 = await page.evaluate(() => document.body.innerText || document.body.textContent || '');
    console.log('Stat2 Response Snippet:', text2.slice(0, 500));
  }

  await browser.close();
}

testStatTopPosts().catch(console.error);
