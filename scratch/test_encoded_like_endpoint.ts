async function testEncodedEndpoints() {
  const blogId = 'nocodelife';
  const logNo = '224369177255';
  
  // Test 1: Encoded q parameter for like API
  const encodedQ = encodeURIComponent(`BLOG[${blogId}_${logNo}]`);
  const url1 = `https://blog.like.naver.com/v1/search/contents?suppress_response_codes=true&q=${encodedQ}`;
  console.log(`URL 1: ${url1}`);
  try {
    const res1 = await fetch(url1, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://blog.naver.com/${blogId}/${logNo}`
      }
    });
    console.log('JSON 1:', JSON.stringify(await res1.json(), null, 2));
  } catch (e: any) {
    console.error(e.message);
  }

  // Test 2: Mobile Post API
  const url2 = `https://m.blog.naver.com/api/blogs/${blogId}/posts/${logNo}`;
  console.log(`\nURL 2: ${url2}`);
  try {
    const res2 = await fetch(url2, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Referer': `https://m.blog.naver.com/${blogId}/${logNo}`
      }
    });
    console.log('Status 2:', res2.status);
    console.log('JSON 2:', JSON.stringify(await res2.json(), null, 2));
  } catch (e: any) {
    console.error(e.message);
  }

  // Test 3: Sympathy API
  const url3 = `https://blog.naver.com/SympathyHistoryList.naver?blogId=${blogId}&logNo=${logNo}`;
  console.log(`\nURL 3: ${url3}`);
  try {
    const res3 = await fetch(url3, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://blog.naver.com/${blogId}/${logNo}`
      }
    });
    console.log('Status 3:', res3.status);
    const text3 = await res3.text();
    console.log('Text 3 snippet:', text3.slice(0, 500));
  } catch (e: any) {
    console.error(e.message);
  }
}

testEncodedEndpoints().catch(console.error);
