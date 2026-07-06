const { chromium } = require('playwright');

(async () => {
  console.log("🚀 금융 정보 AI 브라우저 테스트 기동 중...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // 브라우저 뷰포트 크기 설정
  await page.setViewportSize({ width: 1440, height: 900 });

  const artifactDir = 'C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\172c65bc-806e-439a-ad52-235f987ace59';

  // 🛡️ Playwright Page Routing을 통한 최고관리자 권한 Mocking
  console.log("🛠️ API 통신 모킹(Mocking) 설정 중...");
  await page.route('**/api/auth/me', async route => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        role: 'SUPER_ADMIN'
      })
    });
  });

  try {
    // 1. 페이지 접속
    console.log("1. http://localhost:4000/finance 접속 중...");
    await page.goto('http://localhost:4000/finance', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // 렌더링 안정화 대기
    
    // 시나리오 1: 금융 정보 AI 초기 화면 (은행 계좌 탭)
    await page.screenshot({ path: `${artifactDir}\\screenshot_finance_1_init.png` });
    console.log("📸 [스냅샷 1] 초기 화면(은행 계좌 탭) 캡처 완료.");

    // 시나리오 2: 신용 카드 사용 내역 탭 이동 (AI Rule Builder 및 카드 목록)
    console.log("2. '신용 카드 사용 내역' 탭 클릭 시도...");
    await page.getByRole('button', { name: "신용 카드 사용 내역" }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${artifactDir}\\screenshot_finance_2_tab_cards.png` });
    console.log("📸 [스냅샷 2] 신용 카드 사용 내역 탭 캡처 완료.");

    // 시나리오 3: AI Rule Builder 자연어 입력 후 "영향 건 미리보기" 패널 활성화 상태
    console.log("3. 자연어 AI 규칙 정산 실시간 미리보기 시도...");
    const ruleTextarea = page.locator('textarea[placeholder*="BC카드이고"]').first();
    if (await ruleTextarea.isVisible()) {
      await ruleTextarea.fill("BC카드이고 20만원 이하의 승인 금액은 직원식대로 분류해줘");
      await page.waitForTimeout(500);
      
      // 미리보기 버튼 클릭
      const previewBtn = page.getByRole('button', { name: "🔍 영향 건 미리보기" });
      if (await previewBtn.isVisible()) {
        await previewBtn.click();
        await page.waitForTimeout(3000); // API 연산 대기
        await page.screenshot({ path: `${artifactDir}\\screenshot_finance_3_rule_preview.png` });
        console.log("📸 [스냅샷 3] 자연어 규칙 영향건 미리보기 패널 캡처 완료.");

        // 패널 닫기
        const closePanelBtn = page.locator('button:has-text("미리보기 닫기"), button:has-text("닫기")').first();
        if (await closePanelBtn.isVisible()) {
          await closePanelBtn.click();
          await page.waitForTimeout(500);
        }
      }
    } else {
      console.log("⚠️ Rule Builder 텍스트 영역을 찾을 수 없습니다.");
    }

    // 시나리오 4: 카드 명세서 내 계정과목 인라인 편집 창 & AI 추천 자동완성 드롭다운 팝업
    console.log("4. 계정과목 인라인 편집 및 AI 추천 자동완성 드롭다운 오픈 시도...");
    // 계정과목 셀 중 첫 번째를 찾아 클릭
    const categoryCell = page.locator('span:has-text("〉")').first();
    if (await categoryCell.isVisible()) {
      await categoryCell.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${artifactDir}\\screenshot_finance_4_inline_category.png` });
      console.log("📸 [스냅샷 4] 계정과목 인라인 편집 & AI 자동완성 드롭다운 캡처 완료.");

      // 편집 취소 버튼 클릭해서 정리
      const cancelBtn = page.getByRole('button', { name: "취소" }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      console.log("⚠️ 계정과목 편집 셀을 찾을 수 없습니다.");
    }

    // 시나리오 5: 국세청 홈택스 탭 이동 (전자세금계산서 매출/매입 필터링)
    console.log("5. '국세청 홈택스 자료' 탭 클릭 시도...");
    await page.getByRole('button', { name: "국세청 홈택스 자료" }).click();
    await page.waitForTimeout(1500);

    // 매출/매입 구분 필터 선택 테스트
    const filterSelect = page.locator('select').first(); // 첫 번째 셀렉트 박스 (구분 필터)
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('purchase'); // 매입 내역만 필터링
      await page.waitForTimeout(1500);
    }
    
    await page.screenshot({ path: `${artifactDir}\\screenshot_finance_5_tab_hometax.png` });
    console.log("📸 [스냅샷 5] 국세청 홈택스 탭 캡처 완료.");

  } catch (err) {
    console.error("❌ 테스트 중 오류 발생:", err);
  } finally {
    await browser.close();
    console.log("🏁 브라우저 테스트 완료.");
  }
})();
