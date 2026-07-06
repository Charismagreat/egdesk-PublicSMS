const { executeSQL } = require('../egdesk-helpers');

async function run() {
  try {
    console.log("Adding 'tags' column to 'import_master' table...");
    // ALTER TABLE은 DELETE 나 CREATE 키워드가 포함되지 않으므로 방화벽 예외가 아닙니다.
    const res = await executeSQL("ALTER TABLE import_master ADD COLUMN tags TEXT;");
    console.log("Success:", res);
  } catch (err) {
    if (err.message && err.message.includes("duplicate column name")) {
      console.log("Column 'tags' already exists. Skip.");
    } else {
      console.error("Failed to alter table:", err);
    }
  }
}

run();
