async function testCommentsApi() {
  const blogId = 'nocodelife';
  const logNo = '224369177255';
  
  // Test 1: Native Blog Comment API
  const url1 = `https://blog.naver.com/api/blogs/${blogId}/posts/${logNo}/comments`;
  console.log(`URL 1: ${url1}`);
  try {
    const res1 = await fetch(url1, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://blog.naver.com/${blogId}/${logNo}`
      }
    });
    console.log('Status 1:', res1.status);
    const json1 = await res1.json();
    console.log('JSON 1:', JSON.stringify(json1, null, 2));
  } catch (e: any) {
    console.error('Error 1:', e.message);
  }

  // Test 2: Naver Cbox API
  const url2 = `https://apis.naver.com/commentBox/cbox/web_naver_list_jsonp.json?ticket=blog&templateId=default&pool=cbox5&lang=ko&country=KR&objectId=${blogId}_${logNo}`;
  console.log(`\nURL 2: ${url2}`);
  try {
    const res2 = await fetch(url2, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://blog.naver.com/${blogId}/${logNo}`
      }
    });
    console.log('Status 2:', res2.status);
    const text2 = await res2.text();
    console.log('Text 2 snippet:', text2.slice(0, 500));
  } catch (e: any) {
    console.error('Error 2:', e.message);
  }
}

testCommentsApi().catch(console.error);
