const { chromium } = require("playwright");
const path = require("path");

(async () => {
  console.log("🚀 AI-Briefing 페이지 브라우저 E2E 테스트 기동 중...");
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

  // 1. API Mocking 설정
  // 권한 API
  await page.route('**/api/auth/me', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, role: 'SUPER_ADMIN' })
    });
  });

  // 공유 리포트 리스트 GET API 가로채기
  await page.route('**/api/db/ai-visualize/share', route => {
    if (route.request().method() === 'GET') {
      console.log("💡 [Mock API] GET /api/db/ai-visualize/share 호출 감지 - 가상 대시보드 리스트 응답");
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          list: [
            {
              share_id: "share-001",
              title: "일별 매출 요약",
              custom_title: null,
              sql_query: "SELECT date, sum(amount) FROM sales GROUP BY date",
              table_name: "sales",
              briefing_markdown: "## 일별 매출 분석\n* 최근 **매출 성장세**가 돋보입니다.\n* 특히 `2026-06-01` 매출이 급증했습니다.",
              chart_spec_json: {
                type: "bar",
                x: "date",
                y: "amount",
                sampleRows: [
                  { "date": "2026-06-01", "amount": 12000000 },
                  { "date": "2026-06-02", "amount": 9500000 },
                  { "date": "2026-06-03", "amount": 11000000 }
                ]
              },
              created_at: "2026-06-01 12:00:00",
              last_refreshed_at: "2026-06-04 10:00:00",
              is_active: 1,
              refresh_interval: "DAILY",
              sort_order: 0
            },
            {
              share_id: "share-002",
              title: "공급처 거래 비중",
              custom_title: "공급사 성과 지표",
              sql_query: "SELECT vendor, count(*) FROM orders GROUP BY vendor",
              table_name: "orders",
              briefing_markdown: "## 공급처 분석\n* **(주)테스트파트너**와의 거래량이 가장 많습니다.\n* 단가가 전월 대비 `5%` 감소했습니다.",
              chart_spec_json: {
                type: "pie",
                x: "vendor",
                y: "count",
                sampleRows: [
                  { "vendor": "(주)테스트파트너", "count": 45 },
                  { "vendor": "(주)에이비씨", "count": 25 },
                  { "vendor": "(주)케이프", "count": 15 }
                ]
              },
              created_at: "2026-05-15 09:00:00",
              last_refreshed_at: "2026-06-04 11:00:00",
              is_active: 1,
              refresh_interval: "WEEKLY",
              sort_order: 10
            }
          ]
        })
      });
    } else {
      console.log("💡 [Mock API] PATCH /api/db/ai-visualize/share 호출 감지 - 성공 처리");
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    }
  });

  // 새로고침 API 가로채기 (5번 시나리오 갱신 시 로딩 연출을 위해 의도적으로 응답을 지연시킴)
  await page.route('**/api/db/ai-visualize/share/refresh**', async route => {
    console.log("💡 [Mock API] GET /api/db/ai-visualize/share/refresh 호출 감지 (지연 응답)");
    await new Promise(resolve => setTimeout(resolve, 5000));
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  try {
    // 1. 페이지 접속 및 초기 화면 확인
    console.log("1. http://localhost:4000/ai-briefing 접속 중...");
    await page.goto("http://localhost:4000/ai-briefing", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000); // 렌더링 안정화 대기
    
    // 기본 화면 캡처
    await page.screenshot({ path: path.join(brainPath, "screenshot_ai_briefing_1_init.png") });
    console.log("📸 1. 초기 화면 (종합 관제 대시보드) 캡처 완료.");

    // 2. 보고서 순서 조율 (UP/DOWN)
    console.log("2. 보고서 순서 조율 시도...");
    const downBtn = page.locator("button[title='이 보고서를 한 칸 아래로 내림']").first();
    if (await downBtn.isVisible()) {
      await downBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(brainPath, "screenshot_ai_briefing_2_reordered.png") });
      console.log("📸 2. 보고서 순서 조율 반영 결과 화면 캡처 완료.");
    } else {
      console.log("⚠️ 순서 내림 버튼을 찾지 못했습니다.");
    }

    // 3. 보고서 제목 인라인 편집
    console.log("3. 보고서 제목 인라인 편집 시도...");
    const editTitleBtn = page.locator("button[title='제목 인라인 수정']").first();
    if (await editTitleBtn.isVisible()) {
      await editTitleBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(brainPath, "screenshot_ai_briefing_3_editing_title.png") });
      console.log("📸 3. 보고서 제목 인라인 편집 활성화 상태 화면 캡처 완료.");
      
      // 편집 모드 취소
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    } else {
      console.log("⚠️ 제목 인라인 수정 버튼을 찾지 못했습니다.");
    }

    // 4. 콤팩트 더보기 메뉴(MoreVertical) 열기
    console.log("4. 더보기 메뉴 팝업 노출 시도...");
    const moreBtn = page.locator("button[title='더보기 메뉴']").first();
    if (await moreBtn.isVisible()) {
      await moreBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(brainPath, "screenshot_ai_briefing_4_compact_toolbar.png") });
      console.log("📸 4. 콤팩트 2열 배치 및 더보기 팝업 노출 화면 캡처 완료.");

      // 5. 팝업 내부의 실시간 갱신 버튼 클릭
      console.log("5. 실시간 갱신 작동 중 로딩 화면 연출...");
      const refreshReportBtn = page.locator("button[title='실시간 갱신 (SQL 데이터 재조회 및 AI 브리핑 재스캔)']").first();
      if (await refreshReportBtn.isVisible()) {
        await refreshReportBtn.click();
        await page.waitForTimeout(1500); // 갱신 애니메이션 및 스켈레톤 활성화 대기
        await page.screenshot({ path: path.join(brainPath, "screenshot_ai_briefing_5_refreshing.png") });
        console.log("📸 5. 실시간 AI 분석 보고서 최신 갱신 로딩 화면 캡처 완료.");
      } else {
        console.log("⚠️ 실시간 갱신 버튼을 찾지 못했습니다.");
      }
    } else {
      console.log("⚠️ 더보기 메뉴 버튼을 찾지 못했습니다.");
    }

  } catch (err) {
    console.error("❌ E2E 테스트 실행 중 오류 발생:", err);
  } finally {
    await browser.close();
    console.log("🏁 브라우저 E2E 테스트 완료.");
  }
})();
