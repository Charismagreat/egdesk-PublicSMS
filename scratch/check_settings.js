const { queryTable } = require('../egdesk-helpers');

async function run() {
  try {
    const res = await queryTable('system_settings', {});
    console.log("=== SYSTEM SETTINGS DUMP ===");
    res.rows.forEach(r => {
      if (r.key.includes('ai') || r.key.includes('llm') || r.key.includes('company')) {
        console.log(`[${r.key}]: ${r.value}`);
      }
    });
  } catch (err) {
    console.error('Failed:', err);
  }
}

run();
