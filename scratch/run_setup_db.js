const { setupDatabase } = require('../src/lib/setup-db');

async function run() {
  try {
    console.log('Running setupDatabase()...');
    await setupDatabase();
    console.log('setupDatabase() finished successfully!');
  } catch (err) {
    console.error('setupDatabase error:', err);
  }
}

run();
