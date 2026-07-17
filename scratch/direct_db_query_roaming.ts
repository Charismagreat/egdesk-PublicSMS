import Database from "better-sqlite3";
import path from "path";
import os from "os";

async function main() {
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData/Roaming");
  const dbPath = path.join(appData, "EGDesk/database/user_data.db");
  console.log("Connecting directly to Roaming Database file:", dbPath);
  const db = new Database(dbPath);
  
  const rows = db.prepare("SELECT * FROM crm_operators").all();
  console.log("=== ALL RAW OPERATOR ROWS ===");
  console.log(JSON.stringify(rows, null, 2));
}

main().catch(console.error);
