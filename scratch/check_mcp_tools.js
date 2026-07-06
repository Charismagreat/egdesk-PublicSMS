const API_URL = 'http://localhost:8080';
const API_KEY = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';

const endpoints = [
  'user-data',
  'financehub',
  'internal-knowledge',
  'browser-recording',
  'ai-center'
];

async function checkTools() {
  const allTools = [];
  
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${API_URL}/${ep}/tools`, {
        headers: { 'X-Api-Key': API_KEY }
      });
      if (res.ok) {
        const tools = await res.json();
        for (const t of tools) {
          allTools.push({
            endpoint: ep,
            name: t.name,
            description: t.description
          });
        }
      }
    } catch (err) {
      console.error(`Fetch /${ep}/tools failed:`, err.message);
    }
  }

  console.log(`\n=== Found ${allTools.length} total tools ===`);
  
  // Search for keywords
  const keywords = ['law', 'legal', 'open', 'api', 'search', '법', '판례', '행정', '규칙', '법령', '법제'];
  
  console.log('\n--- All Registered Tools ---');
  for (const t of allTools) {
    console.log(`[${t.endpoint}] ${t.name}: ${t.description.split('\n')[0]}`);
  }

  console.log('\n--- Keyword Filtered Tools ---');
  let matchedCount = 0;
  for (const t of allTools) {
    const textToSearch = `${t.name} ${t.description}`.toLowerCase();
    const matched = keywords.some(k => textToSearch.includes(k));
    if (matched) {
      console.log(`[MATCH] [${t.endpoint}] ${t.name}: ${t.description}`);
      matchedCount++;
    }
  }
  if (matchedCount === 0) {
    console.log('No tools matched key terms like law, legal, etc.');
  }
}

checkTools();
