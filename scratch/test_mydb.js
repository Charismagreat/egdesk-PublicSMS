const { chromium } = require('playwright');

(async () => {
  console.log("🚀 MyDB 브라우저 테스트 기동 중...");
  const browser = await chromium.launch({ headless: true });
  
  // 최고관리자 권한 쿠키 주입을 위해 컨텍스트 생성
  const context = await browser.newContext();
  await context.addCookies([{
    name: 'auth_token',
    value: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoi7L2c6rOg6rSA66as7JqQIn0.',
    domain: 'localhost',
    path: '/'
  }]);

  const page = await context.newPage();
  
  // 브라우저 뷰포트 크기 설정
  await page.setViewportSize({ width: 1440, height: 900 });

  const brainPath = 'C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\172c65bc-806e-439a-ad52-235f987ace59';

  try {
    // 1. 페이지 접속
    console.log("1. http://localhost:4000/my-db 접속 중...");
    await page.goto('http://localhost:4000/my-db', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // 렌더링 안정화 대기

    // 기본 화면 캡처 (접속 직후 진단용)
    await page.screenshot({ path: `${brainPath}\\screenshot_mydb_1_init.png` });
    console.log("📸 기본 화면 캡처 완료.");
    
    // 테이블 로딩 대기 및 crm_expenses 클릭
    console.log("1-1. crm_expenses 테이블 로딩 대기 및 클릭...");
    const tableBtn = page.locator('button:has-text("crm_expenses")').first();
    try {
      await tableBtn.waitFor({ state: 'visible', timeout: 15000 });
      await tableBtn.click();
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log("⚠️ 테이블 로딩 타임아웃 발생, 현재 진단 캡처 생성...");
      await page.screenshot({ path: `${brainPath}\\screenshot_mydb_loading_failed.png` });
      throw e;
    }

    // 2. 각 탭 전환 테스트
    const tabs = [
      { text: "레코드 데이터", name: "data" },
      { text: "테이블 스키마 DDL", name: "schema" },
      { text: "공유 뷰 관리", name: "shared" }
    ];

    for (const tab of tabs) {
      console.log(`2. '${tab.text}' 탭 클릭 시도...`);
      // 텍스트 기반 클릭
      await page.getByRole('button', { name: new RegExp(tab.text) }).click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${brainPath}\\screenshot_mydb_2_tab_${tab.name}.png` });
      console.log(`📸 '${tab.text}' 탭 화면 캡처 완료.`);
    }

    // 다시 레코드 데이터 탭으로 복귀
    await page.getByRole('button', { name: /레코드 데이터/ }).click();
    await page.waitForTimeout(500);

    // 3. 직접 쿼리 입력 플레이그라운드 테스트
    console.log("3. SQL 플레이그라운드 직접 쿼리 입력 탭 전환...");
    const directTabBtn = page.getByRole('button', { name: "직접 쿼리 입력" });
    if (await directTabBtn.isVisible()) {
      await directTabBtn.click();
      await page.waitForTimeout(500);
      
      // SQL 쿼리 입력 영역 초기화 후 입력
      console.log("3-1. SQL 쿼리 텍스트 입력...");
      const sqlTextarea = page.locator('textarea[placeholder*="실행할 커스텀 SQL"]');
      if (await sqlTextarea.isVisible()) {
        await sqlTextarea.fill("SELECT * FROM crm_expenses ORDER BY id DESC LIMIT 5;");
        await page.waitForTimeout(500);
        
        console.log("3-2. SQL 실행 버튼 클릭 시도...");
        await page.getByRole('button', { name: "SQL 실행 (Ctrl+Enter)", exact: true }).click();
        await page.waitForTimeout(3000); // 결과 및 AI 시각화 분석 대기
        
        await page.screenshot({ path: `${brainPath}\\screenshot_mydb_3_sql_result.png` });
        console.log("📸 SQL 실행 결과 화면 캡처 완료.");
      }
    }

    // 4. 공유 뷰 생성 모달 테스트 (데이터 탭으로 복귀 후)
    console.log("4. 데이터 공유 뷰 생성 모달 테스트를 위해 레코드 데이터 탭 복귀...");
    await page.getByRole('button', { name: /레코드 데이터/ }).click();
    await page.waitForTimeout(500);

    console.log("4-1. 데이터 공유 뷰 생성 모달 오픈 시도...");
    const shareBtn = page.locator('button[title="데이터 공유 테이블 뷰 생성"]');
    if (await shareBtn.isVisible()) {
      await shareBtn.click();
      await page.waitForTimeout(1500); // 모달 애니메이션 및 AI 자동 추천 대기
      
      await page.screenshot({ path: `${brainPath}\\screenshot_mydb_4_share_modal.png` });
      console.log("📸 데이터 공유 뷰 생성 모달 화면 캡처 완료.");
      
      // 취소하고 닫기 클릭
      const closeBtn = page.getByRole('button', { name: "취소하고 닫기" });
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      } else {
        // 우측 상단 X 단추로 닫기
        await page.locator('button[title="창 닫기 (취소)"]').click();
        await page.waitForTimeout(500);
      }
    } else {
      console.log("⚠️ 데이터 공유 뷰 생성 버튼이 표시되지 않았습니다.");
    }

  } catch (err) {
    console.error("❌ 테스트 중 오류 발생:", err);
  } finally {
    await browser.close();
    console.log("🏁 브라우저 테스트 완료.");
  }
})();
