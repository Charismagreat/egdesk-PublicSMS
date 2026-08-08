async function testSympathyHistory() {
  const blogId = 'nocodelife';
  const logNo = '224369177255';
  
  const url = `https://blog.naver.com/SympathyHistoryList.naver?blogId=${blogId}&logNo=${logNo}`;
  console.log(`Fetching Sympathy History: ${url}`);
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': `https://blog.naver.com/${blogId}/${logNo}`
    }
  });
  
  const html = await res.text();
  console.log('--- Full HTML Output ---');
  console.log(html);
  
  // 파싱 시도
  const countMatch = html.match(/공감\s*<em>\(?(\d+)\)?<\/em>/i) || 
                     html.match(/<em[^>]*class="[^"]*count[^"]*"[^>]*>(\d+)<\/em>/i) ||
                     html.match(/sympathy_count["']?\s*:\s*(\d+)/i) ||
                     html.match(/totalCount\s*=\s*(\d+)/i);
  console.log('\nParsed Count Match:', countMatch ? countMatch[1] : 'Not Found');
  
  // <li> 태그 개수 (공감 누른 사람 수)
  const liMatches = html.match(/<li[^>]*>/gi);
  console.log('Total <li> elements count:', liMatches ? liMatches.length : 0);
}

testSympathyHistory().catch(console.error);
