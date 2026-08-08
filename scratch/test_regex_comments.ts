async function testRegexComments() {
  const blogId = 'nocodelife';
  const logNo = '224369177255';

  const mUrl = `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
  const res = await fetch(mUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    }
  });
  const html = await res.text();
  
  const match = html.match(/commentCount="(\d+)"/i) || html.match(/commentCount='(\d+)'/i) || html.match(/commentCount:\s*"?(\d+)"?/i);
  console.log('🎉 Extracted Comment Count:', match ? parseInt(match[1], 10) : 'Not found');
}

testRegexComments().catch(console.error);
