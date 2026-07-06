const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('crm_data.db');
db.get("SELECT value FROM system_settings WHERE key='google_ai_api_key'", (err, row) => {
  if (err) {
    console.error("DB Error:", err.message);
  } else {
    if (row && row.value) {
      console.log("API Key Exists: " + row.value.substring(0, 10) + "...");
    } else {
      console.log("API Key NOT FOUND in DB.");
    }
  }
  db.close();
});
