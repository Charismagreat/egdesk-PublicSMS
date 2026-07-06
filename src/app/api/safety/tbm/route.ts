export const dynamic = 'force-dynamic';
import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, updateRows } from '@/../egdesk-helpers';

// GET: TBM 일지 목록 조회
export async function GET(request: Request) {
  try {
    const tbmLogsRes = await queryTable('safety_tbm_logs', {
      orderBy: 'tbm_date',
      orderDirection: 'DESC'
    });

    const tbmLogs = (tbmLogsRes.rows || []).map((row: any) => ({
      ...row,
      attendee_signatures: row.attendee_signatures ? JSON.parse(row.attendee_signatures) : []
    }));

    return NextResponse.json({
      success: true,
      tbmLogs
    });
  } catch (error: any) {
    console.error('Error fetching TBM logs:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: TBM 일지 생성 및 AI 스크립트 자동 생성
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tbm_date, work_leader, weather_info, work_name, generate_script } = body;

    if (!tbm_date || !work_leader) {
      return NextResponse.json({ success: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    let tbmScript = body.tbm_script || '';

    if (generate_script && work_name) {
      // AI TBM 스크립트 작성 가동
      const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
      let apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

      if (!apiKey) {
        apiKey = process.env.GEMINI_API_KEY || '';
      }

      if (!apiKey) {
        return NextResponse.json({ 
          success: false, 
          error: '구글 AI API 키가 시스템에 등록되지 않았습니다. [설정 > AI 설정]에서 키를 등록해 주세요.' 
        }, { status: 400 });
      }

      const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
      const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
        ? modelRes.rows[0].value
        : 'gemini-3.5-flash';

      const systemPrompt = `
You are a warm but firm industrial safety manager.
Generate a morning TBM (Tool Box Meeting) safety briefing speech script in Korean based on the given work name and weather information.
Focus on actual safety measures, precautions, and a reminder to check protective gear.
Keep it under 300 words. Address the workers as "동료 여러분" (dear colleagues) and maintain a polite yet direct tone.
`;

      const promptText = `작업명: ${work_name}\n날씨 정보: ${weather_info || '특이사항 없음'}`;

      const aiResponse = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.7
          }
        })
      });

      if (!aiResponse.ok) {
        const err = await aiResponse.json();
        throw new Error(err.error?.message || 'Gemini API 호출 중 오류가 발생했습니다.');
      }

      const aiData = await aiResponse.json();
      tbmScript = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '스크립트 생성 실패';

      // 토큰 로그 기록
      if (aiData.usageMetadata) {
        try {
          const u = aiData.usageMetadata;
          await insertRows('ai_token_usage_logs', [{
            id: `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            model: selectedModel,
            purpose: 'safety-tbm-script',
            prompt_tokens: u.promptTokenCount || 0,
            completion_tokens: u.candidatesTokenCount || 0,
            total_tokens: u.totalTokenCount || 0,
            created_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
          }]);
        } catch (e) {
          console.warn('Failed to log token usage:', e);
        }
      }
    }

    const tbmId = `tbm-${Date.now()}`;
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    await insertRows('safety_tbm_logs', [{
      id: tbmId,
      tbm_date,
      work_leader,
      weather_info: weather_info || '맑음',
      tbm_script: tbmScript,
      attendees_count: 0,
      attendee_signatures: JSON.stringify([]),
      created_at: nowStr
    }]);

    return NextResponse.json({
      success: true,
      id: tbmId,
      tbm_script: tbmScript
    });
  } catch (error: any) {
    console.error('Error creating TBM log:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: 근로자 QR 서명 추가 (모바일 연동 서명 등록)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, worker_name, signature_data } = body;

    if (!id || !worker_name || !signature_data) {
      return NextResponse.json({ success: false, error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    // 기존 TBM 로그 조회
    const tbmRes = await queryTable('safety_tbm_logs', { filters: { id } });
    const tbmLog = tbmRes.rows?.[0];

    if (!tbmLog) {
      return NextResponse.json({ success: false, error: '해당 TBM 기록이 존재하지 않습니다.' }, { status: 404 });
    }

    const signatures = tbmLog.attendee_signatures ? JSON.parse(tbmLog.attendee_signatures) : [];
    
    // 이미 동일한 작업자가 서명했는지 확인
    const isAlreadySigned = signatures.some((s: any) => s.worker_name === worker_name);
    if (isAlreadySigned) {
      return NextResponse.json({ success: false, error: '이미 서명을 완료한 작업자입니다.' }, { status: 400 });
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    signatures.push({
      worker_name,
      signature_data, // Base64 서명 이미지 혹은 서명 텍스트
      signed_at: nowStr
    });

    await updateRows('safety_tbm_logs', {
      attendees_count: signatures.length,
      attendee_signatures: JSON.stringify(signatures)
    }, { filters: { id } });

    return NextResponse.json({
      success: true,
      message: `${worker_name}님의 안전 서명이 완료되었습니다.`,
      attendees_count: signatures.length
    });
  } catch (error: any) {
    console.error('Error recording TBM signature:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
