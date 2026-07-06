export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from "next/server";
import { queryTable, updateRows, deleteRows, insertRows } from "../../../../../egdesk-helpers";

/**
 * GET: SPC 관리도 차트 설정 및 Cpk 분석 데이터 조회 (Gemini AI 실시간 예측 및 DB 캐시 연동)
 */
export async function GET() {
  try {
    // 1. system_settings에서 API 키 조회
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    let apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY || '';
    }

    // 2. DB에서 SPC 관리도 기본 설정 조회 (ID: SPC-CFG 단일 행)
    const configRes = await queryTable("crm_quality_spc_config", { filters: { id: "SPC-CFG" } });
    const dbConfig = configRes.rows && configRes.rows.length > 0 ? configRes.rows[0] : null;

    const spcConfig = {
      targetValue: dbConfig ? Number(dbConfig.targetValue || 0) : 210.0,
      ucl: dbConfig ? Number(dbConfig.ucl || 0) : 215.0,
      lcl: dbConfig ? Number(dbConfig.lcl || 0) : 205.0,
      usl: dbConfig ? Number(dbConfig.usl || 0) : 218.0,
      lsl: dbConfig ? Number(dbConfig.lsl || 0) : 202.0
    };

    // 3. DB에서 계측 샘플 리스트 조회
    const samplesRes = await queryTable("crm_quality_spc_samples", {});
    const samples = (samplesRes.rows || []).map((s: any) => ({
      batch: s.batch,
      value: Number(s.value || 0),
      cpk: Number(s.cpk || 0),
      timestamp: s.timestamp
    }));
    // 타임라인 정렬
    samples.sort((a: any, b: any) => a.timestamp.localeCompare(b.timestamp));

    // 4. API Key가 존재하고 샘플 데이터가 있는 경우 Gemini AI를 호출하여 실시간 예측 수행
    if (apiKey && samples.length > 0) {
      const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
      const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
        ? modelRes.rows[0].value
        : 'gemini-2.5-flash';

      const recentSamples = samples.slice(-20);
      const lastSample = samples[samples.length - 1];

      const systemPrompt = `
You are a Quality Control Predictive AI in a Smart Factory.
Based on the provided SPC (Statistical Process Control) recent samples and configuration (Target, LSL, USL, LCL, UCL), predict the values for the next 5 batches.
For each of the next 5 batches, calculate:
1. "batch": Next batch name (e.g., if the last batch is "B010", the next is "B011", then "B012", etc. Generate strictly sequential batch names)
2. "value": Expected measured value (REAL)
3. "cpk": Expected Process Capability Index (REAL, Cpk)
4. "timestamp": Timestamp of the prediction (e.g. 5 minutes or 1 hour interval after the last timestamp, in "YYYY-MM-DD HH:mm:ss" format)
5. "risk": Quality deviation risk percentage (0 to 100)

Also, determine:
1. "cpkStatus": Current status of Cpk ("SAFE" (Cpk >= 1.33), "WARNING" (1.0 <= Cpk < 1.33), "CRITICAL" (Cpk < 1.0))
2. "futureRiskProbability": Overall probability (%) of process quality dropping below LSL or exceeding USL within the next 5 batches (0 to 100).

Provided Configuration:
Target Value: ${spcConfig.targetValue}
LSL (Lower Specification Limit): ${spcConfig.lsl}
USL (Upper Specification Limit): ${spcConfig.usl}
LCL (Lower Control Limit): ${spcConfig.lcl}
UCL (Upper Control Limit): ${spcConfig.ucl}

Respond strictly in JSON format:
{
  "predictions": [
    { "batch": "...", "value": 210.5, "cpk": 1.18, "timestamp": "YYYY-MM-DD HH:mm:ss", "risk": 45 },
    ... (total 5 predictions)
  ],
  "cpkStatus": "SAFE" | "WARNING" | "CRITICAL",
  "futureRiskProbability": 80
}
Do not include any markdown format tags like \`\`\`json. Just raw JSON text.
`;

      const userContent = `Recent samples:
${JSON.stringify(recentSamples, null, 2)}
Last sample: ${JSON.stringify(lastSample)}`;

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
          const aiData = await aiResponse.ok ? await aiResponse.json() : null;
          if (aiData) {
            const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            const parsed = JSON.parse(aiText.trim());

            if (parsed.predictions && parsed.predictions.length === 5) {
              // 기존 predictions 조회 및 삭제
              const existingPredictions = await queryTable('crm_quality_spc_predictions', {});
              if (existingPredictions.rows && existingPredictions.rows.length > 0) {
                const ids = existingPredictions.rows.map((p: any) => p.id);
                await deleteRows('crm_quality_spc_predictions', { ids });
              }

              // 새로운 predictions 추가
              const rowsToInsert = parsed.predictions.map((p: any, idx: number) => ({
                id: Math.floor(Date.now() / 1000) + idx,
                batch: p.batch,
                value: Number(p.value),
                cpk: Number(p.cpk),
                timestamp: p.timestamp,
                risk: Number(p.risk)
              }));
              await insertRows('crm_quality_spc_predictions', rowsToInsert);

              // Cpk Config 캐시 갱신
              const nextCpk = Number(parsed.predictions[0].cpk || 1.15);
              await updateRows('crm_quality_spc_config', {
                currentCpk: nextCpk,
                cpkStatus: parsed.cpkStatus || 'WARNING',
                futureRiskProbability: Number(parsed.futureRiskProbability || 0)
              }, { filters: { id: 'SPC-CFG' } });

              // 토큰 로그 로깅
              if (aiData.usageMetadata) {
                const u = aiData.usageMetadata;
                await insertRows('ai_token_usage_logs', [{
                  id: `TKN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  model: selectedModel,
                  purpose: 'quality-spc-prediction',
                  prompt_tokens: u.promptTokenCount || 0,
                  completion_tokens: u.candidatesTokenCount || 0,
                  total_tokens: u.totalTokenCount || 0,
                  created_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
                }]);
              }
            }
          }
        }
      } catch (aiErr) {
        console.error('Failed to run AI SPC prediction, defaulting to cached database values:', aiErr);
      }
    }

    // AI 업데이트가 반영되었을 수 있으므로 DBConfig 상태를 재조회하거나 갱신된 데이터를 쿼리합니다.
    const updatedConfigRes = await queryTable("crm_quality_spc_config", { filters: { id: "SPC-CFG" } });
    const updatedDbConfig = updatedConfigRes.rows && updatedConfigRes.rows.length > 0 ? updatedConfigRes.rows[0] : null;

    const currentCpk = updatedDbConfig ? Number(updatedDbConfig.currentCpk || 0) : 1.15;
    const cpkStatus = updatedDbConfig ? updatedDbConfig.cpkStatus : "WARNING";
    const futureRiskProbability = updatedDbConfig ? Number(updatedDbConfig.futureRiskProbability || 0) : 89;

    // DB에서 예측 Cpk 리스트 재조회
    const predictionsRes = await queryTable("crm_quality_spc_predictions", {});
    const predictions = (predictionsRes.rows || []).map((p: any) => ({
      batch: p.batch,
      value: Number(p.value || 0),
      cpk: Number(p.cpk || 0),
      timestamp: p.timestamp,
      risk: Number(p.risk || 0)
    }));
    predictions.sort((a: any, b: any) => a.timestamp.localeCompare(b.timestamp));

    // DB에서 중요도 리스트 조회
    const featuresRes = await queryTable("crm_quality_spc_features", {});
    const featureImportance = (featuresRes.rows || []).map((f: any) => ({
      name: f.name,
      value: Number(f.value || 0),
      color: f.color
    }));
    featureImportance.sort((a: any, b: any) => b.value - a.value);

    return NextResponse.json({
      success: true,
      spcConfig,
      currentCpk,
      cpkStatus,
      futureRiskProbability,
      samples,
      predictions,
      featureImportance
    });
  } catch (error: any) {
    console.error("Error in SPC API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
