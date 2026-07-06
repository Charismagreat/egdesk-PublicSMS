const { queryTable } = require('../egdesk-helpers');

async function main() {
  try {
    const res = await queryTable('system_settings', {});
    console.log('--- system_settings 데이터 목록 ---');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('에러 발생:', err);
  }
}

main();
