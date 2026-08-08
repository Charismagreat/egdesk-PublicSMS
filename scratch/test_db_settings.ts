import { queryTable } from '../egdesk-helpers';

async function testDbSettings() {
  console.log('🔍 Checking DB naver_blog_marketing_settings...');
  const res = await queryTable('naver_blog_marketing_settings', { filters: { id: '1' } });
  const row = res.rows?.[0];
  
  console.log('DB Settings Row:');
  console.log('id:', row?.id);
  console.log('naver_blog_id:', row?.naver_blog_id);
  console.log('naver_login_id:', row?.naver_login_id);
  console.log('naver_login_pw:', row?.naver_login_pw ? '*** (EXISTS)' : 'NULL / EMPTY');
}

testDbSettings().catch(console.error);
