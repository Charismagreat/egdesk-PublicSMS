const fs = require('fs');
const path = require('path');

let apiKey = '';
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const match = envContent.match(/NEXT_PUBLIC_EGDESK_API_KEY\s*=\s*(.*)/);
  if (match) {
    apiKey = match[1].trim().replace(/['"]/g, '');
  }
} catch (err) {
  console.error("Could not read .env.local:", err.message);
}

async function main() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_EGDESK_API_URL || 'http://localhost:8080';
    const headers = {};
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    const res1 = await fetch(`${apiUrl}/financehub/tools`, { headers }).catch(() => null);
    if (res1) {
      const data = await res1.json().catch(() => null);
      if (data && data.result && data.result.tools) {
        const importTxTool = data.result.tools.find(t => t.name === 'financehub_import_transactions');
        console.log("=== Import Transactions Tool Schema ===");
        console.log(JSON.stringify(importTxTool, null, 2));
      } else {
        // 배열 자체인 경우
        const importTxTool = data && data.find(t => t.name === 'financehub_import_transactions');
        if (importTxTool) {
          console.log("=== Import Transactions Tool Schema ===");
          console.log(JSON.stringify(importTxTool, null, 2));
        } else {
          console.log("financehub_import_transactions not found in standard tools list");
        }
      }
    }
  } catch (err) {
    console.error("Error querying tools:", err);
  }
}

main();
