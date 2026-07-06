async function runHttpCallTest() {
  console.log('📡 [HTTP 통신 테스트] 라이브 Next.js 서버(http://localhost:3000) 대상 실제 API 호출 집행\n');

  // 1. [POST /api/support/feedback] 실제 HTTP 호출 테스트
  try {
    console.log('➡️  [1] 피드백 저장 API 호출 중... (POST /api/support/feedback)');
    
    const feedbackPayload = {
      companyName: 'B2B 실시간 테스트 바이어',
      senderName: '임꺽정 파트장',
      contact: '010-9999-8888',
      feedbackType: '기능 제안',
      feedbackText: '주간 업무 스냅샷 리포트를 한 번에 PDF로 내려받을 수 있는 일괄 다운로드 버튼이 추가되면 좋겠습니다.'
    };

    const resFeedback = await fetch('http://localhost:3000/api/support/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedbackPayload)
    });

    const statusFeedback = resFeedback.status;
    const dataFeedback = await resFeedback.json();

    console.log(`🟢 [HTTP 응답 수신] HTTP 상태 코드: ${statusFeedback}`);
    console.log('📄 [반환 데이터]:', JSON.stringify(dataFeedback, null, 2));
    console.log('------------------------------------------------------------\n');

  } catch (err) {
    console.error('🚨 [오류] 피드백 저장 API HTTP 통신 실패:', err.message);
  }

  // 2. [POST /api/support/feedback/skill] 실제 HTTP 호출 테스트 (카카오 오픈빌더 스킬 웹훅)
  try {
    console.log('➡️  [2] 카카오 챗봇 스킬 API 호출 중... (POST /api/support/feedback/skill)');
    
    // 카카오 오픈빌더가 실제 개발자 서버로 쏘는 mock request body 구조
    const kakaoMockPayload = {
      intent: { id: 'mock-intent-id', name: '피드백조회인텐트' },
      userRequest: {
        timezone: 'Asia/Seoul',
        block: { id: 'mock-block-id', name: '피드백블록' },
        utterance: '피드백',
        user: {
          id: 'DEMO_RECEIVER_USER_KEY_XYZ', // 기본 데모 userKey 대입 (보안 가드 매칭)
          type: 'accountId'
        }
      },
      action: {
        name: 'feedback_inquiry_action',
        params: {}
      }
    };

    const resSkill = await fetch('http://localhost:3000/api/support/feedback/skill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(kakaoMockPayload)
    });

    const statusSkill = resSkill.status;
    const dataSkill = await resSkill.json();

    console.log(`🟢 [HTTP 응답 수신] HTTP 상태 코드: ${statusSkill}`);
    console.log('📄 [반환 데이터 (카카오 2.0 표준 규격)]:');
    console.log(JSON.stringify(dataSkill, null, 2));
    console.log('------------------------------------------------------------\n');

  } catch (err) {
    console.error('🚨 [오류] 카카오 챗봇 스킬 API HTTP 통신 실패:', err.message);
  }
}

runHttpCallTest();
