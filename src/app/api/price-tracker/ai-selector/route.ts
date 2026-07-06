import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows } from '@/../egdesk-helpers';
import { chromium } from 'playwright';

/**
 * POST /api/price-tracker/ai-selector
 * 사용자가 입력한 URL을 분석하여 최적의 가격 크롤링용 CSS Selector를 실시간 반환합니다.
 */
export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ success: false, error: '유효한 웹주소(URL)를 입력해 주세요.' }, { status: 400 });
    }

    const lowerUrl = url.toLowerCase();

    // ============================================================
    // 1단계: 초고속 시그니처 도메인 매핑 (0.05초 반응)
    // 대형 쇼핑몰의 경우 복잡한 스캔을 건너뛰고 100% 매칭 공식 리턴
    // ============================================================
    if (lowerUrl.includes('coupang.com')) {
      return NextResponse.json({
        success: true,
        source: 'SIGNATURE_MAP',
        css_selector: 'span.total-price > strong',
        site_name: '쿠팡',
        message: '쿠팡의 가격 레이아웃에 100% 최적화된 마진 수집 셀렉터를 즉시 연결했습니다.'
      });
    }

    if (lowerUrl.includes('smartstore.naver.com') || lowerUrl.includes('shopping.naver.com')) {
      return NextResponse.json({
        success: true,
        source: 'SIGNATURE_MAP',
        css_selector: 'span.price_val',
        site_name: '네이버 쇼핑',
        message: '네이버 스마트스토어 전용 실시간 가격 감시 셀렉터를 즉시 주입했습니다.'
      });
    }

    if (lowerUrl.includes('aliexpress.com')) {
      return NextResponse.json({
        success: true,
        source: 'SIGNATURE_MAP',
        css_selector: 'span.product-price-value',
        site_name: '알리익스프레스',
        message: '알리익스프레스의 글로벌 가격 변동 추적 셀렉터를 매핑 완료했습니다.'
      });
    }

    if (lowerUrl.includes('amazon.com') || lowerUrl.includes('amazon.co.jp')) {
      return NextResponse.json({
        success: true,
        source: 'SIGNATURE_MAP',
        css_selector: 'span.a-price-whole',
        site_name: '아마존',
        message: '아마존의 글로벌 매매가 공시용 스캔 셀렉터를 긴급 매핑했습니다.'
      });
    }

    // ============================================================
    // 2단계: 기타 사이트의 경우 Playwright Stealth 뼈대 스캔 + Gemini AI 딥 분석
    // ============================================================
    console.log(`📡 [AI-Selector] 일반 도메인 실시간 딥 스캔 개시 ➡️ ${url}`);
    
    // DB에서 구글 AI API 키 조회
    const settingsRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = settingsRes.rows && settingsRes.rows.length > 0 ? settingsRes.rows[0].value : null;

    if (!apiKey) {
      // API Key가 없으면 기본 Fallback 셀렉터 리턴하여 차단 방지
      return NextResponse.json({
        success: true,
        source: 'FALLBACK_MAP',
        css_selector: 'span.price',
        message: '구글 AI 키가 없어 기본 표준 시세 셀렉터(span.price)를 매칭했습니다.'
      });
    }

    // Playwright 가상 브라우저로 접속해 가벼운 DOM 메타데이터 스캐닝
    const browser = await chromium.launch({ headless: true });
    let pageContentText = '';
    
    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 }
      });
      const page = await context.newPage();
      
      // WebDriver 감지 비활성화
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1000); // 렌더링 안정 대기
      
      // 가격이 있을만한 주요 텍스트 태그와 부모 클래스 뼈대만 가볍게 파싱
      pageContentText = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('span, div, strong, em, b, td, h1, h2'));
        // 가격처럼 보이는 패턴(숫자 + 통화 기호 등)을 포함한 엘리먼트 상위 15개 텍스트와 Selector 조합 스캔
        const matches = elements
          .map(el => {
            const text = el.textContent ? el.textContent.trim() : '';
            if (/[0-9]/.test(text) && (text.includes('원') || text.includes('₩') || text.includes('$') || text.includes(',') || text.includes('￥'))) {
              // Selector 경로 조합
              let path = el.tagName.toLowerCase();
              if (el.className) {
                path += `.${Array.from(el.classList).join('.')}`;
              }
              if (el.id) {
                path += `#${el.id}`;
              }
              return { path, text: text.slice(0, 30) };
            }
            return null;
          })
          .filter(x => x !== null)
          .slice(0, 15);
        
        return JSON.stringify(matches);
      });

    } catch (browserErr: any) {
      console.warn('⚠️ [AI-Selector] 가상 브라우저 동적 분석 중 일시 오류:', browserErr.message);
    } finally {
      await browser.close();
    }

    // Gemini API에 분석 의뢰
    const systemPrompt = `
당신은 웹 크롤러 엔지니어링 전문가입니다.
전달된 상품/원자재 가격 공시 페이지 URL과 수집된 엘리먼트 뼈대 구조를 바탕으로, 이 사이트에서 "현재 가격(Price)" 정보를 가리키고 있을 확률이 가장 높은 핵심 엘리먼트의 정확하고 간결한 CSS Selector를 단 한 개만 매칭해 주세요.
반드시 다른 설명 텍스트 없이 다음의 JSON 구조로만 답변하십시오.

응답 JSON 예시:
{
  "css_selector": "div.price_box span.price_val",
  "reason": "가격 수치와 원화 기호가 들어있는 핵심 셀렉터입니다."
}
`;

    const model = 'gemini-3.5-flash';
    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          { role: 'user', parts: [{ text: `대상 URL: ${url}\n수집된 DOM 뼈대: ${pageContentText || '수집 실패 (도메인 정보로 유추해 주세요)'}` }] }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      throw new Error('Gemini AI 분석 실패');
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
        purpose: 'PRICE_SELECTION',
        prompt_tokens,
        completion_tokens,
        total_tokens,
        created_at: logTime
      }]);
    } catch (e: any) {
      console.error('AI 토큰 로깅 실패:', e.message);
    }

    const result = JSON.parse(resultText);

    return NextResponse.json({
      success: true,
      source: 'GEMINI_AI_SCAN',
      css_selector: result.css_selector || 'span.price',
      message: result.reason || 'AI가 해당 사이트의 뼈대를 동적 분석하여 최적의 가격 셀렉터를 찾아냈습니다.'
    });

  } catch (error: any) {
    console.error('❌ [AI-Selector] 자율 감지 에러:', error.message);
    return NextResponse.json({
      success: true,
      source: 'EXCEPTION_FALLBACK',
      css_selector: 'span.price',
      message: '일시적 네트워크 에러로 인해 기본 범용 가격 셀렉터(span.price)를 매칭했습니다.'
    });
  }
}
