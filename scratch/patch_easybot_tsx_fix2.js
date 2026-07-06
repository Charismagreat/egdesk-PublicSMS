const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/components/EasyBot.tsx');
let code = fs.readFileSync(targetPath, 'utf8');

code = code.replace(
  'const res = val.apply(target, args);',
  'const res = (val as Function).apply(target, args);'
);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully fixed EasyBot.tsx html2canvas proxy error!');
