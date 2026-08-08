async function testCommentsV4() {
  const blogId = 'nocodelife';
  const logNo = '224369177255';

  const mUrl = `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
  console.log(`Fetching Mobile PostView HTML: ${mUrl}`);
  try {
    const res = await fetch(mUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      }
    });
    const html = await res.text();
    
    // Search for cbox or comment in HTML
    const cboxMatches = html.match(/cbox[^\s"']+/gi) || [];
    console.log('cbox matches:', Array.from(new Set(cboxMatches)).slice(0, 15));

    const commentMatches = html.match(/comment[^\s"':,{}]*/gi) || [];
    console.log('comment matches:', Array.from(new Set(commentMatches)).slice(0, 15));

    // Print all scripts or JSON data in HTML
    const scriptMatches = html.match(/window\.__[a-zA-Z0-9_]+\s*=\s*\{[^}]+\}/g) || [];
    console.log('Script globals:', scriptMatches);
  } catch (e: any) {
    console.error(e.message);
  }
}

testCommentsV4().catch(console.error);
