const helpers = require('../egdesk-helpers');

async function testMenuApi() {
  console.log("=== Testing Menu Settings Retrieval / Backfill for guest tenant ===");
  const tenantId = 'tenant-guest-id-2222';
  try {
    // 1. system_menu_settings 쿼리
    const result = await helpers.queryTable('system_menu_settings', { filters: { tenant_id: tenantId } });
    console.log("Query Result rows length:", result.rows ? result.rows.length : 0);
    console.log("Rows:", JSON.stringify(result.rows, null, 2));

    if (!result.rows || result.rows.length === 0) {
      console.log("Database is empty for guest tenant. Attempting backfill...");
      
      // DEFAULT_MENU_ITEMS 정의를 menu-metadata에서 가져와야 하지만, 
      // 여기서는 하드코딩해서 간단한 1개 메뉴로 인서트 시도를 테스트해봅니다.
      const testInsertData = [
        {
          menu_href: '/',
          is_enabled: 1,
          sort_order: 10,
          tenant_id: tenantId
        },
        {
          menu_href: '/customers',
          is_enabled: 1,
          sort_order: 20,
          tenant_id: tenantId
        }
      ];

      console.log("Inserting test items...");
      const insertRes = await helpers.insertRows('system_menu_settings', testInsertData);
      console.log("Insert result:", JSON.stringify(insertRes, null, 2));
      
      const refresh = await helpers.queryTable('system_menu_settings', { filters: { tenant_id: tenantId } });
      console.log("Refreshed rows length:", refresh.rows ? refresh.rows.length : 0);
    }
  } catch (err) {
    console.error("Test failed with error:", err);
  }
}

testMenuApi();
