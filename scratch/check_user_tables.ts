import { executeSQL } from '../egdesk-helpers';

async function checkUserTables() {
  try {
    const res = await executeSQL("SELECT * FROM user_tables");
    console.log('=== user_tables rows ===');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err: any) {
    console.error('에러:', err.message);
  }
}

checkUserTables();
