async function testCommentsScraper() {
  const blogId = 'nocodelife';
  const logNo = '224369177255';

  const mUrl = `https://m.blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
  console.log(`Scraping Mobile PostView: ${mUrl}`);
  
  try {
    const res = await fetch(mUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      }
    });
    const html = await res.text();
    
    // Search for comment count patterns in JS/HTML
    const m1 = html.match(/["']?commentCount["']?\s*:\s*["']?(\d+)["']?/i);
    const m2 = html.match(/_commentCount["']?\s*:\s*["']?(\d+)["']?/i);
    const m3 = html.match(/class="[^"]*btn_comment[^"]*"[^>]*>\s*<span[^>]*>([0-9,]+)<\/span>/i);
    const m4 = html.match(/<span[^>]*class="[^"]*reply_count[^"]*"[^>]*>([0-9,]+)<\/span>/i);
    const m5 = html.match(/댓글\s*<em[^>]*>([0-9,]+)<\/em>/i);
    const m6 = html.match(/"commentCount"\s*:\s*(\d+)/i);

    console.log('Match 1:', m1 ? m1[1] : null);
    console.log('Match 2:', m2 ? m2[1] : null);
    console.log('Match 3:', m3 ? m3[1] : null);
    console.log('Match 4:', m4 ? m4[1] : null);
    console.log('Match 5:', m5 ? m5[1] : null);
    console.log('Match 6:', m6 ? m6[1] : null);

    // Find all numbers near 'comment' or '댓글'
    const nearComment = html.match(/.{0,50}(comment|댓글).{0,50}/gi) || [];
    console.log('\nNear comment snippets (sample 5):', nearComment.slice(0, 5));
  } catch (e: any) {
    console.error(e.message);
  }
}

testCommentsScraper().catch(console.error);
