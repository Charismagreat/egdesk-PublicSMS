import { queryTable } from '../egdesk-helpers';

async function checkSettings() {
  const res = await queryTable('naver_blog_marketing_settings', { filters: { id: '1' } });
  console.log('--- Settings Table ---', res.rows);
}

checkSettings().catch(console.error);
