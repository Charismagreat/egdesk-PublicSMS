// 로그인 상태 및 이벤트 핸들러의 타입 정의

export interface UseLoginResult {
  username: string; // 사용자가 입력한 아이디
  setUsername: (value: string) => void; // 아이디 입력값 업데이트 함수
  password: string; // 사용자가 입력한 비밀번호
  setPassword: (value: string) => void; // 비밀번호 입력값 업데이트 함수
  error: string; // 로그인 에러 메시지
  isLoading: boolean; // 로그인 요청 진행 여부
  handleLogin: (e: React.FormEvent) => Promise<void>; // 로그인 제출 핸들러
}
