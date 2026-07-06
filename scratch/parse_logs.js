const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, 'last_replace_calls.txt');
if (!fs.existsSync(logFilePath)) {
  console.error('Log file not found!');
  process.exit(1);
}

const content = fs.readFileSync(logFilePath, 'utf8');
const lines = content.split('\n').filter(line => line.trim());

console.log(`Found ${lines.length} log lines.`);

lines.forEach((line, idx) => {
  try {
    // line이 "filepath:line_num:JSON" 형태일 수 있으므로 첫 두 개의 콜론 이후를 파싱합니다.
    const jsonStartIdx = line.indexOf('{"step_index"');
    if (jsonStartIdx === -1) {
      console.log(`[Line ${idx}] JSON not found in line.`);
      return;
    }
    const jsonStr = line.substring(jsonStartIdx);
    const logObj = JSON.parse(jsonStr);
    
    console.log(`\n==========================================`);
    console.log(`Step Index: ${logObj.step_index}`);
    console.log(`Created At: ${logObj.created_at}`);
    
    if (logObj.tool_calls && logObj.tool_calls.length > 0) {
      logObj.tool_calls.forEach((call, cIdx) => {
        console.log(`  Call #${cIdx}: ${call.name}`);
        if (call.args) {
          console.log(`    TargetFile: ${call.args.TargetFile || call.args.Target || 'N/A'}`);
          console.log(`    Description: ${call.args.Description || 'N/A'}`);
          if (call.args.ReplacementChunks) {
            console.log(`    ReplacementChunks count: ${call.args.ReplacementChunks.length}`);
          }
          if (call.args.StartLine) {
            console.log(`    Lines: ${call.args.StartLine} to ${call.args.EndLine}`);
          }
        }
      });
    }
  } catch (err) {
    console.error(`[Line ${idx}] Failed to parse:`, err.message);
  }
});
