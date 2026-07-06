import * as fs from 'fs';
import * as readline from 'readline';

async function run() {
  const logPath = `C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\65db2edf-45de-41ef-ad4b-55c28a7d7105\\.system_generated\\logs\\transcript.jsonl`;
  if (!fs.existsSync(logPath)) {
    console.log(`Log file not found: ${logPath}`);
    return;
  }

  console.log('Reading file line by line...');
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const matchedLines: string[] = [];
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    if (line.includes('알루미늄') && line.includes('insertRows')) {
      console.log(`Line ${lineNum} matches! Length: ${line.length}`);
      matchedLines.push(`=== LINE ${lineNum} ===\n${line}\n`);
    }
  }

  const outputPath = `c:\\dev\\egdesk-FreeSMS\\scratch\\seeding_raw_lines.txt`;
  fs.writeFileSync(outputPath, matchedLines.join('\n'), 'utf8');
  console.log(`Done! Wrote ${matchedLines.length} matched lines to ${outputPath}`);
}

run();
