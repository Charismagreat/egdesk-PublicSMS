const { chromium } = require('playwright');

(async () => {
  console.log("🚀 MyDB 상세 상호작용 검증 스크립트 기동...");
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
  await page.setViewportSize({ width: 1440, height: 900 });
  const brainPath = 'C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\172c65bc-806e-439a-ad52-235f987ace59';

  try {
    // 1. 페이지 접속
    console.log("1. http://localhost:4000/my-db 접속 중...");
    await page.goto('http://localhost:4000/my-db', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // crm_expenses 테이블(데이터 존재 확정)을 명시적으로 클릭 선택
    console.log("crm_expenses 테이블 선택 시도...");
    const targetTableBtn = page.locator('button:has-text("crm_expenses")').first();
    await targetTableBtn.waitFor({ state: 'visible', timeout: 10000 });
    await targetTableBtn.click();
    await page.waitForTimeout(2000); // 테이블 변경 데이터 로드 대기

    // 2. 실시간 검색 필터 검증
    console.log("2. 실시간 검색 필터 적용 검증 시작...");
    
    // 테이블 로드 확인 (첫 번째 선택된 테이블 이름 가져오기)
    const activeTableBtn = page.locator('button[class*="bg-blue-50"]').first();
    await activeTableBtn.waitFor({ state: 'visible', timeout: 10000 });
    const selectedTableName = await activeTableBtn.locator('span.text-xs').textContent();
    console.log(`현재 로드된 테이블: ${selectedTableName.trim()}`);

    const searchKeySelect = page.locator('form select').first();
    const searchInput = page.locator('form input[placeholder="검색어 입력..."]');
    
    if (await searchKeySelect.isVisible() && await searchInput.isVisible()) {
      // 두 번째 컬럼 선택 (예: id 또는 category 등)
      await searchKeySelect.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      
      // 검색어 입력
      await searchInput.fill("1");
      await page.waitForTimeout(500);
      
      // 검색 버튼 클릭
      await page.getByRole('button', { name: "검색", exact: true }).click();
      await page.waitForTimeout(2000); // 필터 쿼리 실행 대기
      
      await page.screenshot({ path: `${brainPath}\\screenshot_interaction_1_filtered.png` });
      console.log("📸 1. 필터 적용 결과 스크린샷 캡처 완료.");
    } else {
      console.log("⚠️ 검색 필터 UI를 찾지 못했습니다.");
    }

    // 3. 챗봇 대화 이력 보존(localStorage) 검증
    console.log("3. AI 지능형 리포트 탭 진입 및 챗봇 연동 검증...");
    // 직접 쿼리 입력 탭으로 이동해서 SQL 실행 (차트 시각화 및 브리핑 생성을 위함)
    await page.getByRole('button', { name: "직접 쿼리 입력" }).click();
    await page.waitForTimeout(500);

    const sqlTextarea = page.locator('textarea[placeholder*="실행할 커스텀 SQL"]');
    if (await sqlTextarea.isVisible()) {
      const activeQuery = `SELECT * FROM crm_expenses ORDER BY id DESC LIMIT 10;`;
      console.log(`실행할 쿼리: ${activeQuery}`);
      await sqlTextarea.fill(activeQuery);
      await page.waitForTimeout(500);
      // 'SQL 실행 (Ctrl+Enter)' 버튼 클릭
      await page.getByRole('button', { name: "SQL 실행 (Ctrl+Enter)", exact: true }).click();
      console.log("SQL 쿼리 실행 중... (시각화 및 브리핑 생성 대기 5초)");
      await page.waitForTimeout(5500);
    }

    // AI 지능형 통합 리포트 탭으로 이동
    const briefingTab = page.getByRole('button', { name: /AI 지능형 시각화/ });
    await briefingTab.waitFor({ state: 'visible', timeout: 10000 });
    if (await briefingTab.isVisible()) {
      await briefingTab.click();
      await page.waitForTimeout(2500); // 로드 대기
      
      // 챗봇 입력창
      const chatTextarea = page.locator('textarea[placeholder*="AI에게 피드백을 전달"]');
      await chatTextarea.waitFor({ state: 'visible', timeout: 5000 });
      if (await chatTextarea.isVisible()) {
        console.log("챗봇 메시지 전송 시도...");
        await chatTextarea.fill("이 차트의 색상을 파란색 톤으로 바꿔줘.");
        await page.waitForTimeout(500);
        
        // 전송 버튼 클릭
        await page.click('button[title="수정 요청 전송"]');
        console.log("메시지 전송 완료. AI 답변 대기 5초...");
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: `${brainPath}\\screenshot_interaction_2_chat_sent.png` });
        console.log("📸 2. 챗봇 전송 및 답변 화면 캡처 완료.");

        // 새로고침 실행하여 localStorage 복원 검증
        console.log("페이지 새로고침 실행...");
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
        
        // 새로고침 후 AI 지능형 통합 리포트 탭으로 재진입
        const postBriefingTab = page.getByRole('button', { name: /AI 지능형 시각화/ });
        await postBriefingTab.waitFor({ state: 'visible', timeout: 5000 });
        await postBriefingTab.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: `${brainPath}\\screenshot_interaction_3_chat_restored.png` });
        console.log("📸 3. 페이지 새로고침 후 대화 보존 화면 캡처 완료.");
      }
    } else {
      console.log("⚠️ AI 지능형 통합 리포트 탭을 찾을 수 없습니다.");
    }

    // 4. 캡처 드래그 박스 상호작용 검증
    console.log("4. 캡처 드래그 박스 상호작용 검증 시작...");
    const captureBtn = page.getByRole('button', { name: /화면 영역 지정/ });
    if (await captureBtn.isVisible()) {
      await captureBtn.click();
      await page.waitForTimeout(500);
      
      // 차트 영역의 바운딩 박스를 찾아 그 위에서 드래그
      const chartContainer = page.locator('#chart-capture-target');
      if (await chartContainer.isVisible()) {
        const box = await chartContainer.boundingBox();
        if (box) {
          console.log("마우스 드래그 박스 그리기 시뮬레이션...");
          
          const startX = box.x + 100;
          const startY = box.y + 100;
          const endX = box.x + 350;
          const endY = box.y + 250;
          
          await page.mouse.move(startX, startY);
          await page.mouse.down();
          await page.mouse.move(endX, endY);
          await page.waitForTimeout(500);
          
          // 드래그 진행 상태(점선 박스가 떠 있는 상태) 캡처
          await page.screenshot({ path: `${brainPath}\\screenshot_interaction_4_dragging.png` });
          console.log("📸 4. 마우스 드래그 중인 캡처 화면 완료.");
          
          // 드래그 완료
          await page.mouse.up();
          await page.waitForTimeout(1500); // 캡처 완료 토스트 알림 대기
          
          await page.screenshot({ path: `${brainPath}\\screenshot_interaction_5_drag_done.png` });
          console.log("📸 5. 마우스 드래그 완료 후 캡처 결과 화면 완료.");
        }
      }
    } else {
      console.log("⚠️ 영역 선택 지정 버튼을 찾을 수 없습니다.");
    }

  } catch (err) {
    console.error("❌ 상세 상호작용 테스트 중 에러:", err);
  } finally {
    await browser.close();
    console.log("🏁 상세 상호작용 테스트 마침.");
  }
})();
