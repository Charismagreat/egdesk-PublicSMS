// AI 채용 관리 시스템 공통 타입 정의

/**
 * 채용 공고 인터페이스
 */
export interface JobPosting {
  id: string;
  title: string;
  category: string;
  salary: string;
  timeRange: string;
  location: string;
  description: string;
  requirements: string[];
  createdAt: string;
}

/**
 * 실시간 AI DM 면접 대화 로그 항목
 */
export interface InterviewLog {
  sender: "ai" | "candidate";
  text: string;
  timestamp: string;
}

/**
 * AI 평가 리포트 인터페이스
 */
export interface AiEvaluation {
  strengths: string[];
  weaknesses: string[];
  finalVerdict: string;
}

/**
 * 지원자 인터페이스
 */
export interface Applicant {
  id: string;
  name: string;
  age: string;
  phone: string;
  experience: string;
  motivation: string;
  matchingScore: number;
  status: "applied" | "interviewing" | "interview_done" | "approved" | "rejected";
  interviewLogs: InterviewLog[];
  aiEvaluation?: AiEvaluation;
  signatureUrl?: string; // 디지털 서명 이미지 (Base64)
  signedAt?: string;
}

/**
 * 사장님과 AI 비서 이지봇 간의 대화 메시지 인터페이스
 */
export interface ChatMessage {
  sender: "ai" | "user";
  text: string;
  timestamp: Date;
}
