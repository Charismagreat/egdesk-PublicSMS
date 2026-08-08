async function testCbox9() {
  const blogId = 'nocodelife';
  const logNo = '224369177255';

  const url = `https://apis.naver.com/commentBox/cbox/web_naver_list_jsonp.json?ticket=blog&templateId=default&pool=cbox9&lang=ko&country=KR&objectId=${blogId}_${logNo}`;
  console.log(`🚀 Testing Naver Comment cbox9 API: ${url}`);
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://m.blog.naver.com/${blogId}/${logNo}`
      }
    });
    console.log('HTTP Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.slice(0, 1000));

    // Extract count from JSONP
    const matchJson = text.match(/_callback\((.*)\);?/s);
    if (matchJson) {
      const data = JSON.parse(matchJson[1]);
      console.log('\nParsed JSON Result:');
      console.log('success:', data.success);
      console.log('count:', data.result?.count?.comment);
    }
  } catch (e: any) {
    console.error(e.message);
  }
}

testCbox9().catch(console.error);
