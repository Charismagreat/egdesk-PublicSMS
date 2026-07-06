import { updateRows } from '../egdesk-helpers';
async function test() {
  try {
    const res = await updateRows('system_settings', {
      value: 'wonconduct'
    }, { filters: { key: 'google_ai_api_key' } });
    console.log("DB Update Res:", res);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
test();
