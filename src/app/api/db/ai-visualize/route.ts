import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows, updateRows } from '../../../../../egdesk-helpers';

// 4단계 로컬 보안 비식별화 가드레일 엔진 (PII Masking & Obfuscation)
function anonymizeData(rows: any[], schema: any[]) {
  if (!rows || rows.length === 0) return { stats: {}, sampleRows: [] };

  // 1. 컬럼 화이트리스트 추출 (비밀번호, 상세 메모, 이메일, 주소, 첨부파일 등 민감 필드 물리적 제외)
  const blacklist = [
    'password', 'password_hash', 'address', 'shipping_address', 'memo', 
    'attachment_url', 'business_license_url', 'email', 'phone', 'recipient_phone', 
    'manager_phone', 'partner_phone', 'customer_phone', 'ai_analysis', 'error_message'
  ];

  const safeCols = schema
    .map(col => col.name)
    .filter(name => !blacklist.includes(name.toLowerCase()));

  // 2. 수치형 컬럼 탐색 및 총괄 통계 요약 계산 (데이터 원형을 파괴하되 상대 크기 비교를 보존하기 위함)
  const numericCols = schema.filter(col => 
    ['integer', 'real', 'real', 'number'].includes(col.type?.toLowerCase()) || 
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

  // 수치형 기본 합산 메타데이터 추출
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

  // 3. 상위 12개 샘플 데이터 가공 및 PII 치환 (난수화 및 가상 식별자 교체)
  const samples = rows.slice(0, 12);
  const sampleRows = samples.map((row, index) => {
    const cleanRow: any = {};
    for (const col of safeCols) {
      let val = row[col];

      // 개인정보로 추정되는 텍스트 강제 난수화
      if (typeof val === 'string') {
        const colLower = col.toLowerCase();
        if (colLower.includes('name') || colLower.includes('customer') || colLower.includes('partner') || colLower.includes('operator')) {
          // 이름 비식별 마스킹 (예: 홍길동 -> 고객_A)
          val = `고객_${String.fromCharCode(65 + (index % 26))}`;
        }
      }

      // 수치 기밀 데이터는 전체 합계 대비 백분율(상대 점유율) 정보로 전격 원형 치환 (기밀 금액 보호) -> 최고관리자 실데이터 노출 요구로 주석처리
      // if (numericCols.includes(col) && typeof val === 'number') {
      //   const colSum = stats.numericColumns[col]?.sum || 1;
      //   // 소수점 둘째 자리까지의 점유 비율로 치환
      //   val = parseFloat(((val / colSum) * 100).toFixed(2));
      // }

      cleanRow[col] = val;
    }
    return cleanRow;
  });

  return {
    stats,
    sampleRows
  };
}

// 💡 자가 학습 스킬 헬퍼 함수
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

async function saveAccumulatedSkills(skills: string[]): Promise<void> {
  try {
    const existing = await queryTable('system_settings', { filters: { key: 'mydb_ai_skills' } });
    const jsonVal = JSON.stringify(skills);
    
    if (existing.rows && existing.rows.length > 0) {
      // updateRows 인터페이스: updateRows(tableName, updates, options)
      await updateRows('system_settings', { value: jsonVal }, { filters: { key: 'mydb_ai_skills' } });
    } else {
      // insertRows 인터페이스: insertRows(tableName, rows)
      await insertRows('system_settings', [{ key: 'mydb_ai_skills', value: jsonVal }]);
    }
  } catch (e: any) {
    console.error('⚠️ DB 누적 스킬 저장 실패:', e.message);
  }
}

export async function POST(req: Request) {
  try {
    // 🛡️ 1. 최고관리자 권한 가드 검증
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('auth_token');

    if (!tokenCookie || !tokenCookie.value) {
      return NextResponse.json({ error: '인증 토큰이 누락되었습니다.' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = decodeJwt(tokenCookie.value);
    } catch (e) {
      return NextResponse.json({ error: '인증 세션이 유효하지 않습니다.' }, { status: 401 });
    }

    const role = (decoded.role as string || '').toUpperCase();
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '본 API는 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    // 2. 요청 바디 데이터 수신
    const body = await req.json();
    const { rows, schema, tableName, displayName, userFeedback, currentSpec, attachedImage } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: '분석할 데이터 행이 존재하지 않습니다.' }, { status: 400 });
    }

    // 3. 로컬 보안 가드레일을 통과시켜 완전 비식별화된 초경량 데이터셋 확보
    const { stats, sampleRows } = anonymizeData(rows, schema || []);

    // 4. 로컬 및 DB에 등록된 Google AI API Key 검색 (우선순위: DB 설정값 최우선 ➔ 환경 변수 Fallback)
    let apiKey = '';

    try {
      const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
      if (settingsRes.rows && settingsRes.rows.length > 0) {
        apiKey = (settingsRes.rows[0].value || '').trim();
      }
    } catch (err: any) {
      console.error('API 키 로컬 DB 조회 실패:', err.message);
    }

    // 만약 DB 설정값에 API 키가 비어있다면, 로컬 .env.local 환경 변수를 Fallback으로 스캔
    if (!apiKey) {
      apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
    }

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Google AI API Key가 존재하지 않습니다. 시스템 설정에서 google_ai_api_key를 구성해 주세요.' 
      }, { status: 500 });
    }

    // 5. DB에서 최고관리자 누적 스킬 리스트 로드 및 프롬프트 인젝션 준비
    const currentSkills = await getAccumulatedSkills();
    const skillsPrompt = currentSkills.length > 0
      ? `\n[최고관리자의 고유 분석/시각화 스킬 및 선호 취향 (반드시 최우선 적용)]\n${currentSkills.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}\n`
      : '';

    // 6. Gemini 호출을 위한 프롬프트 가이드라인 설계 (일반 모드 vs 자연어 튜닝 모드 분기)
    let prompt = "";

    if (userFeedback && currentSpec) {
      prompt = `
당신은 세계 최고 수준의 비즈니스 데이터 분석가이자 시각화 차트 조정 전문가(BI Tuning Specialist)입니다.
기존에 생성되어 있는 시각화 차트 설계 JSON 스펙과 비즈니스 브리핑이 존재하지만, 최고관리자(사용자)로부터 다음과 같은 강력한 수정을 자연어로 요구받았습니다:

[최고관리자의 수정 요청사항]
"${userFeedback}"
${skillsPrompt}
[기존 차트 스펙 정보]
${JSON.stringify(currentSpec, null, 2)}

[데이터셋 정보 (실제 수치)]
${JSON.stringify(sampleRows, null, 2)}

[통계 정보 (실제 수치)]
${JSON.stringify(stats, null, 2)}

[중요 지침]
1. 위의 [최고관리자의 수정 요청사항]을 100% 최우선 반영하여, 기존의 시각화 차트 설계 JSON 스펙과 3줄 비즈니스 요약 브리핑(마크다운 형식)을 정밀 재튜닝하여 다시 작성해 주십시오.
2. **[차트 유형 변경 보수 가드라인 (절대 준수)]**: 사용자가 차트의 특정 부분 크롭 이미지(예: 도넛 차트 중앙 등 일부 영역 캡처 이미지)를 첨부하며 피드백을 전달한 경우, 이는 해당 차트 내의 국소적 텍스트나 레이블 문구 수정을 바라는 목적입니다. 최고관리자가 텍스트 프롬프트 상으로 차트 형태를 다른 종류로 완전히 변경하라고 명시적으로 텍스트 지시(예: '막대차트로 바꿔줘', '메트릭 카드로 변경해줘')를 내리지 않은 상태라면, 기존 차트의 유형("type" 즉 'line' | 'bar' | 'pie' | 'metric') 및 그에 종속된 축 컬럼 매핑 설정을 임의로 변경하지 말고 **100% 기존 설정을 그대로 보존 유지**하십시오. 캡처 이미지의 국소적 외형(일부만 오려내어 메트릭 카드처럼 보이는 부분적 썸네일 이미지)에 현혹되어 차트 종류 자체를 'metric' 등 다른 포맷으로 제멋대로 오해하여 파괴해서는 절대 안 됩니다.
3. 단위("unit")가 잘못되었다고 지적할 경우 적절한 단위(원, 건, 명, % 등)로 엄격히 고쳐주십시오. (예: "금액인데 백분율%가 붙었다"라고 지적 시, 단위를 "원"으로 반드시 교정)
4. 차트 유형("type")을 바꾸라고 할 경우 ("line" | "bar" | "pie" | "metric") 중 알맞은 유형으로 유연하게 변경하십시오.
5. 요약 브리핑("briefing") 작성 시 사용자의 수정 요구사항이 고스란히 반영된 요점을 세련되게 서술해 주십시오. (예: 원화 금액으로 올바르게 환원)
6. **[에이전틱 자가 학습 스킬화]**: 최고관리자의 이번 수정 요구사항("userFeedback") 및 피드백 내용에 비즈니스 시각화 룰이나 차트 포맷 지침(예: "금액일 땐 소숫점 없이 콤마만 줘", "비율은 소수점 2자리 기본") 등 향후 분석에 영구히 적용할 수 있는 **일반화된 고유 분석/시각화 스킬**이 담겨있다면, 이를 한 문장으로 압축/요약하여 "learnedSkill" 필드에 한국어로 반환해 주십시오. (이미 알고 있는 스킬이거나, 단순 일회성 코멘트라면 빈 문자열 ""을 반환)

반환해야 할 출력 데이터는 반드시 아래의 JSON 포맷 형식을 정확하게 지켜야 하며, 백틱(\`\`\`json)이나 다른 설명 텍스트 없이 순수한 JSON 텍스트 하나만 리턴하십시오.

{
  "recommendedChart": {
    "type": "line" | "bar" | "pie" | "metric",
    "xAxisColumn": "X축으로 사용할 컬럼명",
    "yAxisColumn": "Y축으로 사용할 컬럼명",
    "title": "시각화 차트의 제목",
    "unit": "수정에 부합하는 단위 (예: 원, 건, %, 등)",
    "centerLabel": "도넛(pie) 차트일 때 중앙 중심부에 표출할 핵심 요약 라벨명 (예: '전체 합계', '전체 누적', '총 비용' 등. 기본값은 '전체 누적')"
  },
  "briefing": "마크다운 형식의 3줄 요약 비즈니스 분석 브리핑 내용. 최고관리자의 수정 요구사항이 반영된 요점을 세련되게 서술해 주십시오.",
  "learnedSkill": "최고관리자의 이번 수정요청에서 추출한 일반화된 고유 규칙 요약 (예: '금액 데이터는 원화 기준으로 백분율 표시를 완전히 제거하고 정수형 천단위 콤마로만 포맷팅해야 함'). 배울 점이 없다면 빈 문자열."
}
`;
    } else {
      prompt = `
당신은 세계 최고 수준의 비즈니스 데이터 분석가(Business Intelligence Expert)입니다.
전달받은 [데이터셋 정보]를 깊이 있게 관찰한 후, 의사결정자를 wowed시킬 수 있는 시각화 차트 설계 JSON 스펙과 3줄 비즈니스 요약 브리핑(마크다운 형식)을 생성해 주세요.

[중요 지침]
1. 분석 대상 테이블명: "${tableName}" (${displayName || tableName})
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
    "unit": "수치에 매핑할 단위 (예: 원, 건, 명, % 등)",
    "centerLabel": "도넛(pie) 차트일 때 중앙 중심부에 표출할 핵심 요약 라벨명 (예: '전체 합계', '전체 누적', '총 비용' 등. 기본값은 '전체 누적')"
  },
  "briefing": "마크다운 형식의 3줄 요약 비즈니스 분석 브리핑 내용. 의사결정자가 한눈에 데이터의 통찰을 볼 수 있도록 정교하고 세련되게 작성해 주십시오."
}
`;
    }

    // 7. Gemini 3.5 Flash REST API 멀티모달(Vision) 탑재 호출
    // URL을 gemini-3.5-flash 모델명으로 교체
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    
    // Vision 이미지 분석 대응을 위한 parts 리스트 동적 패키징
    const parts: any[] = [{ text: prompt }];

    if (attachedImage) {
      const match = attachedImage.match(/^data:(image\/[a-zA-Z0-9.-]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      }
    }

    const response = await fetchGeminiWithFallback(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API 호출 에러: ${errText}`);
    }

    const geminiData = await response.json();
    
    // 💡 실시간 AI 호출 토큰 감사록 로깅 연동
    try {
      const promptTokens = geminiData.usageMetadata?.promptTokenCount || 0;
      const completionTokens = geminiData.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = geminiData.usageMetadata?.totalTokenCount || 0;
      
      if (totalTokens > 0) {
        await insertRows('ai_token_usage_logs', [{
          model: 'gemini-3.5-flash',
          purpose: 'easybot-response',
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens
        }]);
      }
    } catch (e: any) {
      console.error('⚠️ AI 토큰 소모량 감사 로깅 실패:', e.message);
    }

    const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!resultText) {
      throw new Error('Gemini 분석 응답이 비어있습니다.');
    }

    // 8. 결과 파싱 및 전송 (안전한 마크다운 백틱 제거 장치 장착)
    let cleanedText = resultText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    
    const cleanJson = JSON.parse(cleanedText);

    // 9. 에이전틱 자가 학습 규칙 반영 및 DB 영구 누적 저장
    let newSkillLearned = '';
    if (userFeedback && cleanJson.learnedSkill && typeof cleanJson.learnedSkill === 'string' && cleanJson.learnedSkill.trim() !== '') {
      const skillText = cleanJson.learnedSkill.trim();
      // 기존 스킬에 포함되어 있지 않은 새로운 내용인 경우에만 누적
      if (!currentSkills.some((s: string) => s.includes(skillText) || skillText.includes(s))) {
        const updatedSkills = [...currentSkills, skillText];
        await saveAccumulatedSkills(updatedSkills);
        newSkillLearned = skillText;
      }
    }

    // 클라이언트에 새로 학습된 스킬이 있다면 newSkillLearned 포함해서 전송
    return NextResponse.json({
      ...cleanJson,
      newSkillLearned: newSkillLearned || undefined
    });

  } catch (err: any) {
    console.error('❌ AI 시각화 분석 API 오류 발생:', err.message);
    return NextResponse.json({ error: `분석 실패: ${err.message}` }, { status: 500 });
  }
}
