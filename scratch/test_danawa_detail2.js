const fs = require('fs');

function parseDanawaDetail(html) {
  // list-item들을 추출
  const itemRegex = /<li[^>]*class="[^"]*list-item[^"]*"[\s\S]*?<\/li>/g;
  const matches = html.match(itemRegex) || [];
  console.log(`Found ${matches.length} list-items.`);

  const products = [];
  for (const itemHtml of matches) {
    // 1. URL 추출 (loadingBridge.html)
    const urlMatch = itemHtml.match(/href="([^"]*bridge\/loadingBridge\.html[^"]*)"/);
    if (!urlMatch) continue;

    const url = urlMatch[1].replace(/&amp;/g, '&');

    // 2. 쇼핑몰 이름 추출
    // a. 이미지 alt 우선 (쌍따옴표와 외따옴표 모두 처리)
    const imgAltMatch = itemHtml.match(/<img[^>]*alt=['"]([^'"]*)['"]/);
    // b. 텍스트 로고 대체
    const textLogoMatch = itemHtml.match(/class=['"]text__logo['"][^>]*>([^<]*)<\/span>/) ||
                          itemHtml.match(/aria-label=['"]([^'"]*)['"][^>]*class=['"]text__logo['"]/) ||
                          itemHtml.match(/class=['"]text__logo['"][^>]*aria-label=['"]([^'"]*)['"]/);

    let mallName = '';
    if (imgAltMatch && imgAltMatch[1]) {
      mallName = imgAltMatch[1].trim();
    } else if (textLogoMatch && textLogoMatch[1]) {
      mallName = textLogoMatch[1].trim();
    } else {
      mallName = '기타 판매처';
    }

    // 3. 가격 추출
    const priceMatch = itemHtml.match(/class="text__num">([^<]*)<\/span>/);
    const price = priceMatch ? parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10) : 0;

    products.push({
      mallName,
      url,
      price
    });
  }

  return products;
}

try {
  const html = fs.readFileSync('c:\\dev\\egdesk-FreeSMS\\scratch\\danawa_html.html', 'utf8');
  const products = parseDanawaDetail(html);
  console.log('Parsed Products:', products.slice(0, 5));
} catch (err) {
  console.error('Error:', err);
}
