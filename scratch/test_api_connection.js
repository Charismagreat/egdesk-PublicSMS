process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';
process.env.NEXT_PUBLIC_EGDESK_API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';

const { queryTable } = require('../egdesk-helpers.js');

async function testApi() {
  console.log('=== [Fact Check] Checking crm_task_folders ===');
  try {
    const res = await queryTable('crm_task_folders', {});
    console.log('--- FOLDERS SUCCESS ---');
    console.log(res.rows);
  } catch (e) {
    console.error('--- FOLDERS ERROR ---', e.message);
  }

  console.log('\n=== [Fact Check] Checking crm_task_folder_items ===');
  try {
    const res = await queryTable('crm_task_folder_items', {});
    console.log('--- ITEMS SUCCESS ---');
    console.log(res.rows);
  } catch (e) {
    console.error('--- ITEMS ERROR ---', e.message);
  }
}

testApi();
