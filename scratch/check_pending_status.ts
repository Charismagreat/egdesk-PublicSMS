import { queryTable } from '../egdesk-helpers';

async function checkPendingStatus() {
  console.log('🔍 Checking crm_naver_blog_posts for pending/scheduled status...');
  const res = await queryTable('crm_naver_blog_posts', {});
  const posts = res.rows || [];
  
  for (const p of posts) {
    if (p.status !== 'POSTED' || !p.post_url) {
      console.log(`\n📌 ID: ${p.id}`);
      console.log(`   Status: "${p.status}"`);
      console.log(`   Title: "${p.title}"`);
      console.log(`   Post URL: "${p.post_url}"`);
      console.log(`   Scheduled At: "${p.scheduled_at}"`);
      console.log(`   Error Message: "${p.error_message}"`);
    }
  }
}

checkPendingStatus().catch(console.error);
