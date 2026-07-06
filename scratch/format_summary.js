const fs = require('fs');
const path = require('path');
const readline = require('readline');

const logFilePath = 'C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\4aa0eddd-c486-4ba1-b33d-10a578b77f59\\.system_generated\\logs\\transcript.jsonl';
const outputFilePath = 'C:\\dev\\egdesk-FreeSMS\\scratch\\finance_edits_summary.txt';

async function run() {
  if (!fs.existsSync(logFilePath)) {
    console.error('Log file not found!');
    return;
  }

  const fileStream = fs.createReadStream(logFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const edits = [];
  let stepIdx = 0;

  for await (const line of rl) {
    stepIdx++;
    try {
      const logObj = JSON.parse(line);
      if (logObj.source === 'MODEL' && logObj.tool_calls) {
        logObj.tool_calls.forEach(call => {
          const args = call.args || {};
          const target = args.TargetFile || args.Target || '';
          
          if (target.includes('finance') || target.includes('helpers')) {
            edits.push({
              step: logObj.step_index,
              time: logObj.created_at,
              tool: call.name,
              target: path.basename(target),
              description: args.Description || '설명 없음',
              startLine: args.StartLine || 'N/A',
              endLine: args.EndLine || 'N/A'
            });
          }
        });
      }
    } catch (e) {}
  }

  console.log(`Parsed ${edits.length} total edits on finance-related files.`);

  let outputText = '=== 마지막 깃 푸시 이후 오늘 오전 협업 작업 내역 리스트 ===\n\n';
  edits.forEach((edit, idx) => {
    outputText += `[작업 #${idx + 1}] (시간: ${edit.time}, 단계: ${edit.step})\n`;
    outputText += `- 대상 파일: ${edit.target}\n`;
    outputText += `- 수행 도구: ${edit.tool} (라인: ${edit.startLine} ~ ${edit.endLine})\n`;
    outputText += `- 작업 목적: ${edit.description}\n`;
    outputText += `--------------------------------------------------------\n\n`;
  });

  fs.writeFileSync(outputFilePath, outputText, 'utf8');
  console.log(`Saved summary to ${outputFilePath}`);
}

run().catch(console.error);
