const { chromium } = require('playwright');

const query = "사조해표 콩기름 식용유";
const cleanSpec = "500ml 1개";
const searchUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query + (cleanSpec ? ' ' + cleanSpec : ''))}`;

async function testPlaywright() {
  console.log(`📡 [Test-Playwright] Playwright 크롤러 구동 시작 ➡️ ${searchUrl}`);
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--use-fake-device-for-media-stream',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      viewport: { width: 390, height: 844 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      extraHTTPHeaders: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'ko,en-US;q=0.9,en;q=0.8',
      }
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log("Connecting page...");
    const res = await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log(`Response status: ${res.status()}`);
    
    await page.waitForTimeout(2000);

    const html = await page.content();
    console.log(`HTML Length: ${html.length}`);

    // __NEXT_DATA__ 파싱 테스트
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch && nextDataMatch[1]) {
      console.log("🎉 __NEXT_DATA__ JSON 발견!");
      const jsonData = JSON.parse(nextDataMatch[1]);
      const products = jsonData.props?.pageProps?.initialState?.products?.list || 
                       jsonData.props?.pageProps?.initialProps?.initialState?.products?.list || [];
      console.log(`Products Count: ${products.length}`);
      products.slice(0, 3).forEach((p, idx) => {
        const item = p.item || p;
        console.log(`Product ${idx + 1}: ${item.productName || item.title} - Price: ${item.price || item.lowPrice}`);
      });
    } else {
      console.log("⚠️ __NEXT_DATA__ JSON 매치 실패!");
    }

  } catch (err) {
    console.error("Playwright Error:", err);
  } finally {
    if (browser) await browser.close();
  }
}

testPlaywright();
