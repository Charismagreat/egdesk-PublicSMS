const { chromium } = require('playwright');

async function testScrape() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log("Navigating to Bizinfo...");
    await page.goto("https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do", { waitUntil: 'networkidle' });
    
    // 테이블 내 행(tr) 요소가 있는지 검사
    const rows = await page.$$("table tbody tr");
    console.log(`Found ${rows.length} rows`);
    
    for (let i = 1; i < Math.min(rows.length, 6); i++) {
      const text = await rows[i].innerText();
      const linkEl = await rows[i].$("a");
      const href = linkEl ? await linkEl.getAttribute("href") : "No Link";
      console.log(`Row ${i}:`, text.replace(/\s+/g, ' '), " | Link:", href);
    }
  } catch (err) {
    console.error("Scraping failed:", err);
  } finally {
    await browser.close();
  }
}

testScrape();
