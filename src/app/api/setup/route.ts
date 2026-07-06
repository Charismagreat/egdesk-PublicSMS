export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { setupDatabase } from '@/lib/setup-db';
import { deleteTable } from '../../../../egdesk-helpers';

export async function GET() {
  try {
    // 메타데이터 및 물리 테이블 스키마 칼각 동기화를 위해 레거시 crm_expenses 강제 소멸 후 재생성
    // crm_expenses, crm_estimate_items의 안전 보존을 위해 강제 드롭 로직을 제거하고 setupDatabase()에 통합 위임합니다.

    await setupDatabase();
    return NextResponse.json({ success: true, message: 'DB setup complete and crm_expenses table has been successfully recreated with latest schemas.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
