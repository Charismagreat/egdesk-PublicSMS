import { 
  listAccounts, 
  queryCardTransactions, 
  queryTaxInvoices, 
  queryTaxExemptInvoices, 
  queryCashReceipts 
} from "../egdesk-helpers";

async function main() {
  console.log("=== 1. 은행 계좌 목록 ===");
  try {
    const res = await listAccounts();
    console.log("listAccounts() raw response:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("계좌 조회 실패:", err);
  }

  console.log("\n=== 2. 카드 거래 내역 ===");
  try {
    const res = await queryCardTransactions({ limit: 100 });
    console.log("queryCardTransactions() raw response:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("카드 거래 조회 실패:", err);
  }

  console.log("\n=== 3. 국세청 세금계산서 ===");
  try {
    const res = await queryTaxInvoices({ limit: 100 });
    console.log("queryTaxInvoices() raw response:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("세금계산서 조회 실패:", err);
  }
}

main().catch(console.error);
