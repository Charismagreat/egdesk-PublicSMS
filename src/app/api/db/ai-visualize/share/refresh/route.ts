import { fetchGeminiWithFallback } from '../../../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, updateRows, executeSQL, getTableSchema, insertRows } from '../../../../../../../egdesk-helpers';

export const dynamic = 'force-dynamic';

// 4단계 로컬 보안 비식별화 가드레일 엔진 (PII Masking & Obfuscation) - 동기화 유지
function anonymizeData(rows: any[], schema: any[]) {
  if (!rows || rows.length === 0) return { stats: {}, sampleRows: [] };

  const blacklist = [
    'password', 'password_hash', 'address', 'shipping_address', 'memo', 
    'attachment_url', 'business_license_url', 'email', 'phone', 'recipient_phone', 
    'manager_phone', 'partner_phone', 'customer_phone', 'ai_analysis', 'error_message'
  ];

  const safeCols = schema
    .map(col => col.name)
    .filter(name => !blacklist.includes(name.toLowerCase()));

  const numericCols = schema.filter(col => 
    ['integer', 'real', 'number'].includes(col.type?.toLowerCase()) || 
    col.name.toLowerCase().includes('amount') || 
    col.name.toLowerCase().includes('price') || 
    col.name.toLowerCase().includes('balance') || 
    col.name.toLowerCase().includes('stock') ||
    col.name.toLowerCase().includes('quantity')
  ).map(col => col.name);

  const stats: any = {
    totalRows: rows.length,
    numericColumns: {}
  };

  for (const colName of numericCols) {
    let sum = 0;
    let max = -Infinity;
    let min = Infinity;
    let count = 0;

    for (const r of rows) {
      const val = parseFloat(r[colName]);
      if (!isNaN(val)) {
        sum += val;
        if (val > max) max = val;
        if (val < min) min = val;
        count++;
      }
    }

    if (count > 0) {
      stats.numericColumns[colName] = {
        sum,
        avg: Math.round(sum / count),
        max,
        min
      };
    }
  }

  const samples = rows.slice(0, 12);
  const sampleRows = samples.map((row, index) => {
    const cleanRow: any = {};
    for (const col of safeCols) {
      let val = row[col];

      if (typeof val === 'string') {
        const colLower = col.toLowerCase();
        if (colLower.includes('name') || colLower.includes('customer') || colLower.includes('partner') || colLower.includes('operator')) {
          val = `고객_${String.fromCharCode(65 + (index % 26))}`;
        }
      }

      // 수치 기밀 데이터는 전체 합계 대비 백분율(상대 점유율) 정보로 전격 원형 치환 (기밀 금액 보호) -> 최고관리자 실데이터 노출 요구로 주석처리
      // if (numericCols.includes(col) && typeof val === 'number') {
      //   const colSum = stats.numericColumns[col]?.sum || 1;
      //   val = parseFloat(((val / colSum) * 100).toFixed(2));
      // }

      cleanRow[col] = val;
    }
    return cleanRow;
  });

  return { stats, sampleRows };
}

// 📂 [GET/POST] 배치 자동 갱신 파이프라인 기동
export async function GET(req: Request) {
  return handleRefresh(req);
}

export async function POST(req: Request) {
  return handleRefresh(req);
}

// 💡 자가 학습 스킬 헬퍼 함수 (동기화)
async function getAccumulatedSkills(): Promise<string[]> {
  try {
    const res = await queryTable('system_settings', { filters: { key: 'mydb_ai_skills' } });
    if (res.rows && res.rows.length > 0) {
      return JSON.parse(res.rows[0].value || '[]');
    }
  } catch (e: any) {
    console.error('⚠️ DB 누적 스킬 로드 실패:', e.message);
  }
  return [];
}

