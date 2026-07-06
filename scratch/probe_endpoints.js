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

async function probe(url, method = 'GET') {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_EGDESK_API_URL || 'http://localhost:8080';
    const headers = {};
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    const res = await fetch(`${apiUrl}${url}`, {
      method,
      headers
    }).catch(() => null);

    if (res) {
      console.log(`Probe ${method} ${url} -> HTTP ${res.status} ${res.statusText}`);
    } else {
      console.log(`Probe ${method} ${url} -> Failed to fetch`);
    }
  } catch (err) {
    console.log(`Probe ${method} ${url} -> Error:`, err.message);
  }
}

async function main() {
  await probe('/hometax/import-excel', 'POST');
  await probe('/financehub/hometax/import-excel', 'POST');
  await probe('/api/hometax/import-excel', 'POST');
  await probe('/hometax/import', 'POST');
}

main();
