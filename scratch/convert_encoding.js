const fs = require('fs');
const path = require('path');

function main() {
  const filePath = path.join(__dirname, '../temp_extract/src/app/hr/attendance/page.tsx');
  const buffer = fs.readFileSync(filePath);
  
  const targetIndex = 24241;
  const start = Math.max(0, targetIndex - 100);
  const end = Math.min(buffer.length, targetIndex + 100);
  
  console.log(`Byte analysis around index ${targetIndex} on ORIGINAL file:`);
  const slice = buffer.slice(start, end);
  
  // 1. 16진수로 출력
  console.log("Hex:", slice.toString('hex'));
  
  // 2. EUC-KR 디코딩 시도
  console.log("EUC-KR Decoded:", new TextDecoder('euc-kr').decode(slice));
  
  // 3. UTF-8 디코딩 시도 (대체 문자 포함)
  console.log("UTF-8 Decoded (with replacement):", new TextDecoder('utf-8', { fatal: false }).decode(slice));
}

main();
