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
const { convertHtmlToSmartEditorJson } = require('./html-to-smarteditor');
const { finished } = require('stream/promises');

// 환경변수 기반 기본 설정 로드 (EGDesk 운영 포트: 4002)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4002';
const SESSION_FILE_PATH = path.join(__dirname, 'naver_session.json');

// 인간적인 타이핑/클릭 패턴 모방을 위한 랜덤 대기 유틸리티 (지터 딜레이)
const jitterSleep = (min = 1500, max = 4000) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
};

// 백엔드 실행 포트 감지 헬퍼 함수
async function getAppUrlWithFallback() {
  const candidatePorts = [process.env.NEXT_PUBLIC_APP_URL, 'http://localhost:4002', 'http://localhost:4000', 'http://localhost:4001', 'http://localhost:4003'];
  for (const url of candidatePorts) {
    if (!url) continue;
    try {
      const cleanUrl = url.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/api/naver-blog/settings`, { method: 'GET' });
      if (res.ok) return cleanUrl;
    } catch (e) {}
  }
  return 'http://localhost:4002';
}

// 네이버 로그인 폼 자동 타이핑 및 클릭 헬퍼 함수
async function autoPerformNaverLogin(page, activeAppUrl) {
  try {
    const settingsRes = await fetch(`${activeAppUrl}/api/naver-blog/settings`).catch(() => null);
    if (!settingsRes || !settingsRes.ok) return false;
    const settingsData = await settingsRes.json().catch(() => null);
    const savedId = settingsData?.settings?.naver_login_id?.trim();
    const savedPw = settingsData?.settings?.naver_login_pw?.trim();

    if (!savedId || !savedPw) {
      console.log('ℹ️ [RPA Auto-Login] 저장된 네이버 계정 정보(ID/PW)가 없어 사용자의 직접 수동 로그인을 대기합니다.');
      return false;
    }

    console.log(`🤖 [RPA Auto-Login] 저장된 네이버 계정(@${savedId})으로 무인 자동 로그인을 개시합니다.`);
    await page.waitForSelector('#id', { timeout: 8000 }).catch(() => {});
    await jitterSleep(600, 1000);

    // 1. #id 필드 클릭 및 직접 키보드 타이핑
    const idInput = page.locator('#id');
    if (await idInput.count() > 0) {
      await idInput.click();
      await idInput.fill('');
      await page.keyboard.type(savedId, { delay: 60 });
    }

    await jitterSleep(400, 800);

    // 2. #pw 필드 클릭 및 직접 키보드 타이핑
    const pwInput = page.locator('#pw');
    if (await pwInput.count() > 0) {
      await pwInput.click();
      await pwInput.fill('');
      await page.keyboard.type(savedPw, { delay: 60 });
    }

    await jitterSleep(800, 1200);

    // 3. 로그인 버튼 클릭
    const loginBtn = page.locator('#log\\.login, button.btn_login, .btn_global').first();
    if (await loginBtn.count() > 0) {
      console.log('🚀 [RPA Auto-Login] "로그인" 버튼을 타격하여 무인 인가를 완료합니다.');
      await loginBtn.click({ force: true }).catch(() => {});
      return true;
    }
  } catch (err) {
    console.warn('⚠️ [RPA Auto-Login] 자동 입력 시도 예외:', err.message);
  }
  return false;
}

async function runNaverRpaDaemon() {
  console.log('🤖 [RPA] 네이버 블로그 자동 발행 데몬 동작을 개시합니다.');
  let activeAppUrl = 'http://localhost:4002';
  try {
    activeAppUrl = await getAppUrlWithFallback();
  } catch (e) {}
  console.log(`🌐 백엔드 연동 서버 주소: ${activeAppUrl}`);

  let targetPost = null;
  const isLoginOnly = process.argv.includes('--login');
  const hasSession = fs.existsSync(SESSION_FILE_PATH);

  let browser;
  try {
    // 0. 로그인 전용 모드 또는 세션 쿠키가 전혀 없는 경우 즉시 팝업 브라우저 띄우기
    if (isLoginOnly || !hasSession) {
      console.log('🔑 [RPA] 네이버 로그인 인증 브라우저 팝업 창을 엽니다.');

      browser = await chromium.launch({
        headless: false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--window-size=1280,800'
        ]
      });

      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const loginPage = await context.newPage();

      await loginPage.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      await loginPage.goto('https://nid.naver.com/nidlogin.login');

      // 저장된 ID/PW 계정 정보로 무인 자동 로그인 시도
      await autoPerformNaverLogin(loginPage, activeAppUrl);

      // 사용자가 직접 로그인을 마무리할 때까지 NID_AUT/NID_SES 로그인 인증 쿠키 실시간 감지 (최대 5분)
      try {
        let loggedIn = false;
        const startTime = Date.now();

        while (Date.now() - startTime < 300000) {
          if (loginPage.isClosed()) break;

          const currentUrl = loginPage.url();
          const cookies = await context.cookies().catch(() => []);
          const hasNidCookie = cookies.some(c => c.name === 'NID_AUT' || c.name === 'NID_SES');

          if (hasNidCookie || (currentUrl.includes('naver.com') && !currentUrl.includes('nidlogin'))) {
            console.log('🎉 [RPA] 네이버 로그인 완료 감지! 쿠키 및 세션 데이터 저장 중...');
            const storageState = await context.storageState();
            fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(storageState, null, 2));
            console.log(`💾 [RPA] 세션 쿠키 데이터 저장을 성공하였습니다: ${SESSION_FILE_PATH}`);
            loggedIn = true;
            await jitterSleep(1000, 1500);
            break;
          }
          await jitterSleep(1000, 1500);
        }

        if (!loggedIn && !loginPage.isClosed()) {
          const storageState = await context.storageState();
          fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(storageState, null, 2));
        }
      } catch (e) {
        console.warn('⚠️ [RPA] 로그인 감지 대기 중 예외:', e.message);
      }

      if (!loginPage.isClosed()) {
        await browser.close().catch(() => {});
      }

      if (isLoginOnly) {
        console.log('✅ [RPA] 로그인 인증 덤프 절차가 종료되었습니다.');
        return;
      }

      // 세션 파일이 덤프되지 않았다면 포스팅 중단 및 펜딩건 FAILED 업데이트
      if (!fs.existsSync(SESSION_FILE_PATH)) {
        console.warn('⚠️ [RPA] 네이버 로그인이 완료되지 않아 펜딩 포스트 상태를 [FAILED]로 정리하고 자동화를 중단합니다.');
        try {
          const resList = await fetch(`${APP_URL}/api/naver-blog/posts`);
          const dataList = await resList.json();
          if (dataList.success && dataList.posts) {
            const nowThreshold = Date.now() + 120000;
            const duePosts = dataList.posts.filter((post) => post.status === 'SCHEDULED' && post.scheduled_at && new Date(post.scheduled_at).getTime() <= nowThreshold);
            for (const p of duePosts) {
              await fetch(`${APP_URL}/api/naver-blog/posts`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: p.id,
                  updates: { status: 'FAILED', error_message: '네이버 로그인 세션 미생성 (계정 연동 탭에서 최초 1회 로그인이 필요합니다)' }
                })
              });
            }
          }
        } catch (e) {
          console.error('FAILED 동기화 에러:', e);
        }
        return;
      }
    }

    const portsToScan = [4002, 4000, 4006, 4001, 4003, 4004, 4005, 3000, 8080, 8000];
    const candidateUrls = Array.from(new Set([APP_URL, ...portsToScan.map(p => `http://localhost:${p}`)]));
    for (const testUrl of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5초 빠른 포트 타임아웃
        const resList = await fetch(`${testUrl}/api/naver-blog/posts`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (resList.ok) {
          const dataList = await resList.json();
          if (dataList.success && dataList.posts) {
            activeAppUrl = testUrl;
            console.log(`🌐 [RPA] 활성 이지데스크 백엔드 포트 자동 바인딩 성공: ${activeAppUrl}`);
            const nowThreshold = Date.now() + 600000; // 10분 넉넉한 타임 마진 부여
            pendingPosts = dataList.posts
              .filter((post) => post.status === 'SCHEDULED' && (!post.scheduled_at || new Date(post.scheduled_at).getTime() <= nowThreshold))
              .sort((a, b) => new Date(a.scheduled_at || a.created_at || 0).getTime() - new Date(b.scheduled_at || b.created_at || 0).getTime());
            break;
          }
        }
      } catch (fetchErr) {
        // 포트 연속 스캔 진행
      }
    }

    if (pendingPosts.length === 0) {
      console.log('💤 [RPA] 현재 기준 실행해야 할 발행 예정 예약글이 없거나 조회가 완료되었습니다.');
      return;
    }

    const targetPost = pendingPosts[0];
    console.log(`🎯 [RPA] 발행 대상 예약 포스트 포커싱 성공: ID [${targetPost.id}] | 제목: "${targetPost.title}"`);

    // 2. Playwright 브라우저 및 컨텍스트 초기화 (세션 파일 기반 Headed 로딩)
    browser = await chromium.launch({ 
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
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
      context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    }

    const page = await context.newPage();
    
    // 자동화 감지 무력화 스크립트 실행
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // 블로그 아이디 설정 조회 (기본값: nocodelife)
    let targetBlogId = 'nocodelife';
    try {
      const settingsRes = await fetch(`${activeAppUrl}/api/naver-blog/settings`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.settings?.naver_blog_id) {
          targetBlogId = settingsData.settings.naver_blog_id.trim();
        }
      }
    } catch (e) {}

    console.log(`🌐 [RPA] 네이버 블로그(@${targetBlogId}) 스마트에디터 ONE 글쓰기 폼으로 진입합니다.`);
    const primaryWriteUrl = `https://blog.naver.com/${targetBlogId}?Redirect=Write`;
    const secondaryWriteUrl = `https://blog.naver.com/PostWriteForm.naver?blogId=${targetBlogId}`;

    try {
      await page.goto(primaryWriteUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch (e) {
      await page.goto(secondaryWriteUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    }
    await jitterSleep(4000, 6000);

    // 3. 네이버 로그인 페이지(nidlogin.login) 리다이렉트 감지 체크 (자동 로그인 복구 시도)
    let currentUrl = page.url();
    if (currentUrl.includes('nidlogin.login') || currentUrl.includes('nidlogin')) {
      console.warn('⚠️ [RPA] 네이버 로그인 세션 쿠키가 만료되어 로그인 화면(nidlogin.login)으로 리다이렉트되었습니다.');

      const loginDone = await autoPerformNaverLogin(page, activeAppUrl);
      if (loginDone) {
        await jitterSleep(3000, 5000);
        // 로그인 성공 후 쿠키 세션 저장
        const storageState = await context.storageState();
        fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(storageState, null, 2));
        console.log('💾 [RPA Auto-Login] 새로 복구된 로그인 세션 쿠키를 성공적으로 저장하였습니다.');

        // 글쓰기 폼으로 재진입
        console.log('🔄 [RPA Auto-Login] 로그인 완료! 글쓰기 폼으로 무중단 재진입합니다.');
        await page.goto(primaryWriteUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await jitterSleep(3000, 5000);
        currentUrl = page.url();
      }
    }

      // 여전히 로그인 페이지에 머물러 있는 경우 최종 FAILED 처리
      if (currentUrl.includes('nidlogin.login') || currentUrl.includes('nidlogin')) {
        console.warn('❌ [RPA] 네이버 로그인 세션 복구 실패. 포스트 상태를 [FAILED]로 반영합니다.');
        await fetch(`${activeAppUrl}/api/naver-blog/posts`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: targetPost.id,
            updates: {
              status: 'FAILED',
              error_message: '네이버 로그인 세션이 만료되었습니다. 계정 관리자 탭에서 [저장된 ID/PW]를 확인하시거나 [RPA 최초 로그인 브라우저 기동]을 진행해 주세요.'
            }
          })
        }).catch(() => {});

        if (browser) await browser.close();
        return;
      }

    // mainFrame iframe 여부 탐색
    let frame = page;
    const mainFrameElement = await page.$('#mainFrame');
    if (mainFrameElement) {
      console.log('🖼️ [RPA] 네이버 스마트에디터 ONE #mainFrame 프레임을 감지하여 전환합니다.');
      frame = page.frame({ name: 'mainFrame' }) || page;
    }

    // 에디터 경고 팝업 / 임시저장 불러오기 모달("작성 중인 글이 있습니다" [취소]) 집요한 닫기 처리
    for (let i = 0; i < 5; i++) {
      try {
        await page.keyboard.press('Escape').catch(() => {});

        // 메인 DOM 및 iframe 내부의 모든 [취소] 버튼 직접 타격
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a'));
          const cancelBtn = btns.find(b => (b.innerText && b.innerText.trim() === '취소') || (b.className && typeof b.className === 'string' && b.className.includes('cancel')));
          if (cancelBtn) cancelBtn.click();
        }).catch(() => {});

        if (mainFrameElement) {
          await frame.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            const cancelBtn = btns.find(b => (b.innerText && b.innerText.trim() === '취소') || (b.className && typeof b.className === 'string' && b.className.includes('cancel')));
            if (cancelBtn) cancelBtn.click();
          }).catch(() => {});
        }

        // 우측 도움말 패널 강제 제거 및 닫기
        await page.evaluate(() => {
          const closeBtns = document.querySelectorAll('.se-help-close, .se-popup-close-button, button.btn_close, button[aria-label="닫기"], .se-help-header button');
          closeBtns.forEach(b => b.click());
          const helpPanels = document.querySelectorAll('.se-help-panel, .se-help-container, [class*="help"]');
          helpPanels.forEach(el => el.remove());
        }).catch(() => {});

        if (mainFrameElement) {
          await frame.evaluate(() => {
            const closeBtns = document.querySelectorAll('.se-help-close, .se-popup-close-button, button.btn_close, button[aria-label="닫기"], .se-help-header button');
            closeBtns.forEach(b => b.click());
            const helpPanels = document.querySelectorAll('.se-help-panel, .se-help-container, [class*="help"]');
            helpPanels.forEach(el => el.remove());
          }).catch(() => {});
        }
      } catch (err) {}
      await jitterSleep(400, 800);
    }

    // 4. 제목(Title) 안전 입력 (egdesk-scratch 공식 XPath & Physical Keyboard 입력 기법)
    console.log('✍️ [RPA] 블로그 포스팅 제목 입력을 시작합니다.');
    
    const titleSelectors = [
      'xpath=/html/body/div[1]/div/div[3]/div/div/div[1]/div/div[1]/div[2]/section/article/div[1]/div[1]/div/div/p/span[2]',
      '.se-document-title [contenteditable="true"]',
      '.se-title-text',
      '.se-ff-nanumgothic.se-document-title'
    ];

    let titleClicked = false;
    for (const selector of titleSelectors) {
      try {
        if (mainFrameElement) {
          const tLoc = frame.locator(selector).first();
          if (await tLoc.count() > 0 && await tLoc.isVisible()) {
            await tLoc.click({ force: true, timeout: 5000 });
            titleClicked = true;
            console.log(`[RPA] 제목 영역 포커스 성공 (Selector: ${selector})`);
            break;
          }
        }
        const pTLoc = page.locator(selector).first();
        if (await pTLoc.count() > 0 && await pTLoc.isVisible()) {
          await pTLoc.click({ force: true, timeout: 5000 });
          titleClicked = true;
          console.log(`[RPA] 제목 영역 포커스 성공 (Page Selector: ${selector})`);
          break;
        }
      } catch (e) {}
    }

    if (!titleClicked) {
      // DOM 클릭 폴백
      const domSuccess = await page.evaluate(() => {
        const titleEl = document.querySelector('.se-document-title [contenteditable="true"], .se-title-text');
        if (titleEl) {
          titleEl.click();
          return true;
        }
        return false;
      }).catch(() => false);

      if (domSuccess) titleClicked = true;
    }

    // 만약 스마트에디터 제목 포커스 클릭에 실패했다면(로그인 화면 등), 키보드 포스트 제목 주입을 엄격히 금지
    if (!titleClicked) {
      console.warn('⚠️ [RPA] 네이버 스마트에디터 제목 입력 필드를 찾지 못해 제목 키보드 주입을 안전하게 취소합니다.');
      
      await fetch(`${activeAppUrl}/api/naver-blog/posts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetPost.id,
          updates: {
            status: 'FAILED',
            error_message: '네이버 블로그 에디터 제목 영역을 찾을 수 없습니다. (로그인 세션 만료 또는 페이지 이동 실패)'
          }
        })
      }).catch(() => {});

      if (browser) await browser.close();
      return;
    }

    await jitterSleep(500, 1000);

    // 전체 선택 후 물리 키보드로 제목 텍스트 타이핑 (SmartEditor State 반영)
    await page.keyboard.press('Control+a').catch(() => {});
    await page.keyboard.press('Backspace').catch(() => {});
    await jitterSleep(300, 500);

    try {
      await page.keyboard.insertText(targetPost.title);
      console.log(`✍️ [RPA] 제목 입력 완료: "${targetPost.title}"`);
    } catch (err) {
      // 키보드 입력을 못 받은 경우 DOM 타이핑 폴백
      await frame.evaluate((titleText) => {
        const el = document.querySelector('.se-document-title [contenteditable="true"], .se-title-text');
        if (el) {
          el.innerText = titleText;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, targetPost.title).catch(() => {});
    }

    await jitterSleep(1000, 2000);

    // 5. 본문(Content) 가독성 정밀 입력 (문단별 줄바꿈 & Enter 단락 분리 엔진)
    console.log('✍️ [RPA] 블로그 포스팅 본문 가독성 단락 분리 입력을 시작합니다.');
    
    // 본문 작성 구역 포커스
    const contentArea = frame.locator('.se-component-write_area [contenteditable="true"], .se-content, .se-component-content').first();
    await contentArea.click({ force: true }).catch(() => {});
    await jitterSleep(800, 1500);

    // 본문 원고를 줄바꿈(\n) 단위로 정밀 파싱하여 각 문단별 Enter 단락 분리 입력
    try {
      const paragraphs = targetPost.content.split('\n');
      for (let idx = 0; idx < paragraphs.length; idx++) {
        const line = paragraphs[idx].trim();
        if (line.length > 0) {
          await page.keyboard.insertText(line);
          await page.keyboard.press('Enter');
          await jitterSleep(150, 300);
        } else {
          // 빈 줄일 경우 1회 더 Enter를 쳐서 가독성 문단 간격 확보
          await page.keyboard.press('Enter');
          await jitterSleep(100, 200);
        }
      }
      console.log('✍️ [RPA] 문단별 Enter 단락 분리 입력을 통해 본문 가독성 배치를 완료했습니다.');
    } catch (kErr) {
      console.warn('⚠️ [RPA] 키보드 단락 주입 폴백 처리:', kErr.message);
      await page.keyboard.insertText(targetPost.content).catch(() => {});
    }

    await jitterSleep(1500, 3000);

    // 6. 대표 이미지 리소스 연동 및 Google Imagen 3 AI 동적 고화질 첨부 처리
    try {
      console.log('📸 [RPA] Google Imagen 3 AI 전용 이미지 모델을 기동하여 대표 이미지를 생성 및 다운로드합니다.');
      const tempImgPath = path.join(__dirname, `temp_blog_upload_${Date.now()}.jpg`);

      // 1순위: 포스트에 명시된 image_url, 2순위: Google Imagen 3 API 호출 또는 최신 AI 모델 폴백
      let imageBuffer = null;
      const keywordSeed = targetPost.target_keywords || targetPost.title || 'technology product';
      const imagen3Prompt = `Professional high quality realistic lifestyle blog photo about ${keywordSeed}, 8k resolution, cinematic lighting, studio product photography, clean background`;

      // 구글 API 키 조회 시도
      let googleApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
      try {
        const sysRes = await fetch(`${backendUrl}/api/shared/settings?key=google_ai_api_key`).catch(() => null);
        if (sysRes && sysRes.ok) {
          const sysData = await sysRes.json().catch(() => null);
          if (sysData && sysData.value) googleApiKey = sysData.value;
        }
      } catch (e) {}

      // A. Google Imagen 3 (imagen-3.0-generate-002) 생성 시도
      if (googleApiKey && (!targetPost.image_url || !targetPost.image_url.startsWith('http'))) {
        try {
          console.log(`✨ [RPA] Google Imagen 3 (imagen-3.0-generate-002) 모델 호출 기동 중... (프롬프트: "${keywordSeed}")`);
          const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${googleApiKey}`;
          
          const imagenRes = await fetch(imagenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instances: [{ prompt: imagen3Prompt }],
              parameters: { sampleCount: 1, aspectRatio: '4:3', outputOptions: { mimeType: 'image/jpeg' } }
            })
          }).catch(() => null);

          if (imagenRes && imagenRes.ok) {
            const imagenJson = await imagenRes.json().catch(() => null);
            const b64Data = imagenJson?.predictions?.[0]?.bytesBase64Encoded;
            if (b64Data) {
              imageBuffer = Buffer.from(b64Data, 'base64');
              console.log('🎉 [RPA] Google Imagen 3 AI 모델 이미지 실시간 생성 성공!');
            }
          }
        } catch (imagenErr) {
          console.warn('⚠️ [RPA] Google Imagen 3 호출 예외, 폴백 엔진으로 전환합니다:', imagenErr.message);
        }
      }

      // B. 1순위 URL 또는 폴백 고화질 AI 렌더링 다운로드
      if (!imageBuffer) {
        const randomSeed = Math.floor(Math.random() * 1000000);
        const dynamicImageUrl = targetPost.image_url && targetPost.image_url.startsWith('http')
          ? targetPost.image_url
          : `https://image.pollinations.ai/prompt/${encodeURIComponent(imagen3Prompt)}?width=800&height=600&seed=${randomSeed}&nologo=true`;

        console.log(`🌐 [RPA] 고화질 이미지 소스 다운로드 진행: ${dynamicImageUrl}`);
        const imgRes = await fetch(dynamicImageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(() => null);
        if (imgRes && imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
        }
      }

      if (imageBuffer) {
        fs.writeFileSync(tempImgPath, imageBuffer);
        console.log('📁 [RPA] 이미지 파일 바이너리 준비 완료. 스마트에디터 파일 업로드 인풋을 정밀 타격합니다.');

        // Playwright filechooser 이벤트 및 direct input setFiles 동시 적용
        let uploadedSuccess = false;

        try {
          // A. 네이버 에디터 내 숨겨진 file input 요소 직주입 시도
          if (mainFrameElement) {
            const fileInputInFrame = frame.locator('input[type="file"]').first();
            if (await fileInputInFrame.count() > 0) {
              await fileInputInFrame.setInputFiles(tempImgPath).catch(() => {});
              uploadedSuccess = true;
              console.log('📸 [RPA] frame input[type="file"]에 Imagen3 생성 이미지 직주입 완료!');
            }
          }

          if (!uploadedSuccess) {
            const fileInputInPage = page.locator('input[type="file"]').first();
            if (await fileInputInPage.count() > 0) {
              await fileInputInPage.setInputFiles(tempImgPath).catch(() => {});
              uploadedSuccess = true;
              console.log('📸 [RPA] page input[type="file"]에 Imagen3 생성 이미지 직주입 완료!');
            }
          }
        } catch (inputErr) {}

        // B. 툴바 [사진] 단추 클릭 + filechooser 이벤트 캡처
        if (!uploadedSuccess) {
          const photoSelectors = 'button.se-image-toolbar-button, button[data-name="image"], .se-toolbar-button-image, button:has-text("사진")';
          try {
            const fcPromise = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
            
            if (mainFrameElement) {
              const btnInFrame = frame.locator(photoSelectors).first();
              if (await btnInFrame.count() > 0) await btnInFrame.click({ force: true }).catch(() => {});
            } else {
              const btnInPage = page.locator(photoSelectors).first();
              if (await btnInPage.count() > 0) await btnInPage.click({ force: true }).catch(() => {});
            }

            const fileChooser = await fcPromise;
            if (fileChooser) {
              await fileChooser.setFiles(tempImgPath);
              uploadedSuccess = true;
              console.log('📸 [RPA] Playwright fileChooser를 통한 Imagen3 이미지 업로드 완료!');
            }
          } catch (fcErr) {}
        }

        await jitterSleep(4000, 6000);

        if (fs.existsSync(tempImgPath)) {
          try { fs.unlinkSync(tempImgPath); } catch (e) {}
        }
      }
    } catch (imgErr) {
      console.warn('⚠️ [RPA] 이미지 첨부 처리 예외:', imgErr.message);
    }

    // 7. 네이버 블로그 최종 [발행] 서브 패널 오픈
    console.log('🔔 [RPA] 에디터 우측 상단 [발행] 패널을 클릭합니다.');
    
    // html-to-smarteditor.js 기반 스마트에디터 JSON 변환 생성
    try {
      const seDocumentJson = convertHtmlToSmartEditorJson(targetPost.title, targetPost.content, '#AI #블로그', undefined, { preserveImageMarkers: true });
      console.log('📑 [RPA] [egdesk-scratch 기술] SmartEditor v2.8.10 JSON 규격 변환이 성공적으로 완료되었습니다.');

      // 스마트에디터 내 객체에 direct JSON 인젝트 시도
      if (mainFrameElement) {
        await frame.evaluate((seJson) => {
          if (window.se && typeof window.se.importDocument === 'function') {
            try { window.se.importDocument(seJson.document); } catch (e) {}
          }
        }, seDocumentJson).catch(() => {});
      }
    } catch (jsonErr) {
      console.warn('⚠️ [RPA] SmartEditor JSON 변환 시도 패스:', jsonErr);
    }
    
    // 도움말 사이드바 닫기
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.se-help-close, .se-popup-close-button');
      if (closeBtn) closeBtn.click();
    }).catch(() => {});

    // 1단계: 우측 상단 [발행] 초록색 헤더 버튼 클릭 (egdesk-scratch 공식 XPath 연동)
    console.log('🔔 [RPA] [egdesk-scratch 학습 적용] 스마트에디터 ONE 상단 헤더 [발행] 버튼 클릭을 시도합니다.');
    
    const initialPublishSelectors = [
      'xpath=/html/body/div[1]/div/div[1]/div/div[3]/div[2]/button',
      'button:has-text("발행")',
      '.se-header-publish-button button',
      'button.btn_publish'
    ];

    let initialButtonClicked = false;

    for (const selector of initialPublishSelectors) {
      try {
        if (mainFrameElement) {
          const btnInFrame = frame.locator(selector).first();
          if (await btnInFrame.count() > 0 && await btnInFrame.isVisible()) {
            await btnInFrame.click({ force: true, timeout: 5000 });
            initialButtonClicked = true;
            console.log(`[RPA] 상단 헤더 발행 버튼 클릭 성공 (Frame Selector: ${selector})`);
            break;
          }
        }
        const btnInPage = page.locator(selector).first();
        if (await btnInPage.count() > 0 && await btnInPage.isVisible()) {
          await btnInPage.click({ force: true, timeout: 5000 });
          initialButtonClicked = true;
          console.log(`[RPA] 상단 헤더 발행 버튼 클릭 성공 (Page Selector: ${selector})`);
          break;
        }
      } catch (e) {}
    }

    if (!initialButtonClicked) {
      // DOM Fallback
      await page.evaluate(() => {
        const btn = document.querySelector('button.btn_publish, .se-header-publish-button button, header button');
        if (btn) btn.click();
      }).catch(() => {});
    }

    // 2단계: egdesk-scratch의 5초 정밀 완충 대기 (발행 옵션 레이어 팝업 애니메이션 안정화)
    console.log('⏳ [RPA] [egdesk-scratch 기술] 발행 옵션 팝업 애니메이션 안정화를 위해 5초간 완충 대기합니다...');
    await jitterSleep(5000, 5000);

    // 3단계: 우측 발행 옵션 팝업 내 최종 V 발행 버튼 클릭 (egdesk-scratch 공식 최종 XPath 적용)
    console.log('🚀 [RPA] [egdesk-scratch 기술] 우측 레이어 팝업 내 최종 "V 발행" 버튼을 정밀 타격합니다.');
    
    const finalPublishSelectors = [
      'xpath=/html/body/div[1]/div/div[1]/div/div[3]/div[2]/div/div/div/div[8]/div/button',
      'xpath=/html/body/div[1]/div/div[1]/div//div[3]/div[2]/button',
      'button.confirm_btn',
      'button.btn_confirm',
      'button[data-name="confirm"]',
      '.layer_publish button.confirm_btn',
      '.se-publish-popup button'
    ];

    let isPostedReal = false;
    let finalUrl = page.url();

    for (let loop = 1; loop <= 6; loop++) {
      console.log(`⏳ [RPA] 네이버 서버 포스팅 게재 시도 ${loop}/6...`);

      for (const selector of finalPublishSelectors) {
        try {
          if (mainFrameElement) {
            const fBtn = frame.locator(selector).first();
            if (await fBtn.count() > 0 && await fBtn.isVisible()) {
              await fBtn.hover({ force: true }).catch(() => {});
              await fBtn.click({ force: true, timeout: 5000 });
              console.log(`🎯 [RPA] 최종 "V 발행" 버튼 타격 성공 (Frame Selector: ${selector})`);
            }
          }
          const pBtn = page.locator(selector).first();
          if (await pBtn.count() > 0 && await pBtn.isVisible()) {
            await pBtn.hover({ force: true }).catch(() => {});
            await pBtn.click({ force: true, timeout: 5000 });
            console.log(`🎯 [RPA] 최종 "V 발행" 버튼 타격 성공 (Page Selector: ${selector})`);
          }
        } catch (e) {}
      }

      // Native Event dispatch fallback
      await page.evaluate(() => {
        const confirmBtn = document.querySelector('button.confirm_btn, button.btn_confirm, .layer_publish button, button[data-name="confirm"]');
        if (confirmBtn) confirmBtn.click();
      }).catch(() => {});

      await page.keyboard.press('Enter').catch(() => {});

      await jitterSleep(3000, 4000);

      finalUrl = page.url();
      if (!finalUrl.includes('Redirect=Write') && !finalUrl.includes('PostWriteForm')) {
        isPostedReal = true;
        break;
      }
    }

    // 9. 결과 주소(URL) 피드백 획득 및 Next.js DB 상태 완료 처리
    const isWritePage = finalUrl.includes('Redirect=Write') || finalUrl.includes('PostWriteForm') || finalUrl.includes('nidlogin');
    const isSuccessPosted = isPostedReal && !isWritePage;

    if (isSuccessPosted) {
      console.log(`🎉 [RPA] 네이버 블로그 실제 게시글 게재 완료 성공! URL: ${finalUrl}`);
      
      const patchRes = await fetch(`${activeAppUrl}/api/naver-blog/posts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetPost.id,
          updates: {
            status: 'POSTED',
            posted_at: new Date().toISOString(),
            post_url: finalUrl,
            error_message: null
          }
        })
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (patchData.success) {
        console.log('💾 [RPA] DB 포스팅 상태가 [POSTED]로 동기화 완료되었습니다.');
      }
    } else {
      console.warn(`❌ [RPA] 네이버 블로그 포스팅 게재 실패 (글쓰기 폼 미이탈/인증 만료). URL: ${finalUrl}`);
      
      const patchRes = await fetch(`${activeAppUrl}/api/naver-blog/posts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetPost.id,
          updates: {
            status: 'FAILED',
            error_message: '네이버 스마트에디터 발행 버튼 클릭 실패 또는 로그인 세션 만료로 실제 블로그에 포스팅이 게재되지 않았습니다.'
          }
        })
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (patchData.success) {
        console.log('💾 [RPA] DB 포스팅 상태가 [FAILED]로 정확하게 동기화 기록되었습니다.');
      }
    }

  } catch (error) {
    console.error('❌ [RPA] 네이버 자동화 발행 처리 중 치명적 오류 발생:', error.message);
    if (typeof targetPost !== 'undefined' && targetPost && targetPost.id) {
      try {
        await fetch(`${activeAppUrl}/api/naver-blog/posts`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: targetPost.id,
            updates: {
              status: 'FAILED',
              error_message: `RPA 런타임 오류 발생: ${error.message}`
            }
          })
        });
      } catch (e) {}
    }
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
