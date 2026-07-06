const helpers = require('../egdesk-helpers.js');

async function run() {
  try {
    const result = await helpers.executeSQL("SELECT model, purpose, prompt_tokens, completion_tokens, total_tokens FROM ai_token_usage_logs");
    
    if (!result.rows || result.rows.length === 0) {
      console.log("No rows found");
      return;
    }
    
    console.log("Total log rows:", result.rows.length);
    console.log("=== Tokens Summary ===");
    
    const stats = {};
    
    result.rows.forEach(row => {
      const model = row.model || "Unknown";
      const purpose = row.purpose || "Unknown";
      const key = `${model} | ${purpose}`;
      
      if (!stats[key]) {
        stats[key] = {
          count: 0,
          sumPrompt: 0,
          sumCompletion: 0,
          sumTotal: 0
        };
      }
      
      stats[key].count += 1;
      stats[key].sumPrompt += Number(row.prompt_tokens || 0);
      stats[key].sumCompletion += Number(row.completion_tokens || 0);
      stats[key].sumTotal += Number(row.total_tokens || 0);
    });
    
    for (const [key, stat] of Object.entries(stats)) {
      const avgPrompt = Math.round(stat.sumPrompt / stat.count);
      const avgCompletion = Math.round(stat.sumCompletion / stat.count);
      const avgTotal = Math.round(stat.sumTotal / stat.count);
      console.log(`\n[${key}] (Calls: ${stat.count})`);
      console.log(`- Avg Prompt Tokens: ${avgPrompt}`);
      console.log(`- Avg Completion Tokens: ${avgCompletion}`);
      console.log(`- Avg Total Tokens: ${avgTotal}`);
    }
    
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
