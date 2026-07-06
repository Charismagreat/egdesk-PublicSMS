const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/help/constants.ts');
const fileContent = fs.readFileSync(filePath, 'utf8');

// id: "..." 형태 매칭
const idRegex = /id:\s*"(.*?)"/g;
let match;
const ids = [];
const idLines = {};

const lines = fileContent.split('\n');
lines.forEach((line, index) => {
  const m = line.match(/id:\s*"(.*?)"/);
  if (m) {
    const id = m[1];
    ids.push(id);
    if (!idLines[id]) {
      idLines[id] = [];
    }
    idLines[id].push(index + 1);
  }
});

const duplicates = {};
const seen = new Set();
for (const id of ids) {
  if (seen.has(id)) {
    duplicates[id] = idLines[id];
  }
  seen.add(id);
}

if (Object.keys(duplicates).length > 0) {
  console.log('❌ 중복된 ID 발견:');
  for (const [id, lines] of Object.entries(duplicates)) {
    console.log(`- ID: "${id}" | 라인 번호들: ${lines.join(', ')}`);
  }
} else {
  console.log('✅ 중복된 ID가 존재하지 않습니다.');
}
