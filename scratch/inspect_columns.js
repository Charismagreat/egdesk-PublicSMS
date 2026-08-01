process.env.NEXT_PUBLIC_EGDESK_PROJECT_ID = '678d54e8-dd25-4586-aa98-191ec54289e8';
process.env.NEXT_PUBLIC_EGDESK_ENV = 'development';
process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';

const { queryTable } = require('../egdesk-helpers');

async function inspect() {
  try {
    const res = await queryTable('products', { limit: 1 });
    if (res.rows && res.rows[0]) {
      console.log('ALL KEYS IN ROW:', Object.keys(res.rows[0]));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

inspect();
