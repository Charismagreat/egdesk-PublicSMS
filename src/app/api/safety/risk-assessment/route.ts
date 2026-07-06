export const dynamic = 'force-dynamic';
import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, updateRows } from '@/../egdesk-helpers';

// 사용자 토큰에서 권한 역할(Role)을 확인하는 헬퍼 함수
async function getRoleFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return 'SUB_OPERATOR';
    const payload = decodeJwt(token);
    return payload.role as string || 'SUB_OPERATOR';
  } catch (e) {
    return 'SUB_OPERATOR';
  }
}

// GET: 위험성평가 리스트 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const filters: Record<string, any> = {};
    if (status) {
      filters.status = status;
    }

    const assessmentsRes = await queryTable('safety_risk_assessments', {
      filters,
      orderBy: 'work_date',
      orderDirection: 'DESC'
    });

    const assessments = (assessmentsRes.rows || []).map((row: any) => ({
      ...row,
      hazards: row.hazards_json ? JSON.parse(row.hazards_json) : []
    }));

    return NextResponse.json({
      success: true,
      assessments
    });
  } catch (error: any) {
    console.error('Error fetching safety risk assessments:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 위험성평가 생성 (AI 자동 평가 포함)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { work_name, work_date, evaluated_by, generate_ai } = body;

    if (!work_name || !work_date || !evaluated_by) {
      return NextResponse.json({ success: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    let hazardsList = [];
    let calculatedRiskLevel = '하';

    if (generate_ai) {
      // 1. DB에서 구글 AI API 키 및 선택된 모델 조회
      const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
      let apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

      // 만약 DB에 없다면 환경 변수에서 가져옴
      if (!apiKey) {
        apiKey = process.env.GEMINI_API_KEY || '';
      }

      if (!apiKey) {
        return NextResponse.json({ 
          success: false, 
          error: '구글 AI API 키가 시스템에 등록되지 않았습니다. [설정 > AI 설정] 또는 DB의 system_settings 테이블에서 google_ai_api_key 값을 입력해 주세요.' 
        }, { status: 400 });
      }

      const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
      const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
        ? modelRes.rows[0].value
        : 'gemini-3.5-flash';

      // 2. AI에 보낼 프롬프트 작성
      const systemPrompt = `
You are a professional industrial safety expert complying with the Korean Serious Accident Punishment Act (SAPA).
Analyze the given work name/type and generate a list of potential hazards, accident types, and reduction measures in Korean.
Also, evaluate the overall risk level as one of "상" (High), "중" (Medium), or "하" (Low).

You must respond strictly in JSON format matching this schema:
{
  "risk_level": "상" | "중" | "하",
  "hazards": [
    {
      "hazard": "유해위험요인 (예: 지붕 위 작업 중 실족)",
      "type": "재해형태 (예: 추락)",
      "measure": "안전대책 (예: 안전대 체결선 설치 및 착용)"
    }
  ]
}
`;

      const aiResponse = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: `작업 내용: ${work_name}` }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        })
      });

      if (!aiResponse.ok) {
        const err = await aiResponse.json();
        throw new Error(err.error?.message || 'Gemini API 호출 중 오류가 발생했습니다.');
      }

      const aiData = await aiResponse.json();
      const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const parsedAi = JSON.parse(aiText);

      hazardsList = parsedAi.hazards || [];
      calculatedRiskLevel = parsedAi.risk_level || '하';

      // 토큰 로그 기록
      if (aiData.usageMetadata) {
        try {
          const u = aiData.usageMetadata;
          await insertRows('ai_token_usage_logs', [{
            id: `TKR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            model: selectedModel,
            purpose: 'safety-risk-assessment',
            prompt_tokens: u.promptTokenCount || 0,
            completion_tokens: u.candidatesTokenCount || 0,
            total_tokens: u.totalTokenCount || 0,
            created_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
          }]);
        } catch (e) {
          console.warn('Failed to log token usage:', e);
        }
      }
    } else {
      // AI를 사용하지 않을 경우 빈 요인 목록과 기본 위험도
      hazardsList = body.hazards || [];
      calculatedRiskLevel = body.risk_level || '하';
    }

    const assessmentId = `risk-${Date.now()}`;
    await insertRows('safety_risk_assessments', [{
      id: assessmentId,
      work_name,
      work_date,
      hazards_json: JSON.stringify(hazardsList),
      risk_level: calculatedRiskLevel,
      evaluated_by,
      approved_at: null,
      status: 'DRAFT'
    }]);

    return NextResponse.json({
      success: true,
      id: assessmentId,
      risk_level: calculatedRiskLevel,
      hazards: hazardsList
    });
  } catch (error: any) {
    console.error('Error creating safety risk assessment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: 위험성평가 승인 상태 변경 및 정보 업데이트
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, approved_by } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    // 승인 행위의 경우 최고관리자 검증
    if (status === 'APPROVED') {
      const role = await getRoleFromToken();
      if (role !== 'SUPER_ADMIN' && role !== 'PRESIDENT') {
        return NextResponse.json({ success: false, error: '최고관리자 또는 대표자만 위험성평가를 승인할 수 있습니다.' }, { status: 403 });
      }
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    const updateFields: Record<string, any> = { status };
    if (status === 'APPROVED') {
      updateFields.approved_at = nowStr;
    }

    await updateRows('safety_risk_assessments', updateFields, { filters: { id } });

    return NextResponse.json({ success: true, message: '위험성평가 상태가 업데이트되었습니다.' });
  } catch (error: any) {
    console.error('Error updating safety risk assessment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
