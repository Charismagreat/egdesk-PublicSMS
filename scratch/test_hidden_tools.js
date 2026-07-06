const helpers = require('../egdesk-helpers.js');

async function testTool(name) {
  try {
    const res = await helpers.callFinanceHubTool(name, {});
    console.log(`-> Result for ${name}:`, JSON.stringify(res, null, 2));
  } catch (err) {
    console.log(`-> Error for ${name}:`, err.message);
  }
}

async function main() {
  await testTool('financehub_import_tax_invoice');
  await testTool('financehub_import_tax_exempt_invoice');
  await testTool('financehub_import_cash_receipt');
  await testTool('financehub_import_hometax_excel_data');
}

main();
