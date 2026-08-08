import { chromium } from 'playwright';

async function testPostTitleList() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const listUrl = `https://blog.naver.com/PostTitleListAsync.naver?blogId=nocodelife&viewdate=&currentPage=1&categoryNo=0&parentCategoryNo=0&countPerPage=10`;
  await page.goto(listUrl, { waitUntil: 'domcontentloaded' });
  const text = await page.evaluate(() => document.body.innerText || document.body.textContent);
  
  try {
    const data = JSON.parse(text);
    console.log('Result Code:', data.resultCode);
    console.log('Post List count:', data.postList ? data.postList.length : 0);
    if (data.postList && data.postList.length > 0) {
      console.log('Sample PostItem Keys:', Object.keys(data.postList[0]));
      console.log('Sample PostItem Full:', JSON.stringify(data.postList[0], null, 2));
    }
  } catch (e: any) {
    console.error(e.message);
  }

  await browser.close();
}

testPostTitleList().catch(console.error);
