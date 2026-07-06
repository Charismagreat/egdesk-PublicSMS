const API_URL = 'http://localhost:8080';
const API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';

async function getGatewayInfo() {
  try {
    const resRoot = await fetch(API_URL, {
      headers: { 'X-Api-Key': API_KEY }
    });
    console.log('--- GET / ---');
    if (resRoot.ok) {
      const data = await resRoot.json();
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`Failed: Status ${resRoot.status}`);
    }
  } catch (err) {
    console.error('Error fetching root:', err.message);
  }

  try {
    const resMcp = await fetch(`${API_URL}/mcp`, {
      headers: { 'X-Api-Key': API_KEY }
    });
    console.log('\n--- GET /mcp ---');
    if (resMcp.ok) {
      const data = await resMcp.json();
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`Failed: Status ${resMcp.status}`);
    }
  } catch (err) {
    console.error('Error fetching /mcp:', err.message);
  }
}

getGatewayInfo();
