import { queryTable } from '../egdesk-helpers';

async function inspect745Post() {
  console.log('🔍 Inspecting 7:45 scheduled post in DB...');
  const res = await queryTable('crm_naver_blog_posts', {
    filters: { status: 'SCHEDULED' }
  });

  console.log('SCHEDULED posts:', JSON.stringify(res.rows, null, 2));
}

inspect745Post().catch(console.error);
