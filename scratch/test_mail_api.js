// 메일 관리 AI API 테스트 스크립트
// 한국어로 주석 작성

const http = require('http');

function postRequest(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(payload);
    req.end();
  });
}

function getRequest(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:4000${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    }).on('error', (e) => {
      reject(e);
    });
  });
}

async function runTests() {
  console.log('--- 1. 현재 메일 관제 상태 및 로그 조회 (GET) ---');
  try {
    const getRes = await getRequest('/api/mail-management');
    console.log('상태 코드:', getRes.statusCode);
    console.log('결과 요약:', getRes.data.success ? '성공' : '실패');
    if (getRes.data.success) {
      console.log('설정:', getRes.data.settings);
      console.log('전체 요약:', getRes.data.summary);
      console.log('분류 목록 개수:', getRes.data.purposes.length);
      console.log('최근 로그 개수:', getRes.data.recentLogs.length);
    } else {
      console.log('에러 내용:', getRes.data);
    }
  } catch (err) {
    console.error('GET 에러 발생:', err.message);
  }

  console.log('\n--- 2. 가상 메일 수집 및 AI 관제 연동 트리거 (POST) ---');
  try {
    const postRes = await postRequest('/api/mail-management', { action: 'trigger_collection' });
    console.log('상태 코드:', postRes.statusCode);
    console.log('API 결과:', postRes.data);
  } catch (err) {
    console.error('POST 에러 발생:', err.message);
  }

  console.log('\n--- 3. 트리거 이후 메일 관제 상태 재조회 (GET) ---');
  try {
    const getRes2 = await getRequest('/api/mail-management');
    console.log('상태 코드:', getRes2.statusCode);
    console.log('결과 요약:', getRes2.data.success ? '성공' : '실패');
    if (getRes2.data.success) {
      console.log('설정:', getRes2.data.settings);
      console.log('업데이트된 요약:', getRes2.data.summary);
      console.log('업데이트된 최근 로그 개수:', getRes2.data.recentLogs.length);
      if (getRes2.data.recentLogs.length > 0) {
        console.log('최신 수집 로그 제목:', getRes2.data.recentLogs[0].subject);
        console.log('최신 수집 로그 AI 액션:', getRes2.data.recentLogs[0].action_result);
      }
    }
  } catch (err) {
    console.error('GET2 에러 발생:', err.message);
  }
}

runTests();
