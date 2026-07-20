const helpers = require('../egdesk-helpers');
const downloadFile = helpers.downloadFile || (helpers.default && helpers.default.downloadFile);
const queryTable = helpers.queryTable || (helpers.default && helpers.default.queryTable);

async function testDownload() {
  console.log('=== FACT CHECKING WITH import_master ===');
  try {
    const res = await queryTable('import_master', { limit: 5 });
    console.log('=== LATEST IMPORTS ===');
    console.log(res.rows);

    if (res.rows && res.rows.length > 0) {
      const target = res.rows[0];
      console.log(`\nAttempting download for rowId: ${target.id}, columnName: file_path`);
      
      const downloadRes = await downloadFile({
        tableName: 'import_master',
        rowId: Number(target.id),
        columnName: 'file_path'
      });
      
      console.log('=== DOWNLOAD RESULT ===');
      console.log('Success:', downloadRes?.success);
      console.log('Filename:', downloadRes?.filename);
      console.log('MimeType:', downloadRes?.mimeType);
      if (downloadRes?.data) {
        console.log('Data type:', typeof downloadRes.data);
        console.log('Data length:', downloadRes.data.length);
        console.log('Data sample (first 120 chars):', downloadRes.data.substring(0, 120));
      } else {
        console.log('Error:', downloadRes?.error);
      }
    }
  } catch (e) {
    console.error('Exception in testDownload:', e.message, e.stack);
  }
}

testDownload();
