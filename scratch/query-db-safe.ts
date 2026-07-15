import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development.local' });

import { executeSQL, updateRows } from '../egdesk-helpers';

async function runDiagnostic() {
  try {
    console.log('🔍 [안전 DB 진단 시작] 테넌트 ID 데이터 분포 조사 및 guest 계정으로 강제 마이그레이션...');

    // 1. products 테이블 강제 업데이트 (default 및 null -> tenant-guest-id-2222)
    await updateRows('products', { tenant_id: 'tenant-guest-id-2222' }, { filters: { tenant_id: 'default' } });
    await updateRows('products', { tenant_id: 'tenant-guest-id-2222' }, { filters: { tenant_id: null as any } });
    console.log('✔ products 테이블 테넌트 강제 업데이트 완료!');

    // 2. inventory_items 테이블 강제 업데이트 (default 및 null -> tenant-guest-id-2222)
    await updateRows('inventory_items', { tenant_id: 'tenant-guest-id-2222' }, { filters: { tenant_id: 'default' } });
    await updateRows('inventory_items', { tenant_id: 'tenant-guest-id-2222' }, { filters: { tenant_id: null as any } });
    console.log('✔ inventory_items 테이블 테넌트 강제 업데이트 완료!');

    // 3. products 테이블의 tenant_id 분포 확인
    const prodTenants = await executeSQL('SELECT tenant_id, COUNT(*) as count FROM products GROUP BY tenant_id');
    console.log('- products 테이블 테넌트 ID 분포:');
    console.log(prodTenants.rows);

    // 4. inventory_items 테이블의 tenant_id 분포 확인
    const invTenants = await executeSQL('SELECT tenant_id, COUNT(*) as count FROM inventory_items GROUP BY tenant_id');
    console.log('- inventory_items 테이블 테넌트 ID 분포:');
    console.log(invTenants.rows);

  } catch (err: any) {
    console.error('❌ 진단 및 복구 중 오류 발생:', err.message);
  }
}

runDiagnostic();
