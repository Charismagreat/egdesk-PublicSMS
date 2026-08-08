async function scanRealViewsScraper() {
  console.log('🔍 Scanning mobile blog HTML for view/read count regex...');
  const blogId = 'nocodelife';
  const logNo = '224369254959'; // 최근 게재 성공 포스트 logNo

  const mUrl = `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
  console.log(`Fetching ${mUrl}...`);

  const res = await fetch(mUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    }
  });

  const html = await res.text();
  console.log('HTML Length:', html.length);

  // views, read, count, stat 키워드 근처 텍스트 매칭 조사
  const viewMatches = [...html.matchAll(/(view|read|hit|stat|count)[^"'\n]{0,30}[:=]\s*"?(\d+)"?/gi)];
  console.log('View Keyword Matches count:', viewMatches.length);
  for (const m of viewMatches.slice(0, 20)) {
    console.log(`Match: key=${m[1]}, val=${m[2]} | context: ${m[0]}`);
  }

  // Naver Mobile Blog Stats / Counter API 조사
  const statApiUrl = `https://m.blog.naver.com/api/blogs/${blogId}/posts/${logNo}/counter`;
  console.log(`Fetching ${statApiUrl}...`);
  const statRes = await fetch(statApiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      'Referer': mUrl
    }
  }).catch(() => null);

  if (statRes) {
    console.log('Stat API Status:', statRes.status);
    console.log('Stat API Response:', await statRes.text().catch(() => ''));
  }
}

scanRealViewsScraper().catch(console.error);
