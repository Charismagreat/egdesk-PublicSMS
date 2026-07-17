import { queryTable } from "../egdesk-helpers";

async function main() {
  const result = await queryTable("crm_operators");
  console.log("=== ROWS ===");
  console.log(JSON.stringify(result.rows, null, 2));
}

main().catch(console.error);
