const http = require('http');

const payload = JSON.stringify({
  action: 'BULK_BACKFILL',
  startDate: '2026-01-01',
  endDate: '2026-05-28'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/price-tracker/exchange-rates',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log('⚡ [Client] 로컬 백필 API 호출 시작...');
console.log(`페이로드: ${payload}`);

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`✓ [Client] 응답 수신 (HTTP ${res.statusCode})`);
    try {
      const json = JSON.parse(data);
      console.log('응답 결과:', json);
    } catch (e) {
      console.log('응답 본문 (JSON 파싱 실패):', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ [Client] API 호출 중 에러 발생: ${e.message}`);
});

req.write(payload);
req.end();
