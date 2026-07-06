const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream('C:\\Users\\CHARISMA\\.gemini\\antigravity\\brain\\f972bfb2-f366-4aff-a90b-4ae34694723a\\.system_generated\\logs\\transcript_full.jsonl', 'utf8')
});

rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.step_index === 910) {
      const lines = data.content.split('\n');
      console.log('=== PART 1: 01 to 25 ===');
      let p1 = false;
      for (const l of lines) {
        if (l.includes('**01.')) p1 = true;
        if (l.includes('**26.')) p1 = false;
        if (p1) console.log(l);
      }
      
      console.log('=== PART 2: 26 to 50 ===');
      let p2 = false;
      for (const l of lines) {
        if (l.includes('**26.')) p2 = true;
        if (p2) console.log(l);
      }
    }
  } catch (e) {
    console.error('Error:', e);
  }
});
