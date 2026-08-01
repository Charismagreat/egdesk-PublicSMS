process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable } = require('../egdesk-helpers');

async function testFetch() {
  try {
    const res = await queryTable('products', { limit: 1 });
    console.log('--- [EGDesk Helpers queryTable Result] ---');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

testFetch();
