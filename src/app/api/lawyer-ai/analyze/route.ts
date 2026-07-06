import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '../../../../../egdesk-helpers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { image, mimeType = 'image/png' } = await req.json();

    if (!image) {
      return NextResponse.json({ success: false, error: '분석할 소송 문서 이미지 데이터(Base64)가 누락되었습니다.' }, { status: 400 });
    }

    // 1. DB 또는 환경변수에서 구글 AI API 키 및 모델 조회
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    let apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    if (!apiKey) {
      apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY || null;
    }

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: '구글 AI API 키가 시스템에 등록되지 않았습니다. [설정 > AI 설정] 또는 DB의 system_settings 테이블에서 google_ai_api_key 값을 설정해 주세요.'
      }, { status: 400 });
    }

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-2.5-flash';

    // 본사 프로필 로드 (기본값 주식회사 원컨덕터트레이딩/지상현/2428700357)
    let myCompanyProfile = { companyName: '주식회사 원컨덕터트레이딩', representative: '지상현', businessNumber: '2428700357' };
    try {
      const myCompanySetting = await queryTable('system_settings', { filters: { key: 'my_company_profile' } });
      if (myCompanySetting.rows && myCompanySetting.rows.length > 0) {
        const parsed = JSON.parse(myCompanySetting.rows[0].value);
        if (parsed.companyName) myCompanyProfile.companyName = parsed.companyName;
        if (parsed.representative) myCompanyProfile.representative = parsed.representative;
        if (parsed.businessNumber) myCompanyProfile.businessNumber = parsed.businessNumber;
      }
    } catch (e) {
      console.error('본사 정보 설정 조회 실패:', e);
    }

    // Base64 순수 데이터 정제
    let base64Data = image;
    if (image.startsWith('data:')) {
      const parts = image.split(';base64,');
      base64Data = parts[1];
    }

    // 2. Gemini Multimodal API 프롬프트 작성
    const lawyerSystemPrompt = `당신은 대한민국 중소기업 CEO를 위한 전문 법률 자문 AI 변호사입니다.
제공된 문서는 소송 및 분쟁과 관련된 법원 송달장, 소장, 판결문, 조세/노무 관련 행정처분 문서, 혹은 기업간 계약서 등의 스캔본입니다.

★ 분석 기준이 되는 우리 회사 정보:
- 상호명: ${myCompanyProfile.companyName}
- 대표자: ${myCompanyProfile.representative}
- 사업자등록번호: ${myCompanyProfile.businessNumber}

제공된 문서 및 계약서에서 '우리 회사(${myCompanyProfile.companyName})'를 사건의 당사자(원고/피고, 또는 갑/을)로 설정하고, 철저히 우리 회사의 이익과 방어적 관점에서 불리한 독소 조항, 계약 상의 불이익, 대금 지급 조건, 법적 리스크, 그리고 행정적 대응 마감 기한(예: 답변서 제출 기한 YYYY-MM-DD 등)을 집중 식별하여 개인화된 가이드라인을 제공해 주세요.

 must 반드시 다음 구조화된 레이아웃을 엄격히 준수하여 한글로 마크다운 리포트를 작성해 주세요:

---
# ⚖️ 소송 문서 AI 정밀 분석 보고서

## 1. 📌 문서 기본 요약
* **문서 구분**: (예: 소장, 지급명령 송달장, 판결문, 행정처분서 등)
* **사건번호**: (예: 2026차단12345 등 문서 내 사건번호 기재값 추출, 식별 불가 시 '미식별')
* **당사자 관계**: 
  - **원고/채권자**: (이름/회사명)
  - **피고/채무자**: (이름/회사명)
* **청구 금액 / 주문 내용**: (청구 금액 및 주요 배상금 명시)

## 2. 🔍 핵심 쟁점 및 법적 진단
* **주요 청구 원인**: (상대방이 소송을 제기한 실질적인 이유와 핵심 논점 요약)
* **법적 리스크 진단**: (우리 기업이 불리하거나 유리한 쟁점 분석, 법 조문 기반 검토)

## 3. ⚠️ CEO 최우선 행동 지침 (기한 필수 포함)
* **법적 대응 마감일**: 
  > [!WARNING]
  > **제출 마감 기한**: **YYYY-MM-DD** 까지 (예: 소장 부본 송달일로부터 30일 이내인 YYYY-MM-DD 기입. 날짜 정보가 명확하지 않다면 "송달일로부터 30일 이내"와 같이 명시)
* **권장 즉시 행동 조치**:
  1. (예: 30일 이내에 답변서 미제출 시 무변론 패소 처리가 되므로 즉각 답변서 초안 작성 개시)
  2. (예: 계약서 사본 및 이메일 수발신 이력 등 입증 자료 실시간 취합)
  3. (예: 청구 금액이 소액(3천만원 이하)이므로 소액사건 심판법 적용 여부 검토)

## 4. 💡 추천 대응 로드맵 및 필요한 서류
* **대응 시나리오**:
  - (합의, 조정, 적극 변론 등 CEO가 취해야 할 단계별 가이드라인)
* **필요 입증 서류**:
  - [ ] (계약서, 세금계산서, 이메일/카카오톡 대화 캡처 등 구체적 지시)
---

**답변 작성 시 주의사항:**
- 철저하게 한국어로만 작성해 주세요. (gemini_added_memories 규칙 준수)
- 마크다운 및 볼드체, 인용구(\`>\`), 경고박스(\`> [!WARNING]\`) 등을 다채롭게 활용하여 가독성이 극대화된 고급스러운 구조로 보고서를 구성해 주세요.
- 보고서 본문 하단에 이지봇이 감지하여 태스크(일정)를 기입할 수 있도록 다음 메타데이터 형식의 태그를 **단독 라인**으로 반드시 기입해 주세요:
  \`[METADATA:CALENDAR_EVENT:마감일(YYYY-MM-DD 또는 없으면 'null'):사건번호:문서유형]\`
  (예: \`[METADATA:CALENDAR_EVENT:2026-07-15:2026가소98765:소장 부본에 대한 답변서 제출 기한]\`)
`;

    // 3. Gemini REST API 호출
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
    const response = await fetchGeminiWithFallback(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: lawyerSystemPrompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API 호출 실패: HTTP ${response.status}`);
    }

    const aiData = await response.json();
    const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error('Gemini 분석 응답이 비어있습니다.');
    }

    // 4. API 토큰 감사로그 기록 적재
    try {
      const u = aiData.usageMetadata || {};
      const promptTokens = u.promptTokenCount || 0;
      const completionTokens = u.candidatesTokenCount || 0;
      const totalTokens = u.totalTokenCount || 0;

      if (totalTokens > 0) {
        await insertRows('ai_token_usage_logs', [{
          id: `TK-LA-${Date.now()}`,
          model: selectedModel,
          purpose: 'lawyer-ai-document-analyze',
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          created_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
        }]);
      }
    } catch (logErr) {
      console.error('법률 상담 AI 분석 감사 로그 적재 실패:', logErr);
    }

    return NextResponse.json({
      success: true,
      report: resultText
    });

  } catch (error: any) {
    console.error('Lawyer AI Analyze API Error:', error);
    return NextResponse.json({ success: false, error: error.message || '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}
