import { createTable } from '../../egdesk-helpers';

async function main() {
  console.log('Creating ad_templates table...');
  try {
    await createTable('광고 템플릿', [
      { name: 'id', type: 'INTEGER', notNull: true },
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'header', type: 'TEXT', notNull: true },
      { name: 'footer', type: 'TEXT', notNull: true },
      { name: 'opt_out', type: 'TEXT', notNull: true },
    ], { tableName: 'ad_templates', uniqueKeyColumns: ['id'] });
    console.log('Table "ad_templates" created successfully!');
  } catch (e: any) {
    console.error('Failed:', e.message);
  }
}

main();
