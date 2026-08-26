export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable } from '../../../../egdesk-helpers';
import { getTenantId } from '@/lib/tenant';

export async function GET() {
  try {
    const tenantId = (await getTenantId()) || 'tenant-wontrading';

    const result = await queryTable('message_logs', {
      filters: tenantId ? { tenant_id: tenantId } : {},
      orderBy: 'id',
      orderDirection: 'DESC',
      limit: 500
    });

    const activeLogs = (result.rows || []).filter((log: any) => !log.deleted_at);
    return NextResponse.json({ success: true, logs: activeLogs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
