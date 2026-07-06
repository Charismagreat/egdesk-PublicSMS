export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows } from '@/../egdesk-helpers';

/**
 * POST: 현재 빌드 중인 홈페이지 구성 정보를 기반으로 SEO Title 및 Meta Description을 AI가 추천 생성
 */
export async function POST(req: Request) {
  try {
    // 1. 최고관리자/사장 권한 세션 체크 가드
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' }, { status: 401 });
    }

    const sessionUser = decodeJwt(token);
    if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'PRESIDENT') {
      return NextResponse.json({ success: false, error: '권한이 없습니다. 최고관리자 계정으로 진행해 주세요.' }, { status: 403 });
    }

    const { config } = await req.json();
    if (!config) {
      return NextResponse.json({ success: false, error: '홈페이지 설정(config) 정보가 전달되지 않았습니다.' }, { status: 400 });
    }

    // 2. system_settings에서 Google API Key 및 모델 조회
    const keyRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = keyRes.rows && keyRes.rows.length > 0 ? keyRes.rows[0].value : null;

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const model = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-2.0-flash';

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: '구글 AI API Key가 등록되지 않았습니다. [시스템 설정] 또는 [AI 설정]에서 API Key를 먼저 저장해 주세요.' 
      }, { status: 400 });
    }

    // 3. 홈페이지 정보를 기반으로 프롬프트 생성
    const title = config.title || '';
    const subtitle = config.subtitle || '';
    const aboutText = config.aboutText || '';
    const mode = config.mode || 'store';
    
    // 대표 상품/메뉴 파싱
    let productsText = '';
    if (config.products && Array.isArray(config.products)) {
      productsText = config.products.map((p: any) => `- ${p.name || ''}: ${p.description || ''}`).join('\n');
    }

    const generatorPrompt = `
당신은 기업의 마케팅과 검색 엔진 노출 전략(SEO)에 최적화된 사이트 메타데이터를 정밀 작성하는 검색 최적화 전문 컨설턴트 AI입니다.

[요구사항]:
아래에 제공된 [홈페이지 비즈니스 구성 정보]를 깊이 분석하여, 네이버, 구글 등 주요 포털 사이트에 이 회사의 홈페이지가 검색되었을 때 클릭률을 가장 높이고 검색 노출이 효과적으로 이루어질 수 있는 최적의 '사이트 대표 제목(SEO Title)'과 '사이트 검색 정보 요약(Meta Description)'을 작성해 추천해 주세요.

[홈페이지 비즈니스 구성 정보]:
- 업체/사이트 명칭: ${title}
- 사이트 슬로건/부제목: ${subtitle}
- 사이트 소개 및 비즈니스 소개글: ${aboutText}
- 사이트 동작 모드: ${mode}
- 대표 상품 및 제공 메뉴 목록:
${productsText || '등록된 상품 없음'}

[가이드라인 및 작성 룰]:
1. 사이트 대표 제목 (SEO Title):
   - 브랜드명과 핵심 업종 키워드가 매끄럽게 조화된 30자 내외의 눈길을 끄는 매력적인 문구로 구성해 주세요.
   - 예시 형태: 브랜드명 - 슬로건 및 대표 서비스
2. 사이트 검색 정보 요약 (Meta Description):
   - 70자 ~ 110자 사이로, 업체의 고유 정체성과 강점, 대표 상품 정보를 함축하여 표현해 주세요.
   - 검색을 이용하는 대중이 매력을 느끼고 즉시 방문하고 싶도록 전문적이고 친절한 마케팅 톤앤매너로 한글로 작성해 주세요.
3. 응답 방식:
   - 마크다운 블록 기호(\`\`\`json 등) 및 설명 텍스트 없이, 오직 아래 지정된 JSON 형식으로만 최종 완성하여 반환해 주세요.

[반환 JSON 포맷]:
{
  "title": "생성된 추천 사이트 대표 제목",
  "description": "생성된 추천 검색 정보 요약 문구"
}
`;

    // 4. Gemini API 호출
    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "당신은 비즈니스 분석 및 포털 검색 최적화(SEO) 양식을 구조화된 JSON으로 응답하는 전문 마케팅 컨설턴트입니다." }] },
        contents: [{ role: 'user', parts: [{ text: generatorPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gemini API 호출 중 오류가 발생했습니다.');
    }

    const resData = await response.json();
    const resultText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // AI 토큰 사용량 로깅
    try {
      const prompt_tokens = resData.usageMetadata?.promptTokenCount || 0;
      const completion_tokens = resData.usageMetadata?.candidatesTokenCount || 0;
      const total_tokens = resData.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
      const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await insertRows('ai_token_usage_logs', [{
        id: logId,
        model: model || 'gemini-3.5-flash',
        purpose: 'WEBSITE_SEO_SUGGEST',
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
      parsedResult = JSON.parse(resultText);
    } catch (jsonErr) {
      console.error('Gemini 결과 JSON 파싱 실패:', resultText);
      return NextResponse.json({ 
        success: false, 
        error: 'AI 추천 메타데이터를 가공하지 못했습니다. 다시 시도해 주세요.' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      title: parsedResult.title || "",
      description: parsedResult.description || ""
    });

  } catch (error: any) {
    console.error('Suggest SEO API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
