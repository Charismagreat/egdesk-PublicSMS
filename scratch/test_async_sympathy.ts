async function testAsyncSympathy() {
  const blogId = 'nocodelife';
  const logNo = '224369177255';
  
  const endpoints = [
    `https://blog.naver.com/SympathyHistoryListAsync.naver?blogId=${blogId}&logNo=${logNo}`,
    `https://blog.naver.com/PostSympathyListAsync.naver?blogId=${blogId}&logNo=${logNo}`,
    `https://blog.naver.com/NBlogSympathyListAsync.naver?blogId=${blogId}&logNo=${logNo}`,
    `https://blog.naver.com/PostSympathyList.naver?blogId=${blogId}&logNo=${logNo}`
  ];

  for (const ep of endpoints) {
    console.log(`\nTesting Endpoint: ${ep}`);
    try {
      const res = await fetch(ep, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `https://blog.naver.com/${blogId}/${logNo}`
        }
      });
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Response Snippet:', text.slice(0, 400));
    } catch (err: any) {
      console.error(err.message);
    }
  }
}

testAsyncSympathy().catch(console.error);
