import { 
  Transaction, CardTransaction, HometaxInvoice, HometaxCash, DbExpenseCategory 
} from "./types";

/**
 * 날짜 객체를 YYYY-MM-DD 포맷의 문자열로 변환
 */
export const getFormattedDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * 은행 조회를 위한 기본 시작 날짜 (1주일 전)
 */
export const getStartDateForBank = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return getFormattedDate(d);
};

/**
 * 홈택스 조회를 위한 기본 시작 날짜 (금년도 1월 1일)
 */
export const getStartDateForHometax = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
};

/**
 * 계정과목 대/중/소 3단 체계 역산 헬퍼
 */
export const getCategoryHierarchy = (
  subCat?: string,
  dbCategories?: DbExpenseCategory[]
): { main: string; mid: string; sub: string } => {
  const defaultMeta = { main: "기타", mid: "기타", sub: "-" };
  if (!subCat) return defaultMeta;

  // 1. DB 연동 데이터에서 소분류가 일치하는지 실시간 역탐색
  const dbMatch = dbCategories?.find((c) => c.sub_category === subCat);
  if (dbMatch) {
    return {
      main: dbMatch.main_category,
      mid: dbMatch.mid_category,
      sub: dbMatch.sub_category
    };
  }

  // 2. Fallback: 하드코딩 맵 기반 매핑 역탐색
  const ACCOUNT_CATEGORIES_MAP: Record<string, string[]> = {
    "판매비와관리비": ["복리후생비", "소모품비", "여비교통비", "임차료", "통신비", "세금과공과", "도서인쇄비", "회의비", "광고선전비", "교육훈련비", "차량유지비"],
    "제조/물류원가": ["외주가공비", "운반비", "포장비", "원재료비", "부재료비", "전력비", "가스수도비", "수선비", "임금", "잡급"],
    "영업외비용": ["이자비용", "기부금", "기타영업외비용"],
    "기타": ["잡손실", "기타소분류"]
  };

  for (const main of Object.keys(ACCOUNT_CATEGORIES_MAP)) {
    if (ACCOUNT_CATEGORIES_MAP[main].includes(subCat)) {
      return {
        main,
        mid: subCat, // 중분류명이 없는 전통적 맵일 땐 소분류명을 임시로 중분류로 활용
        sub: subCat
      };
    }
  }

  return {
    main: "기타",
    mid: "기타",
    sub: subCat
  };
};

/**
 * 대분류별 시각적 뱃지 스타일 헬퍼
 */
export const getCategoryBadgeStyle = (mainCat: string): string => {
  switch (mainCat) {
    case "판매비와관리비":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100/60";
    case "제조/물류원가":
      return "bg-indigo-50 text-indigo-700 border border-indigo-100/60";
    case "영업외비용":
      return "bg-amber-50 text-amber-700 border border-amber-100/60";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-200/60";
  }
};

/**
 * 자연어 규칙 미리보기 결과 엑셀 다운로드
 */
