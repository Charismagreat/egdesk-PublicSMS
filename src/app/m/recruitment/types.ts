// 채용 공고 인터페이스
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

// AI 면접 대화록 인터페이스
export interface ChatLog {
  sender: "ai" | "candidate";
  text: string;
  timestamp: string;
}

// AI 면접 평가 리포트 인터페이스
export interface Evaluation {
  strengths: string[];
  weaknesses: string[];
  finalVerdict: string;
}

// 구직자 지원 데이터 규격
export interface ApplicantData {
  id: string;
  name: string;
  age: string;
  phone: string;
  experience: string;
  motivation: string;
  matchingScore: number;
  status: "applied" | "interviewing" | "passed" | "rejected";
  interviewLogs: ChatLog[];
}
