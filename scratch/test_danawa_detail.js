// Using global fetch in Node.js 24

async function testDanawaDetail(productId) {
  const url = `https://prod.danawa.com/info/?pcode=${productId}`;
  console.log(`Fetching: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!res.ok) {
      console.log(`Failed to fetch. Status: ${res.status}`);
      return;
    }

    const html = await res.text();
    console.log(`HTML Length: ${html.length}`);

    // 최저가 목록 영역 파싱 시도
    // 다나와의 최저가 비교 HTML 영역은 보통 diff_lst, lwst_lst, 혹은 tbl_lst 클래스를 가집니다.
    // 1. onclick="goLink( 또는 goProduct( 등의 호출을 정규식으로 찾아봅니다.
    // 예: href="http://prod.danawa.com/bridge/goProduct.php?c_mall=..."
    // 예: <img src="..." alt="쿠팡"> 또는 <span class="mall_name">쿠팡</span>
    
    // a. 1순위 최저가 행이나 몰 정보 탐색
    // 정규식으로 goProduct.php 링크나 c_mall이 들어간 링크 매칭
    const bridgeRegex = /href="([^"]*bridge\/goProduct\.php[^"]*)"/g;
    const bridgeMatches = [];
    let match;
    while ((match = bridgeRegex.exec(html)) !== null) {
      bridgeMatches.push(match[1]);
    }
    console.log(`Found bridge URLs:`, bridgeMatches.slice(0, 5));

    const communityRegex = /href="([^"]*community\.php\?[^"]*c_mall=[^"]*)"/g;
    const communityMatches = [];
    while ((match = communityRegex.exec(html)) !== null) {
      communityMatches.push(match[1]);
    }
    console.log(`Found community URLs:`, communityMatches.slice(0, 5));

    // 최저가 테이블 행을 더 잘 탐색하기 위해 정규식으로 tr 이나 li 패턴 추출
    // <tr class="lowest_row" 또는 <li class="lowest_row" 등등
    // 다나와 쇼핑몰 리스트 매칭 예시:
    // <a class="link" href="..." target="_blank" onclick="...">
    //   <img src="..." alt="쿠팡">
    // </a>
    // <span class="price"><em class="num">1,920</em>원</span>

    // 상세 분석을 위해 html의 일부를 파일에 저장해보겠습니다.
    const fs = require('fs');
    fs.writeFileSync('c:\\dev\\egdesk-FreeSMS\\scratch\\danawa_html.html', html, 'utf8');
    console.log('Saved HTML to danawa_html.html');
  } catch (err) {
    console.error('Error:', err);
  }
}

testDanawaDetail('61830194');
