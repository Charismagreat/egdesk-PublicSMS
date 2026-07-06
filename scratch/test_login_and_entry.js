const { chromium } = require("playwright");
const path = require("path");

(async () => {
  console.log("🚀 로그인 및 테이블 오더 진입 페이지 E2E 테스트 기동 중...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 모바일/데스크톱 뷰포트
  await page.setViewportSize({ width: 1280, height: 800 });

  const brainPath = "C:\\Users\\CHARISMA\\.gemini\\antigravity/brain/172c65bc-806e-439a-ad52-235f987ace59";

  // Alert/Confirm 수락 핸들러
  page.on("dialog", async (dialog) => {
    console.log(`⚠️ Alert/Confirm 감지됨: [${dialog.type()}] ${dialog.message()}`);
    await dialog.accept();
  });

  // 1. API Mocking 설정
  // 로그인 실패 API mocking
  await page.route('**/api/auth/login', async (route) => {
    const postData = JSON.parse(route.request().postData());
    if (postData.username === "wrong" || postData.password === "wrong") {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: "아이디 또는 비밀번호가 잘못되었습니다." })
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    }
  });

  try {
    // 2. 로그인 페이지 접속
    console.log("1. http://localhost:4000/login 접속 중...");
    await page.goto("http://localhost:4000/login", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    
    // 초기 로그인 화면 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_login_1_init.png") });
    console.log("📸 1. 초기 로그인 화면 캡처 완료.");

    // 3. 잘못된 정보로 로그인 시도 (실패 검증)
    console.log("2. 잘못된 정보로 로그인 시도 중...");
    await page.locator("input[placeholder='아이디']").fill("wrong");
    await page.locator("input[placeholder='비밀번호']").fill("wrong");
    await page.locator("button[type='submit']").click();
    await page.waitForTimeout(1000);

    // 로그인 실패 에러 화면 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_login_2_error.png") });
    console.log("📸 2. 로그인 실패 에러 표시 화면 캡처 완료.");

    // 4. 올바른 정보로 로그인 시도 (성공 검증)
    console.log("3. 올바른 정보로 로그인 시도 중...");
    await page.locator("input[placeholder='아이디']").fill("admin");
    await page.locator("input[placeholder='비밀번호']").fill("admin1234");
    await page.locator("button[type='submit']").click();
    await page.waitForTimeout(2000); // 리다이렉트 대기

    // 로그인 성공 후 대시보드 화면 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_login_3_success_dashboard.png") });
    console.log("📸 3. 로그인 성공 및 대시보드 진입 화면 캡처 완료.");

    // 5. 테이블 오더 진입 페이지 테스트
    console.log("4. http://localhost:4000/table-order 접속 중...");
    await page.goto("http://localhost:4000/table-order", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // 테이블 오더 진입 화면 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_table_order_entry_4_init.png") });
    console.log("📸 4. 테이블 오더 진입 화면 캡처 완료.");

    // 6. 테이블 번호 입력 및 메뉴 이동
    console.log("5. 테이블 번호 '5' 입력 후 이동 중...");
    await page.locator("input[type='number']").fill("5");
    await page.locator("button[type='submit']").click();
    await page.waitForTimeout(2000); // 렌더링 대기

    // 메뉴 이동 성공 화면 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_table_order_entry_5_redirect.png") });
    console.log("📸 5. 테이블 오더 5번 메뉴판 이동 화면 캡처 완료.");

  } catch (err) {
    console.error("❌ E2E 테스트 실행 중 오류가 발생했습니다:", err);
  } finally {
    await browser.close();
    console.log("🏁 E2E 테스트 종료.");
  }
})();
