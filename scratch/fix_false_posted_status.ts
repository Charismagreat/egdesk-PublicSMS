import { queryTable, updateRows } from '../egdesk-helpers';

async function fixFalsePostedStatus() {
  console.log('🔄 잘못 표기된 POSTED 포스트 상태를 FAILED로 정정 처리 중...');
  const res = await queryTable('crm_naver_blog_posts', { limit: 1000 });
  const rows = res.rows || [];
  
  for (const row of rows) {
    if (row.status === 'POSTED') {
      console.log(`- Post ID ${row.id} ("${row.title}") FAILED 처리 및 실패 사유 주입`);
      await updateRows('crm_naver_blog_posts', {
        status: 'FAILED',
        error_message: '네이버 블로그 로그인 세션 미보유 또는 계정 연동 미완료로 인해 실제 포스팅이 게시되지 않았습니다.'
      }, { filters: { id: String(row.id) } });
    }
  }
  console.log('✅ 정정 조치 완료!');
}

fixFalsePostedStatus().catch(console.error);
