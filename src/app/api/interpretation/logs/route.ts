export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { insertRows, executeSQL } from '@/../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import crypto from 'crypto';

// 한국 시간 타임스탬프 헬퍼
function getKoreanTimestamp() {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

// 쿠키 파서
function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// 사용자 인증 헬퍼
async function verifyUser(req?: Request) {
  let token: string | undefined;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get('auth_token')?.value;
  } catch (e) {
    console.error('[verifyUser] cookies() 읽기 실패:', e);
  }

  if (!token && req) {
    const cookieHeader = req.headers.get('cookie');
    token = getCookieValue(cookieHeader, 'auth_token') || undefined;
  }

  if (!token) return { isAuthenticated: false, username: 'system' };
  try {
    const payload = decodeJwt(token);
    return {
      isAuthenticated: true,
      username: (payload.username || 'admin') as string
    };
  } catch {
    return { isAuthenticated: false, username: 'system' };
  }
}

/**
 * POST: 실시간 통역 도중 한 번의 발화 및 번역 로그 적재
 */
export async function POST(req: Request) {
  const { isAuthenticated, username } = await verifyUser(req);
  if (!isAuthenticated) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { session_uuid, speaker_role, original_text, translated_text, audio_url } = body;

    if (!session_uuid || !speaker_role || !original_text || !translated_text) {
      return NextResponse.json({ success: false, error: '필수 로그 항목이 누락되었습니다.' }, { status: 400 });
    }

    const uuid = crypto.randomUUID();
    const timestamp = getKoreanTimestamp();

    // 순차 ID 발급을 위해 현재 최대 ID 조회
    const maxIdRes = await executeSQL('SELECT MAX(id) as maxId FROM crm_interpretation_logs');
    const nextId = (maxIdRes.rows?.[0]?.maxId || 0) + 1;

    const logData = {
      id: nextId,
      uuid,
      session_uuid,
      speaker_role, // 'host' or 'guest'
      original_text,
      translated_text,
      audio_url: audio_url || null,
      created_at: timestamp,
      updated_at: timestamp,
      updated_by: username
    };

    await insertRows('crm_interpretation_logs', [logData]);

    return NextResponse.json({
      success: true,
      log_uuid: uuid,
      message: '발화 로그가 성공적으로 데이터베이스에 기록되었습니다.'
    });

  } catch (err: any) {
    console.error('POST /api/interpretation/logs error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
