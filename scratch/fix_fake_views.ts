import { queryTable, updateRows } from '../egdesk-helpers';

async function fixFakeViews() {
  console.log('🔄 crm_naver_blog_posts 가짜 조회수/공감수 초기화 중...');
  const res = await queryTable('crm_naver_blog_posts', { limit: 1000 });
  const rows = res.rows || [];
  
  for (const row of rows) {
    if (row.views_count > 0 || row.likes_count > 0) {
      console.log(`- Post ID ${row.id} ("${row.title}") 수치 초기화`);
      await updateRows('crm_naver_blog_posts', {
        views_count: 0,
        likes_count: 0
      }, { filters: { id: String(row.id) } });
    }
  }
  console.log('✅ 초기화 완료!');
}

fixFakeViews().catch(console.error);
