export interface GrantAnnouncement {
  id: string;
  agency: string; // 지원 기관 (예: 중소벤처기업부)
  title: string; // 공고명
  budget: string; // 지원 규모 (예: 최대 1억원)
  target: string; // 지원 대상
  deadline: string; // 마감일
  category: "GRANT" | "LOAN" | "RND"; // 지원 유형
  matchScore: number; // 적합도 점수 (%)
  matchGuide: string[]; // AI 매칭 가이드 및 보완 조언
  isBookmarked: boolean; // 북마크 상태
}

export interface CompanyProfile {
  establishmentYear: number; // 설립연도
  employeeCount: number; // 상시 근로자수
  patentsCount: number; // 보유 특허 개수
  femaleEmployeeRatio: number; // 여성 근로자 비율 (%)
  youthEmployeeRatio: number; // 청년 근로자 비율 (%)
  sector: string; // 업종
}

export interface RndPlanSection {
  id: string;
  title: string;
  placeholder: string;
}

export const RND_PLAN_SECTIONS: RndPlanSection[] = [
  {
    id: "necessity",
    title: "1. 연구개발의 필요성 및 시급성",
    placeholder: "기술 개발의 시장성 및 도입 필요성에 대한 AI 초안 작성을 시작하세요."
  },
  {
    id: "differentiation",
    title: "2. 국내외 기술 트렌드 및 차별성",
    placeholder: "경쟁사 기술 분석 및 독창적인 차별화 포인트를 AI 분석으로 채워 넣으세요."
  },
  {
    id: "objectives",
    title: "3. 연구개발 최종 목표 및 상세 내용",
    placeholder: "정량적 목표 항목 및 구체적 개발 일정 로드맵 초안을 구성해 드립니다."
  },
  {
    id: "businessPlan",
    title: "4. 사업화 방안 및 향후 시장 진출 계획",
    placeholder: "타겟 고객 세분화 및 연차별 예상 매출 매출처 확보 전략을 도출해 드립니다."
  }
];

export interface RndPlan {
  announcementId: string;
  sections: Record<string, string>;
}

export interface GrantData {
  announcements: GrantAnnouncement[];
  companyProfile: CompanyProfile;
}
