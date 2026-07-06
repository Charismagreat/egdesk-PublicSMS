import { setupDatabase } from '../src/lib/setup-db';

async function main() {
  console.log('Running setupDatabase manually...');
  try {
    await setupDatabase();
    console.log('Database setup manual execution finished successfully.');
  } catch (err: any) {
    console.error('Error during database setup:', err);
  }
}

main();
