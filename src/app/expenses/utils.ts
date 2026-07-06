// 지출 관리 AI 공통 유틸리티 헬퍼 함수
// 모든 설명과 주석은 한국어로 작성

// ⚡ 실시간 문자 바이트 계산 유틸리티 (SMS 80바이트 한글 40자 제한 지원)
export const getByteLength = (str: string): number => {
  let byteLength = 0;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode <= 127) {
      byteLength += 1;
    } else {
      byteLength += 2;
    }
  }
  return byteLength;
};

// 💰 원화 금액 실시간 한글 번역기 (지출결의서 서식 감성)
export const convertToKoreanNumber = (num: number): string => {
  if (!num || isNaN(num) || num <= 0) return "";
  const units = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const smallUnits = ["", "십", "백", "천"];
  const bigUnits = ["", "만", "억", "조"];
  
  let result = "";
  let numStr = Math.floor(num).toString();
  
  const chunks: string[] = [];
  while (numStr.length > 0) {
    chunks.push(numStr.slice(Math.max(0, numStr.length - 4), numStr.length));
    numStr = numStr.slice(0, Math.max(0, numStr.length - 4));
  }
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let chunkResult = "";
    for (let j = 0; j < chunk.length; j++) {
      const digit = Number(chunk[chunk.length - 1 - j]);
      if (digit > 0) {
        chunkResult = units[digit] + smallUnits[j] + chunkResult;
      }
    }
    chunkResult = chunkResult.replace("일십", "십").replace("일백", "백").replace("일천", "천");
    if (chunkResult) {
      result = chunkResult + bigUnits[i] + result;
    }
  }
  
  return result ? `일금 ${result}원 정` : "";
};

// 🏷️ 적요란 '@' 태그 파싱 헬퍼 함수
export const getTaggedInfo = (
  title: string,
  autocompleteData: {
    partners?: string[];
    staff?: string[];
    departments?: string[];
    projects?: string[];
  } | null,
  dbEmployees?: Array<{ name: string }>,
  dbDepartments?: Array<{ name: string }>,
  dbProjects?: Array<{ name: string }>
) => {
  if (!title) return { department: "-", staff: "-", project: "-" };
  const regex = /@([^\s@]+)/g;
  let match;
  let department = "-";
  let staff = "-";
  let project = "-";
  
  while ((match = regex.exec(title)) !== null) {
    const name = match[1];
    if (
      autocompleteData?.staff?.includes(name) ||
      dbEmployees?.some(e => e.name === name)
    ) {
      staff = name;
    } else if (
      autocompleteData?.departments?.includes(name) ||
      dbDepartments?.some(d => d.name === name)
    ) {
      department = name;
    } else if (
      autocompleteData?.projects?.includes(name) ||
      dbProjects?.some(p => p.name === name)
    ) {
      project = name;
    }
  }
  return { department, staff, project };
};
