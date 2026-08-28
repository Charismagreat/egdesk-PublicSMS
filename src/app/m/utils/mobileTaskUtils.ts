// Haversine 두 위도/경도 간 거리(m) 연산 헬퍼
export const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 🗓️ 마감일 추출 헬퍼 함수
export const extractDueDate = (t: any): string | null => {
  if (t.due_date && String(t.due_date).trim() !== "") {
    const cleaned = String(t.due_date).trim().replace(/[\.\/]/g, "-");
    const match = cleaned.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (match) return match[1];
  }

  // 제목 및 설명문에서 마감/납기일자(YYYY-MM-DD) 우선 파싱
  const searchTarget = `${t.title || ""} ${t.description || ""} ${t.note || ""}`;
  const match = searchTarget.match(/\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})\b/);
  if (match) {
    return match[1].replace(/[/.]/g, "-");
  }

  // 날짜 명시가 전혀 없는 경우 생성일자로 폴백
  if (t.created_at) {
    const cleaned = String(t.created_at).trim().replace(/[\.\/]/g, "-");
    const createdMatch = cleaned.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (createdMatch) return createdMatch[1];
    return t.created_at;
  }

  return null;
};

// 🗓️ 오늘, 내일, 이번 주, 이번 달, 다음 달 필터링 순수 헬퍼
export const isTaskInPeriod = (
  t: any,
  period: "TODAY" | "TOMORROW" | "WEEK" | "MONTH" | "NEXT_MONTH" | "ALL" | "YESTERDAY" | "LAST_MONTH",
  tab: "active" | "completed"
): boolean => {
  if (period === "ALL") return true;

  const targetDateStr = tab === "completed" 
    ? (t.resolved_at || t.completed_at || t.updated_at || t.created_at || "")
    : extractDueDate(t);

  if (!targetDateStr) return false;

  const dateMatch = targetDateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return false;

  const [y, m, d] = dateMatch[0].split("-").map(Number);
  const taskDate = new Date(y, m - 1, d);
  taskDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // 이번 주 (일요일 ~ 토요일) 범위 산출
  const dayOfWeek = today.getDay();
  const sundayTime = new Date(today).setDate(today.getDate() - dayOfWeek);
  const startOfWeek = new Date(sundayTime);
  startOfWeek.setHours(0, 0, 0, 0);

  const saturdayTime = new Date(startOfWeek).setDate(startOfWeek.getDate() + 6);
  const endOfWeek = new Date(saturdayTime);
  endOfWeek.setHours(23, 59, 59, 999);

  const isInCurrentWeek = taskDate.getTime() >= startOfWeek.getTime() && taskDate.getTime() <= endOfWeek.getTime();

  if (tab === "active") {
    if (period === "TODAY") return t.due_date ? diffDays <= 0 : diffDays === 0;
    if (period === "TOMORROW") return diffDays === 1;
    if (period === "WEEK") return isInCurrentWeek && diffDays >= 0;
    if (period === "MONTH") {
      return taskDate.getFullYear() === today.getFullYear() && taskDate.getMonth() === today.getMonth();
    }
    if (period === "NEXT_MONTH") {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return taskDate.getFullYear() === nextMonth.getFullYear() && taskDate.getMonth() === nextMonth.getMonth();
    }
  } else {
    // 한 일 (completed) 탭:
    if (period === "TODAY") return diffDays === 0;
    if (period === "YESTERDAY") return diffDays === -1;
    if (period === "WEEK") return isInCurrentWeek && diffDays <= 0;
    if (period === "MONTH") {
      return taskDate.getFullYear() === today.getFullYear() && taskDate.getMonth() === today.getMonth();
    }
    if (period === "LAST_MONTH") {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return taskDate.getFullYear() === lastMonth.getFullYear() && taskDate.getMonth() === lastMonth.getMonth();
    }
  }

  return true;
};
