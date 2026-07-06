const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/products');
  
  // Wait for the table to load
  await page.waitForSelector('table');
  
  // Check main scroll
  const mainScroll = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      scrollHeight: main.scrollHeight,
      clientHeight: main.clientHeight,
      isScrollable: main.scrollHeight > main.clientHeight,
      overflowY: window.getComputedStyle(main).overflowY
    };
  });
  
  const bodyScroll = await page.evaluate(() => {
    return {
      scrollHeight: document.body.scrollHeight,
      clientHeight: document.body.clientHeight,
      overflowY: window.getComputedStyle(document.body).overflowY
    };
  });
  
  console.log('Main:', mainScroll);
  console.log('Body:', bodyScroll);
  
  await browser.close();
})();
