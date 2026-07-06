const API_URL = 'http://localhost:8080/user-data/tools/call';
const API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';

async function main() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY
      },
      body: JSON.stringify({
        tool: 'user_data_query',
        arguments: {
          tableName: 'system_menu_settings',
          limit: 100
        }
      })
    });
    
    const data = await res.json();
    if (data.success) {
      const content = JSON.parse(data.result?.content?.[0]?.text || '{}');
      const rows = content.rows || [];
      console.log("=== Real MCP DB Menu Settings count ===");
      console.log("Rows Count:", rows.length);
      rows.forEach(r => {
        console.log(`Href: ${r.menu_href} | Enabled: ${r.is_enabled} | Order: ${r.sort_order}`);
      });
    } else {
      console.log("Failed to query MCP:", data.error);
    }
  } catch (err) {
    console.error(err);
  }
}

main();
