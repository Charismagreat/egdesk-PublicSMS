async function testCommentsApiV2() {
  const blogId = 'nocodelife';
  const logNo = '224369177255';
  
  const endpoints = [
    `https://apis.naver.com/commentBox/cbox/web_naver_list_jsonp.json?ticket=blog2&templateId=default&pool=cbox5&lang=ko&country=KR&objectId=${blogId}_${logNo}`,
    `https://blog.naver.com/CommentList.naver?blogId=${blogId}&logNo=${logNo}`,
    `https://blog.naver.com/PostCommentListAsync.naver?blogId=${blogId}&logNo=${logNo}`,
    `https://blog.naver.com/CommentListAsync.naver?blogId=${blogId}&logNo=${logNo}`
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
      console.log('Snippet:', text.slice(0, 300));
    } catch (e: any) {
      console.error(e.message);
    }
  }
}

testCommentsApiV2().catch(console.error);
