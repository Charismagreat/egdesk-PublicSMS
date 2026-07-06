export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, getGeminiApiKey } from '@/../egdesk-helpers';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

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

  if (!token) return { isAuthenticated: false };
  try {
    const payload = decodeJwt(token);
    return { isAuthenticated: true };
  } catch {
    return { isAuthenticated: false };
  }
}

/**
 * GET: 실시간 통역에 필요한 구글 API 설정 및 키 조회
 */
export async function GET(req: Request) {
  const { isAuthenticated } = await verifyUser(req);
  if (!isAuthenticated) {
    return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
  }

  try {
    // DB에서 구글 API 키 및 라이브 모델 설정 가져오기
    let apiKey: string | null = null;
    let selectedModel = 'gemini-2.5-flash'; // 기본 모델

    try {
      const settingsKeyRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
      apiKey = settingsKeyRes.rows && settingsKeyRes.rows.length > 0 ? settingsKeyRes.rows[0].value : null;

      const settingsModelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
      if (settingsModelRes.rows && settingsModelRes.rows.length > 0 && settingsModelRes.rows[0].value) {
        selectedModel = settingsModelRes.rows[0].value;
      }
    } catch (dbErr) {
      console.error('API 설정 로드 오류:', dbErr);
    }

    if (apiKey && !apiKey.startsWith('AIzaSy')) {
      try {
        const decryptedKeyRes = await getGeminiApiKey({ name: apiKey });
        if (decryptedKeyRes && decryptedKeyRes.success && decryptedKeyRes.apiKey) {
          apiKey = decryptedKeyRes.apiKey;
        }
      } catch (keyErr) {
        console.error('⚠️ [interpretation] EGDesk에서 API 키 해독에 실패했습니다:', keyErr);
      }
    }

    if (!apiKey) {
      apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
    }

    return NextResponse.json({
      success: true,
      apiKey: apiKey,
      model: selectedModel
    });

  } catch (err: any) {
    console.error('GET /api/interpretation/config error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
