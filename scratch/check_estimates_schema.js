const fs = require("fs");
const path = require("path");

// .env.local 파일 파싱 및 로드
const envPath = path.join(__dirname, "../.env.local");
let apiUrl = "http://localhost:8080";
let apiKey = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const lines = envContent.split("\n");
  for (const line of lines) {
    if (line.startsWith("NEXT_PUBLIC_EGDESK_API_URL=")) {
      apiUrl = line.split("=")[1].trim();
    }
    if (line.startsWith("NEXT_PUBLIC_EGDESK_API_KEY=")) {
      apiKey = line.split("=")[1].trim();
    }
  }
}

console.log("🔌 연결 대상 API URL:", apiUrl);

// 이지데스크 MCP 도구 호출 헬퍼
async function callTool(tool, args) {
  const res = await fetch(`${apiUrl}/user-data/tools/call`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey
    },
    body: JSON.stringify({ tool, arguments: args })
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "도구 호출 실패");
  }
  const content = json.result?.content?.[0]?.text;
  return content ? JSON.parse(content) : null;
}

async function run() {
  try {
    // 1. crm_estimates 테이블 스키마 조회
    const schemaEst = await callTool("user_data_get_schema", { tableName: "crm_estimates" });
    console.log("\n=== crm_estimates 스키마 ===");
    console.log(schemaEst);

    // 2. crm_purchase_orders (발주) 테이블 스키마 조회
    const schemaPO = await callTool("user_data_get_schema", { tableName: "crm_purchase_orders" });
    console.log("\n=== crm_purchase_orders 스키마 ===");
    console.log(schemaPO);

    // 3. crm_sales_orders (수주) 테이블 스키마 조회
    const schemaSO = await callTool("user_data_get_schema", { tableName: "crm_sales_orders" });
    console.log("\n=== crm_sales_orders 스키마 ===");
    console.log(schemaSO);

    // 4. crm_purchase_orders 데이터 조회
    const dataPO = await callTool("user_data_query", { tableName: "crm_purchase_orders" });
    console.log("\n=== crm_purchase_orders 데이터 샘플 ===");
    console.log(dataPO ? dataPO.rows : "없음");

    // 5. crm_sales_orders 데이터 조회
    const dataSO = await callTool("user_data_query", { tableName: "crm_sales_orders" });
    console.log("\n=== crm_sales_orders 데이터 샘플 ===");
    console.log(dataSO ? dataSO.rows : "없음");

  } catch (e) {
    console.error("❌ 분석 중 오류 발생:", e.message);
  }
}

run();
