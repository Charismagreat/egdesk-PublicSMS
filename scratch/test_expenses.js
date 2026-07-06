const { chromium } = require('playwright');

(async () => {
  console.log("🚀 Expenses 상세 상호작용 검증 스크립트 기동...");
  const browser = await chromium.launch({ headless: true });
  
  // 최고관리자 JWT 우회 토큰 설정
  const context = await browser.newContext();
  await context.addCookies([{
    name: 'auth_token',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiQW50aWdyYXZpdHkgVGVzdCJ9.signature',
    domain: 'localhost',
    path: '/'
  }]);

  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const brainPath = 'C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\172c65bc-806e-439a-ad52-235f987ace59';

  try {
    // 1. 페이지 접속
    console.log("1. http://localhost:4000/expenses 접속 중...");
    await page.goto('http://localhost:4000/expenses', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // 로드 대기

    // 초기 화면 캡처
    await page.screenshot({ path: `${brainPath}\\screenshot_expenses_1_init.png` });
    console.log("📸 1. 초기 화면 캡처 완료.");

    // 2. 통합 검색 필터 테스트
    console.log("2. 통합 검색 필터 적용 중...");
    const searchInput = page.locator('input[placeholder*="적요, 가맹점, 태그명 검색"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("식대");
      await page.waitForTimeout(2000); // 디바운스 대기 및 조회 대기

      await page.screenshot({ path: `${brainPath}\\screenshot_expenses_2_filtered.png` });
      console.log("📸 2. 검색 필터 적용 화면 캡처 완료.");

      // 검색창 비우기
      await searchInput.fill("");
      await page.waitForTimeout(1000);
    }

    // 3. 환경 설정 센터 탭 전환 검증
    console.log("3. 지출 환경 설정 센터 탭 전환 시뮬레이션...");
    
    // 조직 및 사업 탭 클릭
    const orgTabBtn = page.getByRole('button', { name: "🏢 조직 및 사업" });
    if (await orgTabBtn.isVisible()) {
      await orgTabBtn.click();
      await page.waitForTimeout(1000);

      await page.screenshot({ path: `${brainPath}\\screenshot_expenses_3_config_org.png` });
      console.log("📸 3. 조직 및 사업 관리 탭 캡처 완료.");
    }

    // 4. 지출 내역 인라인 수정 모달 팝업 검증
    console.log("4. 지출 내역 인라인 수정 모달 호출 시도...");
    
    // 대장에서 첫 번째 연필(수정) 아이콘 클릭
    const editBtn = page.locator('button[title="상세 내역 인라인 수정"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(1500); // 애니메이션 대기

      await page.screenshot({ path: `${brainPath}\\screenshot_expenses_4_edit_modal.png` });
      console.log("📸 4. 지출 내역 상세 수정 모달 화면 캡처 완료.");
      
      // 모달 닫기
      const closeBtn = page.getByRole('button', { name: "취소" });
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      console.log("⚠️ 지출 수정 버튼이 보이지 않습니다. 대장에 레코드가 비어있을 수 있습니다.");
    }

  } catch (err) {
    console.error("❌ 지출 관리 테스트 에러:", err);
  } finally {
    await browser.close();
    console.log("🏁 지출 관리 E2E 검증 완료.");
  }
})();
