import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.development.local' });

import { executeSQL, updateRows } from '../egdesk-helpers';

async function runDiagnostic() {
  try {
    console.log('🔍 [안전 DB 진단 시작] products 테이블의 deleted_at NULL 검증...');

    // 1. deleted_at 이 NULL인 레코드 수
    const prodNull = await executeSQL('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL');
    console.log('- deleted_at 이 NULL인 레코드 수:', prodNull.rows);

    // 2. deleted_at 이 NULL이 아닌 레코드 수
    const prodNotNull = await executeSQL('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NOT NULL');
    console.log('- deleted_at 이 NULL이 아닌 레코드 수:', prodNotNull.rows);

  } catch (err: any) {
    console.error('❌ 진단 중 오류 발생:', err.message);
  }
}

runDiagnostic();
