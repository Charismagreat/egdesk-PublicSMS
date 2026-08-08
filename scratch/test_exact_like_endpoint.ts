async function testExactLikeEndpoint() {
  const blogId = 'nocodelife';
  const logNo = '224369177255';
  
  console.log(`🔍 Testing various Naver Like Endpoints for blogId=${blogId}, logNo=${logNo}...`);

  // Endpoint 1: Single Content API
  const ep1 = `https://blog.like.naver.com/v1/services/BLOG/contents/${blogId}_${logNo}`;
  console.log(`\nEndpoint 1: ${ep1}`);
  try {
    const res1 = await fetch(ep1, {
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

  // Endpoint 2: Mobile Post View HTML Parse
  const ep2 = `https://m.blog.naver.com/${blogId}/${logNo}`;
  console.log(`\nEndpoint 2: ${ep2}`);
  try {
    const res2 = await fetch(ep2, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      }
    });
    console.log('Status 2:', res2.status);
    const html2 = await res2.text();
    const matchLike = html2.match(/sympathyCount["']?\s*:\s*["']?(\d+)["']?/i) || html2.match(/likeCount["']?\s*:\s*["']?(\d+)["']?/i) || html2.match(/_sympathyCount["']?\s*:\s*["']?(\d+)["']?/i) || html2.match(/_likeItCount["']?\s*:\s*["']?(\d+)["']?/i);
    console.log('HTML Like Match:', matchLike ? matchLike[1] : 'Not Found');
    
    // search for any count in html
    const counts = html2.match(/"count":\s*(\d+)/g);
    console.log('Counts in HTML:', counts);
  } catch (e: any) {
    console.error('Error 2:', e.message);
  }

  // Endpoint 3: PostView.naver iframe/param
  const ep3 = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
  console.log(`\nEndpoint 3: ${ep3}`);
  try {
    const res3 = await fetch(ep3, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Status 3:', res3.status);
    const html3 = await res3.text();
    const matchSympathy = html3.match(/sympathyCount["']?\s*:\s*["']?(\d+)["']?/i) || html3.match(/likeCount["']?\s*:\s*["']?(\d+)["']?/i);
    console.log('HTML 3 Match:', matchSympathy ? matchSympathy[1] : 'Not Found');
  } catch (e: any) {
    console.error('Error 3:', e.message);
  }
}

testExactLikeEndpoint().catch(console.error);
