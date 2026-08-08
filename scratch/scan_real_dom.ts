import { chromium } from 'playwright';

async function scanRealDom() {
  console.log('🔍 Launching browser to scan m.blog.naver.com real rendered DOM...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('api') || url.includes('json') || url.includes('stat') || url.includes('count') || url.includes('view')) {
      try {
        const text = await res.text();
        if (text.includes('224369254959') || text.includes('read') || text.includes('view') || text.includes('count')) {
          console.log(`\n🌐 XHR RES (${res.status()}): ${url.slice(0, 120)}`);
          console.log('  Payload:', text.slice(0, 300));
        }
      } catch (e) {}
    }
  });

  await page.goto('https://m.blog.naver.com/nocodelife/224369254959', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(3000);
  const text = await page.evaluate(() => document.body.innerText || '');
  console.log('\n📄 Rendered DOM text snippet:');
  console.log(text.slice(0, 500));

  await browser.close();
}

scanRealDom().catch(console.error);
