const fs = require('fs');
const path = require('path');

// 재귀적으로 디렉토리 내의 모든 파일 목록 탐색
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// 각 파일에 폴백 적용 리팩토링 수행
function applyFallbackToFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 구글 API URL인 generativelanguage.googleapis.com 호출이 존재하는지 감지
  if (!content.includes('generativelanguage.googleapis.com')) {
    return; // AI 호출이 없는 파일은 통과
  }

  // 백업 보관 파일 및 HMR 백업 임시 파일 등은 건너뜀
  if (filePath.includes('.egdesk-backup') || filePath.includes('.bak') || filePath.includes('gemini-fallback.ts')) {
    return;
  }

  console.log(`[Processing] AI API 호출 감지: ${filePath}`);

  let updated = false;

  // 1. 구글 AI API fetch 호출 구문을 fetchGeminiWithFallback으로 변경
  // 패턴 예: fetch(`https://generativelanguage.googleapis.com/...
  // 패턴 예 2: fetch(geminiUrl, ...
  // 안전하게 generativelanguage.googleapis.com가 포함된 템플릿 리터럴 fetch 혹은 인접 fetch 타겟팅
  
  // 구글 URL이 담긴 fetch 구문 변경
  const googleFetchRegex = /await\s+fetch\(\s*`https:\/\/generativelanguage\.googleapis\.com/g;
  if (googleFetchRegex.test(content)) {
    content = content.replace(googleFetchRegex, 'await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com');
    updated = true;
  }

  // geminiUrl 또는 url이 구글 API 주소인 경우에 대한 일반적인 치환 (안전하게 감지된 파일에서만 적용)
  // 예: fetch(geminiUrl, { ... }) -> fetchGeminiWithFallback(geminiUrl, { ... })
  const urlVariables = ['geminiUrl', 'url', 'aiUrl', 'modelUrl'];
  for (const val of urlVariables) {
    const fetchValRegex = new RegExp(`await\\s+fetch\\(\\s*${val}\\s*,`, 'g');
    if (fetchValRegex.test(content)) {
      content = content.replace(fetchValRegex, `await fetchGeminiWithFallback(${val},`);
      updated = true;
    }
  }

  // 그 외 일반적인 fetch 구문 중 바로 뒤나 근처에 generativelanguage가 선언되었을 경우의 일반 fetch 치환
  // 예: fetch(`https://generativelanguage... -> fetchGeminiWithFallback(`https://generativelanguage...
  const generalFetchRegex = /fetch\(\s*`https:\/\/generativelanguage\.googleapis\.com/g;
  if (generalFetchRegex.test(content)) {
    content = content.replace(generalFetchRegex, 'fetchGeminiWithFallback(`https://generativelanguage.googleapis.com');
    updated = true;
  }
  
  const variableFetchRegex = /await\s+fetch\(\s*(\$\{geminiUrl\}|geminiUrl|modelUrl)/g;
  if (variableFetchRegex.test(content)) {
    content = content.replace(variableFetchRegex, (match, p1) => `await fetchGeminiWithFallback(${p1}`);
    updated = true;
  }

  // 2. 파일 내에 fetchGeminiWithFallback 호출이 있지만 임포트 구문이 없는 경우 임포트 구문 추가
  const hasFallbackCall = content.includes('fetchGeminiWithFallback');
  const hasImport = content.includes('import { fetchGeminiWithFallback }');
  
  if (hasFallbackCall && !hasImport) {
    // 상대 경로 계산
    const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, '../src/lib/gemini-fallback'));
    // Windows 경로 구분자(\)를 웹 표준 포워드 슬래시(/)로 치환하고, relative path 기본 형식 보정
    let importPath = relativePath.replace(/\\/g, '/');
    if (!importPath.startsWith('.')) {
      importPath = './' + importPath;
    }
    
    // 임포트 추가 위치 결정
    const importStatement = `import { fetchGeminiWithFallback } from '${importPath}';\n`;
    
    // 첫 import문 위에 끼워넣기
    if (content.includes("import ")) {
      content = content.replace("import ", `${importStatement}import `);
    } else {
      content = importStatement + content;
    }
    console.log(`  -> 임포트 추가 완료: ${importPath}`);
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  -> [SUCCESS] 전면 적용 완료!`);
  } else {
    console.log(`  -> [SKIP] 수동 호출 양식이 다릅니다. (직접 교체 필요 여부 검토)`);
  }
}

function main() {
  const apiDir = path.join(__dirname, '../src/app/api');
  console.log(`API 디렉토리 탐색 시작: ${apiDir}`);
  const tsFiles = walkDir(apiDir);
  console.log(`검색된 총 파일 개수: ${tsFiles.length}개`);
  
  for (const file of tsFiles) {
    applyFallbackToFile(file);
  }
  console.log("전체 리팩토링 스크립트 실행이 끝났습니다.");
}

main();