async function handleRefresh(req: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);
  const force = searchParams.get('force') === 'true';
  const token = searchParams.get('token');

  // 🛡️ 1. 내부 보안 가드 검증 (Unauthorized 외부 무작위 공격 방어)
  // 배치 스케줄러 호출이거나 로컬 호스트 호출일 때 통과
  const internalSecret = process.env.NEXT_PUBLIC_EGDESK_API_KEY || 'egdesk-internal-secret-token';
  const isLocal = req.headers.get('host')?.includes('localhost') || req.headers.get('host')?.includes('127.0.0.1');
  
  if (!isLocal && token !== internalSecret) {
    return NextResponse.json({ success: false, error: '접근 권한이 유효하지 않습니다.' }, { status: 401 });
  }

  try {
    // 2. 활성화된 스케줄 대시보드 조회
    const dashboardsRes = await queryTable('shared_dashboards', { filters: { is_active: '1' } });
    const list = dashboardsRes.rows || [];
    
    if (list.length === 0) {
      return NextResponse.json({ success: true, updatedCount: 0, message: '활성화된 자동 갱신 대상 공유 대시보드가 없습니다.' });
    }

    const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // KST
    const nowStr = now.toISOString().replace('T', ' ').slice(0, 19);

    let updatedCount = 0;
    const details = [];

    // 3. 루프를 돌며 주기 경과 대상 선별 및 갱신 프로세스 관통
    for (const board of list) {
      const { share_id, title, sql_query, table_name, display_name, refresh_interval, last_refreshed_at } = board;

      if (!refresh_interval || refresh_interval === 'NONE') {
        continue;
      }

      // 주기 계산 (이전 갱신 시각과 현재 시각의 차이)
      let shouldRefresh = force;
      
      if (!shouldRefresh && last_refreshed_at) {
        const lastDate = new Date(last_refreshed_at.replace(' ', 'T') + '+09:00');
        const diffMs = now.getTime() - lastDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (refresh_interval === 'HOURLY' && diffHours >= 0.95) {
          shouldRefresh = true;
        } else if (refresh_interval === 'DAILY' && diffHours >= 23.5) {
          shouldRefresh = true;
        } else if (refresh_interval === 'WEEKLY' && diffHours >= 166.0) {
          shouldRefresh = true;
        }
      } else if (!last_refreshed_at) {
        shouldRefresh = true;
      }

      if (!shouldRefresh) {
        continue;
      }

      // 4. 데이터 갱신 작업 착수
      try {
        console.log(`[배치 갱신] 대시보드 "${title}" (${share_id}) 자동 갱신 시작`);

        // A. 최신 SQL 쿼리 재실행
        const queryRes = await executeSQL(sql_query);
        const rows = queryRes.rows || [];

        if (rows.length === 0) {
          console.warn(`[배치 갱신] "${title}" 재조회 결과가 비어있어 스킵합니다.`);
          continue;
        }

        // B. 스키마 명세 획득
        let schema: any[] = [];
        if (table_name) {
          try {
            const schemaRes = await getTableSchema(table_name);
            schema = schemaRes.columns || schemaRes.schema || [];
          } catch (e: any) {
            console.error(`테이블 [${table_name}] 스키마 조회 실패:`, e.message);
          }
        }

        // C. 비식별화 가드레일 통과
        const { stats, sampleRows } = anonymizeData(rows, schema);

        // D. Google AI API Key 획득
        let apiKey = '';
        try {
          const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
          if (settingsRes.rows && settingsRes.rows.length > 0) {
            apiKey = (settingsRes.rows[0].value || '').trim();
          }
        } catch (err: any) {
          console.error('배치 중 API 키 조회 실패:', err.message);
        }

        if (!apiKey) {
          apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
        }

        if (!apiKey) {
          console.error(`[배치 갱신] "${title}" API 키가 존재하지 않아 갱신을 중단합니다.`);
          continue;
        }

        // E-1. DB에서 최고관리자 누적 스킬 리스트 로드 및 프롬프트 인젝션
        const currentSkills = await getAccumulatedSkills();
        const skillsPrompt = currentSkills.length > 0
          ? `\n[최고관리자의 고유 분석/시각화 스킬 및 선호 취향 (반드시 최우선 적용)]\n${currentSkills.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}\n`
          : '';

        // E-2. AI 호출 프롬프트 조립
        const prompt = `
당신은 세계 최고 수준의 비즈니스 데이터 분석가(Business Intelligence Expert)입니다.
전달받은 [데이터셋 정보]를 깊이 있게 관찰한 후, 의사결정자를 wowed시킬 수 있는 시각화 차트 설계 JSON 스펙과 3줄 비즈니스 요약 브리핑(마크다운 형식)을 생성해 주세요.

[중요 지침]
1. 분석 대상 테이블명: "${table_name}" (${display_name || table_name})
2. 데이터셋의 수치와 통계 정보는 실제 원본 값(금액 등)입니다. 요약 브리핑 시 실제 수치 가치를 근거로 세련되게 서술해 주십시오. (예: "소모품비 지출액이 총 320,000원으로 가장 큰 비중을 차지합니다")
3. 수치 컬럼의 전체 물리적 누적 합계 등은 [통계 정보]를 근거로 서술해 주십시오.
4. 차트 종류("line" | "bar" | "pie" | "metric")를 하나 추천해 주세요.
   - 시간 축의 변화 추이가 중요하고 연속적일 시: "line"
   - 부서별, 카테고리별 등 범주형 데이터 비교에 적합할 시: "bar"
   - 결제 수단, 부서 점유율 등 지분 비중을 한눈에 보고 싶을 시: "pie"
   - 쿼리 결과가 단일 합계값 등 단일 행일 시: "metric"
${skillsPrompt}
[데이터셋 정보]
${JSON.stringify(sampleRows, null, 2)}

[통계 정보]
${JSON.stringify(stats, null, 2)}

반환해야 할 출력 데이터는 반드시 아래의 JSON 포맷 형식을 정확하게 지켜야 하며, 백틱(\`\`\`json)이나 다른 설명 텍스트 없이 순수한 JSON 텍스트 하나만 리턴하십시오.

{
  "recommendedChart": {
    "type": "line" | "bar" | "pie" | "metric",
    "xAxisColumn": "X축으로 사용할 컬럼명 (예: category 또는 expense_date)",
    "yAxisColumn": "Y축으로 사용할 컬럼명 (수치 데이터 컬럼명, 예: amount)",
    "title": "시각화 차트의 직관적인 한글 제목",
    "unit": "수치에 매핑할 단위 (예: 원, 건, 명, % 등)"
  },
  "briefing": "마크다운 형식의 3줄 요약 비즈니스 분석 브리핑 내용. 의사결정자가 한눈에 데이터의 통찰을 볼 수 있도록 정교하고 세련되게 작성해 주십시오."
}
`;

        // F. Gemini REST API fetch 타격 (gemini-3.5-flash 모델 적용)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
        const response = await fetchGeminiWithFallback(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API 에러: ${errText}`);
        }

        const geminiData = await response.json();
        const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // AI 토큰 사용량 로깅
        try {
          const prompt_tokens = geminiData.usageMetadata?.promptTokenCount || 0;
          const completion_tokens = geminiData.usageMetadata?.candidatesTokenCount || 0;
          const total_tokens = geminiData.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
          const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
          await insertRows('ai_token_usage_logs', [{
            id: logId,
            model: 'gemini-3.5-flash',
            purpose: 'AI_VISUALIZE_REFRESH',
            prompt_tokens,
            completion_tokens,
            total_tokens,
            created_at: logTime
          }]);
        } catch (e: any) {
          console.error('AI 토큰 로깅 실패:', e.message);
        }

        if (!resultText) {
          throw new Error('Gemini 응답 텍스트가 비어있습니다.');
        }

        let cleanedText = resultText.trim();
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
        }
        const cleanJson = JSON.parse(cleanedText);

        // G. 대시보드 저장 데이터 업데이트 (sampleRows가 누락 유실되지 않도록 머지하여 저장)
        const enrichedSpec = {
          ...cleanJson.recommendedChart,
          sampleRows
        };

        await updateRows('shared_dashboards', {
          chart_spec_json: JSON.stringify(enrichedSpec),
          briefing_markdown: cleanJson.briefing,
          last_refreshed_at: nowStr
        }, { filters: { share_id } });

        updatedCount++;
        details.push({ share_id, title, status: 'SUCCESS' });
        console.log(`[배치 갱신 성공] 대시보드 "${title}" (${share_id}) 최신 데이터로 업데이트 완료!`);

      } catch (err: any) {
        console.error(`[배치 갱신 에러] 대시보드 "${title}" (${share_id}) 갱신 실패:`, err.message);
        details.push({ share_id, title, status: 'FAILED', error: err.message });
      }
    }

    const duration = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      updatedCount,
      durationMs: duration,
      details,
      message: `${updatedCount}개의 공유 대시보드가 성공적으로 갱신되었습니다.`
    });

  } catch (globalErr: any) {
    console.error('배치 파이프라인 기동 중 치명적 오류:', globalErr.message);
    return NextResponse.json({ success: false, error: globalErr.message }, { status: 500 });
  }
}
