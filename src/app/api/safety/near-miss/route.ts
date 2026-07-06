export const dynamic = 'force-dynamic';
import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '@/../egdesk-helpers';

// GET: 아차사고 제보 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action_status = searchParams.get('action_status');

    const filters: Record<string, any> = {};
    if (action_status) {
      filters.action_status = action_status;
    }

    const nearMissesRes = await queryTable('safety_near_misses', {
      filters,
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });

    return NextResponse.json({
      success: true,
      nearMisses: nearMissesRes.rows || []
    });
  } catch (error: any) {
    console.error('Error fetching near misses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 아차사고 제보 등록 및 AI 위험도 등급 판정 & 비상 FreeSMS 전송
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reporter_name, hazard_location, description, photo_url } = body;

    if (!reporter_name || !hazard_location || !description) {
      return NextResponse.json({ success: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    let detectedRiskGrade = 'LOW';
    let aiReason = 'AI 분석 미시행';

    // 1. Gemini AI를 활용한 위험도 실시간 판정
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    let apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY || '';
    }

    if (apiKey) {
      const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
      const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
        ? modelRes.rows[0].value
        : 'gemini-3.5-flash';

      const systemPrompt = `
You are an AI Safety Analyst complying with the Korean Serious Accident Punishment Act (SAPA).
Analyze the near-miss hazard description below and classify the risk level into one of the following grades:
- CRITICAL: Immediate threat of severe injury or death (e.g., fire, gas leak, high fall risk without safety gear, high voltage exposure).
- HIGH: Significant threat of injury (e.g., unstable structures, slippery steep slopes, lack of personal protective equipment).
- MEDIUM: Moderate hazard (e.g., cluttered workspace walkways, minor equipment wear).
- LOW: Minor or negligible hazard.

Respond strictly in JSON format:
{
  "risk_grade": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "reason": "Brief explanation in Korean for this classification."
}
`;

      try {
        const aiResponse = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: `제보 내용: ${description}` }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const parsed = JSON.parse(aiText);
          detectedRiskGrade = parsed.risk_grade || 'LOW';
          aiReason = parsed.reason || '분석 완료';

          // 토큰 로깅
          if (aiData.usageMetadata) {
            const u = aiData.usageMetadata;
            await insertRows('ai_token_usage_logs', [{
              id: `TKN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              model: selectedModel,
              purpose: 'safety-near-miss-analysis',
              prompt_tokens: u.promptTokenCount || 0,
              completion_tokens: u.candidatesTokenCount || 0,
              total_tokens: u.totalTokenCount || 0,
              created_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
            }]);
          }
        }
      } catch (aiErr) {
        console.error('Failed to run AI near-miss analysis, defaulting to LOW risk:', aiErr);
      }
    }

    const nearMissId = `miss-${Date.now()}`;
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    await insertRows('safety_near_misses', [{
      id: nearMissId,
      reporter_name,
      hazard_location,
      description,
      photo_url: photo_url || '',
      risk_grade: detectedRiskGrade,
      action_status: 'PENDING',
      action_description: null,
      action_photo_url: null,
      action_completed_at: null,
      created_at: nowStr
    }]);

    // 2. CRITICAL 또는 HIGH 위험 등급일 때, 안전관리자에게 비상 FreeSMS 발송
    if (detectedRiskGrade === 'CRITICAL' || detectedRiskGrade === 'HIGH') {
      try {
        // 안전관리자 연락처 쿼리
        const managerPhoneRes = await queryTable('system_settings', { filters: { key: 'safety_manager_phone' } });
        const safetyManagerPhone = managerPhoneRes.rows && managerPhoneRes.rows.length > 0
          ? managerPhoneRes.rows[0].value
          : '010-1234-5678'; // 기본 안전관리인 가상 번호

        const smsContent = `[🚨중대재해 AI비상] ${reporter_name}님이 [${hazard_location}]에서 위험을 제보했습니다. 위험등급: ${detectedRiskGrade}. 상세: ${description.slice(0, 50)} (AI분석: ${aiReason})`;

        // 내부 API Route를 통한 SMS 발송 트리거
        // EGDesk Context에 따라 로컬 포트는 4000 또는 3000
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';
        fetch(`${appUrl}/api/sms/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: safetyManagerPhone,
            message: smsContent,
            customerId: null
          })
        }).then(async (smsRes) => {
          const resJson = await smsRes.json();
          if (resJson.success) {
            console.log(`[Safety Alert] Critical safety SMS sent successfully to ${safetyManagerPhone}`);
          } else {
            console.error(`[Safety Alert] SMS send failed: ${resJson.error}`);
          }
        }).catch((err) => {
          console.error('[Safety Alert] SMS send fetch failed:', err);
        });

      } catch (smsErr) {
        console.error('Failed to trigger safety alert SMS:', smsErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: nearMissId,
      risk_grade: detectedRiskGrade,
      ai_reason: aiReason
    });
  } catch (error: any) {
    console.error('Error reporting near miss:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: 관리자의 아차사고 조치 내용 및 상태 갱신
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, action_status, action_description, action_photo_url } = body;

    if (!id || !action_status) {
      return NextResponse.json({ success: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    const updateFields: Record<string, any> = {
      action_status,
      action_description: action_description || '',
      action_photo_url: action_photo_url || ''
    };

    if (action_status === 'COMPLETED') {
      updateFields.action_completed_at = nowStr;
    }

    await updateRows('safety_near_misses', updateFields, { filters: { id } });

    return NextResponse.json({
      success: true,
      message: '아차사고 조치 내역이 갱신되었습니다.'
    });
  } catch (error: any) {
    console.error('Error updating near miss action:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
