import { queryTable, updateRows, insertRows } from '../../../../../../../egdesk-helpers';

export async function handleFinancialStatement(reqBody: any, nowStr: string) {
  const {
    partnerId,
    companyType,
    data,
    pdfFilePath
  } = reqBody;

  if (!partnerId) {
    throw new Error('등록할 회사 식별자(partnerId)가 누락되었습니다.');
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
    throw new Error('등록할 회계 연도(fiscalYear) 정보가 누락되었습니다.');
  }

  // 동일 회사의 연도/분기 중복 조회
  const checkRes = await queryTable('crm_financial_statements', {
    filters: {
      company_id: partnerId,
      fiscal_year: String(fiscalYear),
      fiscal_quarter: fiscalQuarter
    }
  });

  const exists = checkRes.rows && checkRes.rows.length > 0;

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

    return {
      action: 'updated',
      partnerId,
      fiscalYear,
      message: `기존 등록된 ${fiscalYear}년도 재무제표 정보 갱신을 성공적으로 완료하였습니다.`,
      auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 기존 등록된 회사 재무제표(회계 연도: ${fiscalYear}년) 정보를 분석하여 재무제표 DB에 업데이트 대행하였습니다.`
    };
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

    return {
      action: 'inserted',
      partnerId,
      fiscalYear,
      message: `신규 ${fiscalYear}년도 재무제표 정보를 데이터베이스에 성공적으로 적재 완료하였습니다.`,
      auditPrompt: `[이지봇 AI 이미지 OCR 자율 대행] 신규 회사 재무제표(회계 연도: ${fiscalYear}년) 정보를 분석하여 재무제표 DB에 등록 대행하였습니다.`
    };
  }
}
