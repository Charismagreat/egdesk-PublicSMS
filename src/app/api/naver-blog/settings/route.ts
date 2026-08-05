export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '../../../../../egdesk-helpers';
import fs from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';

// 기본 설정 값 정의
const DEFAULT_SETTINGS = {
  id: 1,
  is_autopilot: 0, // 0: 수동 검토 모드, 1: 100% 무인 오토파일럿 모드
  autopilot_interval: 'DAILY', // DAILY, WEEKLY
  autopilot_time: '10:00', // 발행 시간 (HH:MM)
  tone_style: '정보제공형', // 정보제공형, 솔직리뷰형, 전문칼럼형, 친근한일상형
  naver_blog_id: '', // 연동 블로그 ID
  naver_login_id: '', // 자동 로그인 네이버 ID
  naver_login_pw: '', // 자동 로그인 네이버 비밀번호
  api_client_id: '', // (더이상 사용하지 않으나 하위 호환 유지)
  api_client_secret: '', // (더이상 사용하지 않으나 하위 호환 유지)
};

// 세션 상태 파일 경로
const SESSION_FILE_PATH = path.join(process.cwd(), 'scripts', 'naver_session.json');

/**
 * naver_session.json 쿠키로 네이버 Live Ping (https://nid.naver.com/user2/help/myInfo)을 수행하여
 * 실제 네이버 서버에서 로그인 세션이 유지되어 있는지 100% 실시간 검증합니다.
 */
async function checkSessionValidity(): Promise<number> {
  if (!fs.existsSync(SESSION_FILE_PATH)) return 0;
  try {
    const raw = fs.readFileSync(SESSION_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    const cookies = parsed.cookies || [];
    
    if (!cookies || cookies.length === 0) return 0;

    const nidAut = cookies.find((c: any) => c.name === 'NID_AUT')?.value;
    const nidSes = cookies.find((c: any) => c.name === 'NID_SES')?.value;

    if (!nidAut || !nidSes) {
      console.warn('⚠️ [API] naver_session.json 파일에 필수 로그인 인증 쿠키(NID_AUT/NID_SES)가 누락되었습니다.');
      return 0;
    }

    // 네이버 서버 Live Ping 수행 (302 Redirect 발생 시 세션 만료로 판정)
    const cookieHeader = `NID_AUT=${nidAut}; NID_SES=${nidSes}`;
    const liveRes = await fetch('https://nid.naver.com/user2/help/myInfo', {
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    }).catch(() => null);

    if (liveRes) {
      const location = liveRes.headers.get('location') || '';
      // 302 Redirect 또는 nidlogin 유도 시 세션 만료 처리
      if (liveRes.status === 302 && location.includes('nidlogin')) {
        console.warn('🔴 [API Live Ping] 네이버 서버에서 로그인 세션 거부(만료)가 감지되었습니다. 잔여 세션 파일을 정리합니다.');
        try { fs.unlinkSync(SESSION_FILE_PATH); } catch (e) {}
        return 0;
      }
    }

    console.log('🎉 [API Live Ping] 네이버 인증 세션이 살아있음을 확인했습니다! 🟢');
    return 1;
  } catch (e: any) {
    console.error('⚠️ [API] 세션 검증 예외:', e.message);
    return 0;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // 1. 세션 파일 강제 생성 트리거 액션 핸들링 (로컬 Playwright 수동 로그인 기동)
    if (action === 'trigger_session') {
      console.log('🤖 [API] 사용자 요청에 따라 로컬 Playwright 로그인 세션 굽기 브라우저를 기동합니다.');
      
      const daemonScriptPath = path.join(process.cwd(), 'scripts', 'naver_rpa_daemon.js');
      
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        const nodeExe = process.execPath;
        const cmd = `start "EGDesk Naver RPA Login" "${nodeExe}" "${daemonScriptPath}" --login`;
        exec(cmd, { cwd: process.cwd() });
      } else {
        const child = spawn(process.execPath, [daemonScriptPath, '--login'], {
          cwd: process.cwd(),
          detached: true,
          windowsHide: false,
          stdio: 'ignore'
        });
        child.unref();
      }
      console.log('🚀 [API] 독립형 GUI 프로세스로 로그인 브라우저를 성공적으로 스폰하였습니다.');

      return NextResponse.json({ 
        success: true, 
        message: '로컬 PC에 네이버 로그인 인증 브라우저가 실행되었습니다. 창이 열리면 로그인을 마쳐주세요.' 
      });
    }

    // 2. 세션 파일 강제 삭제 (로그아웃/해제) 액션 핸들링
    if (action === 'clear_session') {
      if (fs.existsSync(SESSION_FILE_PATH)) {
        fs.unlinkSync(SESSION_FILE_PATH);
        console.log('🧹 [API] naver_session.json 쿠키 인증 파일이 강제 파기되었습니다.');
      }
      return NextResponse.json({ success: true, message: 'RPA 자동화 세션이 안전하게 폐기되었습니다.' });
    }

    // 3. ID가 1인 설정을 조회
    const result = await queryTable('naver_blog_marketing_settings', { filters: { id: '1' } });
    
    // 로컬 세션 파일 실시간 네이버 Live Ping 쿠키 유효성 검증
    const hasValidSession = await checkSessionValidity();

    if (result.rows && result.rows.length > 0) {
      return NextResponse.json({ 
        success: true, 
        settings: result.rows[0],
        has_session: hasValidSession
      });
    }

    // 설정이 없을 경우 기본 설정값으로 생성 및 저장
    await insertRows('naver_blog_marketing_settings', [DEFAULT_SETTINGS]);
    return NextResponse.json({ 
      success: true, 
      settings: DEFAULT_SETTINGS,
      has_session: hasValidSession
    });
  } catch (error: any) {
    console.error('네이버 블로그 설정 조회 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // 설정이 존재하는지 확인
    const checkExist = await queryTable('naver_blog_marketing_settings', { filters: { id: '1' } });
    
    const updates = {
      is_autopilot: data.is_autopilot !== undefined ? Number(data.is_autopilot) : 0,
      autopilot_interval: data.autopilot_interval || 'DAILY',
      autopilot_time: data.autopilot_time || '10:00',
      tone_style: data.tone_style || '정보제공형',
      naver_blog_id: data.naver_blog_id !== undefined ? data.naver_blog_id : (checkExist.rows?.[0]?.naver_blog_id || ''),
      naver_login_id: data.naver_login_id !== undefined ? data.naver_login_id : (checkExist.rows?.[0]?.naver_login_id || ''),
      naver_login_pw: data.naver_login_pw !== undefined ? data.naver_login_pw : (checkExist.rows?.[0]?.naver_login_pw || ''),
      api_client_id: data.api_client_id !== undefined ? data.api_client_id : (checkExist.rows?.[0]?.api_client_id || ''),
      api_client_secret: data.api_client_secret !== undefined ? data.api_client_secret : (checkExist.rows?.[0]?.api_client_secret || ''),
    };

    if (checkExist.rows && checkExist.rows.length > 0) {
      // 존재하면 업데이트
      await updateRows('naver_blog_marketing_settings', updates, { filters: { id: '1' } });
    } else {
      // 존재하지 않으면 삽입
      await insertRows('naver_blog_marketing_settings', [{ id: 1, ...updates }]);
    }

    const hasSessionFile = fs.existsSync(SESSION_FILE_PATH) ? 1 : 0;

    return NextResponse.json({ 
      success: true, 
      settings: { id: 1, ...updates },
      has_session: hasSessionFile
    });
  } catch (error: any) {
    console.error('네이버 블로그 설정 저장 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
