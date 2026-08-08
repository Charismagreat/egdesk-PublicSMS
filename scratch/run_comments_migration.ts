import { setupDatabase } from '../src/lib/setup-db';

async function runMigration() {
  console.log('🚀 Running in-app DB migration for comments_count...');
  await setupDatabase();
  console.log('✅ Migration completed!');
}

runMigration().catch(console.error);
