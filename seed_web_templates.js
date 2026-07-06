const path = require('path');
const Database = require('better-sqlite3');

const dbPaths = [
  'C:/Users/CHARISMA/AppData/Roaming/EGDesk/user-data/development/projects/49a59fa4-40b6-40f4-8c3d-0231be79c7f9/user_data.db',
  'C:/Users/CHARISMA/AppData/Roaming/egdesk/user-data/development/projects/49a59fa4-40b6-40f4-8c3d-0231be79c7f9/user_data.db'
];

// 표준 CSS 스타일 선언
const styleBlock = `
<style>
  @page {
    size: A4 portrait;
    margin: 15mm 10mm;
  }
  body {
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
    font-size: 11px;
    color: #334155;
    margin: 0;
    padding: 0;
    line-height: 1.4;
  }
  .container {
    width: 190mm;
    margin: 0 auto;
    box-sizing: border-box;
  }
  .title-area {
    text-align: center;
    margin-bottom: 25px;
  }
  .title-text {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 8px;
    color: #0f172a;
    border-bottom: 3px double #1e293b;
    display: inline-block;
    padding-bottom: 5px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    table-layout: fixed;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 6px 6px;
    height: 24px;
    box-sizing: border-box;
    vertical-align: middle;
  }
  th {
    background-color: #f8fafc;
    color: #475569;
    font-weight: 700;
    text-align: center;
  }
  .bg-slate {
    background-color: #f1f5f9;
  }
  .center {
    text-align: center;
  }
  .right {
    text-align: right;
    padding-right: 8px;
  }
  .bold {
    font-weight: bold;
  }
  .text-indigo {
    color: #4f46e5;
  }
  .header-container {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
    gap: 10px;
  }
  .header-box {
    width: 49%;
  }
  .header-table td {
    font-size: 10px;
  }
  .header-table .label {
    width: 75px;
    background-color: #f8fafc;
    color: #475569;
    font-weight: bold;
    text-align: center;
  }
  .sub-note {
    font-size: 9px;
    color: #64748b;
  }
</style>
`;

// 공통 문서 헤더 렌더링 헬퍼 (공급자, 공급받는자)
function buildHeaderHtml(docTitle, isEstimate) {
  const targetLabel = isEstimate ? "공급받는자 (바이어)" : "발주자 (우리회사)";
  const supplierLabel = isEstimate ? "공급자 (우리회사)" : "공급자 (거래처)";
  
  return `
  <div class='title-area'>
    <div class='title-text'>${docTitle}</div>
  </div>

  <div class='header-container'>
    <div class='header-box'>
      <table class='header-table'>
        <tr>
          <td rowspan='4' class='center bold bg-slate' style='width:25px; writing-mode: vertical-rl; text-orientation: upright;'>${targetLabel}</td>
          <td class='label'>상 호</td>
          <td class='bold center'>{{recipient_company}} 귀하</td>
        </tr>
        <tr>
          <td class='label'>사업장 주소</td>
          <td>{{recipient_address}}</td>
        </tr>
        <tr>
          <td class='label'>담당자명</td>
          <td>{{recipient_contact}}</td>
        </tr>
        <tr>
          <td class='label'>연락처</td>
          <td>{{recipient_phone}}</td>
        </tr>
      </table>
    </div>
    <div class='header-box'>
      <table class='header-table'>
        <tr>
          <td rowspan='4' class='center bold bg-slate' style='width:25px; writing-mode: vertical-rl; text-orientation: upright;'>${supplierLabel}</td>
          <td class='label'>상 호</td>
          <td class='bold center'>{{supplier_company}}</td>
        </tr>
        <tr>
          <td class='label'>사업장 주소</td>
          <td>{{supplier_address}}</td>
        </tr>
        <tr>
          <td class='label'>대표자 성명</td>
          <td class='center'>{{supplier_owner}} (인)</td>
        </tr>
        <tr>
          <td class='label'>연락처</td>
          <td>{{supplier_phone}}</td>
        </tr>
      </table>
    </div>
  </div>
  `;
}

