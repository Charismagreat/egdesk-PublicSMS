const apiKey = 'a67ddc0f-7e2b-4997-9a0b-9667a74c89d0';
const apiUrl = 'http://localhost:8080';

async function checkTable(tableName) {
  try {
    const res = await fetch(`${apiUrl}/user-data/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        tool: 'user_data_query',
        arguments: {
          tableName,
          limit: 3
        }
      })
    });
    
    const data = await res.json();
    if (data.success === false) {
      console.log(`❌ Table [${tableName}]: Error:`, data.error);
      return false;
    }
    
    const textContent = data.result?.content?.[0]?.text;
    if (textContent) {
      const parsed = JSON.parse(textContent);
      console.log(`✅ Table [${tableName}]: Found ${parsed.rows?.length || 0} rows.`);
      if (parsed.rows && parsed.rows.length > 0) {
        console.log(`   Sample:`, parsed.rows[0]);
      }
    } else {
      console.log(`❓ Table [${tableName}]: No text content returned.`);
    }
    return true;
  } catch (err) {
    console.error(`💥 Table [${tableName}]: Fetch failed:`, err.message);
    return false;
  }
}

async function run() {
  const tables = [
    'crm_operators',
    'crm_operator_profiles',
    'crm_operator_education',
    'crm_operator_licenses',
    'crm_operator_careers',
    'crm_operator_salaries',
    'crm_operator_promotions',
    'crm_operator_awards',
    'crm_operator_family_events',
    'crm_operator_medical',
    'crm_operator_incidents',
    'crm_operator_reputations',
    'crm_operator_families',
    'crm_operator_job_history',
    'crm_operator_projects'
  ];
  
  console.log('--- STARTING 360 DB DIAGNOSTICS ---');
  for (const t of tables) {
    await checkTable(t);
  }
  console.log('--- DIAGNOSTICS COMPLETED ---');
}

run();
