const fs = require('fs');
const path = require('path');

let apiKey = '';
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const match = envContent.match(/NEXT_PUBLIC_EGDESK_API_KEY\s*=\s*(.*)/);
  if (match) {
    apiKey = match[1].trim().replace(/['"]/g, '');
  }
} catch (err) {
  console.error("Could not read .env.local:", err.message);
}

async function probe() {
  const apiUrl = 'http://localhost:8080';
  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey) {
    headers['X-Api-Key'] = apiKey;
  }

  const body = JSON.stringify({
    tool: 'browser_recording_list_saved_tests',
    arguments: {}
  });

  console.log(`POST ${apiUrl}/browser-recording/tools/call 에 직접 질의를 쏩니다...`);
  try {
    const res = await fetch(`${apiUrl}/browser-recording/tools/call`, {
      method: 'POST',
      headers,
      body
    });
    
    console.log(`응답 코드: HTTP ${res.status} ${res.statusText}`);
    const data = await res.json().catch(() => null);
    console.log('응답 바디:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('호출 실패:', error.message);
  }
}

probe();
