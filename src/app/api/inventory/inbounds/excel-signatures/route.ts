export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '../../../../../../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import crypto from 'crypto';

function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

async function verifyUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return { isAuthorized: false, username: 'admin' };
    const payload = decodeJwt(token);
    return {
      isAuthorized: true,
      username: (payload.username || 'admin') as string
    };
  } catch {
    return { isAuthorized: false, username: 'admin' };
  }
}

/**
 * GET: 등록되어 있고 활성화된 자동 매핑용 엑셀 입고 시그니처 목록 조회
 */
export async function GET() {
  try {
    const result = await queryTable('crm_inbound_excel_signatures', {
      filters: { is_auto_approve: '1' }
    });
    
    const rows = (result.rows || []).filter((r: any) => r.deleted_at === null);
    const signatures = rows.map((r: any) => r.header_signature);

    return NextResponse.json({ success: true, signatures, configs: rows });
  } catch (error: any) {
    console.error("GET /api/inventory/inbounds/excel-signatures error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: 엑셀 입고 시그니처 매핑 신규 등록 및 갱신(Upsert)
 */
export async function POST(req: Request) {
  const { username } = await verifyUser();
  try {
    const body = await req.json();
    const { header_signature, partner_name, mapping_info } = body;

    if (!header_signature) {
      return NextResponse.json({ success: false, error: 'header_signature가 누락되었습니다.' }, { status: 400 });
    }

    const timestamp = getKoreanTimestamp();

    // 1. 이미 존재하는 시그니처인지 확인
    const checkRes = await queryTable('crm_inbound_excel_signatures', {
      filters: { header_signature }
    });
    const existing = (checkRes.rows || []).find((r: any) => r.deleted_at === null);

    if (existing) {
      // 2. 존재한다면 업데이트
      await updateRows('crm_inbound_excel_signatures', {
        partner_name,
        mapping_info: typeof mapping_info === 'string' ? mapping_info : JSON.stringify(mapping_info),
        updated_at: timestamp,
        updated_by: username
      }, {
        filters: { id: String(existing.id) }
      });
      return NextResponse.json({ success: true, message: '기존 매핑 시그니처가 성공적으로 갱신되었습니다.' });
    } else {
      // 3. 존재하지 않는다면 신규 등록 (7종 감사 컬럼 포함)
      const uuid = crypto.randomUUID();
      await insertRows('crm_inbound_excel_signatures', [{
        header_signature,
        partner_name,
        is_auto_approve: 1,
        mapping_info: typeof mapping_info === 'string' ? mapping_info : JSON.stringify(mapping_info),
        created_at: timestamp,
        uuid: uuid,
        updated_at: timestamp,
        updated_by: username
      }]);
      return NextResponse.json({ success: true, message: '새로운 엑셀 입고 매핑 시그니처가 성공적으로 등록되었습니다.' });
    }
  } catch (error: any) {
    console.error("POST /api/inventory/inbounds/excel-signatures error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
