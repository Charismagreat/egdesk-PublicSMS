const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/app/api/easybot/route.ts');
let code = fs.readFileSync(targetPath, 'utf8');

const targetMarker = 'dbTablesInfo += "\\n" + financialsTablesInfo;';

const ragBlock = `
    // 💡 [RAG] 모든 기업의 연도별 재무제표 세부 계정과목 트리(JSON) 로드 및 프롬프트 RAG 인입
    let financialStatementsRAG = '';
    try {
      const finRes = await queryTable('crm_financial_statements', {});
      const finRows = finRes.rows || [];
      if (finRows.length > 0) {
        const partnersRes = await queryTable('crm_partners', {});
        const partnerMap = {};
        if (partnersRes && partnersRes.rows) {
          for (const p of partnersRes.rows) {
            partnerMap[p.id] = p.company_name || p.name || p.id;
          }
        }

        financialStatementsRAG = "\\n============================\\n[회사별/연도별 재무제표 세부 계정과목 및 JSON 내역 (RAG)]\\n";
        for (const row of finRows) {
          const companyName = row.company_id === 'MY-COMPANY' ? '본사' : (partnerMap[row.company_id] || row.company_id);
          financialStatementsRAG += '- 회사명: ' + companyName + ' (ID: ' + row.company_id + ', 구분: ' + (row.company_type === 'MY_COMPANY' ? '본사' : '거래처/관계사') + '), 연도: ' + row.fiscal_year + '년, 분기: ' + row.fiscal_quarter + '\\n';
          financialStatementsRAG += '  * 6대 핵심 지표: 자산총계: ' + row.total_assets + '원, 부채총계: ' + row.total_liabilities + '원, 자본총계: ' + row.total_equity + '원, 매출액: ' + row.revenue + '원, 영업이익: ' + row.operating_income + '원, 당기순이익: ' + row.net_income + '원\\n';
          if (row.parsed_raw_json) {
            financialStatementsRAG += '  * 세부 계정과목 트리 데이터: ' + row.parsed_raw_json + '\\n';
          }
          financialStatementsRAG += '\\n';
        }
        financialStatementsRAG += '============================\\n';
      }
    } catch (ragErr) {
      console.warn('재무제표 RAG 컨텍스트 빌드 실패:', ragErr);
    }
    dbTablesInfo += "\\n" + financialStatementsRAG;`;

if (code.includes(targetMarker) && !code.includes('financialStatementsRAG')) {
  code = code.replace(targetMarker, targetMarker + ragBlock);
  fs.writeFileSync(targetPath, code, 'utf8');
  console.log('Successfully patched easybot/route.ts!');
} else {
  console.log('Target marker not found or already patched.');
}
