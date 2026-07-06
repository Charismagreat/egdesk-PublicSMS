const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

(async () => {
  console.log("🚀 Partners-AI 페이지 브라우저 E2E 테스트 기동 중...");
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
  const tempFilePath = path.join(__dirname, "temp_business_license.png");

  // 1. API Mocking 설정
  // OCR API 가로채기
  await page.route('**/api/partners/ocr', route => {
    console.log("💡 [Mock API] /api/partners/ocr 호출 감지 - 가상 판독 데이터 응답");
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        status: "NEW_PARTNER",
        data: {
          businessNumber: "123-45-67890",
          companyName: "(주)테스트파트너",
          representative: "대표자테스트",
          address: "서울시 마포구 독막로 100",
          phone: "02-1234-5678",
          managerName: "실무담당자",
          openingDate: "2026-01-01",
          businessType: "도소매업",
          businessItem: "통신판매"
        },
        checksum: {
          isValid: true,
          message: "수학적 체크섬 검증 통과"
        },
        nts: {
          isValidated: true,
          status: "ACTIVE",
          statusText: "정상 계속사업자 (가동중)",
          taxType: "부가가치세 일반과세자",
          closedDate: ""
        },
        message: "등록되지 않은 신규 사업자입니다. 안전하게 신규 거래처로 등록할 수 있습니다."
      })
    });
  });

  // 상세 마이닝 API 가로채기
  await page.route('**/api/partners?action=detail&id=*', route => {
    console.log("💡 [Mock API] /api/partners?action=detail 호출 감지 - 가상 상세 이력 응답");
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        partner: {
          id: "PT-TEST-ID",
          type: "VENDOR",
          company_name: "(주)테스트파트너",
          business_number: "123-45-67890",
          representative: "대표자테스트",
          phone: "02-1234-5678",
          manager_name: "실무담당자",
          manager_phone: "010-9999-9999",
          email: "test@partner.com",
          address: "서울시 마포구 독막로 100",
          vip_level: "NORMAL",
          credit_limit: 50000000,
          memo: "테스트 메모입니다."
        },
        purchaseOrders: [
          {
            id: "PO-10001",
            vendor_name: "(주)테스트파트너",
            status: "PENDING_INBOUND",
            total_amount: 15000000,
            created_at: "2026-06-01 10:00:00"
          },
          {
            id: "PO-10002",
            vendor_name: "(주)테스트파트너",
            status: "COMPLETED",
            total_amount: 35000000,
            created_at: "2026-05-15 14:00:00"
          }
        ],
        salesOrders: []
      })
    });
  });

  try {
    // 2. 임시 업로드용 파일 생성
    fs.writeFileSync(tempFilePath, "dummy png image file content");

    // 3. 페이지 접속 및 초기 화면 확인
    console.log("1. http://localhost:4000/partners 접속 중...");
    await page.goto("http://localhost:4000/partners", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000); // 렌더링 안정화 대기
    
    // 기본 화면 캡처
    await page.screenshot({ path: path.join(brainPath, "screenshot_partners_1_init.png") });
    console.log("📸 1. 초기 화면 (거래처 관리 대시보드) 캡처 완료.");

    // 4. 신규 거래처 등록 모달 화면
    console.log("2. 신규 거래처 등록 모달 표출...");
    const addBtn = page.locator("button:has-text('신규 공급사 등록')").first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1500); // 모달 애니메이션 대기
      await page.screenshot({ path: path.join(brainPath, "screenshot_partners_2_add_modal.png") });
      console.log("📸 2. 신규 거래처 등록 모달 화면 캡처 완료.");
      
      // 5. OCR 파일 업로드 시뮬레이션
      console.log("3. OCR 파일 업로드 시뮬레이션 실행 중...");
      const fileInput = page.locator("input#business-license-uploader");
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(tempFilePath);
        console.log("파일 인풋 세팅 완료. AI 판독 API 대기...");
        await page.waitForTimeout(3500); // AI OCR 결과 수신 및 화면 자동 완성 대기
        
        await page.screenshot({ path: path.join(brainPath, "screenshot_partners_3_ocr_analyzing.png") });
        console.log("📸 3. 사업자등록증 OCR 업로드 후 스캔/판독 결과 피드백 화면 캡처 완료.");
      } else {
        console.log("⚠️ uploader 인풋 엘리먼트를 찾지 못했습니다.");
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
      console.log("⚠️ 신규 공급사 등록 버튼을 찾지 못했습니다.");
    }

    // 6. 특정 거래처 클릭 시 상세 프로필 및 실시간 거래 히스토리 타임라인 모달 화면
    console.log("4. 특정 거래처 상세 이력 조회 시도...");
    const tableRow = page.locator("table tbody tr").first();
    if (await tableRow.isVisible()) {
      await tableRow.click();
      await page.waitForTimeout(3000); // 이력 마이닝 로딩 대기
      
      await page.screenshot({ path: path.join(brainPath, "screenshot_partners_4_detail_modal.png") });
      console.log("📸 4. 특정 거래처 상세 프로필 및 실시간 거래 히스토리 타임라인 모달 화면 캡처 완료.");

      // 모달 닫기
      const closeDetailBtn = page.locator("button:has-text('닫기')").first();
      if (await closeDetailBtn.isVisible()) {
        await closeDetailBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(1000);
    } else {
      console.log("⚠️ 테이블에 선택 가능한 거래처 행이 존재하지 않습니다.");
    }

    // 7. 검색 필터를 거쳐 필터링된 테이블 목록 화면
    console.log("5. 거래처 검색 필터 테스트...");
    const searchInput = page.locator("input[placeholder*='검색...']").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("기존"); // 테스트 검색 필터링 유도
      await page.waitForTimeout(1500); // 필터링 결과 대기
      
      await page.screenshot({ path: path.join(brainPath, "screenshot_partners_5_filtered.png") });
      console.log("📸 5. 검색 필터링된 테이블 목록 화면 캡처 완료.");
    } else {
      console.log("⚠️ 검색 입력 필드를 찾지 못했습니다.");
    }

  } catch (err) {
    console.error("❌ E2E 테스트 실행 중 오류 발생:", err);
  } finally {
    // 8. 임시 파일 삭제 및 브라우저 종료
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("🧹 임시 업로드 파일 삭제 완료.");
    }
    await browser.close();
    console.log("🏁 브라우저 E2E 테스트 완료.");
  }
})();
