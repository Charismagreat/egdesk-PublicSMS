export const dynamic = 'force-dynamic';
// HMR trigger timestamp: 2026-06-12 13:47:00

import { NextResponse } from 'next/server';
import { insertRows, executeSQL, queryTable } from '../../../../../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import crypto from 'crypto';
import fs from 'fs';

// 한국 시간 기준 YYYY-MM-DD HH:MM:SS 타임스탬프 획득 헬퍼
function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// 사용자 권한 검증 및 정보 반환 헬퍼 (로그인된 모든 임직원 가능)
async function verifyUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return { isAuthorized: false, username: null };
  try {
    const payload = decodeJwt(token);
    return {
      isAuthorized: true,
      username: (payload.username || 'user') as string
    };
  } catch {
    return { isAuthorized: false, username: null };
  }
}

/**
 * GET: 발급 대장 목록 조회 (소프트 삭제 필터링 반영)
 */
export async function GET(req: Request) {
  console.log("=== GET /api/templates-new/print-log API START ===");
  const { isAuthorized } = await verifyUser();
  console.log("Authorization status:", isAuthorized);
  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    // raw SQL 실행하여 템플릿 정보와 LEFT JOIN
    const sql = `
      SELECT 
        l.*,
        t.template_name,
        t.document_type,
        t.html_content
      FROM crm_web_form_logs l
      LEFT JOIN crm_web_templates t ON l.template_id = t.id
      ORDER BY l.id DESC
    `;
    console.log("Executing SQL via executeSQL...");
    const logsRes = await executeSQL(sql);
    const rows = logsRes.rows || [];
    const logs = rows.filter((r: any) => !r.deleted_at);
    console.log("SQL execution finished. Count:", logs.length);

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    console.error('GET /api/templates-new/print-log error:', err);
    return NextResponse.json({ success: false, error: "DEBUG_DIRECT_DB_ERR: " + err.message }, { status: 500 });
  }
}

/**
 * POST: 양식 출력 시 발급 이력 적재
 */
export async function POST(req: Request) {
  const { isAuthorized, username } = await verifyUser();
  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { template_id, record_id, record_name, print_data } = body;

    if (!template_id || !record_id || !print_data) {
      return NextResponse.json({ success: false, error: '필수 데이터(template_id, record_id, print_data)가 누락되었습니다.' }, { status: 400 });
    }

    const timestamp = getKoreanTimestamp();

    // 7종 감사 컬럼 기본 제공
    const insertData = {
      template_id: Number(template_id),
      record_id: String(record_id),
      record_name: record_name ? String(record_name) : '',
      print_data: typeof print_data === 'object' ? JSON.stringify(print_data) : String(print_data),
      issue_date: timestamp,
      uuid: crypto.randomUUID(),
      updated_at: timestamp,
      updated_by: username || 'user'
    };

    await insertRows('crm_web_form_logs', [insertData]);

    return NextResponse.json({ success: true, message: '발급대장에 인쇄 기록이 성공적으로 등록되었습니다.' });

  } catch (err: any) {
    console.error('POST /api/templates-new/print-log error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
