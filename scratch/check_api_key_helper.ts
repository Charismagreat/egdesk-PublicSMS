import { queryTable } from '../egdesk-helpers';
async function test() {
  try {
    const res = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    console.log("Res key:", JSON.stringify(res.rows));
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
test();
