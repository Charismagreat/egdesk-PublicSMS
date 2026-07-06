const { chromium } = require('playwright');

(async () => {
  console.log("🚀 Ecount ERP AI 브라우저 테스트 기동 중...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // 브라우저 뷰포트 크기 설정
  await page.setViewportSize({ width: 1440, height: 900 });

  const brainPath = 'C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\172c65bc-806e-439a-ad52-235f987ace59';

  try {
    // 1. 페이지 접속
    console.log("1. http://localhost:4000/ecount-erp-ai 접속 중...");
    await page.goto('http://localhost:4000/ecount-erp-ai', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // 렌더링 안정화 대기
    
    // 기본 화면 캡처
    await page.screenshot({ path: `${brainPath}\\screenshot_ecount_1_init.png` });
    console.log("📸 1. 기본 화면 캡처 완료.");

    // 2. 스크립트 카드 선택 테스트
    console.log("2. 스크립트 카드 선택 시도...");
    // 매출 또는 매입 카드 중 하나 선택
    const cards = page.locator('div[class*="group cursor-pointer"]');
    const count = await cards.count();
    console.log(`발견된 스크립트 카드 수: ${count}`);
    if (count > 1) {
      await cards.nth(1).click(); // 두 번째 카드 선택
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${brainPath}\\screenshot_ecount_2_script_selected.png` });
      console.log("📸 2. 스크립트 선택 화면 캡처 완료.");
    }

    // 3. 날짜 설정 조작 및 빠른 기간 프리셋 클릭 테스트
    console.log("3. 빠른 기간 프리셋 '7일간' 클릭 시도...");
    const presetBtn = page.getByRole('button', { name: "7일간" });
    if (await presetBtn.isVisible()) {
      await presetBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${brainPath}\\screenshot_ecount_3_date_preset.png` });
      console.log("📸 3. 날짜 프리셋 캡처 완료.");
    }

    // 4. RPA 동기화 실행 (시뮬레이션) 테스트
    console.log("4. '이카운트 동기화 실행 (Run RPA)' 버튼 클릭 시도...");
    const runBtn = page.getByRole('button', { name: "이카운트 동기화 실행" });
    if (await runBtn.isVisible()) {
      await runBtn.click();
      // 실행 진행 중에 캡처하기 위해 즉시 대기 후 스냅샷
      await page.waitForTimeout(2500); // 2.5초 대기 (RPA 구동 단계 2~3 상태 예상)
      await page.screenshot({ path: `${brainPath}\\screenshot_ecount_4_rpa_executing.png` });
      console.log("📸 4. RPA 동기화 실행 중 캡처 완료.");
      
      // RPA 성공 완료까지 마저 대기
      await page.waitForTimeout(4000); 
    }

    // 5. 백그라운드 자동화 일정 등록 테스트
    console.log("5. '백그라운드 자동화 일정 등록' 버튼 클릭 시도...");
    const scheduleBtn = page.getByRole('button', { name: "백그라운드 자동화 일정 등록" });
    if (await scheduleBtn.isVisible()) {
      await scheduleBtn.click();
      await page.waitForTimeout(1500); // 크론 스케줄 등록 및 감시 피드 테이블 갱신 대기
      await page.screenshot({ path: `${brainPath}\\screenshot_ecount_5_schedule_added.png` });
      console.log("📸 5. 자동화 일정 추가 상태 캡처 완료.");
    }

  } catch (err) {
    console.error("❌ 테스트 중 오류 발생:", err);
  } finally {
    await browser.close();
    console.log("🏁 브라우저 테스트 완료.");
  }
})();
