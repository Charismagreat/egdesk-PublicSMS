const { EGDESK_CONFIG } = require('../egdesk.config.js');

async function checkSavedScriptsMetadata() {
  try {
    const apiUrl = EGDESK_CONFIG.apiUrl;
    const apiKey = EGDESK_CONFIG.apiKey;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    console.log(`[API CHECK] 이지데스크 REST API 호출 중: ${apiUrl}/browser-recording/tools/call`);
    
    // 1. 저장된 스크립트 목록 조회
    const listRes = await fetch(`${apiUrl}/browser-recording/tools/call`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tool: 'browser_recording_list_saved_tests',
        arguments: {}
      })
    });

    if (!listRes.ok) {
      console.error(`목록 조회 실패: HTTP ${listRes.status}`);
      return;
    }

    const listData = await listRes.json();
    if (!listData.success || !listData.result?.content?.[0]?.text) {
      console.error('스크립트 목록이 없거나 응답이 비어있습니다.');
      return;
    }

    const mcpText = listData.result.content[0].text;
    const mcpData = JSON.parse(mcpText);
    const tests = mcpData.tests || [];

    console.log(`\n🔍 이지데스크 서버 저장된 스크립트 목록 (${tests.length}개):`);
    console.log(JSON.stringify(tests, null, 2));

    if (tests.length > 0) {
      const firstTest = tests[0].name;
      console.log(`\n🔍 첫 번째 스크립트 [${firstTest}] 상세 옵션 조회 중...`);
      
      // 2. 개별 스크립트 상세 옵션 조회
      const detailRes = await fetch(`${apiUrl}/browser-recording/tools/call`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tool: 'browser_recording_get_replay_options',
          arguments: { testFile: firstTest }
        })
      });

      if (detailRes.ok) {
        const detailData = await detailRes.json();
        if (detailData.success && detailData.result?.content?.[0]?.text) {
          const detailText = detailData.result.content[0].text;
          console.log(`\n💡 [${firstTest}] 상세 정보 메타데이터:`);
          console.log(JSON.stringify(JSON.parse(detailText), null, 2));
        } else {
          console.log('상세 데이터 파싱 실패:', detailData);
        }
      } else {
        console.error('상세 옵션 조회 API 실패');
      }
    }
  } catch (error) {
    console.error('오류 발생:', error.message);
  }
}

checkSavedScriptsMetadata();
