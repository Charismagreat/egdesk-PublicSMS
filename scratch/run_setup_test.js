const { setupDatabase } = require('../src/lib/setup-db');

async function run() {
  console.log("Starting test setupDatabase...");
  try {
    await setupDatabase();
    console.log("setupDatabase finished successfully!");
  } catch (err) {
    console.error("setupDatabase crashed with error:", err);
  }
}

run();
