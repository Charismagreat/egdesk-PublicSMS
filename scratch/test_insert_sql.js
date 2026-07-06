const helpers = require('../egdesk-helpers.js');

async function main() {
  try {
    console.log("Testing INSERT via executeSQL...");
    // crm_expenses 테이블에 테스트 지출 데이터 삽입 시도
    const sql = `
      INSERT INTO crm_expenses (title, category, amount, expense_date, memo, uuid)
      VALUES ('SQL테스트지출', '테스트계정', 50000, '2026-06-01', '자동생성', 'test-uuid-12345')
    `;
    const res = await helpers.executeSQL(sql);
    console.log("-> Result:", JSON.stringify(res, null, 2));
    
    // 삽입 성공 시 확인 조회
    const check = await helpers.executeSQL("SELECT * FROM crm_expenses WHERE title='SQL테스트지출'");
    console.log("-> Check:", JSON.stringify(check, null, 2));

    // 테스트 데이터 원복 (Delete)
    await helpers.executeSQL("DELETE FROM crm_expenses WHERE title='SQL테스트지출'");
  } catch (err) {
    console.error("-> Error:", err.message);
  }
}

main();
