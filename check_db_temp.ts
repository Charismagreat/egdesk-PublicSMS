const { executeSQL } = require('./egdesk-helpers');

async function main() {
  try {
    const res = await executeSQL("SELECT COUNT(*) as cnt FROM system_menu_settings");
    console.log("Total Count:", res.rows[0].cnt);
    const resGroup = await executeSQL("SELECT tenant_id, COUNT(*) as cnt FROM system_menu_settings GROUP BY tenant_id");
    console.log("Group Result:", resGroup.rows);
  } catch (err) {
    console.error("오류:", err);
  }
}

main();
