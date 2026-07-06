export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable } from '../../../../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export async function GET() {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const result = await queryTable('message_logs', {
      filters: { tenant_id: tenantId },
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });
    // 데이터베이스 감사 룰 준수: 소프트 삭제된 항목 배제 (deleted_at이 있는 로그는 반환 안 함)
    const activeLogs = (result.rows || []).filter((log: any) => !log.deleted_at);
    return NextResponse.json({ success: true, logs: activeLogs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
