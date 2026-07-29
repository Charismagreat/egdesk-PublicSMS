import { queryTable } from "../egdesk-helpers";

async function inspectItems() {
  const itemsRes = await queryTable('crm_snaptask_items', { limit: 100 });
  const rows = itemsRes.rows || [];
  console.log("=== crm_snaptask_items 전체 레코드 수:", rows.length);
  const targetRows = rows.filter((r: any) => String(r.task_id).includes("1785296513094") || String(r.id).includes("1785296513094"));
  console.log("=== 해당 task_id (1785296513094) 매칭 레코드 목록 ===");
  console.log(JSON.stringify(targetRows, null, 2));

  console.log("\n=== 최근 10개 레코드 목록 ===");
  console.log(JSON.stringify(rows.slice(-10), null, 2));
}

inspectItems().catch(console.error);
