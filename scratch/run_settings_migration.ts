import { setupDatabase } from '../src/lib/setup-db';

async function runSettingsMigration() {
  console.log('Running setupDatabase to update naver_blog_marketing_settings schema...');
  await setupDatabase();
  console.log('✅ naver_blog_marketing_settings schema migration complete!');
}

runSettingsMigration().catch(console.error);
