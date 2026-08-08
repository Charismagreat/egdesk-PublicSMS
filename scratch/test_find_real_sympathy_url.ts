async function testFindRealSympathyUrl() {
  const jsUrl = 'https://ssl.pstatic.net/t.static.blog/mylog/versioning//common/js/mylog/post/comment/sympathy_list-4ee6a89_https.js';
  console.log(`Fetching Naver sympathy JS script: ${jsUrl}`);
  
  const res = await fetch(jsUrl);
  const jsText = await res.text();
  
  console.log('--- Searching for URLs & API endpoints in sympathy JS ---');
  const urls = jsText.match(/https?:\/\/[^\s"']+/g) || [];
  const relativeUrls = jsText.match(/["']\/[a-zA-Z0-9_\/]+\.naver["']/g) || [];
  const jsonUrls = jsText.match(/["']\/[a-zA-Z0-9_\/]+\.json["']/g) || [];
  
  console.log('Absolute URLs:', Array.from(new Set(urls)));
  console.log('Relative .naver URLs:', Array.from(new Set(relativeUrls)));
  console.log('Relative .json URLs:', Array.from(new Set(jsonUrls)));

  // search for words like 'Sympathy', 'like', 'count'
  const sympathyMatches = jsText.match(/[^;{}]*sympathy[^;{}]*/gi) || [];
  console.log('\nSympathy statements sample:', sympathyMatches.slice(0, 10));
}

testFindRealSympathyUrl().catch(console.error);
