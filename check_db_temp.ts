const { executeSQL } = require('./egdesk-helpers');

async function main() {
  try {
    const res = await executeSQL("SELECT sql FROM sqlite_master WHERE type='table' AND name='crm_partners'");
    console.log("DDL 결과:", res);
  } catch (err) {
    console.error("오류:", err);
  }
}

main();
