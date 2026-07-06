const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../src/app/api/easybot/ocr/confirm/route.ts');
let code = fs.readFileSync(targetPath, 'utf8');

const targetMarker = `    // ==================================================
    // 📂 분기 처리 1: 사업자등록증 확정 (BUSINESS_LICENSE)
    // ==================================================
    if (fileType === 'BUSINESS_LICENSE') {`;

const financialConfirmBlock = `    // ==================================================
    // 📂 분기 처리 0: 재무제표 확정 (FINANCIAL_STATEMENT)
    // ==================================================
    if (fileType === 'FINANCIAL_STATEMENT') {
      const {
        partnerId,
        companyType,
        data,
        pdfFilePath
      } = reqBody;

      if (!partnerId) {
        return NextResponse.json({
          success: false,
          error: '등록할 회사 식별자(partnerId)가 누락되었습니다.'
        }, { status: 400 });
      }

      const {
        fiscalYear,
        fiscalQuarter = 'YR',
        totalAssets = 0,
        totalLiabilities = 0,
        totalEquity = 0,
        revenue = 0,
        operatingIncome = 0,
        netIncome = 0,
        parsedRawJson
      } = data || {};

      if (!fiscalYear) {
        return NextResponse.json({
          success: false,
          error: '등록할 회계 연도(fiscalYear) 정보가 누락되었습니다.'
        }, { status: 400 });
      }

      // 동일 회사의 연도/분기 중복 조회
      const checkRes = await queryTable('crm_financial_statements', {
        filters: {
          company_id: partnerId,
          fiscal_year: Number(fiscalYear),
          fiscal_quarter: fiscalQuarter
        }
      });

      const exists = checkRes.rows && checkRes.rows.length > 0;
      const nowStr = getNowTimestamp();

      if (exists) {
        const existingId = checkRes.rows[0].id;
        await updateRows('crm_financial_statements', {
          company_type: companyType,
          total_assets: Number(totalAssets),
          total_liabilities: Number(totalLiabilities),
          total_equity: Number(totalEquity),
          revenue: Number(revenue),
          operating_income: Number(operatingIncome),
          net_income: Number(netIncome),
          pdf_file_path: pdfFilePath || checkRes.rows[0].pdf_file_path,
          parsed_raw_json: parsedRawJson ? JSON.stringify(parsedRawJson) : checkRes.rows[0].parsed_raw_json,
          updated_at: nowStr
        }, {
          filters: { id: existingId }
        });

        return NextResponse.json({
          success: true,
          message: '기존 등록된 ' + fiscalYear + '년도 재무제표 정보 갱신을 성공적으로 완료하였습니다.',
          action: 'updated'
        });
      } else {
        const generatedId = 'FIN-' + Date.now();
        await insertRows('crm_financial_statements', [{
          id: generatedId,
          company_id: partnerId,
          company_type: companyType,
          fiscal_year: Number(fiscalYear),
          fiscal_quarter: fiscalQuarter,
          total_assets: Number(totalAssets),
          total_liabilities: Number(totalLiabilities),
          total_equity: Number(totalEquity),
          revenue: Number(revenue),
          operating_income: Number(operatingIncome),
          net_income: Number(netIncome),
          pdf_file_path: pdfFilePath || '',
          parsed_raw_json: parsedRawJson ? JSON.stringify(parsedRawJson) : '',
          created_at: nowStr,
          updated_at: nowStr
        }]);

        return NextResponse.json({
          success: true,
          message: '신규 ' + fiscalYear + '년도 재무제표 정보를 데이터베이스에 성공적으로 적재 완료하였습니다.',
          action: 'inserted'
        });
      }
    }

    // ==================================================
    // 📂 분기 처리 1: 사업자등록증 확정 (BUSINESS_LICENSE)
    // ==================================================
    if (fileType === 'BUSINESS_LICENSE') {`;

if (code.includes(targetMarker) && !code.includes("fileType === 'FINANCIAL_STATEMENT'")) {
  code = code.replace(targetMarker, financialConfirmBlock);
  fs.writeFileSync(targetPath, code, 'utf8');
  console.log('Successfully patched confirm/route.ts!');
} else {
  console.log('Target marker not found or already patched.');
}
