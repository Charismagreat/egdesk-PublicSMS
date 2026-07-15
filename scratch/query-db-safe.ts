import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development.local' });

import { executeSQL, updateRows } from '../egdesk-helpers';

async function runDiagnostic() {
  try {
    console.log('🔍 [정밀 DB 조사 및 마이그레이션] admin 상품 데이터를 guest 상품 데이터로 원복 복구...');

    // 1. products 테이블에서 tenant_id = 'tenant-admin-id-1111' 인 레코드를 'tenant-guest-id-2222'로 원복
    await updateRows('products', { tenant_id: 'tenant-guest-id-2222' }, { filters: { tenant_id: 'tenant-admin-id-1111' } });
    console.log('✔ products 테이블 tenant-admin-id-1111 -> tenant-guest-id-2222 복구 완료!');

    // 2. 결과 분포 재확인
    const prodAllTenants = await executeSQL("SELECT tenant_id, status, COUNT(*) as count FROM products GROUP BY tenant_id, status");
    console.log('- products 전체 테이블 테넌트/상태별 건수:');
    console.log(prodAllTenants.rows);

  } catch (err: any) {
    console.error('❌ 복구 중 오류 발생:', err.message);
  }
}

runDiagnostic();
