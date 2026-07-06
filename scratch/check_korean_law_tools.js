const API_URL = 'http://localhost:8080';
const API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';

async function checkKoreanLawTools() {
  try {
    const res = await fetch(`${API_URL}/korean-law/tools`, {
      headers: { 'X-Api-Key': API_KEY }
    });
    console.log(`GET /korean-law/tools - Status: ${res.status}`);
    if (res.ok) {
      const tools = await res.json();
      console.log(JSON.stringify(tools, null, 2));
    } else {
      console.log('Failed to fetch korean-law tools');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkKoreanLawTools();
