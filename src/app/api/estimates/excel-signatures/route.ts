export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import crypto from 'crypto';
import { queryTable, insertRows, updateRows } from '../../../../../egdesk-helpers';

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
 * GET: 등록되어 있고 활성화된 자동 승인(Auto-bypass)용 엑셀 헤더 시그니처 목록 조회
 * (소프트 삭제 필터링 규칙 준수)
 */
export async function GET() {
  try {
    const result = await queryTable('crm_excel_signatures', {
      filters: { is_auto_approve: '1' }
    });

    const activeRows = (result.rows || []).filter((r: any) => !r.deleted_at);
    const signatures = activeRows.map((r: any) => r.header_signature);
    
    return NextResponse.json({ success: true, signatures, configs: activeRows });
  } catch (error: any) {
    console.error("GET /api/estimates/excel-signatures error:", error);
    return NextResponse.json({ success: true, signatures: [], configs: [] });
  }
}

/**
 * POST: 엑셀 헤더 시그니처 신규 학습 등록 및 갱신(Upsert)
 */
export async function POST(req: Request) {
  const { username } = await verifyUser();
  try {
    const body = await req.json();
    const { header_signature, partner_name, transaction_type, mapping_info } = body;

    if (!header_signature) {
      return NextResponse.json({ success: false, error: 'header_signature가 누락되었습니다.' }, { status: 400 });
    }

    const timestamp = getKoreanTimestamp();

    // 1. 이미 존재하는 시그니처인지 확인 (deleted_at 필터 없이 전체 조회하여 soft-deleted 항목도 포함)
    const existingRes = await queryTable('crm_excel_signatures', {
      filters: { header_signature }
    });
    const existing = existingRes.rows && existingRes.rows.length > 0 ? existingRes.rows[0] : null;

    if (existing) {
      // 2. 존재하면 복원 및 정보 업데이트
      await updateRows('crm_excel_signatures', {
        is_auto_approve: 1,
        deleted_at: null,
        deleted_by: null,
        partner_name: partner_name || null,
        transaction_type: transaction_type || null,
        mapping_info: mapping_info || null,
        updated_at: timestamp,
        updated_by: username
      }, {
        filters: { id: String(existing.id) }
      });
      console.log(`[Excel Signature Auto-Approve] Updated and restored existing signature ID: ${existing.id}`);
    } else {
      // 3. 존재하지 않으면 감사 컬럼들과 함께 새로 등록
      const uuid = crypto.randomUUID();
      const id = Date.now();
      await insertRows('crm_excel_signatures', [{
        id,
        header_signature,
        partner_name: partner_name || null,
        transaction_type: transaction_type || null,
        is_auto_approve: 1,
        mapping_info: mapping_info || null,
        created_at: timestamp,
        uuid,
        updated_at: timestamp,
        updated_by: username
      }]);
      console.log(`[Excel Signature Auto-Approve] Created new signature for: ${header_signature}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/estimates/excel-signatures error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
