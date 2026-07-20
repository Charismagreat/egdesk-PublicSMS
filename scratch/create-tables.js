process.env.NEXT_PUBLIC_EGDESK_API_URL = 'http://localhost:8080';
process.env.NEXT_PUBLIC_EGDESK_API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';

const { createTable } = require('../egdesk-helpers');

async function setupTables() {
  console.log('=== [Force DB Setup] Creating crm_task_folders & crm_task_folder_items via egdesk-helpers ===');
  
  try {
    // 1. crm_task_folders 생성
    await createTable('crm_task_folders', [
      { name: 'id', type: 'INTEGER', notNull: true, primaryKey: true },
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'description', type: 'TEXT' },
      { name: 'created_by', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' }
    ]);
    console.log('✔️ crm_task_folders 생성 성공!');
  } catch (e) {
    console.log('crm_task_folders 생성 건너뜀/이미존재:', e.message);
  }

  try {
    // 2. crm_task_folder_items 생성
    await createTable('crm_task_folder_items', [
      { name: 'id', type: 'INTEGER', notNull: true, primaryKey: true },
      { name: 'folder_id', type: 'INTEGER', notNull: true },
      { name: 'tags', type: 'TEXT' },
      { name: 'title', type: 'TEXT', notNull: true },
      { name: 'content', type: 'TEXT' },
      { name: 'file_name', type: 'TEXT' },
      { name: 'file_size', type: 'TEXT' },
      { name: 'file_url', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' }
    ]);
    console.log('✔️ crm_task_folder_items 생성 성공!');
  } catch (e) {
    console.log('crm_task_folder_items 생성 건너뜀/이미존재:', e.message);
  }
  
  console.log('DB Setup Done');
}

setupTables();
