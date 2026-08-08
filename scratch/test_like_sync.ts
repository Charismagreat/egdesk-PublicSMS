import { queryTable } from '../egdesk-helpers';

async function testLikeSync() {
  console.log('🔍 Testing Naver Likes API for published posts...');
  const postsRes = await queryTable('crm_naver_blog_posts', {});
  const posts = postsRes.rows || [];
  
  console.log(`Total posts in DB: ${posts.length}`);
  
  for (const post of posts) {
    if (post.status === 'POSTED' && post.post_url) {
      console.log(`\n📌 Post ID: ${post.id}, URL: ${post.post_url}`);
      let blogId = '';
      let logNo = '';

      const matchPath = post.post_url.match(/blog\.naver\.com\/([^\/\?]+)\/(\d+)/i);
      if (matchPath) {
        blogId = matchPath[1];
        logNo = matchPath[2];
      } else {
        const matchQuery = post.post_url.match(/blogId=([^&]+).*logNo=(\d+)/i) || post.post_url.match(/logNo=(\d+).*blogId=([^&]+)/i);
        if (matchQuery) {
          blogId = matchQuery[1];
          logNo = matchQuery[2];
        }
      }

      console.log(`Parsed blogId: ${blogId}, logNo: ${logNo}`);

      if (blogId && logNo) {
        const likeApiUrl = `https://blog.like.naver.com/v1/search/contents?suppress_response_codes=true&q=BLOG[${blogId}_${logNo}]`;
        console.log(`Fetching from: ${likeApiUrl}`);
        
        try {
          const res = await fetch(likeApiUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': post.post_url
            }
          });
          console.log(`HTTP Status: ${res.status}`);
          const json = await res.json();
          console.log('API Response:', JSON.stringify(json, null, 2));
        } catch (err: any) {
          console.error('Fetch error:', err.message);
        }
      }
    }
  }
}

testLikeSync().catch(console.error);
