async function scanHtmlKeywords() {
  const blogId = 'nocodelife';
  const logNo = '224368717102';
  const targetUrl = `https://m.blog.naver.com/${blogId}/${logNo}`;

  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const html = await res.text();
  console.log('HTML Preview (first 1000 chars):', html.slice(0, 1000));
  
  // count, sympathy, like, view 관련 문자열 라인 출력
  const lines = html.split('\n').filter(l => l.includes('count') || l.includes('sympathy') || l.includes('like') || l.includes('공감') || l.includes('조회'));
  console.log(`Found ${lines.length} matching lines.`);
  lines.slice(0, 15).forEach((l, i) => console.log(`[Line ${i}]`, l.trim()));
}

scanHtmlKeywords().catch(console.error);
