const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');
const fs = require('fs');

const homeDir = os.homedir();
const appData = process.env.APPDATA || path.join(homeDir, 'AppData/Roaming');
const paths = [
  path.join(appData, 'EGDesk/database/user_data.db'),
  path.join(appData, 'egdesk/database/user_data.db')
];

let targetPath = '';
for (const p of paths) {
  if (fs.existsSync(p)) {
    targetPath = p;
    break;
  }
}
if (!targetPath) {
  targetPath = paths[0];
}

const normalizedPath = targetPath.replace(/\\/g, '/');
console.log('Connecting to database at:', normalizedPath);

try {
  const db = new Database(normalizedPath);
  const row = db.prepare("SELECT value FROM system_settings WHERE key = ?").get('google_ai_api_key');
  db.close();

  if (!row) {
    console.error('API key not found in DB!');
    process.exit(1);
  }

  const apiKey = row.value;
  console.log('API Key length:', apiKey.length);

  const hintKey = '실제 지출일(승인 시 가능)';
  const hintText = '승인 시 입력 가능. 영수증 상 실제 카드 결제일 혹은 현금 지출일입니다.';

  const promptText = `
당신은 중소기업의 지출 및 회계 관리 프로세스를 완벽하게 꿰뚫고 있는 전문 AI 회계 컨설턴트이자 친절한 경리 어시스턴트입니다.
사용자가 지출 관리 화면 내 특정 기능이나 입력 필드 위에 마우스를 호버했을 때 띄워줄, 매우 풍부하고 깊이 있는 비즈니스 도움말 가이드를 작성해야 합니다.

대상 기능 항목: ${hintKey}
항목 기본 설명: ${hintText}

[작성 및 출력 지침 - 절대 엄수]
1. 단순한 단문 요약이 아닙니다. 사용자가 이 기능의 실무적 용도를 100% 체득할 수 있도록, 이 기능이 왜 실무에서 중요하게 작용하는지(필요성/목적)와 어떻게 사용하는지(활용 방법 및 팁)를 상세하고 친절하게 작성하십시오.
2. 극진히 공손하고 전문적인 한국어 경어체(~입니다, ~해 드립니다, ~하시기 바랍니다 등)를 사용해 문장을 구사하십시오.
3. 분량은 가독성을 위해 적절한 단락 구분(줄바꿈)을 2~3회 포함하여 5~6줄 내외(공백 포함 350자~450자 사이)의 풍성하고 유용한 본문 내용으로 채우십시오. 단문 한두 줄짜리 짧은 해설은 지양합니다.
4. 출력 텍스트가 절대 도중에 끊어져서는 안 되며, 반드시 마침표(.)로 종결되는 완성된 문장으로만 끝마치도록 하십시오.
5. "네, 설명하겠습니다", "도움말입니다" 등 기계적 서론이나 인사말은 전면 제외하고 오직 실질적인 해설 본문으로 즉시 시작하여 완성하십시오.
`;

  console.log('Calling Gemini API (without maxOutputTokens)...');
  fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        { parts: [{ text: promptText }] }
      ],
      generationConfig: {
        temperature: 0.65
      }
    })
  })
  .then(res => {
    console.log('Status:', res.status);
    return res.json();
  })
  .then(data => {
    console.log('Response data:', JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('API Error:', err);
  });

} catch (e) {
  console.error('Error:', e.message);
}
