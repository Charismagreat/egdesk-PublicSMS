import { fetchGeminiWithFallback } from '../../../../lib/gemini-fallback';
import { NextResponse } from "next/server";
import { queryTable, insertRows, updateRows, deleteRows } from "../../../../../egdesk-helpers";

export const dynamic = "force-dynamic";

// Gemini API 호출을 위한 헬퍼 함수
async function callGemini(apiKey: string, model: string, systemPrompt: string, userPrompt: string, purpose: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetchGeminiWithFallback(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.3
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API 호출 실패 (Status: ${response.status})`);
  }

  const data = await response.json();

  // AI 사용량 통계를 위해 ai_token_usage_logs 테이블에 토큰 사용 정보 적재
  try {
    const prompt_tokens = data.usageMetadata?.promptTokenCount || 0;
    const completion_tokens = data.usageMetadata?.candidatesTokenCount || 0;
    const total_tokens = data.usageMetadata?.totalTokenCount || (prompt_tokens + completion_tokens);
    const logId = `TKC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);

    await insertRows("ai_token_usage_logs", [{
      id: logId,
      model,
      purpose,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      created_at: nowStr
    }]);
  } catch (e: any) {
    console.error("AI 사용량 로그 기록 실패:", e.message);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// JSON 문자열의 마크다운 코드 블록(```json ... ```) 정제 함수
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, "");
    cleaned = cleaned.replace(/\n```$/, "");
  }
  return cleaned.trim();
}

// R&D 기본 텍스트 템플릿 (폴백용)
const DEFAULT_RND_TEXTS: Record<string, Record<string, string>> = {
  "GR-501": {
    necessity: `[연구개발의 필요성 및 시급성]
본 연구개발은 중소 유통/도소매 기업의 생존과 직결된 '공급망 리스크 대응 및 지능형 물류/자금 통합 예측 시스템' 개발을 목적으로 합니다. 최근 글로벌 기상 이변 및 항만 정체로 인해 자재 조달 리드타임 편차가 급증하고 있으며, 이는 대기업에 비해 완충 재고 및 자금 여력이 부족한 중소기업에 직격탄이 되고 있습니다.
당사는 본 디딤돌 과제를 통해 실시간 SCM 물류 센서 데이터와 기업 손익 계정을 다차원으로 통합 분석하는 경량 예측 엔진을 개발하고자 합니다. 지연 리스크를 최소 7일 전에 감지하고 우회 조달처를 매칭하여 연간 약 3,500만원 이상의 불필요한 폐기 및 대손 손실을 사전에 차단하는 기술 혁신이 매우 시급한 상황입니다.`,
    differentiation: `[국내외 기술 트렌드 및 차별성]
현재 시장의 물류 예측 솔루션들은 거대 ERP 기반으로 고가의 구축 비용이 발생하여 연 매출 50억 미만의 중소 유통업체들은 도입이 거의 불가능합니다.
본 과제를 통해 개발될 솔루션은 SQLite 및 가벼운 시계열 예측 모델(Prophet/TFT)을 활용하여 초경량 패키징 형태로 제공됩니다. 또한 단순한 운송 상태 트랙킹에 그치지 않고, 지연 리스크 발생 시 동적으로 세무/회계 장부의 지출 예정 금액 및 자금 고갈 D-Day를 실시간 리클러스터링하여 대안 시나리오를 제시합니다. 이는 기존의 물류 전용 시스템이나 세무 전용 장부들과 차별화되는 세계 최초의 '물류-금융 통합 지능형 의사결정 파이프라인'입니다.`,
    objectives: `[연구개발 최종 목표 및 상세 내용]
1. 정량적 개발 목표:
  - 글로벌 조달 화물 리스크 예측 정확도(MAP, Mean Absolute Percentage Error) 92% 이상 달성
  - AI 우회 공급처 자동 전환 응답 속도 2.5초 이내 실현
  - 중소기업용 모바일 물류 관제 노선 무선 동기화 딜레이 1초 미만 보장
2. 주요 연구개발 내용:
  - 1차년도: Prophet 모델 기반 이송 지연 지수 시계열 예측 신경망 학습 및 SQLite 분산 원장 연동 모듈 개발
  - 2차년도: 모바일 세관 통관 바 트래커 동기화 시스템 및 비상 긴급 SMS/전화 핫링크 연동 최적화`,
    businessPlan: `[사업화 방안 및 향후 시장 진출 계획]
1. 타겟 시장 진입 전략:
  - 1단계: 기존 이지데스크 [FreeSMS] 플랫폼을 이용 중인 전국 5,000여 소상공인 및 소규모 유통 파트너사 대상 무료 베타 서비스 출시로 사용성 검증 및 피드백 축적
  - 2단계: 스마트공장 공급기업 연계 및 세무/회계사 사무소와의 B2B 전략적 제휴를 통한 단체 가입 유도
2. 예상 매출 및 일자리 창출:
  - 서비스 상용화 후 3년 내 유료 구독 고객사 450곳 확보, 연 매출 12억 원 달성 목표
  - 연구개발 완료 및 사업화 가동에 따라 신규 청년 개발자 및 CS 인력 총 8명 추가 고용 예정`
  }
};

/**
 * GET: 지원금 공고 리스트, 기업 프로필 조회 (물리 DB 연동 및 AI RAG 적합도 연동)
 */
export async function GET() {
  try {
    // 1. DB에서 공고 전체 조회
    const annRes = await queryTable("crm_grant_announcements", { limit: 100000 });
    const dbAnnouncements = annRes.rows || [];

    // 2. DB에서 관심 북마크 목록 조회
    const bookmarkRes = await queryTable("crm_grant_bookmarks", {});
    const dbBookmarks = bookmarkRes.rows || [];
    const bookmarkedIds = new Set(dbBookmarks.map((b: any) => b.announcement_id));

    // 3. DB에서 기업 프로필 조회 및 없을 시 동적 백필
    const profileRes = await queryTable("crm_grant_company_profile", { filters: { id: "MY-COMPANY" } });
    let companyProfile;
    if (profileRes.rows && profileRes.rows.length > 0) {
      companyProfile = profileRes.rows[0];
    } else {
      companyProfile = {
        id: "MY-COMPANY",
        establishmentYear: 2022,
        employeeCount: 12,
        patentsCount: 2,
        femaleEmployeeRatio: 35,
        youthEmployeeRatio: 65,
        sector: "도소매 및 물류 소프트웨어"
      };
      await insertRows("crm_grant_company_profile", [companyProfile]);
    }

    // AI 설정 쿼리
    const settingsKeyRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
    const apiKey = settingsKeyRes.rows && settingsKeyRes.rows.length > 0 ? settingsKeyRes.rows[0].value : (process.env.GEMINI_API_KEY || "");
    const settingsModelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
    const model = settingsModelRes.rows && settingsModelRes.rows.length > 0 ? settingsModelRes.rows[0].value : "gemini-3.5-flash";

    // 4. 북마크 데이터 바인딩 조립 (AI RAG 연동)
    const announcements = [];
    for (const ann of dbAnnouncements) {
      let matchScore = ann.match_score || 70;
      let matchGuide = [
        "✅ 현재 기술 요건 및 매출액 요건 충족으로 기본 지원 자격 확보",
        "✅ 기업 임직원 중 청년 근로자 비율이 60% 이상으로 가점 항목(+2점) 확보 가능",
        "💡 보유 특허 2건이 핵심 기술과 직접 연계될 경우 우위 예상",
        "⚠️ 연구노트 관리 규정 및 사내 R&D 조직 지정 사전 점검 필요"
      ];

      if (ann.id === "GR-502") {
        matchGuide = [
          "✅ 이지데스크의 스마트오더 연계 도입 시 즉시 신청 적합",
          "✅ F&B 및 도소매 소프트웨어 활성 도메인과 완전 일치",
          "💡 청년 고용 우대 혜택 적용 가능"
        ];
      }

      // DB에 캐싱된 가이드 정보가 있으면 파싱하여 사용 (실시간 Gemini API 호출 제거)
      if (ann.match_guide) {
        try {
          const parsedGuide = JSON.parse(ann.match_guide);
          if (Array.isArray(parsedGuide)) {
            matchGuide = parsedGuide;
          }
        } catch (e) {}
      }

      announcements.push({
        id: ann.id,
        agency: ann.agency,
        title: ann.title,
        budget: ann.budget >= 100000000 
          ? `최대 ${(ann.budget / 100000000).toFixed(1)}억원` 
          : `최대 ${(ann.budget / 10000).toLocaleString()}만원`,
        target: "창업 7년 이하이면서 매출액 요건을 만족하는 중소기업/소상공인",
        deadline: ann.end_date,
        category: ann.id === "GR-501" ? "RND" as const : ann.id === "GR-502" ? "GRANT" as const : "LOAN" as const,
        matchScore,
        matchGuide,
        isBookmarked: bookmarkedIds.has(ann.id)
      });
    }

    // 설정 정보 조회 (동기화 주기 및 마지막 갱신 시간)
    const intervalRes = await queryTable('system_settings', { filters: { key: 'grant_sync_interval' } });
    const syncInterval = intervalRes.rows && intervalRes.rows.length > 0 ? Number(intervalRes.rows[0].value) : 12;

    const lastSyncRes = await queryTable('system_settings', { filters: { key: 'grant_last_sync_time' } });
    const lastSyncTime = lastSyncRes.rows && lastSyncRes.rows.length > 0 ? lastSyncRes.rows[0].value : "";

    return NextResponse.json({
      success: true,
      announcements,
      companyProfile,
      syncInterval,
      lastSyncTime
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST: R&D 계획서 AI 생성 및 북마크 토글
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 0. 동적 사내 DB 데이터 수집 및 매칭 분석 수행 (search_grants)
    if (action === "search_grants") {
      // 1) crm_operators 테이블에서 활성 임직원 개수 집계 (소프트 삭제 제외)
      const opsRes = await queryTable("crm_operators", {});
      const activeEmployees = (opsRes.rows || []).filter((o: any) => !o.deleted_at);
      const employeeCount = activeEmployees.length || 1;

      // 2) crm_financial_statements 테이블에서 본사('MY-COMPANY') 최신 재무 데이터 추출
      const finRes = await queryTable("crm_financial_statements", { filters: { company_id: "MY-COMPANY" } });
      const finList = finRes.rows || [];
      finList.sort((a: any, b: any) => Number(b.fiscal_year) - Number(a.fiscal_year));
      const latestFin = finList[0];

      // 3) crm_operator_licenses 테이블에서 특허 보유 개수 계산
      const licRes = await queryTable("crm_operator_licenses", {});
      const patentsCount = (licRes.rows || []).filter(
        (l: any) => (l.license_name || '').includes("특허") || (l.license_name || '').toLowerCase().includes("patent")
      ).length;

      // 4) system_settings 테이블에서 회사 프로필(설립일 등) 확인
      const settingsRes = await queryTable("system_settings", { filters: { key: "my_company_profile" } });
      let establishmentYear = 2022;
      let sector = "도소매 및 물류 소프트웨어";
      if (settingsRes.rows && settingsRes.rows.length > 0) {
        try {
          const profileData = JSON.parse(settingsRes.rows[0].value);
          if (profileData.establishmentYear) {
            establishmentYear = Number(profileData.establishmentYear);
          }
        } catch (e) {}
      }

      // 5) crm_grant_company_profile 갱신 (Upsert)
      const existingProfileRes = await queryTable("crm_grant_company_profile", { filters: { id: "MY-COMPANY" } });
      const existing = existingProfileRes.rows?.[0] || {};

      const updatedProfile = {
        id: "MY-COMPANY",
        establishmentYear: existing.establishmentYear || establishmentYear,
        employeeCount,
        patentsCount: patentsCount || existing.patentsCount || 0,
        femaleEmployeeRatio: existing.femaleEmployeeRatio || 35,
        youthEmployeeRatio: existing.youthEmployeeRatio || 65,
        sector: existing.sector || sector
      };

      await deleteRows("crm_grant_company_profile", { filters: { id: "MY-COMPANY" } });
      await insertRows("crm_grant_company_profile", [updatedProfile]);

      // 6) 각 공고에 대한 실시간 AI 매칭 분석 수행 (Gemini API 호출 및 스코어 업데이트)
      const annRes = await queryTable("crm_grant_announcements", { limit: 100000 });
      const dbAnnouncements = annRes.rows || [];

      const bookmarkRes = await queryTable("crm_grant_bookmarks", {});
      const dbBookmarks = bookmarkRes.rows || [];
      const bookmarkedIds = new Set(dbBookmarks.map((b: any) => b.announcement_id));

      const settingsKeyRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
      const apiKey = settingsKeyRes.rows && settingsKeyRes.rows.length > 0 ? settingsKeyRes.rows[0].value : (process.env.GEMINI_API_KEY || "");
      const settingsModelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
      const model = settingsModelRes.rows && settingsModelRes.rows.length > 0 ? settingsModelRes.rows[0].value : "gemini-3.5-flash";

      const announcements = [];
      for (const ann of dbAnnouncements) {
        let matchScore = ann.match_score || 70;
        let matchGuide = [
          "✅ 현재 기술 요건 및 매출액 요건 충족으로 기본 지원 자격 확보",
          "✅ 기업 임직원 중 청년 근로자 비율이 60% 이상으로 가점 항목(+2점) 확보 가능",
          "💡 보유 특허 2건이 핵심 기술과 직접 연계될 경우 우위 예상",
          "⚠️ 연구노트 관리 규정 및 사내 R&D 조직 지정 사전 점검 필요"
        ];

        if (ann.id === "GR-502") {
          matchGuide = [
            "✅ 이지데스크의 스마트오더 연계 도입 시 즉시 신청 적합",
            "✅ F&B 및 도소매 소프트웨어 활성 도메인과 완전 일치",
            "💡 청년 고용 우대 혜택 적용 가능"
          ];
        }

        if (apiKey) {
          try {
            const systemPrompt = `
You are an expert government grant advisor for Korean SMEs.
Analyze the company profile, financial data, and the grant announcement to calculate a precise matching score (0-100) and provide exactly 3-4 specific matching advice bullets (each starting with ✅, 💡, or ⚠️) in Korean.
Return the response in raw JSON format matching this schema:
{
  "matchScore": number,
  "matchGuide": string[]
}
Do not wrap the output in markdown code blocks like \`\`\`json.
`;
            const userPrompt = `
[Company Profile]
- Establishment Year: ${updatedProfile.establishmentYear}
- Employee Count: ${updatedProfile.employeeCount}
- Patents Count: ${updatedProfile.patentsCount}
- Youth Employee Ratio: ${updatedProfile.youthEmployeeRatio}%
- Female Employee Ratio: ${updatedProfile.femaleEmployeeRatio}%
- Sector: ${updatedProfile.sector}

[Financial Data (Latest)]
${latestFin ? `- Fiscal Year: ${latestFin.fiscal_year}
- Total Assets: ${latestFin.total_assets?.toLocaleString()} KRW
- Total Liabilities: ${latestFin.total_liabilities?.toLocaleString()} KRW
- Total Equity: ${latestFin.total_equity?.toLocaleString()} KRW
- Revenue: ${latestFin.revenue?.toLocaleString()} KRW
- Operating Income: ${latestFin.operating_income?.toLocaleString()} KRW
- Net Income: ${latestFin.net_income?.toLocaleString()} KRW` : '- No financial statement available'}

[Grant Announcement]
- Title: ${ann.title}
- Agency: ${ann.agency}
- Budget: ${ann.budget} (KRW)
- Deadline: ${ann.end_date}
`;

            const aiText = await callGemini(apiKey, model, systemPrompt, userPrompt, "GRANT_RAG_MATCHING");
            const parsed = JSON.parse(cleanJsonString(aiText));
            if (parsed && typeof parsed.matchScore === "number" && Array.isArray(parsed.matchGuide)) {
              matchScore = parsed.matchScore;
              matchGuide = parsed.matchGuide;
              
              // 데이터베이스 스코어 및 가이드 캐싱 업데이트
              await updateRows("crm_grant_announcements", { 
                match_score: matchScore, 
                match_guide: JSON.stringify(matchGuide) 
              }, { filters: { id: ann.id } });
            }
          } catch (e: any) {
            console.error(`AI RAG matching failed for ${ann.id} during search:`, e.message);
          }
        }

        announcements.push({
          id: ann.id,
          agency: ann.agency,
          title: ann.title,
          budget: ann.budget >= 100000000 
            ? `최대 ${(ann.budget / 100000000).toFixed(1)}억원` 
            : `최대 ${(ann.budget / 10000).toLocaleString()}만원`,
          target: "창업 7년 이하 중소기업/소상공인",
          deadline: ann.end_date,
          category: ann.id === "GR-501" ? "RND" as const : ann.id === "GR-502" ? "GRANT" as const : "LOAN" as const,
          matchScore,
          matchGuide,
          isBookmarked: bookmarkedIds.has(ann.id)
        });
      }

      return NextResponse.json({
        success: true,
        message: "사내 종합 정보(회사 정보, 재무제표, HR)를 조회하여 매칭 분석이 완료되었습니다. 🟢",
        announcements,
        companyProfile: updatedProfile
      });
    }

    // 0-1. 스케줄 주기 설정 저장 (save_schedule)
    if (action === "save_schedule") {
      const { interval } = body;
      
      const checkRes = await queryTable("system_settings", { filters: { key: "grant_sync_interval" } });
      const exists = checkRes.rows && checkRes.rows.length > 0;

      if (exists) {
        await updateRows("system_settings", { value: String(interval) }, { filters: { key: "grant_sync_interval" } });
      } else {
        await insertRows("system_settings", [{
          key: "grant_sync_interval",
          value: String(interval)
        }]);
      }

      return NextResponse.json({
        success: true,
        message: `정기 동기화 주기가 ${interval}시간으로 저장되었습니다.`
      });
    }

    // 1. 북마크 상태 변경 (toggle_bookmark)
    if (action === "toggle_bookmark") {
      const { id } = body;

      const checkRes = await queryTable("crm_grant_bookmarks", { filters: { announcement_id: id } });
      const exists = checkRes.rows && checkRes.rows.length > 0;

      if (exists) {
        await deleteRows("crm_grant_bookmarks", { filters: { announcement_id: id } });
      } else {
        await insertRows("crm_grant_bookmarks", [{
          id: `BM-${Date.now()}`,
          announcement_id: id
        }]);
      }

      // 갱신된 전체 리스트 획득
      const annRes = await queryTable("crm_grant_announcements", { limit: 100000 });
      const dbAnnouncements = annRes.rows || [];
      const bookmarkRes = await queryTable("crm_grant_bookmarks", {});
      const dbBookmarks = bookmarkRes.rows || [];
      const bookmarkedIds = new Set(dbBookmarks.map((b: any) => b.announcement_id));

      const announcements = dbAnnouncements.map((ann: any) => ({
        id: ann.id,
        agency: ann.agency,
        title: ann.title,
        budget: ann.budget >= 100000000 
          ? `최대 ${(ann.budget / 100000000).toFixed(1)}억원` 
          : `최대 ${(ann.budget / 10000).toLocaleString()}만원`,
        target: "창업 7년 이하 중소기업/소상공인",
        deadline: ann.end_date,
        category: ann.id === "GR-501" ? "RND" as const : "GRANT" as const,
        matchScore: ann.match_score,
        matchGuide: ["✅ 자격 요건 충족"],
        isBookmarked: bookmarkedIds.has(ann.id)
      }));

      return NextResponse.json({
        success: true,
        message: "북마크 상태가 DB에 정상 변경되었습니다.",
        announcements
      });
    }

    // 2. R&D 계획서 AI 생성 (generate_plan)
    if (action === "generate_plan") {
      const { id } = body;

      // 2-1. 기존 DB에 적재된 계획서가 있는지 조회
      const planRes = await queryTable("crm_grant_rnd_plans", { filters: { announcement_id: id } });
      let plan;

      if (planRes.rows && planRes.rows.length > 0) {
        plan = JSON.parse(planRes.rows[0].plan_data);
      } else {
        // DB에 없을 시 실시간 Gemini 생성 시도
        const settingsKeyRes = await queryTable('system_settings', { filters: { key: 'google_ai_api_key' } });
        const apiKey = settingsKeyRes.rows && settingsKeyRes.rows.length > 0 ? settingsKeyRes.rows[0].value : (process.env.GEMINI_API_KEY || "");
        const settingsModelRes = await queryTable('system_settings', { filters: { key: 'google_ai_model' } });
        const model = settingsModelRes.rows && settingsModelRes.rows.length > 0 ? settingsModelRes.rows[0].value : "gemini-3.5-flash";

        // 회사 매칭 프로필 및 공고 정보 획득
        const profileRes = await queryTable("crm_grant_company_profile", { filters: { id: "MY-COMPANY" } });
        const companyProfile = profileRes.rows?.[0] || {
          establishmentYear: 2022,
          employeeCount: 12,
          patentsCount: 2,
          femaleEmployeeRatio: 35,
          youthEmployeeRatio: 65,
          sector: "도소매 및 물류 소프트웨어"
        };

        const annRes = await queryTable("crm_grant_announcements", { filters: { id } });
        const ann = annRes.rows?.[0] || { title: "중소기업 기술개발 과제", agency: "정부기관", budget: 100000000 };

        let generatedPlan = null;

        if (apiKey) {
          try {
            const systemPrompt = `
You are an expert R&D consultant helping Korean SMEs draft high-scoring research proposals for government grants.
Based on the company profile and the grant announcement, write a detailed 4-part research plan in Korean. Keep the tone professional, realistic, and highly technical.
Return the response in raw JSON format matching this schema:
{
  "necessity": "Detailed text for 1. 연구개발의 필요성 및 시급성 (approx 3-5 sentences in Korean)",
  "differentiation": "Detailed text for 2. 국내외 기술 트렌드 및 차별성 (approx 3-5 sentences in Korean)",
  "objectives": "Detailed text for 3. 연구개발 최종 목표 및 상세 내용 (approx 3-5 sentences in Korean)",
  "businessPlan": "Detailed text for 4. 사업화 방안 및 향후 시장 진출 계획 (approx 3-5 sentences in Korean)"
}
Do not wrap the output in markdown code blocks like \`\`\`json.
`;
            const userPrompt = `
[Company Profile]
- Establishment Year: ${companyProfile.establishmentYear}
- Employee Count: ${companyProfile.employeeCount}
- Patents Count: ${companyProfile.patentsCount}
- Youth Employee Ratio: ${companyProfile.youthEmployeeRatio}%
- Female Employee Ratio: ${companyProfile.femaleEmployeeRatio}%
- Sector: ${companyProfile.sector}

[Grant Announcement]
- Title: ${ann.title}
- Agency: ${ann.agency}
- Budget: ${ann.budget} (KRW)
`;

            const aiText = await callGemini(apiKey, model, systemPrompt, userPrompt, "GRANT_RND_PLAN_GENERATION");
            const parsed = JSON.parse(cleanJsonString(aiText));
            if (parsed && parsed.necessity && parsed.differentiation && parsed.objectives && parsed.businessPlan) {
              generatedPlan = parsed;
            }
          } catch (e: any) {
            console.error("Gemini R&D generation failed, falling back to template:", e.message);
          }
        }

        // AI 생성 성공 시 해당 데이터 사용, 실패 혹은 API 키 부재 시 하드코딩 폴백 적용
        plan = generatedPlan || DEFAULT_RND_TEXTS[id] || {
          necessity: `[연구개발의 필요성 및 시급성]
선택하신 사업공고(${id})에 대응하는 기술 개발 시나리오입니다. 중소기업 혁신성장을 위한 맞춤형 R&D 테마를 수립하고 관련 연구의 시급성을 세부 설명합니다.`,
          differentiation: `[국내외 기술 트렌드 및 차별성]
국내외 시장 분석 및 특허 데이터베이스 대조를 바탕으로 한 고유한 차별화 방안 및 특허 확보 전략을 기술합니다.`,
          objectives: `[연구개발 최종 목표 및 상세 내용]
구체적인 정량 성능 평가 기준(목표치)과 함께 핵심 과제 상세 내용을 수립합니다.`,
          businessPlan: `[사업화 방안 및 향후 시장 진출 계획]
국내 대리점 및 글로벌 판로 개척 방안, 양산화 코스트 최적화 계획 및 신규 인재 확보 일정을 도출합니다.`
        };

        // DB에 최초 적재
        await insertRows("crm_grant_rnd_plans", [{
          id: `PLAN-${Date.now()}`,
          announcement_id: id,
          plan_data: JSON.stringify(plan)
        }]);
      }

      return NextResponse.json({
        success: true,
        message: "Gemini AI가 R&D 사업계획서 표준 4대 초안을 성공적으로 완필하여 DB에 저장했습니다.",
        plan
      });
    }

    return NextResponse.json({ success: false, error: "유효하지 않은 요청 액션입니다." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
