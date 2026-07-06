const { queryTable } = require('../egdesk-helpers');

async function main() {
  try {
    const res = await queryTable('crm_operators');
    const ops = res.rows || [];
    console.log('--- 전체 직원 목록 ---');
    ops.forEach((op) => {
      console.log(`ID: ${op.id}, 아이디: ${op.username}, 이름: ${op.name}, 사원번호: ${op.employee_number || 'NULL'}`);
    });
  } catch (e) {
    console.error('에러:', e.message);
  }
}

main();
