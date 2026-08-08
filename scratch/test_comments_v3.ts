async function testCommentsV3() {
  const blogId = 'nocodelife';
  const logNo = '224369177255';

  // Test 1: Mobile Post View HTML parse for comment count
  const mUrl = `https://m.blog.naver.com/${blogId}/${logNo}`;
  console.log(`Fetching Mobile Post HTML: ${mUrl}`);
  try {
    const res = await fetch(mUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      }
    });
    const html = await res.text();
    
    // search for comment count keywords
    const matchComment = html.match(/commentCount["']?\s*:\s*["']?(\d+)["']?/i) ||
                         html.match(/_commentCount["']?\s*:\s*["']?(\d+)["']?/i) ||
                         html.match(/comment_count["']?\s*:\s*["']?(\d+)["']?/i) ||
                         html.match(/댓글\s*<em[^>]*>(\d+)<\/em>/i) ||
                         html.match(/댓글\s*(\d+)/i);
    console.log('Comment Count Match:', matchComment ? matchComment[1] : 'Not Found');

    // ticket check in HTML
    const ticketMatch = html.match(/ticket["']?\s*:\s*["']([^"']+)["']/i);
    console.log('Ticket in HTML:', ticketMatch ? ticketMatch[1] : 'Not Found');
    const objectIdMatch = html.match(/objectId["']?\s*:\s*["']([^"']+)["']/i);
    console.log('ObjectId in HTML:', objectIdMatch ? objectIdMatch[1] : 'Not Found');
  } catch (e: any) {
    console.error(e.message);
  }
}

testCommentsV3().catch(console.error);
