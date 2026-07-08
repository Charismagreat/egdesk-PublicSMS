// 캘린더 날짜 연산 관련 유틸리티 함수 모음

/**
 * 특정 날짜가 속한 월의 정보를 계산합니다.
 * @param date 대상 Date 객체
 * @returns { firstDay: 시작 요일 인덱스(0-6), totalDays: 해당 월의 총 일수, year: 연도, month: 월(0-11) }
 */
export const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 시작 요일 index (0: 일요일, 1: 월요일, ...)
  const totalDays = new Date(year, month + 1, 0).getDate(); // 해당 월의 마지막 날짜
  return { firstDay, totalDays, year, month };
};

/**
 * 특정 날짜가 속한 주의 일요일부터 토요일까지의 Date 객체 배열을 구합니다.
 * @param date 대상 Date 객체
 * @returns 7개의 Date 객체를 포함하는 배열 (일요일~토요일)
 */
export const getDaysInWeek = (date: Date) => {
  const current = new Date(date);
  const dayOfWeek = current.getDay(); // 0: 일요일, 1: 월요일, ...
  
  // 이번 주 일요일의 날짜 계산
  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() - dayOfWeek);
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }
  return days;
};
