/**
 * 데이터 유효성 검증 및 정규화(Sanitization) 공통 유틸리티
 * 날짜, 금액, 사업자등록번호, 이메일, 승인번호 검증 가드
 */

export interface ValidationResult<T> {
  value: T;
  isValid: boolean;
  warning?: string;
}

/**
 * 1. 날짜 정규화 및 유효성 검사
 */
export function sanitizeDate(raw: any): ValidationResult<string> {
  if (raw === null || raw === undefined) {
    return { value: '', isValid: false, warning: '날짜 데이터 없음' };
  }

  let str = String(raw).trim();
  if (!str) {
    return { value: '', isValid: false, warning: '빈 날짜 값' };
  }

  // 엑셀 시리얼 번호 (예: 45678)
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    if (serial >= 30000 && serial <= 60000) {
      const utcDays = Math.floor(serial - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      const y = dateInfo.getUTCFullYear();
      const m = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dateInfo.getUTCDate()).padStart(2, '0');
      return { value: `${y}-${m}-${d}`, isValid: true };
    }
  }

  // 숫자가 10자리 이상인 경우 일련번호/승인번호로 판단하여 차단
  const digitsOnly = str.replace(/\D/g, '');
  if (digitsOnly.length > 8 && !str.includes('-') && !str.includes('.') && !str.includes('/')) {
    return {
      value: '',
      isValid: false,
      warning: `날짜 형식이 아님 (긴 일련번호/승인번호 감지: ${str})`
    };
  }

  let year = 0;
  let month = 0;
  let day = 0;

  if (digitsOnly.length === 8) {
    year = parseInt(digitsOnly.substring(0, 4), 10);
    month = parseInt(digitsOnly.substring(4, 6), 10);
    day = parseInt(digitsOnly.substring(6, 8), 10);
  } else {
    const parts = str.split(/[-./]/).map((p) => p.trim());
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
  }

  if (year < 1970 || year > 2099) {
    return { value: str, isValid: false, warning: `유효하지 않은 연도 (${year}년)` };
  }

  if (month < 1 || month > 12) {
    return { value: str, isValid: false, warning: `유효하지 않은 월 (${month}월)` };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return { value: str, isValid: false, warning: `${year}년 ${month}월에 존재하지 않는 일자 (${day}일)` };
  }

  const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { value: formatted, isValid: true };
}

/**
 * 2. 금액 및 숫자 정규화
 */
export function sanitizeAmount(raw: any): ValidationResult<number> {
  if (typeof raw === 'number') {
    if (isNaN(raw) || !isFinite(raw)) return { value: 0, isValid: false, warning: '숫자가 아님' };
    return { value: Math.floor(raw), isValid: true };
  }

  if (!raw) return { value: 0, isValid: true };

  let str = String(raw).trim();
  if (str.startsWith('(') && str.endsWith(')')) {
    str = '-' + str.slice(1, -1);
  }

  const numStr = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(numStr);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return { value: 0, isValid: false, warning: '유효한 금액 형식이 아님' };
  }

  return { value: Math.floor(parsed), isValid: true };
}

/**
 * 3. 공급가액 / 세액 / 합계금액 삼각 교차 검증 및 보정
 */
export function reconcileAmounts(
  supplyAmt: number,
  taxAmt: number,
  totalAmt: number
): {
  supply: number;
  tax: number;
  total: number;
  isBalanced: boolean;
  warning?: string;
} {
  let supply = supplyAmt || 0;
  let tax = taxAmt || 0;
  let total = totalAmt || 0;

  if (!supply && total) {
    supply = total - tax;
  }
  if (!total && supply) {
    total = supply + tax;
  }
  if (!tax && total > supply && supply > 0) {
    tax = total - supply;
  }

  const expectedTotal = supply + tax;
  const isBalanced = Math.abs(expectedTotal - total) <= 1;

  return {
    supply,
    tax,
    total,
    isBalanced,
    warning: !isBalanced ? `금액 불일치 (공급가액 ${supply.toLocaleString()} + 세액 ${tax.toLocaleString()} ≠ 합계 ${total.toLocaleString()})` : undefined
  };
}

/**
 * 4. 사업자등록번호 유효성 검사 및 정규화
 */
export function sanitizeBusinessNumber(raw: any): {
  value: string;
  formatted: string;
  isValid: boolean;
  warning?: string;
} {
  if (!raw) return { value: '', formatted: '', isValid: false, warning: '사업자번호 누락' };

  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) {
    const formatted = `${digits.substring(0, 3)}-${digits.substring(3, 5)}-${digits.substring(5, 10)}`;
    return { value: digits, formatted, isValid: true };
  }

  if (digits.length === 13) {
    const formatted = `${digits.substring(0, 6)}-${digits.substring(6, 13)}`;
    return { value: digits, formatted, isValid: true };
  }

  return { value: String(raw).trim(), formatted: String(raw).trim(), isValid: false, warning: `10자리 사업자등록번호가 아님 (${raw})` };
}

/**
 * 5. 이메일 주소 유효성 검사
 */
export function sanitizeEmail(raw: any): ValidationResult<string> {
  if (!raw) return { value: '', isValid: false, warning: '이메일 없음' };

  const str = String(raw).trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const isValid = emailRegex.test(str);

  return { value: isValid ? str : '', isValid, warning: !isValid ? `올바른 이메일 형식이 아님 (${str})` : undefined };
}

/**
 * 6. 전화번호 / 휴대전화 유효성 검사 및 정규화
 * - 010-XXXX-XXXX 또는 지역번호 포맷 변환
 */
export function sanitizePhoneNumber(raw: any): {
  value: string;
  formatted: string;
  isValid: boolean;
  warning?: string;
} {
  if (!raw) return { value: '', formatted: '', isValid: false, warning: '전화번호 없음' };

  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11) {
    const formatted = `${digits.substring(0, 3)}-${digits.substring(3, 7)}-${digits.substring(7, 11)}`;
    return { value: digits, formatted, isValid: true };
  } else if (digits.length === 10) {
    // 02-XXXX-XXXX or 01X-XXX-XXXX
    if (digits.startsWith('02')) {
      const formatted = `${digits.substring(0, 2)}-${digits.substring(2, 6)}-${digits.substring(6, 10)}`;
      return { value: digits, formatted, isValid: true };
    } else {
      const formatted = `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
      return { value: digits, formatted, isValid: true };
    }
  } else if (digits.length >= 8 && digits.length <= 12) {
    return { value: digits, formatted: String(raw).trim(), isValid: true };
  }

  return { value: digits, formatted: String(raw).trim(), isValid: false, warning: `올바른 전화번호가 아님 (${raw})` };
}

/**
 * 7. 수량(Quantity) 유효성 검사
 */
export function sanitizeQuantity(raw: any): ValidationResult<number> {
  if (typeof raw === 'number') {
    if (isNaN(raw) || !isFinite(raw)) return { value: 0, isValid: false, warning: '유효한 수량이 아님' };
    return { value: raw, isValid: true };
  }

  if (!raw) return { value: 0, isValid: true };

  const numStr = String(raw).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(numStr);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return { value: 0, isValid: false, warning: `수량 변환 실패 (${raw})` };
  }

  return { value: parsed, isValid: true };
}

/**
 * 8. 품목 바코드 / 품목코드 유효성 검사
 */
export function sanitizeBarcode(raw: any): ValidationResult<string> {
  if (!raw) return { value: '', isValid: false, warning: '바코드/품목코드 없음' };
  const str = String(raw).trim();
  const isValid = str.length >= 2;
  return { value: str, isValid };
}
