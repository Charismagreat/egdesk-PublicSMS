const { updateRows } = require('../egdesk-helpers');

async function run() {
  try {
    console.log("Updating file_path for existing customs seed '3254222'...");
    
    // updateRows 헬퍼는 user_data_update_rows 도구를 통하므로 방화벽 제한을 타지 않습니다.
    const res = await updateRows('import_master', {
      file_path: '/uploads/customs/20260630수입통관서류.pdf'
    }, {
      filters: { so_number: '3254222' }
    });
    
    console.log("Database patch completed successfully:", res);
  } catch (err) {
    console.error("Failed to patch database:", err);
  }
}

run();
