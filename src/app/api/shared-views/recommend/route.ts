import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';

export const dynamic = 'force-dynamic';

// 🔑 최고관리자 권한 검증 헬퍼
async function verifySuperAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return false;
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    return role === 'SUPER_ADMIN';
  } catch (e) {
    return false;
  }
}

// 📂 [POST] AI 기반 공유 뷰 설정 지능형 추천 API (Gemini 3.5 Flash)
export async function POST(request: Request) {
  try {
    const isAuthorized = await verifySuperAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 전용 기능입니다.' }, { status: 403 });
    }

    const { tableName, tableSchema } = await request.json();

    if (!tableName || !tableSchema || !Array.isArray(tableSchema)) {
      return NextResponse.json({ success: false, error: '분석에 필요한 테이블명 및 스키마 정보가 누락되었습니다.' }, { status: 400 });
    }

    // 1. Google AI API 키 획득
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    let apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;
    
    if (!apiKey) {
      apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || null;
    }

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: '⚠️ 구글 AI API 키가 설정되지 않았습니다. [시스템 설정] 대시보드에서 등록하시거나, 서버 환경 변수를 활성화해 주십시오.' 
      }, { status: 400 });
    }

    // 2. Gemini 전용 지침 (System Instruction) 설계
    const systemPrompt = `
너는 최고의 데이터베이스 보안 전문가이자 비즈니스 레이아웃 디자이너야.
사용자가 요청한 SQLite3 테이블 정보를 기반으로 외부 임직원 및 사용자들이 안전하고 효율적으로 조회할 수 있도록 최적의 "데이터 공유 뷰" 설정을 AI 지능형 엔진으로서 정밀히 추천해주어야 해.

[너의 의무]
제공받은 테이블의 영문 물리명과 스키마 정보(각 컬럼의 이름, 데이터 타입, 기본키 여부 등)를 분석하여 다음과 같은 JSON 객체를 한글 비즈니스 상황에 딱 들어맞도록 추천해줘:

1. friendlyTableName: 영문 테이블 이름(예: crm_expenses, crm_operators)을 일반 사용자들이 한눈에 직관적으로 이해할 수 있는 세련되고 명확한 한글 비즈니스 타이틀(예: "지출 장부 관리", "운영자 권한 대장")로 추천해줘.
2. columnMappings: 각 컬럼에 대한 상세한 매핑 설정 배열. 다음 요소들을 완벽히 세팅해서 배열로 뽑아줘:
   - physical: 컬럼의 영문 물리명 (제공된 컬럼명 그대로 보존)
   - friendly: 컬럼의 의미를 정확하게 한글로 변역한 직관적인 비즈니스 표시명 (예: "title" -> "지출 내역", "amount" -> "금액", "phone" -> "연락처", "created_at" -> "등록 일시")
   - visible: 개인정보 및 기업 기밀 누출을 막기 위한 노출 여부 (boolean)
     * [🚨 보안 가이드라인]: 비밀번호(password, pwd), 보안 키(secret, key), 인증 토큰(token), 물리 ID 및 소프트 삭제 정보(deleted_at, deleted_by)는 중대 보안 위협이 되므로 무조건 false 처리해야 해.
     * 그 외 일반적 비즈니스 데이터(이름, 날짜, 적요, 내역, 결제 방식 등)는 투명하게 공개되도록 true 처리해.
   - sortDirection: 컬럼 기준 정렬 방향 ('ASC' | 'DESC' | 'NONE'). 일반적으로 등록일시(created_at, date)나 일련번호(id) 등은 최신순 정렬('DESC')을 추천하고, 그 외는 기본적으로 'NONE'을 줘.
   - sortOrder: 멀티 정렬 우선순위 정수 (0은 정렬 해제, 1~5는 우선순위). 최신 정보를 우선 보여줘야 하므로 등록일시(created_at)나 기본키(id) 등 가장 직관적인 정렬 기준 컬럼에 '1'을 주고 나머지는 '0'을 줘.

[출력 제약 조건]
반드시 아래의 출력 예시처럼 완전하고 깔끔하게 파싱될 수 있는 JSON 포맷으로만 응답해야 해. 주석이나 설명글, 마크다운 기호(\`\`\`) 등은 절대 덧붙이지 말고 오직 유효한 JSON 문자열만 출력해.

[출력 형식 예시]
{
  "friendlyTableName": "지출 장부 관리",
  "columnMappings": [
    { "physical": "id", "friendly": "일련번호", "visible": true, "sortDirection": "DESC", "sortOrder": 1 },
    { "physical": "title", "friendly": "지출 내역", "visible": true, "sortDirection": "NONE", "sortOrder": 0 },
    { "physical": "password", "friendly": "비밀번호", "visible": false, "sortDirection": "NONE", "sortOrder": 0 }
  ]
}
`;

    // 3. API 전송용 프롬프트 생성
    const userPrompt = `
분석할 테이블 이름: "${tableName}"
테이블 스키마 정보: ${JSON.stringify(tableSchema)}
    `;

    // 4. Gemini API 호출
    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          { parts: [{ text: userPrompt }] }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1 // 정확도 향상을 위해 온도 조절
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Google AI API 통신 에러가 발생했습니다.');
    }

    const resData = await response.json();
    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // AI 토큰 사용량 로깅
    try {
      const prompt_tokens = resData.usageMetadata?.promptTokenCount || 0;
      const completion_tokens = resData.usageMetadata?.candidatesTokenCount || 0;
      const total_tokens = resData.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
      const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await insertRows('ai_token_usage_logs', [{
        id: logId,
        model: 'gemini-3.5-flash',
        purpose: 'SHARED_VIEW_RECOMMEND',
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: logTime
      }]);
    } catch (e: any) {
      console.error('AI 토큰 로깅 실패:', e.message);
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText.trim());
    } catch (e) {
      throw new Error("AI 추천 데이터를 JSON 포맷으로 파싱할 수 없습니다.");
    }

    return NextResponse.json({
      success: true,
      friendlyTableName: parsedResult.friendlyTableName,
      columnMappings: parsedResult.columnMappings
    });

  } catch (error: any) {
    console.error('AI View Recommend Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
