const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 이전 대화의 transcript.jsonl 경로
const logFilePath = 'C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\4aa0eddd-c486-4ba1-b33d-10a578b77f59\\.system_generated\\logs\\transcript.jsonl';

async function run() {
  if (!fs.existsSync(logFilePath)) {
    console.error('Log file not found at:', logFilePath);
    return;
  }

  const fileStream = fs.createReadStream(logFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let stepCount = 0;
  const financePageEdits = [];

  for await (const line of rl) {
    stepCount++;
    try {
      const logObj = JSON.parse(line);
      
      // MODEL의 툴 호출 추적
      if (logObj.source === 'MODEL' && logObj.tool_calls) {
        logObj.tool_calls.forEach(call => {
          const args = call.args || {};
          const target = args.TargetFile || args.TargetFile || '';
          
          if (target.includes('finance') && target.includes('page.tsx')) {
            financePageEdits.push({
              step_index: logObj.step_index,
              created_at: logObj.created_at,
              tool: call.name,
              args: args
            });
          }
        });
      }
      
      // SYSTEM/USER에 의한 최초 view_file 출력 결과물 보존 확인 (최초 page.tsx 원본 텍스트 복구용)
      if (logObj.source === 'SYSTEM' && logObj.type === 'VIEW_FILE' && logObj.status === 'DONE') {
        // 이 안에 파일 전체 텍스트가 들어있을 수 있음
        const content = logObj.content || '';
        if (content.includes('NaverIcon') || content.includes('NaverBlogMarketingPortal') || content.includes('activeTab === "cards"')) {
          console.log(`[SYSTEM VIEW_FILE] Found a view file output at step ${logObj.step_index}, length: ${content.length}`);
        }
      }
    } catch (err) {
      // JSON 파싱 오류 무시
    }
  }

  console.log(`\nAnalyzed ${stepCount} steps.`);
  console.log(`Found ${financePageEdits.length} edits on finance/page.tsx.`);

  financePageEdits.forEach((edit, idx) => {
    console.log(`\nEdit #${idx + 1} at Step ${edit.step_index} (${edit.created_at}):`);
    console.log(`  Tool: ${edit.tool}`);
    console.log(`  Description: ${edit.args.Description}`);
    if (edit.tool === 'replace_file_content') {
      console.log(`  StartLine: ${edit.args.StartLine}, EndLine: ${edit.args.EndLine}`);
      console.log(`  TargetContent preview: ${edit.args.TargetContent.substring(0, 100).replace(/\n/g, '\\n')}...`);
    } else if (edit.tool === 'multi_replace_file_content') {
      console.log(`  Chunks count: ${edit.args.ReplacementChunks ? edit.args.ReplacementChunks.length : 0}`);
    }
  });

  // 이전 세션이 page.tsx에 가했던 최종 변경 툴의 ReplacementContent를 백업합니다.
  if (financePageEdits.length > 0) {
    const lastEdit = financePageEdits[financePageEdits.length - 1];
    fs.writeFileSync('C:\\dev\\egdesk-FreeSMS\\scratch\\last_edit_args.json', JSON.stringify(lastEdit, null, 2), 'utf8');
    console.log('\nSaved last edit arguments to scratch/last_edit_args.json');
  }
}

run().catch(console.error);
