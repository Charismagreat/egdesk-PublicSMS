const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\dev\\egdesk-FreeSMS\\src';
const aiCalls = [];
const missingLogs = [];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      // 백업 파일은 제외
      if (file.includes('.bak') || file.includes('.backup')) continue;
      
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const hasAICall = content.includes('generativelanguage.googleapis.com');
      const hasLogging = content.includes('ai_token_usage_logs');
      
      if (hasAICall) {
        aiCalls.push(fullPath);
        if (!hasLogging) {
          missingLogs.push(fullPath);
        }
      }
    }
  }
}

scanDir(srcDir);

console.log(`=== AI Call Scan Report ===`);
console.log(`Total files with AI calls: ${aiCalls.length}`);
console.log(`Files missing token logging: ${missingLogs.length}`);
console.log('\n--- Missing Logging Files List ---');
missingLogs.forEach((f, idx) => {
  const relPath = path.relative('C:\\dev\\egdesk-FreeSMS', f).replace(/\\/g, '/');
  console.log(`${String(idx + 1).padStart(2, '0')}. [${path.basename(f)}](file:///${f}) (${relPath})`);
});
