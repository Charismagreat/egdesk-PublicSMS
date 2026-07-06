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

const helpers = require('../egdesk-helpers.js');

async function main() {
  try {
    console.log("Querying system_settings...");
    const settings = await helpers.queryTable('system_settings');
    console.log("Settings rows:", JSON.stringify(settings, null, 2));

    console.log("Querying crm_web_published_sites...");
    const sites = await helpers.queryTable('crm_web_published_sites');
    console.log("Published sites:", JSON.stringify(sites, null, 2));
  } catch (err) {
    console.error("Error querying tables:", err);
  }
}

main();
