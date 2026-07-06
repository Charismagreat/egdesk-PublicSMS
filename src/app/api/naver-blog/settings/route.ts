export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '../../../../../egdesk-helpers';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

// 기본 설정 값 정의
const DEFAULT_SETTINGS = {
  id: 1,
  is_autopilot: 0, // 0: 수동 검토 모드, 1: 100% 무인 오토파일럿 모드
  autopilot_interval: 'DAILY', // DAILY, WEEKLY
  autopilot_time: '10:00', // 발행 시간 (HH:MM)
  tone_style: '정보제공형', // 정보제공형, 솔직리뷰형, 전문칼럼형, 친근한일상형
  naver_blog_id: '', // 연동 블로그 ID
  api_client_id: '', // (더이상 사용하지 않으나 하위 호환 유지)
  api_client_secret: '', // (더이상 사용하지 않으나 하위 호환 유지)
};

// 세션 상태 파일 경로
const SESSION_FILE_PATH = path.join(process.cwd(), 'scripts', 'naver_session.json');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // 1. 세션 파일 강제 생성 트리거 액션 핸들링 (로컬 Playwright 수동 로그인 기동)
    if (action === 'trigger_session') {
      console.log('🤖 [API] 사용자 요청에 따라 로컬 Playwright 로그인 세션 굽기 브라우저를 기동합니다.');
      
      const daemonScriptPath = path.join(process.cwd(), 'scripts', 'naver_rpa_daemon.js');
      
      // 백그라운드 비동기 프로세스로 실행 (Headed 크로미움 브라우저 팝업)
      exec(`node "${daemonScriptPath}"`, (err, stdout, stderr) => {
        if (err) {
          console.error('❌ [API] Playwright 세션 데몬 실행 에러:', err);
          return;
        }
        console.log('🤖 [API] Playwright 세션 데몬 콘솔 로그:', stdout);
      });

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
    
    // 로컬 세션 파일 유효 상태 체크
    const hasSessionFile = fs.existsSync(SESSION_FILE_PATH) ? 1 : 0;

    if (result.rows && result.rows.length > 0) {
      return NextResponse.json({ 
        success: true, 
        settings: result.rows[0],
        has_session: hasSessionFile
      });
    }

    // 설정이 없을 경우 기본 설정값으로 생성 및 저장
    await insertRows('naver_blog_marketing_settings', [DEFAULT_SETTINGS]);
    return NextResponse.json({ 
      success: true, 
      settings: DEFAULT_SETTINGS,
      has_session: hasSessionFile
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
      naver_blog_id: data.naver_blog_id || '',
      api_client_id: '',
      api_client_secret: '',
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
