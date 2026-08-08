import { chromium } from 'playwright';

async function testRpaViewsFetch() {
  const naverBlogId = 'nocodelife';
  console.log(`🚀 Launching Playwright to test Naver Blog Stat & Views fetch for ${naverBlogId}...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Test 1: PostTitleListAsync
  const listUrl = `https://blog.naver.com/PostTitleListAsync.naver?blogId=${naverBlogId}&viewdate=&currentPage=1&categoryNo=0&parentCategoryNo=0&countPerPage=30`;
  console.log(`Fetching: ${listUrl}`);
  try {
    const res = await page.goto(listUrl, { waitUntil: 'domcontentloaded' });
    const text = await page.content();
    console.log('PostTitleListAsync Response snippet:', text.slice(0, 500));
  } catch (e: any) {
    console.error(e.message);
  }

  // Test 2: Admin Stat Async
  const statUrl = `https://admin.blog.naver.com/NBlogStatAsync.naver?blogId=${naverBlogId}`;
  console.log(`\nFetching Stat URL: ${statUrl}`);
  try {
    const res = await page.goto(statUrl, { waitUntil: 'domcontentloaded' });
    const text = await page.content();
    console.log('Stat Response snippet:', text.slice(0, 500));
  } catch (e: any) {
    console.error(e.message);
  }

  await browser.close();
}

testRpaViewsFetch().catch(console.error);
