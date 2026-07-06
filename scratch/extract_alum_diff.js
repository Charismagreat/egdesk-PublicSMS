const fs = require('fs');
const readline = require('readline');

async function run() {
  const filePath = `c:\\dev\\egdesk-FreeSMS\\scratch\\git_forensic_alum.txt`;
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const lines = [];
  for await (const line of rl) {
    lines.push(line);
  }

  console.log(`Loaded ${lines.length} lines from git_forensic_alum.txt`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // setup-db.ts 가 포함되어 있고 RAW-ALUM-02 도 근처에 있을 때
    if (line.includes('diff --git a/src/lib/setup-db.ts') || line.includes('setup-db.ts')) {
      console.log(`\n================ Found setup-db.ts diff at line ${i + 1} ================`);
      const start = Math.max(0, i - 10);
      const end = Math.min(lines.length, i + 300);
      for (let j = start; j < end; j++) {
        console.log(`${j + 1}: ${lines[j]}`);
      }
    }
  }
}

run();
