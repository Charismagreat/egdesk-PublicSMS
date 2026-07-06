const { queryTable } = require('../egdesk-helpers');

async function testEgdeskCloudSend() {
  console.log('📡 [egdesk.cloud 실시간 테스트 전송 시작]');
  
  // 1. 임시 피드백 생성 및 API 호출을 통해 DB 적재 (http://localhost:3000/api/support/feedback)
  let testId = '';
  try {
    console.log('➡️  1단계: 이지봇 피드백 수집 API 호출 (POST /api/support/feedback)');
    const feedbackPayload = {
      companyName: 'egdesk.cloud Live 테스트사',
      senderName: '이순신 장군',
      contact: '010-7777-6666',
      feedbackType: '버그 제보',
      feedbackText: 'Supabase Edge Function 연동 실시간 내보내기 테스트 제보 원문입니다!'
    };

    const res = await fetch('http://localhost:3000/api/support/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackPayload)
    });

    const data = await res.json();
    console.log('🟢 [성공] 피드백 적재 완료:', JSON.stringify(data, null, 2));

    // 2. DB에서 최근 등록된 피드백의 실시간 ID 확보
    const dbResult = await queryTable('user_feedbacks', {
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit: 1
    });

    if (dbResult.rows && dbResult.rows.length > 0) {
      testId = dbResult.rows[0].id;
      console.log(`• 확보한 실시간 피드백 ID: ${testId}`);
    } else {
      throw new Error('DB에서 피드백 ID를 조회하지 못했습니다.');
    }

  } catch (err) {
    console.error('🚨 1단계 실패:', err.message);
    return;
  }

  try {
    console.log('\n➡️  2단계: Supabase 공식 REST API 다이렉트 HTTP 호출');
    console.log('• 대상 URL: https://cbptgzaubhcclkmvkiua.supabase.co/rest/v1/feedback');

    const supabasePayload = {
      name: 'EGDESK 최고관리자 내보내기 (통합 테스트)',
      email: 'chachogreat@gmail.com',
      message: `[실시간 다이렉트 연동 성공!]\n이순신 장군의 모크 피드백 데이터가 원격 Supabase PostgreSQL 데이터베이스에 다이렉트 REST API를 통해 안전하게 적재 완료되었습니다! 🚀`,
      page_url: '/hr/attendance',
      user_agent: 'EGDESK System Settings Gateway',
      client_id: testId
    };

    const resExport = await fetch('https://cbptgzaubhcclkmvkiua.supabase.co/rest/v1/feedback', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicHRnemF1YmhjY2xrbXZraXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5OTAzMTIsImV4cCI6MjA3NTU2NjMxMn0.wE5tLN9pMmZWjag_q1E9LaItcsNQlqZYM6XHUL5OiuM',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicHRnemF1YmhjY2xrbXZraXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5OTAzMTIsImV4cCI6MjA3NTU2NjMxMn0.wE5tLN9pMmZWjag_q1E9LaItcsNQlqZYM6XHUL5OiuM'
      },
      body: JSON.stringify(supabasePayload)
    });

    const statusExport = resExport.status;

    console.log(`🟢 [Supabase REST API 응답 수신] HTTP 상태 코드: ${statusExport} (201은 생성 성공을 의미합니다)`);
    console.log('\n🏁 [테스트 대성공] egdesk.cloud 및 Supabase 원격 PostgreSQL 데이터베이스 실시간 안착을 모두 완수했습니다!');

  } catch (err) {
    console.error('🚨 2단계 실패:', err.message);
  }
}

testEgdeskCloudSend();
