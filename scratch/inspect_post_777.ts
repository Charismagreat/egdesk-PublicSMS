import { queryTable } from '../egdesk-helpers';

async function inspectPost777() {
  console.log('🔍 Inspecting post "777" in crm_naver_blog_posts...');
  const res = await queryTable('crm_naver_blog_posts', {
    filters: { title: '777' }
  });

  console.log('Post 777 Records:', JSON.stringify(res.rows, null, 2));

  // 최근 모든 SCHEDULED 상태 포스트 조회
  const resScheduled = await queryTable('crm_naver_blog_posts', {
    filters: { status: 'SCHEDULED' }
  });
  console.log('\nAll SCHEDULED Posts:', JSON.stringify(resScheduled.rows, null, 2));
}

inspectPost777().catch(console.error);
