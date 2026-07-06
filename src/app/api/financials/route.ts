import { fetchGeminiWithFallback } from '../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, updateRows, deleteRows } from '../../../../egdesk-helpers';

export const dynamic = 'force-dynamic';

// 세션 검증 헬퍼
async function verifySession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return { isAuthorized: false, role: 'GUEST', name: 'Unknown', operatorId: null };
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Unknown';
    const operatorId = Number(payload.id) || null;
    
    return {
      isAuthorized: role === 'SUPER_ADMIN' || role === 'OPERATOR',
      role,
      name,
      operatorId
    };
  } catch (e) {
    return { isAuthorized: false, role: 'GUEST', name: 'Unknown', operatorId: null };
  }
}

// Altman Z-Score 계산 및 등급 판정 함수
function calculateZScore(assets: number, liabilities: number, equity: number, revenue: number, operatingIncome: number, netIncome: number) {
  if (assets <= 0) return { zScore: 0, riskGrade: 'CRITICAL' };

  // X1: 자본비율 (자기자본 / 총자산)
  const x1 = equity / assets;
  // X2: 누적적립금 근사치 (당기순이익 / 총자산)
  const x2 = netIncome / assets;
  // X3: 자산수익률 (영업이익 / 총자산)
  const x3 = operatingIncome / assets;
  // X4: 재무구조 안정성 (자본 / 부채) -> 부채가 0인 경우 방지
  const safeLiabilities = liabilities <= 0 ? 1 : liabilities;
  const x4 = equity / safeLiabilities;
  // X5: 자산회전율 (매출액 / 총자산)
  const x5 = revenue / assets;

  // Altman Z-Score 공식 적용 (상장/비상장 가중치 가미된 범용 모델)
  const zScore = (1.2 * x1) + (1.4 * x2) + (3.3 * x3) + (0.6 * x4) + (0.999 * x5);

  let riskGrade = 'WARNING';
  if (zScore > 3.0) {
    riskGrade = 'SAFE';
  } else if (zScore < 1.8) {
    riskGrade = 'CRITICAL';
  }

  return { zScore: Math.round(zScore * 100) / 100, riskGrade };
}

