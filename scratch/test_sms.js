const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

(async () => {
  console.log("🚀 SMS-AI 페이지 브라우저 E2E 테스트 기동 중...");
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
  
  // 브라우저 뷰포트 크기 설정
  await page.setViewportSize({ width: 1440, height: 950 });

  // Alert/Confirm 자동 수락/해제 핸들러 등록
  page.on("dialog", async (dialog) => {
    console.log(`⚠️ Alert/Confirm 감지됨: [${dialog.type()}] ${dialog.message()}`);
    await dialog.accept();
  });

  const brainPath = "C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\172c65bc-806e-439a-ad52-235f987ace59";
  const tempExcelPath = path.join(__dirname, "temp_sms_customers.xlsx");

  // 1. API Mocking 설정
  // 권한 API
  await page.route('**/api/auth/me', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, role: 'SUPER_ADMIN' })
    });
  });

  // 기기 환경 설정 API
  await page.route('**/api/settings?key=sms_devices', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        value: JSON.stringify([
          { phoneNumber: "default", name: "기본 스마트폰 기기", isConnected: true, dailyLimit: 150, todaySent: 10 },
          { phoneNumber: "01099998888", name: "서브 테스트폰", isConnected: false, dailyLimit: 100, todaySent: 0 }
        ])
      })
    });
  });

  // 기기 개별 연결 상태 체크 API
  await page.route('**/api/sms/status**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, isConnected: true })
    });
  });

  // 발송 카운트 산출용 로그 API
  await page.route('**/api/message-logs', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, logs: [] })
    });
  });

  // 광고성 템플릿 목록 API
  await page.route('**/api/ad-templates', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        templates: [
          { id: "t1", name: "주말 특가 세일", header: "(광고) EG주말세일", footer: "무료거부:", optOut: "080-123-4567" }
        ]
      })
    });
  });

  // 광고 연동 상품 목록 API
  await page.route('**/api/products', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, products: [] })
    });
  });

  // 거래 정보 이력 API
  await page.route('**/api/transactions', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, transactions: [] })
    });
  });

  // 문자 본문 템플릿 목록 API
  await page.route('**/api/message-templates', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        templates: [
          { id: 101, title: "첫 인사 템플릿", content: "안녕하세요! {이름} 고객님, EGDesk입니다." }
        ]
      })
    });
  });

  // 고객 목록 DB 로드 API
  await page.route('**/api/customers', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          rows: [
            { id: 1, name: "김단골", phone: "010-1111-2222", tags: "VIP" },
            { id: 2, name: "이정기", phone: "010-3333-4444", tags: "단골" },
            { id: 3, name: "박신규", phone: "010-5555-6666", tags: "신규" }
          ]
        }
      })
    });
  });

  // AI 자동 작성 API 가로채기
  await page.route('**/api/ai-sms', route => {
    console.log("💡 [Mock API] POST /api/ai-sms 호출 감지 - AI 자동화 텍스트 반환");
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        targetIds: [1, 2],
        messageContent: "안녕하세요! {이름} 고객님, 이번 주말 50% 역대급 세일 이벤트를 진행합니다. 변함없이 찾아주셔서 감사합니다."
      })
    });
  });

  try {
    // 2. 임시 엑셀 데이터 파일 작성
    const ws = XLSX.utils.json_to_sheet([
      { "이름": "엑셀고객1", "연락처": "010-9999-1111", "태그": "마케팅" },
      { "이름": "엑셀고객2", "연락처": "010-9999-2222", "태그": "홍보" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "고객명단");
    XLSX.writeFile(wb, tempExcelPath);

    // 3. 페이지 접속 및 초기 화면 확인
    console.log("1. http://localhost:4000/sms 접속 중...");
    await page.goto("http://localhost:4000/sms", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000); // 렌더링 안정화 대기
    
    // 기본 화면 캡처
    await page.screenshot({ path: path.join(brainPath, "screenshot_sms_1_init.png") });
    console.log("📸 1. 초기 화면 (무료 문자 발송 대시보드) 캡처 완료.");

    // 4. AI 비서 자동 완성 기동
    console.log("2. AI 비서 프롬프트 입력 및 자동 완성 작동 중...");
    const aiInput = page.locator("input[placeholder*='단골 고객들에게']").first();
    const aiSubmitBtn = page.locator("button:has-text('자동 완성')").first();
    if (await aiInput.isVisible() && await aiSubmitBtn.isVisible()) {
      await aiInput.fill("단골 고객 대상 주말 50% 세일 문자 작성해줘");
      await page.waitForTimeout(500);
      await aiSubmitBtn.click();
      await page.waitForTimeout(2500); // AI 로딩 및 텍스트 반영 대기
      
      await page.screenshot({ path: path.join(brainPath, "screenshot_sms_2_ai_completing.png") });
      console.log("📸 2. AI 자동 완성 결과 반영 화면 캡처 완료.");
    } else {
      console.log("⚠️ AI 입력 필드 또는 자동 완성 버튼을 찾지 못했습니다.");
    }

    // 5. 광고성 옵션 활성화
    console.log("3. 광고성 메시지 옵션 체크 시도...");
    const adCheckbox = page.locator("input[type='checkbox']").first();
    if (await adCheckbox.isVisible()) {
      await adCheckbox.click();
      await page.waitForTimeout(1500); // 헤더/푸터 패널 슬라이드 노출 대기
      
      await page.screenshot({ path: path.join(brainPath, "screenshot_sms_3_ad_option_checked.png") });
      console.log("📸 3. 광고 옵션 체크 및 템플릿 입력 영역 노출 화면 캡처 완료.");
    } else {
      console.log("⚠️ 광고 옵션 체크박스를 찾지 못했습니다.");
    }

    // 6. 발송 대상 탭을 엑셀 직접 업로드로 전환하고 엑셀 파일 로드
    console.log("4. 발송 대상을 엑셀 업로드 탭으로 전환 및 파일 업로드 시뮬레이션...");
    const excelTabBtn = page.locator("button:has-text('엑셀 직접 업로드')").first();
    if (await excelTabBtn.isVisible()) {
      await excelTabBtn.click();
      await page.waitForTimeout(1000);

      // 파일 업로드 처리
      const fileInput = page.locator("input[type='file']").first();
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(tempExcelPath);
        await page.waitForTimeout(2500); // 엑셀 파싱 및 데이터 바인딩 대기
        
        await page.screenshot({ path: path.join(brainPath, "screenshot_sms_4_target_excel_tab.png") });
        console.log("📸 4. 엑셀 업로드 데이터 테이블 바인딩 화면 캡처 완료.");
      } else {
        console.log("⚠️ 엑셀 파일 인풋 요소를 찾지 못했습니다.");
      }
    } else {
      console.log("⚠️ 엑셀 직접 업로드 탭 버튼을 찾지 못했습니다.");
    }

    // 7. 테스트 발송 팝업 모달 열기
    console.log("5. 테스트 발송 미리보기 팝업 트리거...");
    const testSendBtn = page.locator("button:has-text('테스트 발송')").first();
    if (await testSendBtn.isVisible()) {
      await testSendBtn.click();
      await page.waitForTimeout(1500); // 모달 애니메이션 대기
      
      await page.screenshot({ path: path.join(brainPath, "screenshot_sms_5_test_send_modal.png") });
      console.log("📸 5. 테스트 발송 모달 미리보기 화면 캡처 완료.");

      // 모달 닫기
      const closeBtn = page.locator("button:has-text('닫기')").first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(1000);
    } else {
      console.log("⚠️ 테스트 발송 버튼을 찾지 못했습니다.");
    }

  } catch (err) {
    console.error("❌ E2E 테스트 실행 중 오류 발생:", err);
  } finally {
    // 8. 임시 파일 삭제 및 브라우저 종료
    if (fs.existsSync(tempExcelPath)) {
      fs.unlinkSync(tempExcelPath);
      console.log("🧹 임시 업로드용 엑셀 파일 삭제 완료.");
    }
    await browser.close();
    console.log("🏁 브라우저 E2E 테스트 완료.");
  }
})();
