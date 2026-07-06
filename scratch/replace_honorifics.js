const fs = require('fs');
const path = require('path');

const manualPath = path.join(__dirname, '..', 'src', 'docs', 'egdesk-manual.md');
const helpPath = path.join(__dirname, '..', 'src', 'app', 'help', 'page.tsx');

function replaceHonorifics(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // 정교한 매칭 및 치환 규칙 정의
  // 1. "점주님" -> "관리자님"
  content = content.replace(/점주님/g, '관리자님');
  // 2. "점주" -> "관리자" (단, '관리자님'으로 이미 바뀐 것 제외하고 매칭)
  content = content.replace(/점주(?![가-힣])/g, '관리자');
  content = content.replace(/점주\s/g, '관리자 ');
  content = content.replace(/점주([가-힣])/g, (match, p1) => {
    // 점주용 -> 관리자용 등 변환
    return '관리자' + p1;
  });

  // 3. "사장님" -> "관리자님"
  content = content.replace(/사장님/g, '관리자님');
  // 4. "사장님이" -> "관리자님이"
  content = content.replace(/사장님이/g, '관리자님이');
  // 5. "사장가" -> "관리자가" 등 예외
  content = content.replace(/사장(?![가-힣])/g, '관리자');
  content = content.replace(/사장([가-힣])/g, (match, p1) => {
    if (p1 === '님' || p1 === '이') return match; // 이미 위에서 치환됨
    return '관리자' + p1;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully replaced honorifics in: ${filePath}`);
  } else {
    console.log(`No changes needed in: ${filePath}`);
  }
}

replaceHonorifics(manualPath);
replaceHonorifics(helpPath);
