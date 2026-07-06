const { createTable, deleteTable, listTables } = require('../egdesk-helpers');

async function rebuild() {
  try {
    const tables = await listTables();
    const hasTenantTable = tables.rows && tables.rows.some(t => t.tableName === 'tenant_menu_settings');
    const hasSystemTable = tables.rows && tables.rows.some(t => t.tableName === 'system_menu_settings');

    if (hasTenantTable) {
      console.log('Deleting legacy tenant_menu_settings table...');
      await deleteTable('tenant_menu_settings');
    }

    if (hasSystemTable) {
      console.log('system_menu_settings table already exists. Recreating it to ensure clean schema...');
      await deleteTable('system_menu_settings');
    }

    const schema = [
      { name: 'menu_href', type: 'TEXT', notNull: true },
      { name: 'is_enabled', type: 'INTEGER', notNull: true, defaultValue: 1 },
      { name: 'sort_order', type: 'INTEGER', notNull: true }
    ];

    console.log('Creating system_menu_settings table...');
    const result = await createTable('시스템 메뉴 설정', schema, {
      tableName: 'system_menu_settings',
      uniqueKeyColumns: ['menu_href'],
      duplicateAction: 'update'
    });

    console.log('Table created successfully:', result);
  } catch (error) {
    console.error('Rebuild failed:', error);
  }
}

rebuild();
