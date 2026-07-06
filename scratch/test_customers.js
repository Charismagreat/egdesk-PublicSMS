const { chromium } = require("C:/dev/egdesk-FreeSMS/node_modules/playwright");
const path = require("path");

(async () => {
  console.log("🚀 Customers-AI 페이지 브라우저 E2E 테스트 기동 중...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // 브라우저 뷰포트 크기 설정
  await page.setViewportSize({ width: 1440, height: 950 });

  // Alert/Confirm 자동 수락/해제 핸들러 등록
  page.on("dialog", async (dialog) => {
    console.log(`⚠️ Alert/Confirm 감지됨: [${dialog.type()}] ${dialog.message()}`);
    await dialog.accept();
  });

  const brainPath = "C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\172c65bc-806e-439a-ad52-235f987ace59";

  try {
    // 1. 페이지 접속 및 초기 화면 확인
    console.log("1. http://localhost:4000/customers 접속 중...");
    await page.goto("http://localhost:4000/customers", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000); // 렌더링 안정화 대기
    
    // 기본 화면 캡처
    await page.screenshot({ path: path.join(brainPath, "screenshot_customers_1_init.png") });
    console.log("📸 1. 초기 화면 (고객 관리 대시보드) 캡처 완료.");

    // 2. 신규 고객 등록 모달 화면
    console.log("2. 신규 고객 등록 모달 표출 및 실제 등록 시도...");
    const addBtn = page.locator("button:has-text('신규 등록')").first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1500); // 모달 애니메이션 대기
      await page.screenshot({ path: path.join(brainPath, "screenshot_customers_2_add_modal.png") });
      console.log("📸 2. 신규 고객 등록 모달 화면 캡처 완료.");
      
      // 실제 테스트용 임시 고객 추가 입력
      console.log("임시 고객 정보 입력 중...");
      const nameInput = page.locator("input[placeholder='예: 홍길동']").first();
      const phoneInput = page.locator("input[placeholder='예: 010-1234-5678']").first();
      const submitBtn = page.locator("button:has-text('등록하기')").first();
      
      if (await nameInput.isVisible() && await phoneInput.isVisible() && await submitBtn.isVisible()) {
        await nameInput.fill("테스트고객");
        await phoneInput.fill("010-9999-9999");
        await page.waitForTimeout(500);
        await submitBtn.click();
        console.log("등록 버튼 클릭 완료. 테이블 갱신 대기...");
        await page.waitForTimeout(2500); // 등록 처리 및 테이블 재조회 대기
      } else {
        console.log("⚠️ 모달 내 입력 필드나 등록 버튼을 찾지 못했습니다. 모달을 닫습니다.");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(1000);
      }
    } else {
      console.log("⚠️ 신규 등록 버튼을 찾지 못했습니다.");
    }

    // 3. 특정 고객 주문 이력 탭 상세 모달 화면
    console.log("3. 테스트고객 이력 조회 시도...");
    // 방금 등록한 '테스트고객' 행의 이력 조회 버튼 찾기
    const testCustomerRowBtn = page.locator("tr:has-text('테스트고객') button:has-text('이력 조회')").first();
    const fallbackHistoryBtn = page.locator("table tbody tr button:has-text('이력 조회')").first();
    const targetBtn = (await testCustomerRowBtn.isVisible()) ? testCustomerRowBtn : fallbackHistoryBtn;

    if (await targetBtn.isVisible()) {
      await targetBtn.click();
      await page.waitForTimeout(3000); // 이력 데이터 및 모달 애니메이션 대기
      await page.screenshot({ path: path.join(brainPath, "screenshot_customers_3_history_orders.png") });
      console.log("📸 3. 특정 고객 주문 이력 탭 상세 모달 화면 캡처 완료.");

      // 4. 특정 고객 적립금 내역 탭 및 수동 조정 폼 화면
      console.log("4. 적립금 내역 탭으로 전환 시도...");
      const pointsTabBtn = page.locator("button:has-text('적립금 내역')").first();
      if (await pointsTabBtn.isVisible()) {
        await pointsTabBtn.click();
        await page.waitForTimeout(1500); // 데이터 로딩 대기
        await page.screenshot({ path: path.join(brainPath, "screenshot_customers_4_history_points.png") });
        console.log("📸 4. 특정 고객 적립금 내역 탭 화면 캡처 완료.");
      } else {
        console.log("⚠️ 적립금 내역 탭 버튼을 찾지 못했습니다.");
      }

      // 모달 닫기
      const closeBtn = page.locator("button:has-text('닫기')").first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(1000);
    } else {
      console.log("⚠️ 이력 조회 버튼을 가진 고객 행을 찾지 못했습니다.");
    }

    // 5. 검색 필터를 거쳐 검색된 고객 목록 화면
    console.log("5. 고객 검색 시도...");
    const searchInput = page.locator("input[placeholder*='검색...']").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("테스트고객");
      await page.waitForTimeout(1500); // 검색 필터링 완료 대기
      await page.screenshot({ path: path.join(brainPath, "screenshot_customers_5_filtered.png") });
      console.log("📸 5. 검색된 고객 목록 화면 캡처 완료.");
    } else {
      console.log("⚠️ 검색 입력창을 찾지 못했습니다.");
    }

  } catch (err) {
    console.error("❌ E2E 테스트 중 에러 발생:", err);
  } finally {
    await browser.close();
    console.log("🏁 브라우저 E2E 테스트 완료.");
  }
})();
