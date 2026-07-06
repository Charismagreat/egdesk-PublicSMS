const https = require('https');

const url = 'https://api.frankfurter.dev/latest?from=USD&to=KRW,EUR,JPY,CNY';

console.log(`📡 [API] Frankfurter API 호출 중: ${url}`);

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      console.log('✓ HTTP Status:', res.statusCode);
      const json = JSON.parse(data);
      console.log('✓ API 응답 성공:', json);
    } catch (e) {
      console.error('JSON 파싱 에러:', e);
      console.log('원본 응답:', data.substring(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('API 호출 에러:', err);
});

