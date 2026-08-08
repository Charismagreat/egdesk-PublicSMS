import { setupDatabase } from '../src/lib/setup-db';
import { updateRows } from '../egdesk-helpers';

async function runDbMigrationAndUpdate() {
  console.log('Running setupDatabase to add post_url column...');
  await setupDatabase();
  console.log('✅ Database schema migration complete.');

  const targetUrl = 'https://blog.naver.com/nocodelife/224368717102';
  console.log(`Setting post_url of ID 7 to ${targetUrl}...`);
  await updateRows('crm_naver_blog_posts', { post_url: targetUrl }, { ids: [7] });
  console.log('🎉 Successfully updated post 7 URL to https://blog.naver.com/nocodelife/224368717102');
}

runDbMigrationAndUpdate().catch(console.error);
