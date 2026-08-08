import { queryTable } from '../egdesk-helpers';

async function inspectDbPosts() {
  console.log('🔍 Inspecting DB posts in crm_naver_blog_posts table...');
  const res = await queryTable('crm_naver_blog_posts', {});
  const posts = res.rows || [];
  
  console.log(`Total Posts in DB: ${posts.length}`);
  
  for (const post of posts) {
    console.log(`\n📌 ID: ${post.id}`);
    console.log(`   Status: "${post.status}"`);
    console.log(`   Title: "${post.title?.slice(0, 30)}"`);
    console.log(`   Post URL: "${post.post_url}"`);
    console.log(`   Scheduled At: "${post.scheduled_at}"`);
    console.log(`   Posted At: "${post.posted_at}"`);
    console.log(`   Error Message: "${post.error_message}"`);
  }
}

inspectDbPosts().catch(console.error);
