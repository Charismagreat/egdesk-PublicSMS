import { chromium } from 'playwright';

async function inspectJsonRaw() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://blog.naver.com/PostTitleListAsync.naver?blogId=nocodelife&viewdate=&currentPage=1&categoryNo=0&parentCategoryNo=0&countPerPage=50');
  const text = await page.evaluate(() => document.body.innerText || document.body.textContent || '');
  console.log('Raw text slice 0~500:');
  console.log(text.slice(0, 500));
  await browser.close();
}

inspectJsonRaw().catch(console.error);
