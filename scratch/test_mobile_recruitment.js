const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

(async () => {
  console.log("🚀 모바일 채용 정보 페이지 E2E 테스트 기동 중...");
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

  try {
    // 1. 모바일 채용 페이지 접속 및 초기 화면 확인
    console.log("1. http://localhost:4000/m/recruitment 접속 중...");
    await page.goto("http://localhost:4000/m/recruitment", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000); // 렌더링 안정화 대기
    
    // 간편 프로필 데이터 채우기
    console.log("📝 1초 간편 지원서 작성 시뮬레이션 중...");
    await page.locator("input[placeholder='홍길동']").fill("김테스트");
    await page.locator("input[placeholder='24']").fill("27");
    await page.locator("input[placeholder='010-1234-5678']").fill("010-9876-5432");
    await page.locator("input[placeholder*='카페 바리스타']").fill("베이커리 카페 바리스타 경력 1년 6개월");
    await page.locator("textarea[placeholder*='인센티브와 시너지']").fill("스페셜티 커피 브랜드에 대한 높은 이해도를 바탕으로 활기차게 시너지를 내어 근무하겠습니다.");
    await page.waitForTimeout(500);

    // 1단계 공고 및 지원서 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_recruitment_m_1_posting.png") });
    console.log("📸 1. 초기 공고 피드 & 지원서 작성 화면 캡처 완료.");

    // 지원서 제출
    const applySubmitBtn = page.locator("button:has-text('1초 프로필 제출')");
    await applySubmitBtn.click();
    await page.waitForTimeout(1500); // 상태 전환 대기

    // 2. 지원 완료 대기 화면 확인
    await page.screenshot({ path: path.join(brainPath, "screenshot_recruitment_m_2_waiting.png") });
    console.log("📸 2. 프로필 제출 후 사장님 승인 대기 화면 캡처 완료.");

    // 3. 사장님이 AI 면접방을 개방한 상태 모사 (localStorage sync 트리거)
    console.log("⚡ 사장님 측의 AI 면접 기동 동기화 신호 시뮬레이션 주입...");
    await page.evaluate(() => {
      localStorage.setItem("egdesk_recruitment_candidate_id", "APP_TEST_123");
      const eventData = {
        action: "interview_start",
        applicantId: "APP_TEST_123",
        timestamp: Date.now()
      };
      localStorage.setItem("egdesk_recruitment_sync", JSON.stringify(eventData));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'egdesk_recruitment_sync',
        newValue: JSON.stringify(eventData)
      }));
    });
    await page.waitForTimeout(2000); // 면접 채팅방 활성화 대기

    // 첫 면접 메시지 답변 입력 및 전송
    console.log("💬 AI 면접관과 대화 시작 (1차 답변 전송 중)...");
    await page.locator("input[placeholder='메세지 보내기...']").fill("과거 대형 프랜차이즈 카페에서 신속하고 세련되게 음료 제조를 하고 고객 만족을 달성한 서비스 노하우가 강점입니다.");
    await page.waitForTimeout(500);
    await page.locator("button:has(svg.lucide-send)").click();
    await page.waitForTimeout(2500); // AI 답변 지연 및 렌더링 대기

    // 3단계 AI 면접 타임라인 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_recruitment_m_3_interviewing.png") });
    console.log("📸 3. AI 1:1 대화(DM) 진행 중 채팅 화면 캡처 완료.");

    // 4. 사장님이 합격 승인 및 근로계약서 개방 상태 모사 (localStorage sync 트리거)
    console.log("⚡ 사장님 측의 근로계약서 개방 동기화 신호 시뮬레이션 주입...");
    await page.evaluate(() => {
      const eventData = {
        action: "contract_open",
        applicantId: "APP_TEST_123",
        timestamp: Date.now()
      };
      localStorage.setItem("egdesk_recruitment_sync", JSON.stringify(eventData));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'egdesk_recruitment_sync',
        newValue: JSON.stringify(eventData)
      }));
    });
    await page.waitForTimeout(2000); // 근로계약서 및 사인 패드 활성화 대기

    // HTML5 Canvas 서명 그리기 시뮬레이션
    console.log("✍️ 스케치 패드 친필 서명 그리기 시뮬레이션 중...");
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (box) {
      // 캔버스 중앙 영역을 긁는 궤적 시뮬레이션
      await page.mouse.move(box.x + 50, box.y + 50);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 30, { steps: 3 });
      await page.mouse.move(box.x + 180, box.y + 80, { steps: 5 });
      await page.mouse.move(box.x + 300, box.y + 40, { steps: 4 });
      await page.mouse.up();
    }
    await page.waitForTimeout(1000);

    // 4단계 표준근로계약서 & 서명 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_recruitment_m_4_contracting.png") });
    console.log("📸 4. 전자 근로계약서 및 친필 서명 패드 화면 캡처 완료.");

    // 서명 제출 및 최종 채용 완료
    const contractSubmitBtn = page.locator("button:has-text('디지털 서명 제출')");
    await contractSubmitBtn.click();
    await page.waitForTimeout(1500); // 상태 전환 대기

    // 5단계 매칭 완료 스냅샷 촬영
    await page.screenshot({ path: path.join(brainPath, "screenshot_recruitment_m_5_done.png") });
    console.log("📸 5. 채용 매칭 최종 완료 축하 화면 캡처 완료.");

  } catch (err) {
    console.error("❌ 모바일 채용 E2E 테스트 실행 중 에러 발생:", err);
  } finally {
    await browser.close();
    console.log("🏁 모바일 채용 E2E 테스트 종료.");
  }
})();
