const API_URL = 'http://localhost:8080';
const API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';

const paths = [
  '',
  '/status',
  '/health',
  '/info',
  '/api',
  '/api/status',
  '/api/tools',
  '/moleg',
  '/moleg/tools',
  '/law',
  '/law/tools',
  '/legal',
  '/legal/tools',
  '/search',
  '/search/tools',
  '/mcp',
  '/mcp/tools',
  '/open-api',
  '/open-api/tools',
  '/integration',
  '/integration/tools'
];

async function scanPaths() {
  console.log('=== Scanning EGDesk API Server Paths ===');
  for (const path of paths) {
    try {
      const url = `${API_URL}${path}`;
      const res = await fetch(url, {
        headers: { 'X-Api-Key': API_KEY }
      });
      console.log(`Path [${path}] - Status: ${res.status}`);
      if (res.status === 200) {
        const text = await res.text();
        console.log(`  -> Content (truncated): ${text.slice(0, 300)}`);
      }
    } catch (err) {
      console.log(`Path [${path}] - Error: ${err.message}`);
    }
  }
}

scanPaths();
