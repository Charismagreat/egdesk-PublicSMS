export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '../../../../egdesk-helpers';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // 1. 기존 어드민 존재 여부 확인
    const result = await queryTable('crm_operators', { limit: 1 });
    
    if (result.rows && result.rows.length > 0 && !force) {
      return NextResponse.json({ success: true, message: 'Admin already exists. Setup skipped. Use ?force=true to reset.' });
    }

    // force=true일 경우 기존 운영자 계정 정보 일괄 초기화(소멸)
    if (force) {
      const allOps = await queryTable('crm_operators');
      const ops = allOps.rows || [];
      if (ops.length > 0) {
        const ids = ops.map((op: any) => Number(op.id));
        await deleteRows('crm_operators', { ids });
        console.log('Force reset: Cleared all legacy admin accounts.');
      }
    }

    // 2. 최고관리자 및 테스트용 게스트 계정 생성
    const password_hash = await bcrypt.hash('admin123', 10);
    const guest_password_hash = await bcrypt.hash('1234', 10);
    const dateStr = new Date().toISOString();

    await insertRows('crm_operators', [
      {
        id: 1,
        username: 'admin',
        password_hash: password_hash,
        name: '최고관리자',
        role: 'SUPER_ADMIN',
        tenant_id: 'tenant-admin-id-1111',
        created_at: dateStr
      },
      {
        id: 2,
        username: 'guest',
        password_hash: guest_password_hash,
        name: '테스트게스트',
        role: 'SUPER_ADMIN',
        tenant_id: 'tenant-guest-id-2222',
        created_at: dateStr
      }
    ]);

    return NextResponse.json({ 
      success: true, 
      message: force 
        ? 'Default SUPER_ADMIN has been force-reset successfully (admin / admin123)' 
        : 'Default SUPER_ADMIN created successfully (admin / admin123)' 
    });
  } catch (error: any) {
    console.error('Setup Admin Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
