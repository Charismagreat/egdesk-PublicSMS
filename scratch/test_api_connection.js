// 동적으로 로컬 API 환경 변수 강제 매핑 (dotenv Fallback)
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';
process.env.NEXT_PUBLIC_EGDESK_API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';

const { queryTable } = require('../egdesk-helpers.js');

async function testApi() {
  console.log('=== [Fact Check] Calling queryTable("expense_projects") via egdesk-helpers ===');
  try {
    const res = await queryTable('expense_projects', { limit: 2 });
    console.log('--- API RESPONSE SUCCESS ---');
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('--- API RESPONSE ERROR ---', e.message);
  }
}

testApi();
