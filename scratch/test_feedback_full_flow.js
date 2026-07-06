const { queryTable, insertRows, executeSQL } = require('../egdesk-helpers');

async function runTest() {
  console.log('🏁 [1단계] 이지봇 피드백 전송 API 시뮬레이션 시작');
  
  // 1. 임시 피드백 데이터 구성
  const mockFeedback = {
    companyName: '테스트 컴퍼니 B2B',
    senderName: '홍길동 개발자',
    contact: '010-1234-5678',
    feedbackType: '버그 제보',
    feedbackText: '주별 보기 화면에서 캘린더 날짜가 중복되어 렌더링되는 버그가 있습니다. 조속히 확인 바랍니다.'
  };

  const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const testId = `FB-TEST-${Date.now()}`;
  const fullUserPrompt = `[고객사: ${mockFeedback.companyName} / 제보자: ${mockFeedback.senderName} (${mockFeedback.contact}) / 유형: ${mockFeedback.feedbackType}]
${mockFeedback.feedbackText}`;

  console.log(`• 가공된 DB 저장 prompt:\n${fullUserPrompt}\n`);

  try {
    // 2. DB 적재 시뮬레이션 (API POST 로직과 100% 동일)
    await insertRows('user_feedbacks', [{
      id: testId,
      user_prompt: fullUserPrompt,
      detected_type: 'bug',
      current_url: '/hr/attendance',
      resolved_status: 'pending',
      created_at: nowStr
    }]);
    
    console.log('🟢 [성공] user_feedbacks 테이블에 테스트 피드백이 안전하게 등록되었습니다!');

    // 3. 적재된 내용 DB에서 직접 확인
    const insertedResult = await queryTable('user_feedbacks', { filters: { id: testId } });
    console.log('• DB에서 조회한 실제 레코드:', JSON.stringify(insertedResult.rows, null, 2));

    console.log('\n🏁 [2단계] 카카오 챗봇 스킬(Skill) 웹훅 API 시뮬레이션 시작');

    // 4. 스킬 호출 시나리오 (개발자 userKey 검증 가드 통과 가동)
    // DB에서 pending인 최신 피드백 5건을 조회하는 쿼리 실행 (스킬 API 로직과 100% 동일)
    const dbResult = await queryTable('user_feedbacks', {
      filters: { resolved_status: 'pending' },
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit: 5
    });

    const feedbacks = dbResult.rows || [];
    console.log(`• 현재 DB에 대기 중인 미해결 피드백 개수: ${feedbacks.length}개`);

    let replyMessage = `💬 [EGDESK 미처리 피드백 알림]

현재 미해결된 소중한 피드백이 총 ${feedbacks.length}건 대기 중입니다.

`;

    feedbacks.forEach((fb, index) => {
      const timeFormatted = fb.created_at || '시간 미상';
      const typeLabel = fb.detected_type === 'bug' ? '🔴 버그' : fb.detected_type === 'feature_request' ? '💡 제안' : '📝 일반';
      
      replyMessage += `[${index + 1}] 접수: ${timeFormatted} (${typeLabel})\n`;
      replyMessage += `${fb.user_prompt}\n`;
      replyMessage += `---------------------------\n\n`;
    });

    replyMessage += `※ 최고관리자 화면 [설정 > 피드백 관리] 탭에서 상세 내역 및 이메일 전송, 처리 상태를 직접 마킹할 수 있습니다. 🛠️`;

    // 5. 카카오 챗봇 2.0 표준 응답 래퍼 구성
    const mockKakaoResponse = {
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: replyMessage
            }
          }
        ]
      }
    };

    console.log('\n🤖 [카카오 챗봇 표준 2.0 반환 규격 최종 검증 결과]:');
    console.log(JSON.stringify(mockKakaoResponse, null, 2));

    console.log('\n🏁 [3단계] 테스트 데이터 안전 청소 완료');
    // 테스트용 더미 레코드 삭제 (원상복구)
    await executeSQL(`DELETE FROM user_feedbacks WHERE id = '${testId}'`);
    console.log('🟢 [성공] 테스트용 임시 레코드가 깨끗하게 제거되었습니다.');

  } catch (err) {
    console.error('🚨 테스트 도중 오류 발생:', err);
  }
}

runTest();
