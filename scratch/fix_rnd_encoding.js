const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/rnd-management/page.tsx');
const buffer = fs.readFileSync(filePath);

console.log('Original Buffer length:', buffer.length);

// TextDecoder를 사용하여 잘못된 UTF-8 바이트를 보정하여 디코딩
const decoder = new TextDecoder('utf-8', { fatal: false });
const decodedText = decoder.decode(buffer);

// UTF-8 파일로 다시 안전하게 씁니다.
fs.writeFileSync(filePath, decodedText, 'utf8');
console.log('Encoding fix completed for rnd-management page! Saved UTF-8 file.');
