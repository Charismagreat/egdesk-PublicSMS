import { queryTable } from '../egdesk-helpers';

async function inspectPostContents() {
  console.log('🔍 Inspecting post contents in crm_naver_blog_posts...');
  const res = await queryTable('crm_naver_blog_posts', {});

  for (const post of res.rows) {
    console.log(`\n📌 ID ${post.id}: status=${post.status}`);
    console.log(`   Title: ${post.title}`);
    console.log(`   Content snippet: ${post.content?.slice(0, 150)}`);
  }
}

inspectPostContents().catch(console.error);
