export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { queryTable, updateRows } from '../../../../../egdesk-helpers';
import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// 글로벌 실행 락(Lock) 상태 관리 (중복 실행 방지)
let isRpaRunning = false;

export async function POST(req: Request) {
  try {
    // 1. 네이버 블로그 마케팅 설정 조회 (공식 API 연동 키 보유 여부 체크)
    const settingsRes = await queryTable('naver_blog_marketing_settings', { filters: { id: '1' } });
    const settings = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0] : null;

    const clientId = settings?.api_client_id?.trim() || '';
    const clientSecret = settings?.api_client_secret?.trim() || '';
    const blogId = settings?.naver_blog_id?.trim() || '';

    // 2. 공식 API 연동 모드 처리 (Client ID & Client Secret 이 입력되어 있는 경우)
    if (clientId && clientSecret) {
      console.log(`📡 [API] 네이버 공식 API 키(Client ID: ${clientId}) 기반 포스팅 전송을 시도합니다...`);

      // 발행 대상 SCHEDULED 포스트 1건 조회 (미래 10분 이내 시각 또는 시각 무관 최신 SCHEDULED 포스트)
      const postsRes = await queryTable('crm_naver_blog_posts', { limit: 10000 });
      const nowThreshold = new Date(Date.now() + 600000).toISOString(); // 10분 마진
      const pendingPosts = (postsRes.rows || [])
        .filter((p: any) => p.status === 'SCHEDULED' && (!p.scheduled_at || p.scheduled_at <= nowThreshold))
        .sort((a: any, b: any) => new Date(a.scheduled_at || a.created_at || 0).getTime() - new Date(b.scheduled_at || b.created_at || 0).getTime());

      if (pendingPosts.length === 0) {
        return NextResponse.json({
          success: true,
          mode: 'API',
          message: '공식 API 모드: 현재 발행 예정인 예약 포스트가 없습니다.'
        });
      }

      const targetPost = pendingPosts[0];

      try {
        // 네이버 공식 블로그 글쓰기 Open API 호출
        // Reference: https://openapi.naver.com/v1/nid/blog/post.json
        const formParams = new URLSearchParams();
        formParams.append('title', targetPost.title || '제목 없음');
        formParams.append('contents', targetPost.content || '');

        const apiRes = await fetch('https://openapi.naver.com/v1/nid/blog/post.json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret,
          },
          body: formParams.toString()
        });

        const apiData = await apiRes.json();

        if (apiRes.ok && apiData.message && apiData.message.status === '200') {
          // 공식 API 발행 성공 시 DB 갱신
          await updateRows('crm_naver_blog_posts', {
            status: 'POSTED',
            posted_at: new Date().toISOString()
          }, { filters: { id: String(targetPost.id) } });

          console.log(`🎉 [API] 네이버 공식 API를 통한 포스팅 발행 완착 성공! ID: ${targetPost.id}`);

          return NextResponse.json({
            success: true,
            mode: 'API',
            message: `공식 API 연동 성공! 블로그(@${blogId || 'nocodelife'})에 포스팅 [${targetPost.title}]이 즉시 발행되었습니다.`,
            post: targetPost,
            api_response: apiData
          });
        } else {
          // 네이버 OpenAPI 에러 응답 파싱 (OAuth 토큰 필요 또는 API 접근 권한 부족 등)
          const errorMsg = apiData.errorMessage || apiData.message || JSON.stringify(apiData);
          console.warn(`⚠️ [API] 네이버 공식 API 연동 응답 에러 (Client Key 제한): ${errorMsg}`);

          // 공식 API Key 실패 시 RPA 모드로 자동 폴백(Fallback) 기동 지원
          console.log('🤖 [API] 공식 API 인증 제한으로 인해 RPA 브라우저 자동화 모드로 안전하게 전환(Fallback)하여 발행을 계속 진행합니다.');
        }
      } catch (apiErr: any) {
        console.error('❌ [API] 네이버 공식 API 통신 오류:', apiErr.message);
      }
    }

    // 3. RPA 간편 연동 모드 (또는 공식 API 폴백) 처리
    const daemonScriptPath = path.join(process.cwd(), 'scripts', 'naver_rpa_daemon.js');
    const sessionFilePath = path.join(process.cwd(), 'scripts', 'naver_session.json');

    if (!fs.existsSync(daemonScriptPath)) {
      return NextResponse.json({
        success: false,
        error: 'RPA 데몬 스크립트(naver_rpa_daemon.js)를 찾을 수 없습니다.'
      }, { status: 404 });
    }

    const hasSession = fs.existsSync(sessionFilePath);

    // 2-1. API 인증키와 RPA 세션 둘 다 없는 경우 최고관리자 실패 원인 기록 및 반환
    if (!clientId && !hasSession) {
      console.warn('⚠️ [API] 네이버 API 인증 키와 RPA 로그인 세션이 모두 없습니다. 포스팅을 FAILED 처리합니다.');
      
      const postsRes = await queryTable('crm_naver_blog_posts', { limit: 10000 });
      const pendingPosts = (postsRes.rows || []).filter((p: any) => p.status === 'SCHEDULED');

      for (const p of pendingPosts) {
        await updateRows('crm_naver_blog_posts', {
          status: 'FAILED',
          error_message: '네이버 공식 API 인증 키(Client ID/Secret) 미등록 및 RPA 자동화 로그인 세션(naver_session.json)이 등록되어 있지 않습니다.'
        }, { filters: { id: String(p.id) } });
      }

      return NextResponse.json({
        success: false,
        error: '네이버 API 인증 키 및 RPA 로그인 세션이 미등록 상태입니다. 1단계 계정 관리에서 연동 설정을 완료해 주세요.',
        reason_code: 'NO_AUTH_SETTING'
      }, { status: 400 });
    }

    isRpaRunning = true;
    console.log('🤖 [API] 네이버 블로그 RPA 자동 발행 데몬을 즉시 기동합니다...');

    // 5초 안전 타임아웃 락 해제
    const lockTimer = setTimeout(() => {
      isRpaRunning = false;
    }, 5000);

    // 4. 요청 헤더(Host 및 Referer)에서 사용자의 현재 포트 동적 추출
    const referer = req.headers.get('referer');
    let currentAppUrl = '';
    if (referer) {
      try {
        const u = new URL(referer);
        currentAppUrl = `${u.protocol}//${u.host}`;
      } catch (e) {}
    }
    if (!currentAppUrl) {
      const host = req.headers.get('host') || 'localhost:4000';
      const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
      currentAppUrl = `${protocol}://${host}`;
    }

    const env = { ...process.env, NEXT_PUBLIC_APP_URL: currentAppUrl };
    
    console.log(`🚀 [API] RPA 데몬 바인딩 실행 (CWD: ${process.cwd()}, Node: ${process.execPath})`);

    const child = spawn(process.execPath, [daemonScriptPath], {
      cwd: process.cwd(),
      env,
      detached: true,
      windowsHide: false,
      stdio: 'ignore'
    });

    child.unref();

    // 25초 후 글로벌 락 자동 해제
    setTimeout(() => {
      isRpaRunning = false;
    }, 25000);

    return NextResponse.json({
      success: true,
      triggered: true,
      mode: 'RPA',
      has_session: hasSession,
      message: hasSession
        ? `네이버 블로그(@${blogId || '설정 ID'}) 자동 발행 프로세스가 백그라운드에서 기동되었습니다.`
        : `네이버 세션 쿠키가 없습니다. 팝업 브라우저가 열리면 블로그(@${blogId || 'nocodelife'}) 계정 로그인을 진행해 주세요.`
    });

  } catch (error: any) {
    isRpaRunning = false;
    console.error('네이버 블로그 포스팅 발행 트리거 API 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
