const { chromium } = require("playwright");
const path = require("path");

(async () => {
  console.log("🚀 상품 관리 AI 페이지 E2E 테스트 기동 중...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 데스크톱 해상도 설정
  await page.setViewportSize({ width: 1440, height: 950 });

  // Alert/Confirm 자동 수락 핸들러 등록
  page.on("dialog", async (dialog) => {
    console.log(`⚠️ Alert/Confirm 감지됨: [${dialog.type()}] ${dialog.message()}`);
    await dialog.accept();
  });

  page.on("console", msg => {
    if (msg.type() === "error" || msg.text().includes("Failed") || msg.text().includes("error")) {
      console.log(`❌ [브라우저 콘솔 에러] ${msg.text()}`);
    } else {
      console.log(`💬 [브라우저 콘솔] ${msg.text()}`);
    }
  });

  page.on("pageerror", err => {
    console.log(`❌ [브라우저 페이지 에러] ${err.message}`);
  });

  const brainPath = "C:\\Users\\CHARISMA\\.gemini\\antigravity/brain/172c65bc-806e-439a-ad52-235f987ace59";

  // 1. API Mocking 설정
  let mockProducts = [
    { id: "prod_001", name: "이지웨어 스포츠 레깅스", price: "24000원", category: "스토어용", menu_category: "의류", description: "신축성이 뛰어난 스포츠 기능성 레깅스", main_image_url: "https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=150", detail_image_url: "", is_coupon_excludable: 0, available_methods: "매장에서,배송" },
    { id: "prod_002", name: "모던 세라믹 머그잔", price: "12000원", category: "스토어용", menu_category: "리빙", description: "전자레인지 사용이 가능한 내열 세라믹 머그잔", main_image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150", detail_image_url: "", is_coupon_excludable: 1, available_methods: "매장에서,가져가기" }
  ];

  // 상품 패칭 API
  await page.route('**/api/products', route => {
    const method = route.request().method();
    if (method === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, products: mockProducts })
      });
    } else if (method === 'POST') {
      console.log("💡 [Mock API] POST /api/products 호출 감지 - 신규 상품 등록");
      const newProd = { id: `prod_${Date.now()}`, name: "테스트 블루투스 이어폰", price: "39000원", category: "스토어용", menu_category: "전자기기", description: "가성비 좋은 블루투스 이어폰", main_image_url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=150", detail_image_url: "", is_coupon_excludable: 0, available_methods: "매장에서,배송" };
      mockProducts.push(newProd);
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    } else if (method === 'PUT') {
      console.log("💡 [Mock API] PUT /api/products 호출 감지 - 상품 정보 수정");
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    } else {
      route.continue();
    }
  });

  try {
    // 2. 페이지 접속 및 초기 화면 확인
    console.log("1. http://localhost:4000/products 접속 중...");
    await page.goto("http://localhost:4000/products", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000); // 렌더링 안정화 대기
    
    // 초기 화면 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_products_1_init.png") });
    console.log("📸 1. 초기 상품 목록 관리 화면 캡처 완료.");

    // 3. 상품 정보 작성 중 스냅샷 촬영
    console.log("📝 신규 상품 등록 정보 작성 시뮬레이션 중...");
    await page.locator("input[placeholder*='상품명 (예:']").fill("테스트 블루투스 이어폰");
    await page.locator("input[placeholder*='가격 (예:']").fill("39000");
    await page.locator("input[placeholder*='카테고리 (예:']").fill("전자기기");
    await page.locator("textarea[placeholder*='상세 설명 문구']").fill("노이즈 캔슬링과 가성비가 돋보이는 테스트용 블루투스 무선 이어폰입니다.");
    await page.waitForTimeout(500);

    // 상품 등록 시도 화면 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_products_2_add_attempt.png") });
    console.log("📸 2. 상품 등록 정보 입력 상태 화면 캡처 완료.");

    // 상품 등록 실행 (로그아웃 버튼과 혼동을 방지하기 위해 '등록' 텍스트를 가진 버튼을 특정)
    await page.locator("form button:has-text('등록')").first().click();
    await page.waitForTimeout(1500); // API 연동 및 테이블 갱신 대기

    // 등록 시도 이후 상태 확인을 위해 중간 캡처
    await page.screenshot({ path: path.join(brainPath, "screenshot_products_2_after_add.png") });
    console.log("📸 2-1. 상품 등록 실행 후 화면 캡처 완료.");

    // 4. 대표 이미지 마우스 호버 프리뷰 팝업
    console.log("👀 썸네일 이미지 마우스 호버 시뮬레이션 중...");
    try {
      await page.waitForSelector("img[alt='모던 세라믹 머그잔']", { timeout: 5000 });
      const thumbnail = page.locator("img[alt='모던 세라믹 머그잔']").first();
      const box = await thumbnail.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(1000); // 호버 렌더 대기
        
        // 이미지 호버 스냅샷 촬영
        await page.screenshot({ path: path.join(brainPath, "screenshot_products_3_hover_preview.png") });
        console.log("📸 3. 대표 이미지 마우스 호버 프리뷰 화면 캡처 완료.");
      } else {
        console.log("⚠️ 머그잔 상품 썸네일 이미지의 크기를 측정하지 못했습니다.");
      }
    } catch (e) {
      console.log("⚠️ 머그잔 상품 썸네일 이미지를 찾지 못했습니다. 대기 중 오류:", e.message);
    }

    // 5. 쿠폰 허용/제외 토글 변경
    console.log("🔄 쿠폰 적용 여부 토글 조작 중...");
    try {
      // 테이블 내의 토글 스위치 버튼 감지 (모던 세라믹 머그잔 행 내부의 버튼)
      const toggleBtn = page.locator("tr:has-text('모던 세라믹 머그잔') button.relative.inline-flex").first();
      await toggleBtn.waitFor({ state: "visible", timeout: 5000 });
      await toggleBtn.click();
      await page.waitForTimeout(1000);
      
      // 쿠폰 토글 스냅샷 촬영
      await page.screenshot({ path: path.join(brainPath, "screenshot_products_4_coupon_toggled.png") });
      console.log("📸 4. 쿠폰 허용 토글 스위치 변경 화면 캡처 완료.");
    } catch (e) {
      console.log("⚠️ 쿠폰 허용 토글 버튼 조작 실패:", e.message);
    }

    // 6. 검색어 입력 및 페이지네이션 컨트롤 변경
    console.log("🔍 상품 검색 및 페이지 크기 변경 시뮬레이션 중...");
    try {
      const searchInput = page.locator("input[placeholder*='상품명, 카테고리']");
      await searchInput.waitFor({ state: "visible", timeout: 5000 });
      await searchInput.fill("이어폰");
      await page.waitForTimeout(1000);
      
      // 페이지당 표시 건수 변경
      const limitSelect = page.locator("span:has-text('페이지당 표시') + select").first();
      if (await limitSelect.isVisible()) {
        await limitSelect.selectOption("20");
        await page.waitForTimeout(1000);
      }

      // 검색/페이지네이션 필터 스냅샷 촬영
      await page.screenshot({ path: path.join(brainPath, "screenshot_products_5_filtered_pagination.png") });
      console.log("📸 5. 검색 필터 및 페이지네이션 컨트롤러 조작 화면 캡처 완료.");
    } catch (e) {
      console.log("⚠️ 검색 필터 조작 실패:", e.message);
    }

  } catch (err) {
    console.error("❌ 상품 관리 E2E 테스트 실행 중 에러 발생:", err);
  } finally {
    await browser.close();
    console.log("🏁 상품 관리 E2E 테스트 종료.");
  }
})();
