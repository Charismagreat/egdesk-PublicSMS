const { chromium } = require("playwright");
const path = require("path");

(async () => {
  console.log("🚀 테이블 주문 페이지 E2E 테스트 기동 중...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 모바일 디바이스 뷰포트 (iPhone 13 수준)
  await page.setViewportSize({ width: 390, height: 844 });

  // Alert/Confirm 자동 수락 핸들러 등록
  page.on("dialog", async (dialog) => {
    console.log(`⚠️ Alert/Confirm 감지됨: [${dialog.type()}] ${dialog.message()}`);
    await dialog.accept();
  });

  const brainPath = "C:\\Users\\CHARISMA\\.gemini\\antigravity/brain/172c65bc-806e-439a-ad52-235f987ace59";

  // 1. API Mocking 설정
  // 상품 목록 API
  await page.route('**/api/products', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        products: [
          { id: "p1", name: "이지 아메리카노", price: "4500원", category: "테이블용", menu_category: "커피", main_image_url: "" },
          { id: "p2", name: "스윗 카페라떼", price: "5000원", category: "테이블용", menu_category: "커피", main_image_url: "" }
        ]
      })
    });
  });

  // 포인트 적립율 설정 API
  await page.route('**/api/settings?key=point_earning_rate', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, value: "3" })
    });
  });

  // 단골 포인트 조회 API
  await page.route('**/api/points?phone=**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, balance: 5000, customerId: 44 })
    });
  });

  // 포인트 OTP 요청/검증 API
  await page.route('**/api/points/otp', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  // 주문 접수 API
  await page.route('**/api/orders', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  // 단골 포인트 실차감 API
  await page.route('**/api/points', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  try {
    // 2. 페이지 접속 및 초기 화면 확인
    console.log("1. http://localhost:4000/table-order/3 접속 중...");
    await page.goto("http://localhost:4000/table-order/3", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000); // 렌더링 안정화 대기
    
    // 초기 화면 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_table_order_1_init.png") });
    console.log("📸 1. 초기 테이블 메뉴 카탈로그 화면 캡처 완료.");

    // 3. 상품 "담기" 버튼 클릭
    console.log("🛍️ 메뉴 상품 장바구니에 담기 시도...");
    const putInCartBtn = page.locator("button:has-text('담기')").first();
    if (await putInCartBtn.isVisible()) {
      await putInCartBtn.click();
      await page.waitForTimeout(1000);
      
      // 장바구니 활성화 화면 스냅샷 촬영
      await page.screenshot({ path: path.join(brainPath, "screenshot_table_order_2_cart_active.png") });
      console.log("📸 2. 상품 담기 후 하단 플로팅 장바구니 활성화 화면 캡처 완료.");
    } else {
      console.log("⚠️ 상품 담기 버튼을 찾지 못했습니다.");
    }

    // 4. 예상 적립금 뱃지 클릭하여 단골 혜택 안내 모달 팝업
    console.log("💡 단골 혜택 안내 모달 팝업 트리거...");
    const earningBadge = page.locator("span[title*='적립 혜택']").first();
    if (await earningBadge.isVisible()) {
      await earningBadge.click();
      await page.waitForTimeout(1000);
      
      // 단골 안내 모달 스냅샷 촬영
      await page.screenshot({ path: path.join(brainPath, "screenshot_table_order_3_point_guide.png") });
      console.log("📸 3. 단골 혜택 안내 모달 팝업 화면 캡처 완료.");
      
      // 모달 닫기
      await page.locator("button:has(svg.lucide-x)").first().click();
      await page.waitForTimeout(500);
    } else {
      console.log("⚠️ 예상 적립금 뱃지 버튼을 찾지 못했습니다.");
    }

    // 5. 단골 조회 및 OTP 인증 발송 요청
    console.log("🔍 단골 조회 및 포인트 OTP 발송 진행 중...");
    await page.locator("input[placeholder*='010-1234-5678']").fill("010-8888-9999");
    await page.locator("button:has-text('단골 조회')").click();
    await page.waitForTimeout(1000); // 조회 결과 대기
    
    await page.locator("input[placeholder*='사용할 포인트']").fill("2000");
    await page.locator("button:has-text('인증번호 발송')").click();
    await page.waitForTimeout(1000); // OTP 발송 결과 대기

    // OTP 발송 인증 입력란 활성화 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_table_order_4_otp_sent.png") });
    console.log("📸 4. 단골 포인트 입력 및 인증번호 발송 요청 화면 캡처 완료.");

    // OTP 검증 진행
    await page.locator("input[placeholder*='4자리 입력']").fill("1234");
    await page.locator("button:has-text('인증 승인')").click();
    await page.waitForTimeout(1000); // OTP 인증 완료 대기

    // 6. 주문 제출 및 주문 성공 화면 확인
    console.log("🚀 최종 주문 완료 처리 시도...");
    await page.locator("button:has-text('주문하기')").click();
    await page.waitForTimeout(2000); // 주문 완료 상태 전환 대기

    // 주문 성공 화면 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_table_order_5_success.png") });
    console.log("📸 5. 주문 성공 및 계좌 안내 화면 캡처 완료.");

  } catch (err) {
    console.error("❌ 테이블 주문 E2E 테스트 실행 중 에러 발생:", err);
  } finally {
    await browser.close();
    console.log("🏁 테이블 주문 E2E 테스트 종료.");
  }
})();
