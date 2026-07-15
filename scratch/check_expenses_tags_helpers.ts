import { queryTable } from '../egdesk-helpers';

async function run() {
  try {
    const res = await queryTable('crm_expenses', {
      limit: 5,
      orderBy: 'expense_date',
      orderDirection: 'DESC'
    });
    console.log('Result Rows:', JSON.stringify(res.rows, null, 2));
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}
run();
