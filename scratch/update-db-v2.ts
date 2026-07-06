import { setupDatabase } from '../src/lib/setup-db';

async function updateDb() {
  try {
    await setupDatabase();
    console.log("Database recreated with new schema.");
  } catch(e) {
    console.error(e);
  }
}
updateDb();
