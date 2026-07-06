export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from "next/server";
import { queryTable, updateRows, insertRows } from "../../../../../egdesk-helpers";

/**
 * GET: NCR 목록 조회 및 유사 사례 추천 데이터 조회 (Gemini AI RAG 교차 분석 연동)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const searchKeyword = searchParams.get("query") || "";

    // 1. DB에서 system_settings에서 API 키 조회
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    let apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY || '';
    }

    // 2. DB에서 NCR 전체 조회
    const ncrRes = await queryTable("crm_quality_ncr_items", {});
    let ncrList = (ncrRes.rows || []).map((item: any) => ({
      id: item.id,
      date: item.date,
      itemName: item.itemName,
      defectCode: item.defectCode,
      defectType: item.defectType,
      quantity: Number(item.quantity || 0),
      reporter: item.reporter,
      status: item.status,
      description: item.description,
      actionPlan: item.actionPlan || ""
    }));

    // 검색 필터 적용
    if (searchKeyword) {
      ncrList = ncrList.filter((item: any) =>
        (item.itemName || "").includes(searchKeyword) ||
        (item.defectType || "").includes(searchKeyword) ||
        (item.description || "").includes(searchKeyword)
      );
    }

    // 최신 날짜순 정렬
    ncrList.sort((a: any, b: any) => b.id.localeCompare(a.id));

    // 3. DB에서 유사 사례 원본 조회 (폴백 및 RAG 소스)
    const similarRes = await queryTable("crm_quality_ncr_similar_cases", {});
    let similarCases = (similarRes.rows || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      similarity: Number(s.similarity || 0),
      rootCause: s.rootCause,
      actionTaken: s.actionTaken
    }));

    // 4. 최신 NCR이 존재하고 API Key가 있는 경우 Gemini AI RAG를 실행하여 유사도 및 CAPA 동적 매칭
    if (apiKey && ncrList.length > 0 && similarCases.length > 0) {
      const targetNcr = ncrList[0]; // 가장 최신 NCR

      const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
      const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
        ? modelRes.rows[0].value
        : 'gemini-2.5-flash';

      const systemPrompt = `
You are a Quality Control Engineer.
Your task is to perform RAG (Retrieval-Augmented Generation) on the past similar NCR (Non-Conformance Report) cases and match them against the Target NCR.
Compare the Target NCR details with the past cases. For each past case:
1. Re-calculate the similarity percentage (0 to 100) between the Target NCR and the past case.
2. Adapt/translate the "rootCause" (Korean) to fit the context of the Target NCR based on that past case's context.
3. Adapt/provide the optimal Corrective and Preventive Actions ("actionTaken") (Korean) that can be applied to the Target NCR, referencing the past case's action.

Target NCR Details:
- Item Name: ${targetNcr.itemName}
- Defect Code: ${targetNcr.defectCode}
- Defect Type: ${targetNcr.defectType}
- Description: ${targetNcr.description}

You must respond strictly in JSON format matching the schema:
{
  "similarCases": [
    {
      "id": "CASE-XXX",
      "similarity": 92.5,
      "rootCause": "Detailed root cause in Korean adapted to Target NCR",
      "actionTaken": "Detailed CAPA / action taken in Korean adapted to Target NCR"
    },
    ...
  ]
}
Do not include any markdown format tags like \`\`\`json. Just raw JSON text.
`;

      const userContent = `Past Similar Cases to compare:
${JSON.stringify(similarCases, null, 2)}`;

      try {
        const aiResponse = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userContent }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const parsed = JSON.parse(aiText.trim());

          if (parsed.similarCases && parsed.similarCases.length > 0) {
            similarCases = parsed.similarCases.map((sc: any) => {
              const matchedOriginal = (similarRes.rows || []).find((orig: any) => orig.id === sc.id);
              return {
                id: sc.id,
                title: matchedOriginal ? matchedOriginal.title : '유사 사례',
                similarity: Number(sc.similarity || 0),
                rootCause: sc.rootCause,
                actionTaken: sc.actionTaken
              };
            });

            // 토큰 로그 로깅
            if (aiData.usageMetadata) {
              const u = aiData.usageMetadata;
              await insertRows('ai_token_usage_logs', [{
                id: `TKN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                model: selectedModel,
                purpose: 'quality-ncr-rag',
                prompt_tokens: u.promptTokenCount || 0,
                completion_tokens: u.candidatesTokenCount || 0,
                total_tokens: u.totalTokenCount || 0,
                created_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
              }]);
            }
          }
        }
      } catch (aiErr) {
        console.error('Failed to run AI NCR RAG, defaulting to database original cases:', aiErr);
      }
    }

    return NextResponse.json({
      success: true,
      ncrList,
      similarCases
    });
  } catch (error: any) {
    console.error("Error in NCR GET API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT: NCR 조치 완료 및 상태 갱신
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status, actionPlan } = body;

    const nextStatus = status || "COMPLETED";
    const nextActionPlan = actionPlan || "지정된 대책 처리 완료";

    // DB 업데이트 실행
    await updateRows("crm_quality_ncr_items", {
      status: nextStatus,
      actionPlan: nextActionPlan
    }, { filters: { id } });

    return NextResponse.json({
      success: true,
      message: `부적합 보고서 [${id}]에 대한 조치 사항이 등록되어 상태가 변경되었습니다.`,
      updatedItem: {
        id,
        status: nextStatus,
        actionPlan: nextActionPlan,
      }
    });
  } catch (error: any) {
    console.error("Error in NCR PUT API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