// 품목 상세 내역 렌더링 템플릿
const itemsTableHtml = `
  <table>
    <colgroup>
      <col style='width: 30%;'>
      <col style='width: 20%;'>
      <col style='width: 12%;'>
      <col style='width: 18%;'>
      <col style='width: 20%;'>
    </colgroup>
    <thead>
      <tr>
        <th>품명 및 규격</th>
        <th>정산방식 (단위)</th>
        <th>수량</th>
        <th>단가</th>
        <th>합계금액</th>
      </tr>
    </thead>
    <tbody>
      {{#items}}
      <tr>
        <td class='bold'>
          {{#item_code}}[{{item_code}}] {{/item_code}}{{product_name}}
          {{#spec}}<br><span class='sub-note' style='font-weight: normal;'>규격: {{spec}}</span>{{/spec}}
        </td>
        <td class='center'>{{billing_type_name}} ({{unit}})</td>
        <td class='center'>{{quantity}}</td>
        <td class='right'>{{unit_price}}원</td>
        <td class='right bold text-indigo'>{{amount}}원</td>
      </tr>
      {{#has_cost_breakdown}}
      <tr class='bg-slate'>
        <td colspan='5' style='padding: 5px 12px; font-size: 9px; color: #475569;'>
          ↳ <b>원가 세부 분석 (Cost Breakdown)</b> | 
          자재비: {{cost_breakdown.material_cost}}원 | 
          외주가공비: {{cost_breakdown.processing_cost}}원 | 
          일반관리비: {{cost_breakdown.overhead_cost}}원 | 
          기타경비: {{cost_breakdown.other_expenses}}원 | 
          운반비: {{cost_breakdown.delivery_expense}}원
        </td>
      </tr>
      {{/has_cost_breakdown}}
      {{/items}}
      <tr class='bg-slate'>
        <td colspan='4' class='center bold'>총 합 계 금 액 (VAT 포함)</td>
        <td class='right bold text-indigo' style='font-size: 13px;'>{{total_amount}}원</td>
      </tr>
    </tbody>
  </table>

  <table style='margin-top: 15px;'>
    <tr>
      <th style='width: 15%;'>특 기 사 항</th>
      <td style='padding: 10px; height: 80px; vertical-align: top;'>{{document_memo}}</td>
    </tr>
  </table>
`;

// 최종 기입할 템플릿 목록 정의
const templatesToInsert = [
  {
    id: 10,
    template_name: "보낼 견적서 (자재구매)",
    document_type: "ESTIMATE_MATERIAL",
    html_content: `<!DOCTYPE html><html lang='ko'><head><meta charset='UTF-8'><title>견적서</title>${styleBlock}</head><body><div class='container'>${buildHeaderHtml("견 적 서 (자재구매)", true)}${itemsTableHtml}</div></body></html>`
  },
  {
    id: 11,
    template_name: "보낼 견적서 (임가공)",
    document_type: "ESTIMATE_PROCESSING",
    html_content: `<!DOCTYPE html><html lang='ko'><head><meta charset='UTF-8'><title>견적서</title>${styleBlock}</head><body><div class='container'>${buildHeaderHtml("견 적 서 (임가공)", true)}${itemsTableHtml}</div></body></html>`
  },
  {
    id: 12,
    template_name: "보낼 견적서 (외주작업)",
    document_type: "ESTIMATE_OUTSOURCING",
    html_content: `<!DOCTYPE html><html lang='ko'><head><meta charset='UTF-8'><title>견적서</title>${styleBlock}</head><body><div class='container'>${buildHeaderHtml("견 적 서 (외주작업)", true)}${itemsTableHtml}</div></body></html>`
  },
  {
    id: 13,
    template_name: "보낼 발주서 (자재구매)",
    document_type: "PURCHASE_ORDER_MATERIAL",
    html_content: `<!DOCTYPE html><html lang='ko'><head><meta charset='UTF-8'><title>발주서</title>${styleBlock}</head><body><div class='container'>${buildHeaderHtml("발 주 서 (자재구매)", false)}${itemsTableHtml}</div></body></html>`
  },
  {
    id: 14,
    template_name: "보낼 발주서 (임가공)",
    document_type: "PURCHASE_ORDER_PROCESSING",
    html_content: `<!DOCTYPE html><html lang='ko'><head><meta charset='UTF-8'><title>발주서</title>${styleBlock}</head><body><div class='container'>${buildHeaderHtml("발 주 서 (임가공)", false)}${itemsTableHtml}</div></body></html>`
  },
  {
    id: 15,
    template_name: "보낼 발주서 (외주작업)",
    document_type: "PURCHASE_ORDER_OUTSOURCING",
    html_content: `<!DOCTYPE html><html lang='ko'><head><meta charset='UTF-8'><title>발주서</title>${styleBlock}</head><body><div class='container'>${buildHeaderHtml("발 주 서 (외주작업)", false)}${itemsTableHtml}</div></body></html>`
  }
];

function seedTemplates() {
  console.log('=== Seeding 6 standard SCM Web Templates ===');
  
  for (const dbPath of dbPaths) {
    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
      continue;
    }
    
    console.log(`Processing Database: ${dbPath}`);
    let db;
    try {
      db = new Database(dbPath, { fileMustExist: true });
      
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO crm_web_templates (
          id, template_name, html_content, web_html_content, document_type, 
          is_active, is_print_active, is_web_active, uuid, updated_at, updated_by
        ) VALUES (?, ?, ?, ?, ?, 1, 1, 1, ?, ?, 'admin')
      `);
      
      const transaction = db.transaction(() => {
        for (const t of templatesToInsert) {
          const uuid = `SEED-TPL-${t.id}-${Date.now()}`;
          const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
          insertStmt.run(t.id, t.template_name, t.html_content, null, t.document_type, uuid, nowStr);
          console.log(`✓ Inserted template ID ${t.id} '${t.template_name}'`);
        }
      });
      
      transaction();
      console.log(`✓ Completed Seeding for: ${dbPath}\n`);
    } catch (err) {
      console.error(`Error seeding db ${dbPath}:`, err.message);
    } finally {
      if (db) db.close();
    }
  }
  
  console.log('=== All Seeding Completed ===');
}

seedTemplates();
