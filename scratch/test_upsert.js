const { insertRows, queryTable } = require('../egdesk-helpers');

async function testUpsert() {
  try {
    console.log('Fetching current system_menu_settings...');
    const cur = await queryTable('system_menu_settings');
    console.log('Current row count:', cur.rows.length);

    console.log('Attempting upsert (insertRows) to toggle /sms is_enabled to 0...');
    
    // /sms 메뉴 설정을 변경해서 Upsert 시도
    const testData = [
      { menu_href: '/sms', is_enabled: 0, sort_order: 20 }
    ];

    const result = await insertRows('system_menu_settings', testData);
    console.log('Upsert result:', result);

    const after = await queryTable('system_menu_settings', { filters: { menu_href: '/sms' } });
    console.log('Row after upsert:', after.rows[0]);

    // 다시 원래대로 1로 복구
    console.log('Restoring /sms back to enabled: 1');
    await insertRows('system_menu_settings', [{ menu_href: '/sms', is_enabled: 1, sort_order: 20 }]);
  } catch (err) {
    console.error('Upsert failed:', err);
  }
}

testUpsert();
