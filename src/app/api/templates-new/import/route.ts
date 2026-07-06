export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows, executeSQL } from '../../../../../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import crypto from 'crypto';

// 한국 시간 기준 YYYY-MM-DD HH:MM:SS 타임스탬프 획득 헬퍼
function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// 쿠키 헤더 문자열에서 특정 쿠키 값을 파싱하는 헬퍼 함수
function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// 최고 관리자(SUPER_ADMIN) 권한 검증 및 사용자 정보 반환 헬퍼 (route.ts와 호환)
async function verifySuperAdmin(req?: Request) {
  let token: string | undefined;

  try {
    const cookieStore = await cookies();
    token = cookieStore.get('auth_token')?.value;
  } catch (e) {
    console.error('[verifySuperAdmin] cookies() 읽기 실패:', e);
  }

  if (!token && req) {
    const cookieHeader = req.headers.get('cookie');
    token = getCookieValue(cookieHeader, 'auth_token') || undefined;
  }

  if (!token) return { isAuthorized: false, username: null };
  try {
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    return {
      isAuthorized: role === 'SUPER_ADMIN',
      username: (payload.username || 'admin') as string
    };
  } catch {
    return { isAuthorized: false, username: null };
  }
}

/**
 * POST: 양식 백업 파일 가져오기 (Import)
 * - 덮어쓰기(overwrite) 또는 복사본 추가(duplicate) 지원
 */
export async function POST(req: Request) {
  const { isAuthorized, username } = await verifySuperAdmin(req);
  if (!isAuthorized) {
    return NextResponse.json({ success: false, error: '최고관리자 권한이 필요합니다.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { 
      template_name, 
      html_content, 
      web_html_content, 
      document_type, 
      is_active, 
      is_print_active, 
      is_web_active,
      actionType, // 'overwrite' | 'duplicate'
      existingId 
    } = body;

    if (!template_name || (!html_content && !web_html_content)) {
      return NextResponse.json({ success: false, error: '유효한 양식 데이터가 아닙니다.' }, { status: 400 });
    }

    const timestamp = getKoreanTimestamp();
    const currentUsername = username || 'admin';

    if (actionType === 'overwrite' && existingId) {
      // 1. 덮어쓰기 (Overwrite)
      const templateId = parseInt(existingId);
      const updateData = {
        template_name,
        html_content: html_content && html_content.trim() ? html_content : '<!-- 인쇄 비활성화 양식 -->',
        web_html_content: web_html_content || '',
        document_type: document_type || '',
        is_active: is_active !== undefined ? Number(is_active) : 1,
        is_print_active: is_print_active !== undefined ? Number(is_print_active) : 1,
        is_web_active: is_web_active !== undefined ? Number(is_web_active) : 1,
        updated_at: timestamp,
        updated_by: currentUsername
      };

      await updateRows('crm_web_templates', updateData, { filters: { id: String(templateId) } });
      return NextResponse.json({ 
        success: true, 
        message: `'${template_name}' 양식이 성공적으로 덮어쓰기 되었습니다.`, 
        id: templateId 
      });
    } else {
      // 2. 복사본으로 추가 (Duplicate / New)
      let finalName = template_name;

      // 이름 중복 검사 및 자동 넘버링 부여 (예: "양식명_복사본", "양식명_복사본(2)")
      if (actionType === 'duplicate') {
        let nameExists = true;
        let suffixCount = 0;
        
        while (nameExists) {
          const checkName = suffixCount === 0 
            ? `${template_name}_복사본`
            : `${template_name}_복사본(${suffixCount})`;
          
          const dupRes = await queryTable('crm_web_templates', { filters: { template_name: checkName } });
          const activeDups = (dupRes.rows || []).filter((r: any) => !r.deleted_at);

          if (activeDups.length === 0) {
            finalName = checkName;
            nameExists = false;
          } else {
            suffixCount++;
          }
        }
      }

      const insertData = {
        template_name: finalName,
        html_content: html_content && html_content.trim() ? html_content : '<!-- 인쇄 비활성화 양식 -->',
        web_html_content: web_html_content || '',
        document_type: document_type || '',
        is_active: is_active !== undefined ? Number(is_active) : 1,
        is_print_active: is_print_active !== undefined ? Number(is_print_active) : 1,
        is_web_active: is_web_active !== undefined ? Number(is_web_active) : 1,
        uuid: crypto.randomUUID(),
        updated_at: timestamp,
        updated_by: currentUsername
      };

      await insertRows('crm_web_templates', [insertData]);

      // 생성된 새 ID 반환
      const maxIdRes = await executeSQL('SELECT MAX(id) as maxId FROM crm_web_templates');
      const newId = maxIdRes.rows?.[0]?.maxId || 0;

      return NextResponse.json({ 
        success: true, 
        message: `'${finalName}' 양식이 복사본으로 성공적으로 생성되었습니다.`, 
        id: newId 
      });
    }
  } catch (err: any) {
    console.error('Import template API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
