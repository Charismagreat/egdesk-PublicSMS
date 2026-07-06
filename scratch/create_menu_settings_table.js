const { createTable } = require('../egdesk-helpers');

const schema = [
  { name: 'tenant_id', type: 'TEXT', notNull: true },
  { name: 'menu_href', type: 'TEXT', notNull: true },
  { name: 'is_enabled', type: 'INTEGER', notNull: true, defaultValue: 1 },
  { name: 'sort_order', type: 'INTEGER', notNull: true }
];

createTable('테넌트 메뉴 설정', schema, {
  tableName: 'tenant_menu_settings',
  uniqueKeyColumns: ['tenant_id', 'menu_href'],
  duplicateAction: 'update'
})
.then(result => {
  console.log('Table created successfully:', result);
})
.catch(error => {
  console.error('Error creating table:', error);
});