// 1. GET: 재무제표 목록 및 상세 내역 조회
export async function GET(req: Request) {
  try {
    const { isAuthorized } = await verifySession();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    // 마스터 재무제표 데이터 조회 (소프트 삭제 배제, egdesk-helpers의 queryTable 사용)
    const statementsRes = await queryTable('crm_financial_statements', {
      filters: { deleted_at: null as any },
      orderBy: 'fiscal_year',
      orderDirection: 'DESC'
    });
    const statements = statementsRes.rows || [];

    if (statements.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 상세 계정과목 조회 (egdesk-helpers 사용)
    const itemsRes = await queryTable('crm_financial_statement_items', {
      filters: { deleted_at: null as any }
    });
    const items = itemsRes.rows || [];

    // AI 분석 로그 조회 (egdesk-helpers 사용)
    const logsRes = await queryTable('crm_financial_analysis_logs', {
      filters: { deleted_at: null as any }
    });
    const logs = logsRes.rows || [];

    // 데이터 구조 매핑
    const result = statements.map((stmt: any) => {
      const stmtItems = items.filter((item: any) => item.statement_id === stmt.id);
      const stmtLog = logs.find((log: any) => log.statement_id === stmt.id) || null;
      return {
        ...stmt,
        detailedItems: stmtItems,
        analysisLog: stmtLog
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Financials GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. POST: 재무제표 신규 등록 또는 수정 (Detailed Items 및 AI 분석 동시 적재)
export async function POST(req: Request) {
  try {
    const { isAuthorized, name: operatorName } = await verifySession();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      companyId = 'MY-COMPANY',
      companyType = 'MY_COMPANY',
      fiscalYear,
      fiscalQuarter = 'YR',
      totalAssets = 0,
      totalLiabilities = 0,
      totalEquity = 0,
      revenue = 0,
      operatingIncome = 0,
      netIncome = 0,
      pdfFilePath = null,
      detailedItems = []
    } = body;

    if (!fiscalYear) {
      return NextResponse.json({ success: false, error: '회계연도(fiscalYear)는 필수 항목입니다.' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    
    // 멱등성 유지: 동일 회사, 동일 연도, 동일 분기의 소프트 삭제되지 않은 기존 재무제표 조회 (egdesk-helpers 사용)
    const checkRes = await queryTable('crm_financial_statements', {
      filters: {
        company_id: companyId,
        fiscal_year: String(fiscalYear),
        fiscal_quarter: fiscalQuarter,
        deleted_at: null as any
      }
    });
    const existingStatement = checkRes.rows && checkRes.rows.length > 0 ? checkRes.rows[0] : null;

    let statementId = existingStatement ? existingStatement.id : `STMT-${Date.now()}`;
    const uuid = existingStatement ? existingStatement.uuid : `uuid-stmt-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    // A. 마스터 재무제표 UPSERT (egdesk-helpers 사용)
    if (existingStatement) {
      await updateRows('crm_financial_statements', {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        revenue: revenue,
        operating_income: operatingIncome,
        net_income: netIncome,
        pdf_file_path: pdfFilePath,
        parsed_raw_json: JSON.stringify(detailedItems),
        updated_at: nowStr,
        updated_by: operatorName
      }, { filters: { id: statementId } });
    } else {
      await insertRows('crm_financial_statements', [{
        id: statementId,
        company_id: companyId,
        company_type: companyType,
        fiscal_year: fiscalYear,
        fiscal_quarter: fiscalQuarter,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        revenue: revenue,
        operating_income: operatingIncome,
        net_income: netIncome,
        pdf_file_path: pdfFilePath,
        parsed_raw_json: JSON.stringify(detailedItems),
        created_at: nowStr,
        updated_at: nowStr,
        updated_by: operatorName,
        uuid: uuid
      }]);
    }

    // B. 상세 계정과목 저장 (멱등성 유지를 위해 기존 항목 삭제 후 신규 INSERT, egdesk-helpers 사용)
    await deleteRows('crm_financial_statement_items', { filters: { statement_id: statementId } });

    // 신규 상세 계정과목 벌크 INSERT (egdesk-helpers 사용)
    if (detailedItems && detailedItems.length > 0) {
      const itemsToInsert = detailedItems.map((item: any, idx: number) => {
        const itemId = `ITM-${Date.now()}-${idx}`;
        const itemUuid = `uuid-item-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;
        return {
          id: itemId,
          statement_id: statementId,
          category: item.category,
          account_name: item.accountName || item.account_name,
          amount: Number(item.amount) || 0,
          created_at: nowStr,
          updated_at: nowStr,
          updated_by: operatorName,
          uuid: itemUuid
        };
      });
      await insertRows('crm_financial_statement_items', itemsToInsert);
    }

    // C. Z-Score 연산 및 AI 컨설팅 리포트 자동 생성
    const { zScore, riskGrade } = calculateZScore(totalAssets, totalLiabilities, totalEquity, revenue, operatingIncome, netIncome);

    // AI API 호출 준비 (구글 AI API 키 조회)
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;
    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-2.5-flash';

    let forecastText = 'AI 분석 키가 설정되지 않아 예측 리포트를 작성할 수 없습니다.';
    let consultingText = 'AI 분석 키가 설정되지 않아 재무 제언 리포트를 작성할 수 없습니다.';

    if (apiKey) {
      try {
        const ratioAnalysis = {
          부채비율: totalEquity > 0 ? `${Math.round((totalLiabilities / totalEquity) * 10000) / 100}%` : 'N/A',
          자기자본비율: totalAssets > 0 ? `${Math.round((totalEquity / totalAssets) * 10000) / 100}%` : 'N/A',
          영업이익률: revenue > 0 ? `${Math.round((operatingIncome / revenue) * 10000) / 100}%` : 'N/A',
          당기순이익률: revenue > 0 ? `${Math.round((netIncome / revenue) * 10000) / 100}%` : 'N/A'
        };

        const aiPrompt = `
당신은 최고 수준의 기업 재무 컨설턴트 및 리스크 매니저입니다.
다음은 분석 대상 기업의 연간 재무제표 요약 정보와 비율 분석 결과 및 부도 예측 모델인 Altman Z-Score 계산 결과입니다.

[기업 재무 지표 요약]
- 회사 구분: ${companyId === 'MY-COMPANY' ? '본사' : '외부 거래처'}
- 회계연도: ${fiscalYear}년
- 자산총계: ${totalAssets.toLocaleString()}원
- 부채총계: ${totalLiabilities.toLocaleString()}원
- 자본총계: ${totalEquity.toLocaleString()}원
- 매출액: ${revenue.toLocaleString()}원
- 영업이익: ${operatingIncome.toLocaleString()}원
- 당기순이익: ${netIncome.toLocaleString()}원

[비율 및 재무 지표 분석]
- Altman Z-Score: ${zScore} (판정 등급: ${riskGrade === 'SAFE' ? '안전 (SAFE)' : riskGrade === 'WARNING' ? '보통/주의 (WARNING)' : '부도 위험군 (CRITICAL)'})
- 부채비율: ${ratioAnalysis.부채비율}
- 자기자본비율: ${ratioAnalysis.자기자본비율}
- 영업이익률: ${ratioAnalysis.영업이익률}
- 당기순이익률: ${ratioAnalysis.당기순이익률}

[상세 계정과목 목록]
${JSON.stringify(detailedItems)}

위 정보를 기반으로 다음 두 가지 항목을 한국어로 전문적이고 신뢰감 있게 작성하여 JSON 형태로 출력해 주세요.
1. "forecast": 차기 회계연도의 매출 및 영업 실적 예측 시나리오 (자산 회전 및 수익성 지표 기반의 통찰 포함, 3~4문장)
2. "consulting": 현 상황에 기반한 구체적이고 실행 가능한 비용 통제, 현금 흐름 확보, 여신 관리 및 비즈니스 리스크 완화 제언 (3~4문장)

JSON 응답 포맷 예시:
{
  "forecast": "예측 시나리오 내용...",
  "consulting": "컨설팅 제언 내용..."
}
`;

        const aiResponse = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: aiPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3
            }
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiJsonText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const aiParsed = JSON.parse(aiJsonText.trim());
          forecastText = aiParsed.forecast || forecastText;
          consultingText = aiParsed.consulting || consultingText;

          // 토큰 로깅
          const u = aiData.usageMetadata || {};
          await insertRows('ai_token_usage_logs', [{
            id: `TFK-${Date.now()}`,
            model: selectedModel,
            purpose: 'financial-ai-consulting',
            prompt_tokens: u.promptTokenCount || 0,
            completion_tokens: u.candidatesTokenCount || 0,
            total_tokens: u.totalTokenCount || 0,
            created_at: nowStr,
            updated_at: nowStr,
            updated_by: operatorName
          }]);
        }
      } catch (aiErr) {
        console.error('AI 분석 리포트 생성 중 오류:', aiErr);
      }
    }

    // D. AI 분석 로그 UPSERT (egdesk-helpers 사용)
    const logCheckRes = await queryTable('crm_financial_analysis_logs', {
      filters: {
        statement_id: statementId,
        deleted_at: null as any
      }
    });
    const existingLog = logCheckRes.rows && logCheckRes.rows.length > 0 ? logCheckRes.rows[0] : null;

    if (existingLog) {
      await updateRows('crm_financial_analysis_logs', {
        z_score: zScore,
        risk_grade: riskGrade,
        forecast_text: forecastText,
        consulting_text: consultingText,
        updated_at: nowStr,
        updated_by: operatorName
      }, { filters: { id: existingLog.id } });
    } else {
      const logId = `LOG-${Date.now()}`;
      const logUuid = `uuid-log-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      await insertRows('crm_financial_analysis_logs', [{
        id: logId,
        statement_id: statementId,
        z_score: zScore,
        risk_grade: riskGrade,
        forecast_text: forecastText,
        consulting_text: consultingText,
        created_at: nowStr,
        updated_at: nowStr,
        updated_by: operatorName,
        uuid: logUuid
      }]);
    }

    return NextResponse.json({
      success: true,
      message: '재무제표 데이터 및 AI 분석 리포트가 성공적으로 저장되었습니다.',
      statementId
    });

  } catch (error: any) {
    console.error('Financials POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 3. DELETE: 재무제표 소프트 삭제
export async function DELETE(req: Request) {
  try {
    const { isAuthorized, name: operatorName } = await verifySession();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '삭제할 재무제표 ID(id)가 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // 마스터 테이블 소프트 삭제 (egdesk-helpers updateRows 사용)
    await updateRows('crm_financial_statements', {
      deleted_at: nowStr,
      deleted_by: operatorName
    }, { filters: { id } });

    // 상세 테이블 소프트 삭제 (egdesk-helpers updateRows 사용)
    await updateRows('crm_financial_statement_items', {
      deleted_at: nowStr,
      deleted_by: operatorName
    }, { filters: { statement_id: id } });

    // 분석 로그 테이블 소프트 삭제 (egdesk-helpers updateRows 사용)
    await updateRows('crm_financial_analysis_logs', {
      deleted_at: nowStr,
      deleted_by: operatorName
    }, { filters: { statement_id: id } });

    return NextResponse.json({
      success: true,
      message: '재무제표 및 연계 데이터가 성공적으로 소프트 삭제되었습니다.'
    });

  } catch (error: any) {
    console.error('Financials DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
