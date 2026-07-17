import Database from "better-sqlite3";
import path from "path";

async function main() {
  const dbPath = path.resolve(process.cwd(), "crm_data.db");
  console.log("Connecting directly to Database file:", dbPath);
  const db = new Database(dbPath);
  
  const rows = db.prepare("SELECT * FROM crm_operators").all();
  console.log("=== ALL RAW ROWS FROM SQLITE ===");
  console.log(JSON.stringify(rows, null, 2));
}

main().catch(console.error);
