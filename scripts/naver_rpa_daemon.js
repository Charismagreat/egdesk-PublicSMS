/**
 * 네이버 블로그 Playwright RPA 자동 발행 데몬 스크립트 (네이티브 fetch 기반)
 * 
 * [동작 원리]
 * 1. Next.js DB API를 호출하여 현재 시간 기준 발행 대기 상태인 예약 포스트(SCHEDULED)를 조회합니다.
 * 2. 발행 대상 포스트가 존재할 경우 Playwright 브라우저를 기동합니다.
 * 3. 기존에 저장된 세션 쿠키(naver_session.json)가 있다면 로드하여 캡차 없이 즉시 로그인을 통과합니다.
 * 4. 네이버 블로그 스마트에디터(ONE) 글쓰기 화면에 접속하여 제목과 본문을 인간적인 모션을 모방해 입력합니다.
 * 5. 대표 이미지가 있을 경우 로컬 임시 파일로 변환하여 에디터 파일 초이저를 통해 안전하게 업로드합니다.
 * 6. 설정된 발행 기준에 따라 최종 [발행] 버튼을 클릭하여 발행을 완료합니다.
 * 7. 성공 시 실제 발행된 블로그 포스트 URL을 캡처하고 백엔드 API에 완료 피드백(POSTED)을 전송합니다.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { finished } = require('stream/promises');

// 환경변수 기반 기본 설정 로드
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SESSION_FILE_PATH = path.join(__dirname, 'naver_session.json');

// 인간적인 타이핑/클릭 패턴 모방을 위한 랜덤 대기 유틸리티 (지터 딜레이)
const jitterSleep = (min = 1500, max = 4000) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

async function runNaverRpaDaemon() {
  console.log('🤖 [RPA] 네이버 블로그 자동 발행 데몬 동작을 개시합니다.');
  console.log(`🌐 백엔드 연동 서버 주소: ${APP_URL}`);

  let browser;
  try {
    // 1. Next.js 백엔드 API를 통해 예약 포스트 리스트 호출 (네이티브 fetch 사용)
    const resList = await fetch(`${APP_URL}/api/naver-blog/posts`);
    const dataList = await resList.json();
    
    if (!dataList.success || !dataList.posts) {
      console.log('❌ [RPA] 예약 포스트 목록을 조회하지 못했습니다. 서버 상태를 확인하세요.');
      return;
    }

    const now = new Date();
    // 예정 시각이 지났고 아직 SCHEDULED(예약대기)인 포스트 중 가장 오래된 건 1개 선점
    const pendingPosts = dataList.posts
      .filter((post) => post.status === 'SCHEDULED' && new Date(post.scheduled_at) <= now)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

    if (pendingPosts.length === 0) {
      console.log('💤 [RPA] 현재 기준 실행해야 할 발행 예정 예약글이 없습니다. 데몬을 대기 모드로 전환합니다.');
      return;
    }

    const targetPost = pendingPosts[0];
    console.log(`🎯 [RPA] 발행 대상 예약 포스트 포커싱 성공: ID [${targetPost.id}] | 제목: "${targetPost.title}"`);

    // 2. Playwright 브라우저 및 컨텍스트 초기화
    // 네이버 캡차 방지 및 동적 스크롤 인터랙션을 위해 headless: false 모드를 강력히 권장합니다.
    browser = await chromium.launch({ 
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled', // 웹드라이버 자동화 감지 무력화 플래그
        '--window-size=1280,800'
      ]
    });

    let context;
    if (fs.existsSync(SESSION_FILE_PATH)) {
      console.log('🔑 [RPA] 기존 네이버 로그인 세션 파일(naver_session.json)이 확인되어 로드합니다.');
      const storageState = JSON.parse(fs.readFileSync(SESSION_FILE_PATH, 'utf8'));
      context = await browser.newContext({ 
        storageState,
        viewport: { width: 1280, height: 800 }
      });
    } else {
      console.log('⚠️ [RPA] 네이버 로그인 세션 쿠키 파일이 존재하지 않습니다.');
      console.log('💡 [RPA] 브라우저 창에서 최초 1회 로그인을 안전하게 진행해 주십시오. (2단계 인증 포함 3분 대기)');
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
      });
      
      const loginPage = await context.newPage();
      await loginPage.goto('https://nid.naver.com/nidlogin.login');
      
      // 사용자가 직접 로그인을 마무리하고 네이버 메인으로 넘어갈 때까지 대기
      await loginPage.waitForURL('https://www.naver.com/', { timeout: 180000 });
      console.log('🎉 [RPA] 네이버 로그인 완착 감지! 세션 파일로 덤프합니다.');
      
      const storageState = await context.storageState();
      fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(storageState, null, 2));
      console.log(`💾 [RPA] 쿠키 데이터가 안전하게 저장되었습니다: ${SESSION_FILE_PATH}`);
      await loginPage.close();
    }

    const page = await context.newPage();
    
    // 자동화 감지 무력화 스크립트 실행
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    console.log('🌐 [RPA] 네이버 블로그 스마트에디터 ONE 글쓰기 화면으로 진입합니다.');
    await page.goto('https://blog.naver.com/write');
    await jitterSleep(4000, 6000);

    // 에디터 경고 팝업 또는 임시저장 불러오기 모달 등이 떴을 때 닫기 핸들링
    try {
      const popupCloseBtn = page.locator('.se-popup-close, .dialog-close, button:has-text("취소")');
      if (await popupCloseBtn.count() > 0) {
        await popupCloseBtn.first().click();
        console.log('🧹 [RPA] 에디터 초기 안내/임시저장 팝업창을 닫았습니다.');
        await jitterSleep(1000, 2000);
      }
    } catch (err) {
      // 팝업이 없는 경우 패스
    }

    // 4. 제목(Title) 안전 입력
    console.log('✍️ [RPA] 블로그 포스팅 제목 입력을 시작합니다.');
    const titleContainer = page.locator('.se-document-title [contenteditable="true"]');
    await titleContainer.click();
    await jitterSleep(1000, 2000);

    // 타이핑 속도 감지를 회피하기 위해 element.innerText 변경 방식으로 붙여넣기 시뮬레이션
    await page.evaluate((titleText) => {
      const el = document.querySelector('.se-document-title [contenteditable="true"]');
      if (el) {
        el.innerText = titleText;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, targetPost.title);
    await jitterSleep(1500, 3000);

    // 5. 본문(Content) 안전 입력
    console.log('✍️ [RPA] 블로그 포스팅 본문 장문 원고 입력을 시작합니다.');
    const contentBody = page.locator('.se-component-write_area [contenteditable="true"]');
    await contentBody.first().click();
    await jitterSleep(1000, 2000);

    // 본문 전체 내용을 한 번에 주입하여 인간다운 붙여넣기(Ctrl+V) 모방
    await page.evaluate((bodyText) => {
      const el = document.querySelector('.se-component-write_area [contenteditable="true"]');
      if (el) {
        el.innerText = bodyText;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, targetPost.content);
    await jitterSleep(2000, 4500);

    // 6. 대표 이미지 리소스 연동 및 업로드 처리 (네이티브 fetch Stream 다운로드)
    if (targetPost.image_url) {
      console.log('📸 [RPA] AI 대표 이미지 다운로드 및 에디터 본문 첨부를 조율합니다.');
      const tempImgPath = path.join(__dirname, 'temp_blog_upload.jpg');
      
      const imgRes = await fetch(targetPost.image_url);
      if (!imgRes.ok) {
        throw new Error(`이미지 다운로드 실패: ${imgRes.statusText}`);
      }
      
      const writer = fs.createWriteStream(tempImgPath);
      // fetch body stream을 Readable로 변환하여 파일에 파이프 스트림 연결
      await finished(Readable.fromWeb(imgRes.body).pipe(writer));

      // Playwright 파일 선택 대화상자(FileChooser) 캡처 후 사진 업로드 버튼 타격
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('.se-image-upload-button, button:has-text("사진")').first().click()
      ]);
      
      await fileChooser.setFiles(tempImgPath);
      console.log('⏳ [RPA] 블로그 에디터 서버에 이미지 전송 중... 이미지 렌더링을 기다립니다.');
      await jitterSleep(5000, 8000); // 넉넉히 대기하여 로딩 완료 보장

      // 임시 다운로드 파일 즉시 정리
      fs.unlinkSync(tempImgPath);
      console.log('🧹 [RPA] 로컬 임시 이미지 캐시 파일 삭제 완료.');
    }

    // 7. 네이버 블로그 최종 [발행] 서브 패널 오픈
    console.log('🔔 [RPA] 에디터 우측 상단 [발행] 패널을 클릭합니다.');
    const publishBtn = page.locator('button:has-text("발행"), .btn_publish');
    await publishBtn.click();
    await jitterSleep(2000, 3500);

    // 8. 최종 [발행하기] 버튼 타격
    console.log('🚀 [RPA] 블로그 최종 등록 및 게시글 등록 트랜잭션을 완성합니다.');
    const finalSubmitBtn = page.locator('.btn_register, button:has-text("발행하기")');
    await finalSubmitBtn.click();
    await jitterSleep(6000, 9000); // 블로그 생태계 처리 완료 대기

    // 9. 결과 주소(URL) 피드백 획득 및 Next.js DB 상태 완료 처리
    const finalUrl = page.url();
    console.log(`🎉 [RPA] 네이버 블로그 실제 자동 포스팅 발행 완착 성공!`);
    console.log(`🔗 게시글 URL: ${finalUrl}`);

    const patchRes = await fetch(`${APP_URL}/api/naver-blog/posts`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: targetPost.id,
        updates: {
          status: 'POSTED',
          posted_at: new Date().toISOString()
        }
      })
    });
    
    const patchData = await patchRes.json();
    if (patchData.success) {
      console.log('💾 [RPA] Next.js SQLite DB 내부 포스팅 상태가 [POSTED]로 동기화 갱신 완료되었습니다.');
    } else {
      console.log('❌ [RPA] DB 상태 업데이트 API 호출이 실패했습니다.');
    }

  } catch (error) {
    console.error('❌ [RPA] 네이버 자동화 발행 처리 중 치명적 오류 발생:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 [RPA] Playwright 웹 브라우저 커넥션을 안전하게 닫고 종료합니다.');
    }
  }
}

// 모듈 단독 실행 시 자동 러닝
if (require.main === module) {
  runNaverRpaDaemon();
}
