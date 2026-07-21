import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from 'next/server';
import { queryTable, insertRows, deleteRows } from '../../../../../egdesk-helpers';
import { getAppSetting } from '@/lib/app-settings';
import { getTenantId } from '@/lib/tenant';

export async function POST(req: Request) {
  try {
    const { hintKey, hintText, pagePath, forceRefresh } = await req.json();

    if (!hintKey || !hintText) {
      return NextResponse.json({ success: false, error: 'hintKey and hintText are required' }, { status: 400 });
    }

    // 1. DB 캐시 조회 (forceRefresh 플래그가 참이면 조회를 우회하고 신규 API 호출 유도)
    console.log(`[AI 글로벌 도움말] DB 조회 시도: ${hintKey} (forceRefresh: ${!!forceRefresh})`);
    let cachedRow = null;

    if (!forceRefresh) {
      const cacheRes = await queryTable('ai_contextual_help', { filters: { hint_key: hintKey } });
      cachedRow = cacheRes.rows && cacheRes.rows.length > 0 ? cacheRes.rows[0] : null;
    }

    if (cachedRow) {
      console.log(`[AI 글로벌 도움말] 캐시 발견! 바로 재사용합니다.`);
      return NextResponse.json({
        success: true,
        explanation: cachedRow.ai_explanation,
        cached: true
      });
    }

    // 2. 캐시가 없으면 Gemini API 호출을 위해 DB에서 API 키 조회
    const tenantId = await getTenantId();
    const apiKey = await getAppSetting('google_ai_api_key', tenantId);

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: '대시보드(시스템 설정)에서 구글 AI API 키를 먼저 등록해주세요.' 
      }, { status: 400 });
    }

    // 3. 진입 경로(pagePath) 분석을 통해 동적 AI 페르소나 및 지침 바인딩
    const pathStr = pagePath || "";
    let persona = "중소기업 경영 및 비즈니스 관리 프로세스 전반에 정통한 전문 AI 비즈니스 컨설턴트";
    let extraContext = "기업의 효율적인 비즈니스 관리 프로세스를 완벽하게 꿰뚫고 있는 동반자";

    if (pathStr.includes('/expenses')) {
      persona = "전문 AI 회계 컨설턴트이자 친절한 경리 어시스턴트";
      extraContext = "중소기업의 지출 결의, 영수증 증빙, 계정과목 분류 및 전사 예산 통제 실무를 완벽하게 꿰뚫고 있는 조력자";
    } else if (pathStr.includes('/safety-management')) {
      persona = "중대재해처벌법 및 산업안전보건법에 정통한 전문 AI 안전보건 진단 컨설턴트";
      extraContext = "기업의 안전 보건 경영 방침 수립, 작업별 유해·위험 요인 발굴 및 위험성평가, TBM(Toolbox Talk) 스크립트 작성, 아차사고 방지 대책을 완벽하게 꿰뚫고 있는 조력자";
    } else if (pathStr.includes('/rnd-management')) {
      persona = "정부 지원 기업연구소 인증 및 R&D 기술 문서 작성에 정통한 전문 AI 기술 어드바이저";
      extraContext = "국가 R&D 연구 일지 기록 요건, 비전 AI 기반 공간 안전 모니터링, 한국산업기술진흥협회(KOITA) 설립/유지 요건 및 자격 요건을 완벽하게 꿰뚫고 있는 조력자";
    } else if (pathStr.includes('/finance-cashflow')) {
      persona = "기업 재무 지표 분석 및 거시 경제 자금 예측에 정통한 전문 AI 재무 애널리스트";
      extraContext = "재무제표 해설, 자금수지 분석, 매입/매출 자금 흐름 예측, 원자재 가격 변동에 따른 리스크 관리 실무를 완벽하게 꿰뚫고 있는 조력자";
    } else if (pathStr.includes('/mail-management-ai')) {
      persona = "기업 비즈니스 커뮤니케이션 및 업무 자동화 처리에 정통한 전문 AI 워크플로우 분석가";
      extraContext = "수신된 전사 이메일의 중요도 및 리스크 분석, 발주서 자동 연동 및 NCR 품질 클레임 스냅태스크 자율 기안 실무를 완벽하게 꿰뚫고 있는 조력자";
    } else if (pathStr.includes('/sms') || pathStr.includes('/message-logs') || pathStr.includes('/automation')) {
      persona = "전문 AI 모바일 마케팅 및 SMS 메시징 전략 컨설턴트";
      extraContext = "고객 유치 및 재방문을 유도하는 효과적인 문자 발송 시간대, 스팸 규정 준수, 수신거부 필터링 및 예약 발송 최적화 실무 조력자";
    } else if (pathStr.includes('/customers') || pathStr.includes('/partners')) {
      persona = "CRM 및 기업간 협력사 관계 관리 전문 AI 비즈니스 파트너";
      extraContext = "고객 등급 관리, 거래처 이력 통계, 파트너사 신용 평가 및 맞춤형 관계 증진 가이드 실무 조력자";
    } else if (pathStr.includes('/transactions') || pathStr.includes('/orders') || pathStr.includes('/payments') || pathStr.includes('/finance')) {
      persona = "기업 매출 정산 및 온/오프라인 거래 결제 전문 AI 관제관";
      extraContext = "실시간 매출 분석, 미정산금 추적, PG사 결제 연동 가이드 및 증빙 처리를 꿰뚫고 있는 조력자";
    } else if (pathStr.includes('/coupons') || pathStr.includes('/reservations') || pathStr.includes('/deliveries') || pathStr.includes('/booking')) {
      persona = "리테일 매장 관리 및 라스트마일 배송 물류 전문 AI 매니저";
      extraContext = "쿠폰 마케팅 효과 검증, 실시간 예약 노쇼 예방 조치, 물류 배송 기사 매핑 및 배송 추적 조력자";
    } else if (pathStr.includes('/products') || pathStr.includes('/inventory')) {
      persona = "상품 MD 및 전사 자재 재고 통제 전문 AI 분석가";
      extraContext = "최적의 안전 재고 계산, 원자재 및 부품 카탈로그 설계, 재고 부족 리스크 사전 진단 실무 조력자";
    } else if (pathStr.includes('/estimates')) {
      persona = "B2B 견적 분석 및 발주/수주 행정 전문 AI 통상 컨설턴트";
      extraContext = "발주서 단가 마진 계산, 수주 계약 협의 시 유의사항 및 표준 계약 조건 검토 실무 조력자";
    } else if (pathStr.includes('/snaptasks')) {
      persona = "사내 협업 및 업무 지시 스케줄링 전문 AI 워크플로우 마스터";
      extraContext = "신속한 스냅태스크 생성 및 처리 현황 관리, 긴급 NCR 품질 조치 명령 전파 조력자";
    } else if (pathStr.includes('/quality-control') || pathStr.includes('/facility-management')) {
      persona = "공장 설비 예방 보전 및 품질 보증(QA) 전문 AI 기술 파트너";
      extraContext = "설비 종합 효율(OEE) 분석, 고장 유해 요인 감지 및 정비 일지 기록, NCR 결함 통계 조력자";
    } else if (pathStr.includes('/hr') || pathStr.includes('/recruitment') || pathStr.includes('/labor-management')) {
      persona = "근로기준법 및 인적 자원 채용 관리 전문 AI 노무 어드바이저";
      extraContext = "주52시간제 준수, 연차 정산 가이드, 학위 증명서 OCR 진위 판독 요건 충족 실무 조력자";
    } else if (pathStr.includes('/price-tracker')) {
      persona = "글로벌 비철금속 시세 및 시장가 변동 분석 전문 AI 에디터";
      extraContext = "런던금속거래소(LME) 알루미늄/구리 가격 추이 분석, 원가 리스크 구매 헤징 의사결정 조력자";
    } else if (pathStr.includes('/website')) {
      persona = "디지털 브랜딩 및 웹 퍼블리싱/SEO 최적화 전문 AI 웹 빌더";
      extraContext = "검색 엔진 노출 키워드 분석, 모바일 반응형 페이지 레이아웃 및 UX 설계 조력자";
    } else if (pathStr.includes('/instagram') || pathStr.includes('/naver-blog') || pathStr.includes('/youtube-shorts')) {
      persona = "소셜 미디어 콘텐츠 마케팅 전문 AI 크리에이터";
      extraContext = "인스타그램 카피라이팅, 블로그 유입 키워드 설계, 유튜브 쇼츠 스크립트 대본 자동 구성 조력자";
    } else if (pathStr.includes('/knowledge-ai')) {
      persona = "기업 문서 구조화 및 지식 베이스 구축 전문 AI 기술 사서";
      extraContext = "비정형 데이터의 RAG 벡터화, 사내 매뉴얼 기반 지식 학습 및 질의응답 최적화 조력자";
    } else if (pathStr.includes('/ecount-erp-ai')) {
      persona = "이카운트 ERP 동기화 및 API 연동 전문 AI 컨설턴트";
      extraContext = "ERP 전표 자동 생성 스크립트 작성 및 보안 세션 동기화 주기 관리 조력자";
    } else if (pathStr.includes('/governance')) {
      persona = "전사 AI 컨트롤타워 및 태스크 폴더 통합 관제 AI 거버넌스 오케스트레이터";
      extraContext = "현장 서류 AI 파싱 배정대기 관제, 원터치 담당자 배정, 태스크 폴더 서류 관제 및 자율 실행 감사 피드 통제 조력자";
    } else if (pathStr.includes('/production-plan') || pathStr.includes('/energy-management')) {
      persona = "생산 계획 최적화 및 에너지 소비 절감 전문 AI 엔지니어";
      extraContext = "한전 피크 전력 차감 스케줄링 대안 대책, 생산 가동 오더 조정 팁 조력자";
    } else if (pathStr.includes('/safety-detection')) {
      persona = "CCTV 비전 AI 위험 기계 관제 전문 AI 안전 감시관";
      extraContext = "위험 구역 침범 자동 인식 및 현장 알림 SMS 전송 대책 수립 조력자";
    } else if (pathStr.includes('/scm-management')) {
      persona = "공급망 원자재 수급 및 협력사 물류 AI 통제관";
      extraContext = "부품 리드타임 관리, 다변화 수급 및 리스크 회피 조언 조력자";
    } else if (pathStr.includes('/grant-management')) {
      persona = "정부 R&D 지원금 및 정책 자금 매칭 AI 행정 파트너";
      extraContext = "정부 무상 출연금 자격 요건 판별, 정책 자금 신청서 작성 가이드 조력자";
    } else if (pathStr.includes('/lawyer-ai')) {
      persona = "기업 계약 리스크 진단 전문 AI 사내 변호사";
      extraContext = "불공정 독소 조항 분석 및 특약 조항 보완 방향 제시 조력자";
    } else if (pathStr.includes('/credit-risk')) {
      persona = "매출채권 회수 전략 및 부실채권 리스크 관리 AI 금융 분석가";
      extraContext = "연체 미수금 회수성공 확률 분석, 독촉 알림 SMS 자동 연동 가이드 조력자";
    } else if (pathStr.includes('/password-ai')) {
      persona = "기업 계정 보안 및 비밀번호 자산 보호 AI 보안 요원";
      extraContext = "마스터 비밀번호 암호화, 계정 소유 및 권한 위임 보안 규칙 준수 조력자";
    } else if (pathStr.includes('/operators') || pathStr.includes('/settings')) {
      persona = "EGDesk 플랫폼 시스템 환경 및 전사 직원 계정 통합 관리 AI 마스터";
      extraContext = "본사 프로필 셋팅, AI 라우팅 모델 설정, 직원 관리 대장 통합 계정 관리 및 최고관리자 전용 메뉴 순서 제어 조력자";
    } else if (pathStr.includes('/help')) {
      persona = "Q&A 헬프센터 및 고객 셀프지원 AI 운영 팀장";
      extraContext = "플랫폼 기능 장애 해결 가이드, 이지봇 대화 유도 기법 조력자";
    } else if (pathStr.includes('/my-db')) {
      persona = "SQLite 데이터베이스 자율 SQL 쿼리 전문 AI 데이터 엔지니어";
      extraContext = "스키마 명세 조회, 안전한 DDL/DML 작성 및 엑셀 내보내기 팁 조력자";
    }

    // 4. Gemini API 호출용 프롬프트 구성 (페르소나가 반영된 풍부하고 상세한 가이드 작성 유도)
    const promptText = `
당신은 ${persona}이자 ${extraContext}입니다.
사용자가 비즈니스 관리 화면 내 특정 기능이나 입력 필드 위에 마우스를 호버했을 때 띄워줄, 매우 풍부하고 깊이 있는 비즈니스 도움말 가이드를 작성해야 합니다.

대상 기능 항목: ${hintKey}
항목 기본 설명: ${hintText}

[작성 및 출력 지침 - 절대 엄수]
1. 단순한 단문 요약이 아닙니다. 사용자가 이 기능의 실무적 용도를 100% 체득할 수 있도록, 이 기능이 왜 실무에서 중요하게 작용하는지(필요성/목적)와 어떻게 사용하는지(활용 방법 및 팁)를 상세하고 친절하게 작성하십시오.
2. 극진히 공손하고 전문적인 한국어 경어체(~입니다, ~해 드립니다, ~하시기 바랍니다 등)를 사용해 문장을 구사하십시오.
3. 분량은 가독성을 위해 적절한 단락 구분(줄바꿈)을 2~3회 포함하여 5~6줄 내외(공백 포함 350자~450자 사이)의 풍성하고 유용한 본문 내용으로 채우십시오. 단문 한두 줄짜리 짧은 해설은 지양합니다.
4. 출력 텍스트가 절대 도중에 끊어져서는 안 되며, 반드시 마침표(.)로 종결되는 완성된 문장으로만 끝마치도록 하십시오.
5. "네, 설명하겠습니다", "도움말입니다" 등 기계적 서론이나 인사말은 전면 제외하고 오직 실질적인 해설 본문으로 즉시 시작하여 완성하십시오.
`;

    console.log(`[AI 글로벌 도움말] 캐시 없음. Gemini API 호출 시작: ${hintKey}`);
    const response = await fetchGeminiWithFallback(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: promptText }] }
        ],
        generationConfig: {
          temperature: 0.65
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Google Gemini API Error');
    }

    const data = await response.json();
    const aiExplanation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!aiExplanation) {
      throw new Error('AI 설명 생성 실패');
    }

    // 5. AI 토큰 감사록 기록
    try {
      const promptTokens = data.usageMetadata?.promptTokenCount || 0;
      const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = data.usageMetadata?.totalTokenCount || 0;
      
      if (totalTokens > 0) {
        await insertRows('ai_token_usage_logs', [{
          model: 'gemini-3.5-flash',
          purpose: `help-${hintKey.substring(0, 15)}`,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens
        }]);
      }
    } catch (e: any) {
      console.error('⚠️ AI 토큰 감사 로깅 실패:', e.message);
    }

    // 6. DB 캐시 테이블에 저장
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    
    try {
      // SQLite UNIQUE 제약 조건 충돌을 미연에 방지하기 위해 기존 레코드 삭제
      await deleteRows('ai_contextual_help', { filters: { hint_key: hintKey } });
    } catch (e: any) {
      console.log(`[AI 글로벌 도움말] 기존 캐시 삭제 시 오류 무시: ${e.message}`);
    }

    await insertRows('ai_contextual_help', [{
      hint_key: hintKey,
      hint_text: hintText,
      ai_explanation: aiExplanation,
      created_at: nowStr
    }]);

    console.log(`[AI 글로벌 도움말] 새로운 설명 생성 및 DB 캐시 저장 완료: ${hintKey}`);

    return NextResponse.json({
      success: true,
      explanation: aiExplanation,
      cached: false
    });

  } catch (error: any) {
    console.error('AI 글로벌 도움말 API 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
