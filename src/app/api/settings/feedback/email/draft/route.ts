export const dynamic = 'force-dynamic';

import { fetchGeminiWithFallback } from '../../../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { queryTable, insertRows } from '../../../../../../../egdesk-helpers';

/**
 * 최고관리자(SUPER_ADMIN) 권한 검증 공통 헬퍼
 */
async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    throw new Error('인증 세션이 만료되었습니다. 다시 로그인해주세요.');
  }

  const payload = decodeJwt(token);
  if (payload.role !== 'SUPER_ADMIN') {
    throw new Error('이메일 초안 생성 권한이 없습니다. 최고관리자 계정으로 로그인해주세요.');
  }
}

export async function POST(req: Request) {
  try {
    // 1. 최고관리자 권한 가드
    await verifySuperAdmin();

    const { feedbackIds } = await req.json();

    if (!feedbackIds || !Array.isArray(feedbackIds) || feedbackIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: '초안을 작성할 피드백 식별자 목록(feedbackIds)이 누락되었거나 유효하지 않습니다.'
      }, { status: 400 });
    }

    // 2. DB에서 피드백 내역 로드 및 필터링
    const dbResult = await queryTable('user_feedbacks', {
      orderBy: 'created_at',
      orderDirection: 'DESC'
    });

    const allFeedbacks = dbResult.rows || [];
    const targetFeedbacks = allFeedbacks.filter((item: any) => feedbackIds.includes(item.id));

    if (targetFeedbacks.length === 0) {
      return NextResponse.json({
        success: false,
        error: '초안을 작성할 피드백 데이터가 데이터베이스에 존재하지 않습니다.'
      }, { status: 404 });
    }

    // 3. system_settings에서 Google API Key 및 모델명 로드
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: '구글 AI API 키가 시스템에 등록되지 않았습니다. [시스템 설정 > AI 설정]에서 API 키를 먼저 입력해 주세요.'
      }, { status: 400 });
    }

    const modelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const selectedModel = modelRes.rows && modelRes.rows.length > 0 && modelRes.rows[0].value
      ? modelRes.rows[0].value
      : 'gemini-3.5-flash';

    // 4. Gemini AI에 줄 프롬프트 구성 (반드시 격식 있는 한국어 비즈니스 톤)
    const pageNameMap: Record<string, string> = {
      "/": "대시보드",
      "/sms": "무료 문자 발송 AI",
      "/message-logs": "발송 내역 조회",
      "/automation": "자동 발송 설정",
      "/customers": "고객 관리 AI",
      "/partners": "거래처 관리 AI",
      "/transactions": "거래 관리 AI",
      "/orders": "주문 관리 AI",
      "/payments": "결제 관리 AI",
      "/finance": "금융 정보 AI",
      "/coupons": "쿠폰 관리 AI",
      "/reservations": "예약 관리 AI",
      "/deliveries": "배송 관리 AI",
      "/products": "상품 관리 AI",
      "/estimates": "견적/발주/수주 AI",
      "/snaptasks": "AI 스냅태스크",
      "/inventory": "재고 관리 AI",
      "/expenses": "지출 관리 AI",
      "/price-tracker": "가격 추적 AI",
      "/website": "홈페이지 빌더 AI",
      "/recruitment": "채용 매니저 AI",
      "/instagram": "인스타그램 마케팅 AI",
      "/naver-blog": "N-BLOG 포스팅 AI",
      "/youtube-shorts": "YOUTUBE 쇼츠 AI",
      "/ai-briefing": "AI 브리핑",
      "/operators": "직원 관리",
      "/my-db": "MY DB",
      "/help": "Q&A 헬프센터",
      "/settings": "시스템 설정"
    };

    const typeLabelMap: Record<string, string> = {
      bug: '🐛 버그 제보',
      feature_request: '💡 기능 건의',
      complaint: '🔥 불만 사항',
      other: '기타'
    };

    const formattedFeedbacks = targetFeedbacks.map((f: any, idx: number) => {
      const pageName = pageNameMap[f.current_url] || f.current_url;
      const typeLabel = typeLabelMap[f.detected_type] || f.detected_type;
      return `${idx + 1}. [${typeLabel}] 접수 메뉴: ${pageName}\n- 제보 원문: ${f.user_prompt}\n- 접수 일시: ${f.created_at}`;
    }).join('\n\n');

    const prompt = `다음은 이지데스크 관리 시스템을 통해 접수된 사용자의 실시간 버그 및 건의사항 목록입니다. 
개발사 및 관계 부서에 사전 문의 및 조치를 정중하고 격식 있게 요청하는 메일 제목(subject)과 본문(body)을 작성해 주세요.

수신 이메일 주소는 CHACHOGREAT@GMAIL.COM 입니다.
메일은 정중하고 신뢰성 높은 한국어 비즈니스 이메일 서식 양식을 준수하여 명확하게 작성해 주세요. 

피드백 목록:
${formattedFeedbacks}

반드시 정확한 JSON 포맷으로만 답변해야 하며, JSON 데이터 외의 다른 텍스트나 마크다운 기호(\`\`\`json 등)는 절대 포함하지 마세요. 속성 값에 들어가는 줄바꿈 문자는 \\n으로 안전하게 이스케이프 해주세요.

JSON 스키마 형식:
{
  "subject": "[제목 들어갈 자리]",
  "body": "[본문 전체 내용 들어갈 자리 (줄바꿈은 \\n으로 표현)]"
}`;

    // 5. Gemini API 호출
    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json" // JSON 엄격 모드 활성화
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini AI 호출 실패: HTTP ${response.status}`);
    }

    const aiData = await response.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    // AI 토큰 사용량 로깅
    try {
      const prompt_tokens = aiData.usageMetadata?.promptTokenCount || 0;
      const completion_tokens = aiData.usageMetadata?.candidatesTokenCount || 0;
      const total_tokens = aiData.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
      const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const logTime = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      await insertRows('ai_token_usage_logs', [{
        id: logId,
        model: selectedModel || 'gemini-3.5-flash',
        purpose: 'FEEDBACK_EMAIL_DRAFT_GEN',
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: logTime
      }]);
    } catch (e: any) {
      console.error('AI 토큰 로깅 실패:', e.message);
    }

    if (!rawText) {
      throw new Error('Gemini AI로부터 올바른 응답을 받지 못했습니다.');
    }

    // 6. 응답 JSON 파싱
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText.trim());
    } catch (parseErr) {
      // 만약 JSON 파싱이 실패하면 텍스트에서 안전하게 파싱을 재시도
      console.warn('JSON 엄격 파싱 실패, 정규식으로 복구 시도:', rawText);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0].trim());
      } else {
        throw new Error('AI 응답이 올바른 JSON 규격에 부합하지 않습니다.');
      }
    }

    return NextResponse.json({
      success: true,
      subject: parsedResult.subject || '[이지데스크 피드백 사전 문의] 접수된 버그 및 건의사항 조치 요청',
      body: parsedResult.body || `안녕하세요. 접수된 피드백 목록을 전달해 드립니다.\n\n${formattedFeedbacks}`
    });

  } catch (error: any) {
    console.error('이메일 초안 작성 오류:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '이메일 초안을 생성하는 중 예외가 발생했습니다.'
    }, { status: 500 });
  }
}
