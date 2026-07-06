import { executeSQL } from '../egdesk-helpers';

async function run() {
  try {
    const res = await executeSQL('SELECT COUNT(*) as cnt FROM crm_expenses');
    console.log('Result for crm_expenses count:', JSON.stringify(res, null, 2));
    
    const res2 = await executeSQL('SELECT * FROM crm_expenses LIMIT 1');
    console.log('Result for crm_expenses row:', JSON.stringify(res2, null, 2));
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}
run();
