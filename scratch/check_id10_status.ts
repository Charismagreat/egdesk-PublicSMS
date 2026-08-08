import { queryTable } from '../egdesk-helpers';

async function checkId10Status() {
  console.log('🔍 Checking ID 10 post status...');
  const res = await queryTable('crm_naver_blog_posts', {
    filters: { id: '10' }
  });

  const post = res.rows[0];
  console.log('ID 10 Status:', post?.status);
  console.log('ID 10 Post URL:', post?.post_url);
}

checkId10Status().catch(console.error);
