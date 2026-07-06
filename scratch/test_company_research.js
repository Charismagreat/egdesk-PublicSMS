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
    console.log("Calling listBusinessIdentitySnapshots...");
    const snapshots = await helpers.listBusinessIdentitySnapshots();
    console.log("Snapshots:", JSON.stringify(snapshots, null, 2));
    
    if (snapshots && snapshots.length > 0) {
      const firstId = snapshots[0].id;
      console.log(`Calling getBusinessIdentitySnapshot for '${firstId}'...`);
      const snapshot = await helpers.getBusinessIdentitySnapshot(firstId);
      console.log("Snapshot result keys:", Object.keys(snapshot));
      console.log("Snapshot detail sample:", JSON.stringify(snapshot).substring(0, 1000));
    }
  } catch (err) {
    console.error("Error calling business identity tools:", err);
  }
}

main();
