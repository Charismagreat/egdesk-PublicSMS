const { chromium } = require("C:/dev/egdesk-FreeSMS/node_modules/playwright");
const path = require("path");

(async () => {
  console.log("🚀 Store-AI 페이지 브라우저 E2E 테스트 기동 중...");
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
  const requestContext = await browser.newContext().then(ctx => ctx.request);
  const testProductId = "test-product-id-e2e";

  try {
    // 0. E2E 검증용 모의 상품 API 호출로 사전 생성
    console.log("0. E2E 테스트용 모의 상품 생성 중...");
    const createRes = await requestContext.post("http://localhost:4000/api/products", {
      data: {
        id: testProductId,
        name: "테스트상품",
        price: "10,000",
        description: "E2E 검증용 테스트 상품 설명입니다.",
        category: "일반상품",
        available_methods: "배달,배송,가져가기,매장에서",
        main_image_url: "",
        detail_image_url: ""
      }
    });
    console.log(`모의 상품 생성 API 응답: status=${createRes.status()}`);

    // 1. 페이지 접속 및 초기 화면 확인
    console.log("1. http://localhost:4000/store 접속 중...");
    await page.goto("http://localhost:4000/store", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000); // 렌더링 안정화 대기
    
    // 기본 화면 캡처
    await page.screenshot({ path: path.join(brainPath, "screenshot_store_1_init.png") });
    console.log("📸 1. 초기 화면 (스토어 대시보드) 캡처 완료.");

    // 2. 음성 주문 마법사 기동 및 화면 확인
    console.log("2. 음성 주문 마법사 클릭 중...");
    const voiceBtn = page.locator("button:has(svg.lucide-bot)").first();
    if (await voiceBtn.isVisible()) {
      await voiceBtn.click();
      await page.waitForTimeout(1500); // 모달 애니메이션 대기
      await page.screenshot({ path: path.join(brainPath, "screenshot_store_3_voice_wizard.png") });
      console.log("📸 2. 음성 주문 마법사 화면 캡처 완료.");
      
      // 모달 닫기
      const voiceCloseBtn = page.locator("button:has(svg.lucide-x)").last(); // 음성 모달 내 x 버튼
      if (await voiceCloseBtn.isVisible()) {
        await voiceCloseBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(1000);
    } else {
      console.log("⚠️ 음성 주문 플로팅 버튼을 찾지 못했습니다.");
    }

    // 3. 특정 상품 클릭하여 주문서 모달 표출
    console.log("3. 상품 카드 클릭 시도...");
    const targetProductCard = page.locator(`div.cursor-pointer:has-text('테스트상품')`).first();
    const fallbackProductCard = page.locator("div.cursor-pointer").first();
    const productCard = (await targetProductCard.isVisible()) ? targetProductCard : fallbackProductCard;

    if (await productCard.isVisible()) {
      await productCard.click();
      await page.waitForTimeout(2500); // 모달 로딩 및 애니메이션 대기
      await page.screenshot({ path: path.join(brainPath, "screenshot_store_2_detail_modal.png") });
      console.log("📸 3. 상품 상세 및 주문서 팝업 화면 캡처 완료.");

      // 4. 단골 적립 뱃지 클릭하여 포인트 가이드 팝업 표출
      console.log("4. 적립 예정 포인트 뱃지 클릭 시도...");
      const pointBadge = page.locator("span:has-text('적립 예정')").first();
      if (await pointBadge.isVisible()) {
        await pointBadge.click();
        await page.waitForTimeout(1500); // 가이드 모달 애니메이션 대기
        await page.screenshot({ path: path.join(brainPath, "screenshot_store_4_point_guide.png") });
        console.log("📸 4. 3초 단골 적립 가이드 팝업 화면 캡처 완료.");
        
        // 가이드 모달 닫기
        const guideCloseBtn = page.locator("button:has-text('확인 및 닫기')").first();
        if (await guideCloseBtn.isVisible()) {
          await guideCloseBtn.click();
        } else {
          await page.keyboard.press("Escape");
        }
        await page.waitForTimeout(1000);
      } else {
        console.log("⚠️ 적립 예정 포인트 뱃지를 찾지 못했습니다.");
      }

      // 5. 모의 주문 폼 작성 및 주문 제출
      console.log("5. 모의 주문 작성 중...");
      const nameInput = page.locator("input[placeholder='홍길동']").first();
      const phoneInput = page.locator("input[placeholder='010-1234-5678']").first();
      
      if (await nameInput.isVisible() && await phoneInput.isVisible()) {
        await nameInput.fill("테스트주문자");
        await phoneInput.fill("010-9999-9999");
        await page.waitForTimeout(500);

        // 배송지 정보 주소 필드 필요 시 입력
        const addressInput = page.locator("input[placeholder*='주소']").first();
        if (await addressInput.isVisible()) {
          await addressInput.fill("서울시 강남구 삼성동 123");
          await page.waitForTimeout(500);
        }

        const orderSubmitBtn = page.locator("button[type='submit']").first();
        if (await orderSubmitBtn.isVisible()) {
          await orderSubmitBtn.click();
          console.log("주문 접수 버튼 클릭 완료. 성공 화면 대기...");
          await page.waitForTimeout(3000); // 주문 성공 결과 렌더링 대기
          await page.screenshot({ path: path.join(brainPath, "screenshot_store_5_order_success.png") });
          console.log("📸 5. 주문 성공 및 입금 계좌 안내 화면 캡처 완료.");
        } else {
          console.log("⚠️ 주문 제출 버튼을 찾지 못했습니다.");
        }
      } else {
        console.log("⚠️ 주문자 정보 입력 폼 필드를 찾지 못했습니다.");
      }

      // 최종 모달 닫기
      const finalCloseBtn = page.locator("button:has-text('확인')").first();
      const fallbackCloseBtn = page.locator("button:has(svg.lucide-x)").first();
      const closeBtn = (await finalCloseBtn.isVisible()) ? finalCloseBtn : fallbackCloseBtn;
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(1000);

    } else {
      console.log("⚠️ 상품 카드를 찾지 못했습니다.");
    }

  } catch (err) {
    console.error("❌ E2E 테스트 중 에러 발생:", err);
  } finally {
    // 9. E2E 테스트용 모의 상품 API 호출로 삭제
    console.log("9. E2E 테스트용 모의 상품 삭제 중...");
    try {
      const deleteRes = await requestContext.delete(`http://localhost:4000/api/products?id=${testProductId}`);
      console.log(`모의 상품 삭제 API 응답: status=${deleteRes.status()}`);
    } catch (e) {
      console.error("모의 상품 삭제 실패:", e);
    }

    await browser.close();
    console.log("🏁 브라우저 E2E 테스트 완료.");
  }
})();
