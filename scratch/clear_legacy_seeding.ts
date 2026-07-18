import { deleteRows } from '../egdesk-helpers';

async function main() {
  console.log('🧹 Cleaning up legacy Hyosung seed data from local SQLite DB...');
  
  try {
    // delete crm_task_folder_items with folder_id = 1 (Hyosung items)
    const itemRes = await deleteRows('crm_task_folder_items', {
      filters: { folder_id: '1' }
    });
    console.log('crm_task_folder_items cleanup result:', itemRes);

    // delete crm_task_folders with id = 1 (Hyosung folder)
    const folderRes = await deleteRows('crm_task_folders', {
      ids: [1]
    });
    console.log('crm_task_folders cleanup result:', folderRes);

    console.log('✅ Legacy seed data cleanup successfully finished.');
  } catch (err: any) {
    console.error('❌ Failed cleaning up database:', err.message);
  }
}

main();
