import { listTables, queryTable } from '../egdesk-helpers';

async function check() {
  try {
    const res = await listTables();
    console.log("Tables list:", res.tables?.map((t: any) => t.tableName));
    
    const folders = await queryTable('crm_task_folders', { limit: 5 });
    console.log("Folders rows:", folders.rows);
  } catch (err: any) {
    console.error("Check Error:", err.message);
  }
}

check();
