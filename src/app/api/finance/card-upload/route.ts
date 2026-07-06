export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import crypto from "crypto";
import { queryTable, insertRows, executeSQL } from "../../../../../egdesk-helpers";

// 금액 및 정수 파싱 헬퍼
function parseAmount(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

// 문자열 공백 정제 헬퍼
function cleanStr(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

// 카드번호 정화 헬퍼 (카드사 한글 프리픽스 제거 및 대시 기호 제거)
function cleanCardNumber(str: string): string {
  if (!str) return "";
  const cleaned = str.replace(/(BC카드|KB국민카드|KB카드|NH농협카드|NH카드|신한카드|삼성카드|현대카드|롯데카드|하나카드|\s)/g, "");
  return cleaned.replace(/-/g, "");
}

// 헤더 정규화 헬퍼
function normalizeHeader(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str).replace(/\s+/g, "").replace(/·/g, "");
}

// 파일명 및 엑셀 시트 내용으로부터 카드사를 스마트하게 자동 감지하는 헬퍼 함수
function detectCardCompanyIdFromExcel(fileName: string, rawRows: any[][]): string {
  const fileUpper = fileName.toUpperCase();
  
  // 1단계: 파일명 기반 판별
  if (fileUpper.includes("신한")) return "shinhan-card";
  if (fileUpper.includes("국민") || fileUpper.includes("KB")) return "kb-card";
  if (fileUpper.includes("농협") || fileUpper.includes("NH")) return "nh-card";
  if (fileUpper.includes("비씨") || fileUpper.includes("BC")) return "bc-card";
  if (fileUpper.includes("하나") || fileUpper.includes("HANA")) return "hana-card";

  // 2단계: 엑셀 내용(행 내 고유 셀 키워드 혹은 헤더 구성) 기반 판별
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i];
    if (!row || !Array.isArray(row)) continue;
    
    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      const valStr = String(cell).toUpperCase();
      
      if (valStr.includes("신한카드") || valStr.includes("신한")) return "shinhan-card";
      if (valStr.includes("국민카드") || valStr.includes("KB국민") || valStr.includes("KB카드")) return "kb-card";
      if (valStr.includes("농협카드") || valStr.includes("NH농협") || valStr.includes("NH카드")) return "nh-card";
      if (valStr.includes("BC카드") || valStr.includes("비씨카드")) return "bc-card";
      if (valStr.includes("하나카드")) return "hana-card";
    }
  }

  // 3단계: 헤더 컬럼 구조 기반 판별 (특징적인 헤더명)
  for (let i = 0; i < Math.min(rawRows.length, 12); i++) {
    const row = rawRows[i];
    if (!row || !Array.isArray(row)) continue;
    const normalizedHeaders = row.map(h => normalizeHeader(h));
    
    if (normalizedHeaders.includes("이용카드") && normalizedHeaders.includes("할부개월수")) {
      return "shinhan-card";
    }
    if (normalizedHeaders.includes("대표자성명") && normalizedHeaders.includes("승인시간")) {
      return "kb-card";
    }
    if (normalizedHeaders.includes("국내이용금액(원)") || normalizedHeaders.includes("취소여부")) {
      return "nh-card";
    }
    if (normalizedHeaders.includes("본부명") && normalizedHeaders.includes("카드소지자")) {
      return "bc-card";
    }
    if (normalizedHeaders.includes("이용일") && normalizedHeaders.includes("이용시간") && normalizedHeaders.includes("승인취소금액")) {
      return "hana-card";
    }
  }

  return "";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    let cardCompanyId = formData.get("cardCompanyId") as string; // 'shinhan-card', 'kb-card', 'nh-card', 'bc-card', 'hana-card'
    const accountId = formData.get("accountId") as string; // 연동할 카드/계좌 아이디

    if (!file) {
      return NextResponse.json(
        { success: false, error: "업로드된 카드 엑셀 파일이 없습니다." },
        { status: 400 }
      );
    }

    // 1. 엑셀 로딩 및 버퍼 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      return NextResponse.json(
        { success: false, error: "엑셀 시트 데이터를 읽을 수 없습니다." },
        { status: 400 }
      );
    }

    const rawRows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });
    if (rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "엑셀 시트가 비어 있습니다." },
        { status: 400 }
      );
    }

    // [스마트 카드사 자동 감지] 파일명 및 내용, 헤더 구조를 통해 카드사 자동 식별
    const detectedId = detectCardCompanyIdFromExcel(file.name, rawRows);
    if (detectedId) {
      console.log(`[Smart Card Detect] 감지된 카드사: ${detectedId} (기존 폼 데이터: ${cardCompanyId})`);
      cardCompanyId = detectedId;
    }

    if (!cardCompanyId) {
      return NextResponse.json(
        { success: false, error: "업로드된 엑셀 분석 결과 어떤 카드사 자료인지 식별할 수 없습니다. 파일명을 변경하거나 올바른 카드의 엑셀 파일을 업로드해 주세요." },
        { status: 400 }
      );
    }

    // 2. 카드사별 헤더 행 위치 스캔 및 식별자 초기화
    let headerRowIndex = -1;
    let dataRows: any[][] = [];

    // 신한, 국민, BC는 첫 10개 행 내에서 특정 고유 키워드를 매치해 헤더 행을 동적으로 오토스캔합니다.
    if (cardCompanyId === "shinhan-card") {
      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const row = rawRows[i];
        if (row && row.some(cell => {
          const h = normalizeHeader(cell);
          return h === "카드번호" || h === "승인일" || h === "이용일" || h === "승인금액" || h === "이용카드";
        })) {
          headerRowIndex = i;
          break;
        }
      }
    } 
    else if (cardCompanyId === "kb-card") {
      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const row = rawRows[i];
        if (row && row.some(cell => normalizeHeader(cell) === "승인일") && row.some(cell => normalizeHeader(cell) === "카드번호")) {
          headerRowIndex = i;
          break;
        }
      }
    } 
    else if (cardCompanyId === "nh-card") {
      headerRowIndex = 10 - 1; // 농협은 고정 10행 (0-based 9)
    } 
    else if (cardCompanyId === "bc-card") {
      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const row = rawRows[i];
        if (row && row.some(cell => normalizeHeader(cell) === "카드번호") && row.some(cell => normalizeHeader(cell) === "승인금액")) {
          headerRowIndex = i;
          break;
        }
      }
    } 
    else if (cardCompanyId === "hana-card") {
      headerRowIndex = 6 - 1; // 하나는 고정 6행 (0-based 5)
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }

    const headerRow = rawRows[headerRowIndex];
    if (!headerRow || !Array.isArray(headerRow)) {
      return NextResponse.json(
        { success: false, error: "카드 엑셀 헤더 행을 감지할 수 없습니다." },
        { status: 400 }
      );
    }

    const headersNormalized = headerRow.map(h => normalizeHeader(h));
    const headerIndices: Record<string, number> = {};
    headersNormalized.forEach((header, index) => {
      if (header) {
        headerIndices[header] = index;
      }
    });

    dataRows = rawRows.slice(headerRowIndex + 1);
    const targetAccountId = accountId || "CARD-IMPORT";

    // [SQLite 외래 키 방어 로직] accounts 테이블에 카드가 계좌로서 실제로 존재하는지 조회하고, 없으면 수동 개설(폴백)합니다.
    try {
      const checkAccRes = await queryTable("accounts", { filters: { id: targetAccountId } });
      const checkAcc = checkAccRes.rows?.[0];
      if (!checkAcc) {
        console.log(`[Card DB Fallback] accounts에 연동 카드 계좌가 없어 자동 폴백 삽입합니다: ${targetAccountId}`);
        const cardNames: Record<string, string> = {
          "shinhan-card": "신한카드",
          "kb-card": "KB국민카드",
          "nh-card": "NH농협카드",
          "bc-card": "BC카드",
          "hana-card": "하나카드",
          "samsung-card": "삼성카드",
          "hyundai-card": "현대카드"
        };
        const cardName = cardNames[cardCompanyId] || "신용카드";
        
        await insertRows("accounts", [{
          id: targetAccountId,
          bank_id: cardCompanyId,
          account_number: `CARD-${cardCompanyId.toUpperCase().replace("-CARD", "")}`,
          account_name: `${cardName} 자동등록 카드`,
          balance: 0,
          currency: 'KRW',
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
      }
    } catch (accErr: any) {
      console.warn("⚠️ Card DB auto account insertion warning:", accErr.message);
    }

    // 기존 card_transactions ID 목록 로드하여 중복 제외
    const existingIds = new Set<string>();
    try {
      const checkRes = await executeSQL("SELECT id FROM card_transactions");
      if (checkRes && checkRes.rows) {
        checkRes.rows.forEach((r: any) => {
          if (r.id) existingIds.add(String(r.id));
        });
      }
    } catch (err: any) {
      console.warn("card_transactions table read warning:", err.message);
    }

    let insertedCount = 0;
    const rowsToInsert: any[] = [];

    for (const row of dataRows) {
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      // 행의 유효성 검사 (모두 비어있는 경우 스킵)
      const rowHasData = row.some((val) => val !== null && val !== undefined && String(val).trim() !== "");
      if (!rowHasData) continue;

      const getVal = (colName: string): string => {
        const idx = headerIndices[colName];
        if (idx === undefined || idx >= row.length) return "";
        const v = row[idx];
        return v === null || v === undefined ? "" : String(v).trim();
      };

      let headquartersName = "";
      let departmentName = "";
      let cardNumber = "";
      let cardType = "법인";
      let cardholderName = "";
      let transactionBank = "";
      let usageType = "";
      let salesType = "";
      let approvalDatetime = "";
      let approvalDate = "";
      let billingDate = "";
      let approvalNumber = "";
      let merchantName = "";
      let amount = 0;
      let foreignAmountUsd = 0;
      let memo = "";
      let isCancelled = 0;

      // ==========================================
      // CARD A. 신한카드 (shinhan-card)
      // ==========================================
      if (cardCompanyId === "shinhan-card") {
        const dtVal = getVal("이용일시") || getVal("승인일시");
        if (!dtVal) continue;
        
        // 이용일시 YYYY.MM.DD HH:MM:SS -> 가공
        const cleanedDt = dtVal.replace(/\./g, "-");
        approvalDatetime = cleanedDt;
        approvalDate = cleanedDt.split(" ")[0] || "";

        cardNumber = cleanCardNumber(getVal("이용카드") || getVal("카드번호"));
        if (!cardNumber) continue;

        approvalNumber = getVal("승인번호");
        merchantName = getVal("가맹점명");
        amount = parseAmount(getVal("이용금액") || getVal("승인금액"));
        cardholderName = getVal("이용자명");
        usageType = getVal("이용구분");
        cardType = getVal("카드구분") || "법인";
        billingDate = getVal("결제예정일").replace(/\./g, "-");

        const cancelDate = getVal("취소일자");
        if (cancelDate || usageType.includes("취소")) {
          isCancelled = 1;
          amount = -Math.abs(amount); // 취소는 음수 처리
        }

        memo = getVal("할부개월수") ? `${getVal("할부개월수")}개월 할부` : "";
      }
      // ==========================================
      // CARD B. KB국민카드 (kb-card)
      // ==========================================
      else if (cardCompanyId === "kb-card") {
        const rawDate = getVal("승인일").replace(/\./g, "-");
        const rawTime = getVal("승인시간") || "00:00:00";
        if (!rawDate) continue;

        approvalDate = rawDate;
        approvalDatetime = `${rawDate} ${rawTime}`;

        cardNumber = cleanCardNumber(getVal("카드번호"));
        if (!cardNumber) continue;

        approvalNumber = getVal("승인번호");
        merchantName = getVal("가맹점명");
        amount = parseAmount(getVal("승인금액"));
        departmentName = getVal("부서명");
        
        // 국민은 대표자성명이 이용자 성격
        cardholderName = getVal("대표자성명") || getVal("이용자명");
        usageType = getVal("승인구분");
        billingDate = getVal("결제예정일") ? getVal("결제예정일").replace(/\./g, "-") : "";

        if (usageType.includes("취소") || getVal("상태").includes("취소")) {
          isCancelled = 1;
          amount = -Math.abs(amount);
        }

        memo = getVal("할부개월수") ? `${getVal("할부개월수")}개월 할부` : "";
      }
      // ==========================================
      // CARD C. NH농협카드 (nh-card)
      // ==========================================
      else if (cardCompanyId === "nh-card") {
        const dtVal = getVal("이용일시");
        if (!dtVal) continue;

        const cleanedDt = dtVal.replace(/\./g, "-");
        approvalDatetime = cleanedDt;
        approvalDate = cleanedDt.split(" ")[0] || "";

        cardNumber = cleanCardNumber(getVal("이용카드"));
        if (!cardNumber) continue;

        approvalNumber = getVal("승인번호");
        merchantName = getVal("가맹점명");
        
        const domesticAmt = parseAmount(getVal("국내이용금액(원)") || getVal("승인금액"));
        const cancelAmt = parseAmount(getVal("취소금액"));
        
        if (cancelAmt > 0 || getVal("취소여부") === "Y" || getVal("취소여부") === "취소") {
          isCancelled = 1;
          amount = -Math.abs(cancelAmt || domesticAmt);
        } else {
          amount = domesticAmt;
        }

        cardholderName = getVal("사용자명") || getVal("이용자명");
        salesType = getVal("매출종류");
        billingDate = getVal("결제일") ? getVal("결제일").replace(/\./g, "-") : "";
      }
      // ==========================================
      // CARD D. BC카드 (bc-card)
      // ==========================================
      else if (cardCompanyId === "bc-card") {
        const rawDate = getVal("승인일자");
        const rawTime = getVal("승인시간");
        if (!rawDate) continue;

        let formattedDate = rawDate.replace(/\./g, "-");
        if (rawDate.length === 8) {
          formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
        }
        approvalDate = formattedDate;

        let formattedTime = "00:00:00";
        if (rawTime) {
          const cleanTime = rawTime.replace(/\s+/g, "");
          if (cleanTime.includes(":")) {
            const parts = cleanTime.split(":");
            if (parts.length === 3) {
              formattedTime = cleanTime; // HH:MM:SS
            } else if (parts.length === 2) {
              formattedTime = `${cleanTime}:00`; // HH:MM -> HH:MM:00
            }
          } else {
            if (cleanTime.length === 6) {
              formattedTime = `${cleanTime.substring(0, 2)}:${cleanTime.substring(2, 4)}:${cleanTime.substring(4, 6)}`;
            } else if (cleanTime.length === 4) {
              formattedTime = `${cleanTime.substring(0, 2)}:${cleanTime.substring(2, 4)}:00`;
            }
          }
        }
        approvalDatetime = `${formattedDate} ${formattedTime}`;

        cardNumber = cleanCardNumber(getVal("카드번호"));
        if (!cardNumber) continue;

        headquartersName = getVal("본부명");
        departmentName = getVal("부서명");
        cardType = getVal("카드구분") || "법인";
        cardholderName = getVal("카드소지자") || getVal("카드소지자명");
        transactionBank = getVal("거래은행");
        usageType = getVal("사용구분");
        salesType = getVal("매출종류");
        approvalNumber = getVal("승인번호");
        merchantName = getVal("가맹점명/국가명") || getVal("가맹점명");
        
        amount = parseAmount(getVal("승인금액") || getVal("이용금액"));

        if (salesType.includes("취소") || salesType.includes("매입취소")) {
          isCancelled = 1;
          amount = -Math.abs(amount);
        }

        // 해외 이용금액 환산
        const usdVal = parseAmount(getVal("해외승인원화금액"));
        if (usdVal > 0) {
          const exRate = parseAmount(getVal("환율")) || 1350;
          foreignAmountUsd = usdVal / exRate;
        }
      }
      // ==========================================
      // CARD E. 하나카드 (hana-card)
      // ==========================================
      else if (cardCompanyId === "hana-card") {
        const rawDate = getVal("이용일");
        const rawTime = getVal("이용시간");
        if (!rawDate) continue;

        let formattedDate = rawDate.replace(/\./g, "-");
        if (rawDate.length === 8 && !rawDate.includes("-")) {
          formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
        }
        approvalDate = formattedDate;

        let formattedTime = "00:00:00";
        if (rawTime.length === 6) {
          formattedTime = `${rawTime.substring(0, 2)}:${rawTime.substring(2, 4)}:${rawTime.substring(4, 6)}`;
        }
        approvalDatetime = `${formattedDate} ${formattedTime}`;

        cardNumber = cleanCardNumber(getVal("카드번호"));
        if (!cardNumber) continue;

        approvalNumber = getVal("승인번호");
        merchantName = getVal("가맹점명");
        amount = parseAmount(getVal("승인금액"));
        usageType = getVal("이용구분");
        
        const cancelAmt = parseAmount(getVal("승인취소금액"));
        const status = getVal("상태");

        if (cancelAmt > 0 || status.includes("취소") || status.includes("승인취소")) {
          isCancelled = 1;
          amount = -Math.abs(cancelAmt || amount);
        }
      }

      // 고유 식별 MD5 해시 아이디 생성 (카드번호 + 승인날짜 + 승인번호 + 이용금액 + 가맹점명 조합)
      const hashSeed = `${cardNumber}_${approvalDate}_${approvalNumber}_${amount}_${merchantName}`;
      const uniqueId = crypto.createHash("md5").update(hashSeed).digest("hex");

      // 중복 체크 및 저장 대상 추가
      if (!existingIds.has(uniqueId)) {
        rowsToInsert.push({
          id: uniqueId,
          account_id: targetAccountId,
          card_company_id: cardCompanyId,
          headquarters_name: headquartersName,
          department_name: departmentName,
          card_number: cardNumber,
          card_type: cardType,
          cardholder_name: cardholderName,
          transaction_bank: transactionBank,
          usage_type: usageType,
          sales_type: salesType,
          approval_datetime: approvalDatetime,
          approval_date: approvalDate,
          billing_date: billingDate,
          approval_number: approvalNumber,
          merchant_name: merchantName,
          amount: amount,
          foreign_amount_usd: foreignAmountUsd,
          memo: memo,
          category: "",
          is_cancelled: isCancelled,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        insertedCount++;
      }
    }

    if (rowsToInsert.length > 0) {
      await insertRows('card_transactions', rowsToInsert);
    }

    return NextResponse.json({
      success: true,
      message: "성공적으로 카드 이용 내역을 매핑 및 적재 처리하였습니다.",
      data: {
        cardCompanyId,
        accountId: targetAccountId,
        parsedCount: dataRows.length,
        insertedCount
      }
    });
  } catch (error: any) {
    console.error("Card Excel Upload API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "카드 엑셀 파싱 및 이지데스크 서버 전송 중 시스템 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
