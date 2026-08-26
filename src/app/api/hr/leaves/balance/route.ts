export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable } from '@/../egdesk-helpers';

/**
 * 로그인한 직원의 잔여 연차 조회 API
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        balance: { total_allowed: 15, used: 0, remaining: 15 }
      });
    }

    const payload = decodeJwt(token);
    const username = (payload.username as string) || '';
    const tenantId = (payload.tenant_id as string) || 'default';
    let operatorId = payload.id;

    if (!operatorId && username) {
      const opRes = await queryTable('crm_operators', {
        filters: { username, tenant_id: tenantId }
      }).catch(() => ({ rows: [] }));
      if (opRes.rows && opRes.rows.length > 0) {
        operatorId = opRes.rows[0].id;
      }
    }

    if (!operatorId) {
      return NextResponse.json({
        success: true,
        balance: { total_allowed: 15, used: 0, remaining: 15 }
      });
    }

    const balRes = await queryTable('crm_operator_leave_balances', {
      filters: { operator_id: String(operatorId), tenant_id: tenantId }
    }).catch(() => ({ rows: [] }));

    if (balRes.rows && balRes.rows.length > 0) {
      const row = balRes.rows[0];
      return NextResponse.json({
        success: true,
        balance: {
          total_allowed: Number(row.total_allowed) || 15,
          used: Number(row.used) || 0,
          remaining: Number(row.remaining) ?? 15
        }
      });
    }

    return NextResponse.json({
      success: true,
      balance: { total_allowed: 15, used: 0, remaining: 15 }
    });

  } catch (error: any) {
    console.error('Leaves Balance API Error:', error);
    return NextResponse.json({
      success: true,
      balance: { total_allowed: 15, used: 0, remaining: 15 }
    });
  }
}
