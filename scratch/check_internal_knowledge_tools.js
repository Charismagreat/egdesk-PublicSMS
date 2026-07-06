const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

async function main() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_EGDESK_API_URL || 'http://localhost:8080';
    const apiKey = process.env.NEXT_PUBLIC_EGDESK_API_KEY;
    const headers = {};
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    console.log("Fetching internal-knowledge tools list...");
    const res = await fetch(`${apiUrl}/internal-knowledge/tools`, { headers }).catch((e) => { console.error(e); return null; });
    if (res) {
      const data = await res.json().catch(() => null);
      console.log("=== Internal Knowledge Tools ===");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Error querying tools:", err);
  }
}

main();
