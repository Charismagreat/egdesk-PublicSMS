const query = "사조해표 콩기름 식용유";
const cleanSpec = "500ml 1개";
const searchUrl = `https://search.danawa.com/dsearch.php?query=${encodeURIComponent(query + (cleanSpec ? ' ' + cleanSpec : ''))}`;

async function testFetch() {
  console.log(`📡 [Test-Fetch] 다나와 가격비교 fetch 시작: ${searchUrl}`);
  try {
    const fetchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    console.log(`Response Status: ${fetchRes.status}`);
    if (fetchRes.ok) {
      const html = await fetchRes.text();
      console.log(`HTML Length: ${html.length}`);
      
      // 다나와 상품 아이템 매칭 정규식
      // <li class="prod_item" id="productItem12345"> ... </li> 구조를 잡습니다.
      const itemRegex = /<li[^>]*class="[^"]*prod_item[^"]*"[\s\S]*?<\/li>/g;
      const matches = html.match(itemRegex) || [];
      console.log(`포착된 상품 매칭 개수: ${matches.length}`);

      const itemRegex = /<li[^>]*class="[^"]*prod_item[^"]*"[\s\S]*?<\/li>/g;
      const matches = html.match(itemRegex) || [];
      console.log(`포착된 상품 매칭 개수: ${matches.length}`);

      const results = [];
      matches.slice(0, 3).forEach((itemHtml, idx) => {
        // 1. productId 및 최저가 추출 (숨겨진 input)
        const priceMatch = itemHtml.match(/id="min_price_(\d+)"\s+value="(\d+)"/);
        
        // 2. 썸네일 이미지의 alt 속성에서 상품 설명/타이틀 추출
        const imgAltMatch = itemHtml.match(/<img[^>]*alt="([^"]*)"/);

        if (priceMatch) {
          const productId = priceMatch[1];
          const price = parseInt(priceMatch[2], 10) || 0;
          const url = `https://prod.danawa.com/info/?pcode=${productId}`;
          
          let title = imgAltMatch ? imgAltMatch[1].trim() : `${query} ${cleanSpec}`;
          // 타이틀에 '식용유 500ml' 처럼 간략히 들어가 있다면 원래 쿼리명을 섞어서 고도화
          if (title.length < 5) {
            title = `${query} (${title})`;
          }

          console.log(`[Product ${idx + 1}] Title: ${title} | Price: ${price} | URL: ${url}`);
          results.push({ title, url, price, mallName: '다나와 최저가망' });
        }
      });
    } else {
      console.log("Fetch failed!");
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testFetch();
