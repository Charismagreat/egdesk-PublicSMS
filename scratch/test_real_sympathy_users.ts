async function testRealSympathyUsers() {
  const blogId = 'nocodelife';
  const logNo = '224369177255';
  
  const url = `https://blog.naver.com/api/blogs/${blogId}/posts/${logNo}/sympathy-users`;
  console.log(`🚀 Fetching REAL Naver Sympathy Users API: ${url}`);
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://blog.naver.com/${blogId}/${logNo}`
      }
    });
    console.log('HTTP Status:', res.status);
    const json = await res.json();
    console.log('API JSON Result:', JSON.stringify(json, null, 2));
  } catch (err: any) {
    console.error('Fetch Error:', err.message);
  }
}

testRealSympathyUsers().catch(console.error);
