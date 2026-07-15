import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development.local' });

import { executeSQL } from '../egdesk-helpers';

async function runDiagnostic() {
  try {
    console.log('🔍 [안전 DB 진단 시작] 테넌트 ID 데이터 분포 조사...');

    // 1. products 테이블의 tenant_id 분포
    const prodTenants = await executeSQL('SELECT tenant_id, COUNT(*) as count FROM products GROUP BY tenant_id');
    console.log('- products 테이블 테넌트 ID 분포:');
    console.log(prodTenants.rows);

    // 2. inventory_items 테이블의 tenant_id 분포
    const invTenants = await executeSQL('SELECT tenant_id, COUNT(*) as count FROM inventory_items GROUP BY tenant_id');
    console.log('- inventory_items 테이블 테넌트 ID 분포:');
    console.log(invTenants.rows);

    // 3. crm_operators 에 가입된 테넌트 목록 정보
    const operators = await executeSQL('SELECT username, tenant_id, role FROM crm_operators');
    console.log('- 가입된 운영자 목록 및 테넌트 ID:');
    console.log(operators.rows);

  } catch (err: any) {
    console.error('❌ 진단 중 오류 발생:', err.message);
  }
}

runDiagnostic();
