const { chromium } = require("playwright");
const path = require("path");

(async () => {
  console.log("🚀 모바일 B2B 견적 요청 AI 페이지 E2E 테스트 기동 중...");
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
  const mockProducts = [
    { id: "prod_t01", name: "친환경 대나무 텀블러 500ml", price: "15000", description: "B2B VIP용 이중단열 텀블러", category: "리빙웨어" },
    { id: "prod_t02", name: "프리미엄 옥수수 전분 빨대 100입", price: "2500", description: "생분해성 친환경 옥수수 빨대", category: "소모품" }
  ];

  // estimates GET API 모킹
  await page.route('**/api/estimates', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      console.log("💡 [Mock API] GET /api/estimates 호출 감지 - 상품 목록 전달");
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, products: mockProducts })
      });
    } else if (method === 'POST') {
      console.log("💡 [Mock API] POST /api/estimates 호출 감지 - 견적 요청서 전송");
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, estimateId: "EST_TEST_55941" })
      });
    } else {
      route.continue();
    }
  });

  // partners 중복 조회 API 모킹
  await page.route(/\/api\/partners.*/, async (route) => {
    console.log("💡 [Mock API] GET /api/partners 중복 조회 감지");
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, exists: false }) // 신규 가입 파트너로 설정
    });
  });

  // estimates/ocr API 모킹
  await page.route('**/api/estimates/ocr', async (route) => {
    console.log("💡 [Mock API] POST /api/estimates/ocr AI OCR 판독 감지");
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        company_name: "(주)에코그린라이프",
        representative: "이그린",
        address: "서울특별시 마포구 월드컵북로 400",
        phone: "010-9999-8888",
        email: "contact@ecogreen.com"
      })
    });
  });

  try {
    // 2. 모바일 견적 요청 페이지 접속 및 초기 화면 확인
    console.log("1. http://localhost:4000/m/estimate-request 접속 중...");
    await page.goto("http://localhost:4000/m/estimate-request", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000); // 렌더링 안정화 대기
    
    // 초기 화면 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_estimates_m_1_init.png") });
    console.log("📸 1. 초기 견적 요청 화면 캡처 완료.");

    // 3. 상품 검색 및 수량 선택
    console.log("🔍 상품 검색 및 수량 선택 시뮬레이션 중...");
    const searchInput = page.locator("input[placeholder*='자재/상품 이름']");
    await searchInput.fill("텀블러");
    await page.waitForTimeout(500);

    // 첫 번째 플러스 버튼 클릭하여 수량 1로 변경
    const plusBtn = page.locator("button:has(svg.lucide-plus)").first();
    await plusBtn.click();
    await page.waitForTimeout(500);

    // 수량 선택 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_estimates_m_2_qty_selected.png") });
    console.log("📸 2. 상품 수량 선택 화면 캡처 완료.");

    // 4. 사업자 번호 중복 조회 실행 (신규 가입 폼 노출)
    console.log("💳 사업자등록번호 입력 및 중복조회 실행 중...");
    await page.locator("input[placeholder*='10자리 번호']").fill("111-22-33333");
    await page.waitForTimeout(500);

    const checkBizBtn = page.locator("button:has-text('중복 조회')").first();
    await checkBizBtn.click();
    await page.waitForTimeout(1500); // 상태 전환 대기

    // 중복조회 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_estimates_m_3_biz_checked.png") });
    console.log("📸 3. 신규 사업자 중복 조회 완료 화면 캡처 완료.");

    // 5. 사업자등록증 첨부 시뮬레이션
    console.log("📂 가상 사업자등록증 파일 첨부 및 AI OCR 판독 트리거 중...");
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator("label[for='licenseFile']").click();
    const fileChooser = await fileChooserPromise;
    
    // 더미 버퍼 이미지를 생성하여 전송
    const dummyFilePath = path.join(__dirname, "dummy_license.png");
    const fs = require("fs");
    fs.writeFileSync(dummyFilePath, "dummy image content");
    await fileChooser.setFiles(dummyFilePath);
    await page.waitForTimeout(3000); // OCR 분석 완료 대기

    // 임시 더미 파일 삭제
    try { fs.unlinkSync(dummyFilePath); } catch (e) {}

    // OCR 성공 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_estimates_m_4_ocr_completed.png") });
    console.log("📸 4. AI OCR 자동 판독 완성 화면 캡처 완료.");

    // 6. 최종 견적서 요청 전송
    console.log("📤 견적서 최종 요청 전송 중...");
    const submitBtn = page.locator("button:has-text('AI 견적서 즉시 요청하기')").first();
    await submitBtn.click();
    await page.waitForTimeout(2000); // 전송 대기 및 전면 성공 화면 노출

    // 최종 접수 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_estimates_m_5_submitted.png") });
    console.log("📸 5. 견적 요청 완료 전면 화면 캡처 완료.");

  } catch (err) {
    console.error("❌ 모바일 B2B 견적 E2E 테스트 실행 중 에러 발생:", err);
  } finally {
    await browser.close();
    console.log("🏁 모바일 B2B 견적 E2E 테스트 종료.");
  }
})();
