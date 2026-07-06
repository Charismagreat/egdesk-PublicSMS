export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, updateRows, insertRows } from '@/../egdesk-helpers';
import crypto from 'crypto';

// 한국 시간 기준 YYYY-MM-DD HH:MM:SS 타임스탬프 헬퍼
function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// 최고관리자/사장 권한 세션 체크 헬퍼
async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return { isAuthorized: false, username: null };
  try {
    const payload = decodeJwt(token);
    const hasRole = payload.role === 'SUPER_ADMIN' || payload.role === 'PRESIDENT';
    return {
      isAuthorized: hasRole,
      username: (payload.username || 'admin') as string
    };
  } catch {
    return { isAuthorized: false, username: null };
  }
}

/**
 * POST: AI 홈페이지 디자인 결과물을 특정 도메인(대표 홈페이지 / 커스텀 도메인 / 서브도메인)으로 실시간 배포 퍼블리싱
 */
export async function POST(req: Request) {
  const { isAuthorized, username } = await verifyAdmin();
  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: '인증 권한이 없습니다.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { domain_type, domain_url, html_content, config_json, title, description } = body;

    if (!domain_type || !domain_url || !html_content || !config_json) {
      return NextResponse.json({ success: false, error: '필수 데이터(domain_type, domain_url, html_content, config_json)가 누락되었습니다.' }, { status: 400 });
    }

    const timestamp = getKoreanTimestamp();

    // 1. 버전 관리를 위해 동일 domain_url을 가지는 기존 활성(is_active = 1) 배포 건들을 모두 비활성(is_active = 0) 처리
    try {
      const existingRes = await queryTable('crm_web_published_sites', {
        filters: { domain_url: domain_url.trim(), is_active: '1' }
      });

      if (existingRes.rows && existingRes.rows.length > 0) {
        // 동일 도메인의 기존 활성 건들을 일괄 비활성화
        await updateRows('crm_web_published_sites', 
          { is_active: 0, updated_at: timestamp, updated_by: username || 'admin' },
          { filters: { domain_url: domain_url.trim() } }
        );
      }
    } catch (dbErr) {
      console.warn('기존 배포 비활성화 처리 중 경고 (신규 테이블 최초 배포 등):', dbErr);
    }

    // 2. 신규 배포 정보 적재 (7종 감사 컬럼 주입)
    const insertData = {
      domain_type: String(domain_type).trim(),
      domain_url: String(domain_url).trim(),
      html_content: String(html_content),
      config_json: typeof config_json === 'object' ? JSON.stringify(config_json) : String(config_json),
      title: title ? String(title).trim() : '',
      description: description ? String(description).trim() : '',
      is_active: 1,
      uuid: crypto.randomUUID(),
      updated_at: timestamp,
      updated_by: username || 'admin'
    };

    await insertRows('crm_web_published_sites', [insertData]);

    return NextResponse.json({
      success: true,
      message: `'${domain_url}' 주소로의 웹사이트 실시간 배포 퍼블리싱이 성공적으로 완료되었습니다! 🚀`
    });

  } catch (err: any) {
    console.error('POST /api/website/publish error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
