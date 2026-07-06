const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\CHARISMA\\AppData\\Roaming\\egdesk\\database\\user_data.db';

function migrate() {
  try {
    const db = new Database(dbPath);
    console.log('Successfully opened database at:', dbPath);

    // crm_estimates 테이블의 컬럼 정보를 조회하여 tags 컬럼이 존재하는지 체크
    const columns = db.prepare("PRAGMA table_info(crm_estimates)").all();
    const hasTags = columns.some(col => col.name === 'tags');

    if (!hasTags) {
      console.log('Adding "tags" column to "crm_estimates" table...');
      db.prepare("ALTER TABLE crm_estimates ADD COLUMN tags TEXT").run();
      console.log('"tags" column successfully added!');
    } else {
      console.log('"tags" column already exists in "crm_estimates" table.');
    }

    db.close();
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
