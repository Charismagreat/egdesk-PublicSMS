async function testNaverMetricsFetch() {
  const blogId = 'nocodelife';
  const logNo = '224368717102';
  const targetUrl = `https://m.blog.naver.com/${blogId}/${logNo}`;

  console.log('📡 네이버 모바일 블로그 포스트 HTML을 가져옵니다:', targetUrl);
  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    }
  });

  const html = await res.text();
  console.log('HTML Length:', html.length);

  // 공감수 / 조회수 관련 키워드 탐색
  const likeMatch = html.match(/"sympathyCount"\s*:\s*(\d+)/i) || html.match(/u_cnt font_pretendard">(\d+)<\/span>/i) || html.match(/공감\s*(\d+)/i);
  console.log('Like Match:', likeMatch ? likeMatch[1] : 'Not Found');

  // 네이버 공감 전용 API 테스트
  const sympathyUrl = `https://m.blog.naver.com/SympathyHistoryList.naver?blogId=${blogId}&logNo=${logNo}`;
  const sympathyRes = await fetch(sympathyUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
    }
  }).catch(() => null);

  if (sympathyRes && sympathyRes.ok) {
    const sHtml = await sympathyRes.text();
    console.log('Sympathy HTML Length:', sHtml.length);
    const sMatch = sHtml.match(/<span[^>]*class="[^"]*cnt[^"]*"[^>]*>(\d+)<\/span>/i) || sHtml.match(/(\d+)명/);
    console.log('Sympathy API Match:', sMatch ? sMatch[1] : 'Not Found');
  }
}

testNaverMetricsFetch().catch(console.error);
