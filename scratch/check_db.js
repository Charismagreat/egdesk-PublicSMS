const fs = require('fs');
const path = require('path');

try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {}

const { callUserDataTool } = require('../egdesk-helpers.ts');

async function test() {
  try {
    // queryTable 테스트
    const qRes = await callUserDataTool('user_data_query', { 
      tableName: 'inventory_items',
      limit: 5
    });
    console.log('QUERY TABLE RESULT SAMPLE ROWS:', qRes?.rows?.length);

    // aggregateTable 테스트
    const aggRes = await callUserDataTool('user_data_aggregate', {
      tableName: 'inventory_items',
      column: 'id',
      function: 'COUNT'
    });
    console.log('AGGREGATE COUNT RESULT:', aggRes);
  } catch (e) {
    console.error('ERROR:', e);
  }
}

test();
