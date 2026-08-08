async function testNaverLikeApi() {
  const contentsId = 'nocodelife_224368717102';
  const apiUrl = `https://blog.like.naver.com/v1/search/contents?suppress_response_codes=true&q=BLOG[${contentsId}]`;
  
  console.log('📡 네이버 블로그 공감(Like) API를 호출합니다:', apiUrl);
  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': `https://m.blog.naver.com/nocodelife/224368717102`
    }
  });

  const json = await res.json();
  console.log('Like API Response:', JSON.stringify(json, null, 2));
}

testNaverLikeApi().catch(console.error);
