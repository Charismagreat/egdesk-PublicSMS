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

async function checkTools(endpoint) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_EGDESK_API_URL || 'http://localhost:8080';
    const apiKey = process.env.NEXT_PUBLIC_EGDESK_API_KEY;
    const headers = {};
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    const res = await fetch(`${apiUrl}/${endpoint}/tools`, { headers }).catch(() => null);
    if (res) {
      const data = await res.json().catch(() => null);
      if (Array.isArray(data)) {
        return data.map(t => t.name);
      } else if (data && data.result && Array.isArray(data.result.tools)) {
        return data.result.tools.map(t => t.name);
      } else if (data && Array.isArray(data.tools)) {
        return data.tools.map(t => t.name);
      }
      return data;
    }
  } catch (e) {
    return { error: e.message };
  }
  return null;
}

async function main() {
  const endpoints = ['user-data', 'financehub', 'internal-knowledge', 'browser-recording', 'ai-center', 'korean-law'];
  for (const ep of endpoints) {
    const tools = await checkTools(ep);
    console.log(`=== ${ep} tools ===`);
    console.log(tools);
  }
}

main();