export const downloadPreviewExcel = async (previewList: any[]) => {
  if (previewList.length === 0) return;
  try {
    const XLSX = await import("xlsx");
    const headers = ["거래일자", "승인시간", "카드사", "카드번호", "가맹점명", "거래금액", "현재 계정과목", "매칭 후 계정과목", "태그"];
    const aoaData: any[][] = [headers];
    previewList.forEach(tx => {
      aoaData.push([
        tx.date,
        tx.time || "",
        tx.cardCompanyName || "",
        `'${tx.cardNumber || ""}`,
        tx.merchantName || "",
        tx.amount,
        tx.currentCategory || "",
        tx.targetCategory || "",
        tx.memo || ""
      ]);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "영향건_미리보기");
    XLSX.writeFile(workbook, `AI_정산규칙_적용_영향건_미리보기_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (e: any) {
    alert("엑셀 파일 생성 중 오류가 발생했습니다: " + e.message);
  }
};

/**
 * 은행거래내역 엑셀 다운로드
 */
export const downloadAccountsExcel = async (transactionList: Transaction[]) => {
  if (transactionList.length === 0) {
    alert("다운로드할 거래 내역 데이터가 없습니다.");
    return;
  }
  try {
    const XLSX = await import("xlsx");
    const headers = ["거래일자", "거래시간", "은행명", "계좌번호", "구분(입/출금)", "거래처/적요", "거래금액", "잔액", "계정과목", "태그"];
    const aoaData: any[][] = [headers];
    transactionList.forEach(tx => {
      aoaData.push([
        tx.date,
        tx.time || "",
        tx.bankName || "",
        `'${tx.accountNumber || ""}`,
        tx.type,
        tx.description || "",
        tx.amount,
        tx.balance || 0,
        tx.category || "미지정",
        tx.memo || ""
      ]);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "은행거래내역");
    XLSX.writeFile(workbook, `금융허브_은행거래내역_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (e: any) {
    alert("엑셀 파일 생성 중 오류가 발생했습니다: " + e.message);
  }
};

/**
 * 신용카드거래내역 엑셀 다운로드
 */
export const downloadCardsExcel = async (cardTxList: CardTransaction[]) => {
  if (cardTxList.length === 0) {
    alert("다운로드할 카드 승인 내역 데이터가 없습니다.");
    return;
  }
  try {
    const XLSX = await import("xlsx");
    const headers = ["승인일자", "승인시간", "카드사", "카드번호", "가맹점명", "승인금액", "상태", "계정과목", "승인번호", "태그"];
    const aoaData: any[][] = [headers];
    cardTxList.forEach(tx => {
      aoaData.push([
        tx.date,
        tx.time || "",
        tx.cardCompanyName || "",
        `'${tx.cardNumber || ""}`,
        tx.merchantName || "",
        tx.amount,
        tx.status || "",
        tx.category || "미지정",
        `'${tx.approvalNumber || ""}`,
        tx.memo || ""
      ]);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "카드승인내역");
    XLSX.writeFile(workbook, `금융허브_카드승인내역_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (e: any) {
    alert("엑셀 파일 생성 중 오류가 발생했습니다: " + e.message);
  }
};

/**
 * 국세청 세금계산서/계산서 엑셀 다운로드
 */
export const downloadHometaxInvoiceExcel = async (list: HometaxInvoice[], isExempt: boolean) => {
  const title = isExempt ? "계산서_면세" : "세금계산서";
  if (list.length === 0) {
    alert(`다운로드할 ${isExempt ? "계산서(면세)" : "세금계산서"} 내역 데이터가 없습니다.`);
    return;
  }
  try {
    const XLSX = await import("xlsx");
    const headers = ["발행일자", "공급자", "공급받는자", "품목명", "태그", "공급가액", "세액", "합계금액", "구분", "과세구분"];
    const aoaData: any[][] = [headers];
    list.forEach(tx => {
      aoaData.push([
        tx.issueDate,
        tx.supplierName || "",
        tx.buyerName || "",
        tx.itemName || "",
        tx.memo || "",
        tx.supplyAmount,
        tx.taxAmount,
        tx.totalAmount,
        tx.invoiceType,
        tx.taxType || ""
      ]);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, title);
    XLSX.writeFile(workbook, `금융허브_국세청_${title}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (e: any) {
    alert("엑셀 파일 생성 중 오류가 발생했습니다: " + e.message);
  }
};

/**
 * 국세청 현금영수증 엑셀 다운로드
 */
export const downloadHometaxCashExcel = async (cashReceiptList: HometaxCash[]) => {
  if (cashReceiptList.length === 0) {
    alert("다운로드할 현금영수증 내역 데이터가 없습니다.");
    return;
  }
  try {
    const XLSX = await import("xlsx");
    const headers = ["거래일자", "가맹점명", "용도", "태그", "공급가액", "세액", "합계금액", "승인번호"];
    const aoaData: any[][] = [headers];
    cashReceiptList.forEach(tx => {
      aoaData.push([
        tx.transactionDate,
        tx.franchiseName || "",
        tx.purpose || "",
        tx.memo || "",
        tx.supplyAmount,
        tx.taxAmount,
        tx.totalAmount,
        `'${tx.approvalNumber || ""}`
      ]);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "현금영수증");
    XLSX.writeFile(workbook, `금융허브_현금영수증_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (e: any) {
    alert("엑셀 파일 생성 중 오류가 발생했습니다: " + e.message);
  }
};
