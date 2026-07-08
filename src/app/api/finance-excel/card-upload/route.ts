export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import {
  queryTable,
  insertRows,
  executeSQL
} from "../../../../../egdesk-helpers";
import crypto from "crypto";
import * as xlsx from "xlsx";

// 🔑 세션 토큰 디코딩 및 격리 컨텍스트 획득 헬퍼
async function verifyUserRole() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Unknown';
    const username = payload.username as string || '';
    const tenantId = payload.tenant_id as string || 'default';
    
    const isAuthorized = role === 'SUPER_ADMIN' || role === 'SUB_OPERATOR' || role === 'PRESIDENT';
    
    return {
      isAuthorized,
      role,
      name,
      username,
      tenantId
    };
  } catch (e) {
    return { isAuthorized: false, role: 'SUB_OPERATOR', name: 'Unknown', username: '', tenantId: 'default' };
  }
}

function parseAmount(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

function cleanStr(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function cleanCardNumber(str: string): string {
  if (!str) return "";
  const cleaned = str.replace(/(BC카드|KB국민카드|KB카드|NH농협카드|NH카드|신한카드|삼성카드|현대카드|롯데카드|하나카드|\s)/g, "");
  return cleaned.replace(/-/g, "");
}

function normalizeHeader(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str).replace(/\s+/g, "").replace(/·/g, "");
}

function detectCardCompanyIdFromExcel(fileName: string, rawRows: any[][]): string {
  const fileUpper = fileName.toUpperCase();
  if (fileUpper.includes("신한")) return "shinhan-card";
  if (fileUpper.includes("국민") || fileUpper.includes("KB")) return "kb-card";
  if (fileUpper.includes("농협") || fileUpper.includes("NH")) return "nh-card";
  if (fileUpper.includes("비씨") || fileUpper.includes("BC")) return "bc-card";
  if (fileUpper.includes("하나") || fileUpper.includes("HANA")) return "hana-card";

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

  for (let i = 0; i < Math.min(rawRows.length, 12); i++) {
    const row = rawRows[i];
    if (!row || !Array.isArray(row)) continue;
    const normalizedHeaders = row.map(h => normalizeHeader(h));
    if (normalizedHeaders.includes("이용카드") && normalizedHeaders.includes("할부개월수")) return "shinhan-card";
    if (normalizedHeaders.includes("대표자성명") && normalizedHeaders.includes("승인시간")) return "kb-card";
    if (normalizedHeaders.includes("국내이용금액(원)") || normalizedHeaders.includes("취소여부")) return "nh-card";
    if (normalizedHeaders.includes("본부명") && normalizedHeaders.includes("카드소지자")) return "bc-card";
    if (normalizedHeaders.includes("이용일") && normalizedHeaders.includes("이용시간") && normalizedHeaders.includes("승인취소금액")) return "hana-card";
  }

  return "";
}

const cardNames: Record<string, string> = {
  "shinhan-card": "신한카드",
  "kb-card": "KB국민카드",
  "nh-card": "NH농협카드",
  "bc-card": "BC카드",
  "hana-card": "하나카드",
  "lotte-card": "롯데카드",
  "samsung-card": "삼성카드",
  "hyundai-card": "현대카드"
};

export async function POST(request: NextRequest) {
  try {
    const { isAuthorized, tenantId, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    let cardCompanyId = formData.get("cardCompanyId") as string;
    const accountId = formData.get("accountId") as string;

    if (!file) {
      return NextResponse.json({ success: false, error: "업로드된 카드 엑셀 파일이 없습니다." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      return NextResponse.json({ success: false, error: "엑셀 시트 데이터를 읽을 수 없습니다." }, { status: 400 });
    }

    const rawRows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });
    if (rawRows.length === 0) {
      return NextResponse.json({ success: false, error: "엑셀 시트가 비어 있습니다." }, { status: 400 });
    }

    const detectedId = detectCardCompanyIdFromExcel(file.name, rawRows);
    if (detectedId) {
      cardCompanyId = detectedId;
    }

    if (!cardCompanyId) {
      return NextResponse.json({ success: false, error: "업로드된 엑셀 분석 결과 어떤 카드사 자료인지 식별할 수 없습니다." }, { status: 400 });
    }

    let headerRowIndex = -1;
    let dataRows: any[][] = [];

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
      headerRowIndex = 10 - 1; 
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
      headerRowIndex = 6 - 1; 
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }

    const headerRow = rawRows[headerRowIndex];
    if (!headerRow || !Array.isArray(headerRow)) {
      return NextResponse.json({ success: false, error: "카드 엑셀 헤더 행을 감지할 수 없습니다." }, { status: 400 });
    }

    const headersNormalized = headerRow.map(h => normalizeHeader(h));
    const headerIndices: Record<string, number> = {};
    headersNormalized.forEach((header, index) => {
      if (header) {
        headerIndices[header] = index;
      }
    });

    dataRows = rawRows.slice(headerRowIndex + 1);
    const targetAccountId = accountId || `CARD-${cardCompanyId.toUpperCase().replace("-CARD", "")}`;

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // accounts 테이블에 연동 카드 계좌가 없다면 자동 개설
    try {
      const checkAccRes = await queryTable("excel_accounts", { filters: { id: targetAccountId, tenant_id: tenantId } });
      const checkAcc = checkAccRes.rows?.[0];
      if (!checkAcc) {
        const cardName = cardNames[cardCompanyId] || "신용카드";
        const uuid = `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await insertRows("excel_accounts", [{
          id: targetAccountId,
          bank_id: cardCompanyId,
          account_number: `CARD-${cardCompanyId.toUpperCase().replace("-CARD", "")}`,
          account_name: `${cardName} 자동등록 카드`,
          balance: 0,
          currency: 'KRW',
          tenant_id: tenantId,
          uuid: uuid,
          updated_at: nowStr,
          updated_by: username
        }]);
      }
    } catch (accErr: any) {
      console.warn("⚠️ Card DB auto account insertion warning:", accErr.message);
    }

    // 중복 방지 체크
    const existingIds = new Set<string>();
    try {
      const checkRes = await executeSQL(`SELECT id FROM excel_card_transactions WHERE tenant_id = '${tenantId}'`);
      if (checkRes && checkRes.rows) {
        checkRes.rows.forEach((r: any) => {
          if (r.id) existingIds.add(String(r.id));
        });
      }
    } catch (err: any) {
      console.warn("excel_card_transactions table read warning:", err.message);
    }

    let insertedCount = 0;
    const rowsToInsert: any[] = [];

    for (const row of dataRows) {
      if (!row || !Array.isArray(row) || row.length === 0) continue;
      const rowHasData = row.some((val) => val !== null && val !== undefined && String(val).trim() !== "");
      if (!rowHasData) continue;

      const getVal = (colName: string): string => {
        const idx = headerIndices[colName];
        if (idx === undefined || idx >= row.length) return "";
        const v = row[idx];
        return v === null || v === undefined ? "" : String(v).trim();
      };

      let cardNumber = "";
      let cardholderName = "";
      let usageType = "";
      let salesType = "";
      let approvalDate = "";
      let approvalTime = "00:00:00";
      let approvalNumber = "";
      let merchantName = "";
      let amount = 0;
      let memo = "";
      let status = "승인";

      if (cardCompanyId === "shinhan-card") {
        const dtVal = getVal("이용일시") || getVal("승인일시");
        if (!dtVal) continue;
        const cleanedDt = dtVal.replace(/\./g, "-");
        approvalDate = cleanedDt.split(" ")[0] || "";
        approvalTime = cleanedDt.split(" ")[1] || "00:00:00";
        cardNumber = cleanCardNumber(getVal("이용카드") || getVal("카드번호"));
        approvalNumber = getVal("승인번호");
        merchantName = getVal("가맹점명");
        amount = parseAmount(getVal("이용금액") || getVal("승인금액"));
        cardholderName = getVal("이용자명");
        usageType = getVal("이용구분");
        const cancelDate = getVal("취소일자");
        if (cancelDate || usageType.includes("취소")) {
          status = "취소";
        }
        memo = getVal("할부개월수") ? `${getVal("할부개월수")}개월 할부` : "";
      }
      else if (cardCompanyId === "kb-card") {
        const rawDate = getVal("승인일").replace(/\./g, "-");
        const rawTime = getVal("승인시간") || "00:00:00";
        if (!rawDate) continue;
        approvalDate = rawDate;
        approvalTime = rawTime;
        cardNumber = cleanCardNumber(getVal("카드번호"));
        approvalNumber = getVal("승인번호");
        merchantName = getVal("가맹점명");
        amount = parseAmount(getVal("승인금액"));
        cardholderName = getVal("대표자성명") || getVal("이용자명");
        usageType = getVal("승인구분");
        if (usageType.includes("취소") || getVal("상태").includes("취소")) {
          status = "취소";
        }
        memo = getVal("할부개월수") ? `${getVal("할부개월수")}개월 할부` : "";
      }
      else if (cardCompanyId === "nh-card") {
        const dtVal = getVal("이용일시");
        if (!dtVal) continue;
        const cleanedDt = dtVal.replace(/\./g, "-");
        approvalDate = cleanedDt.split(" ")[0] || "";
        approvalTime = cleanedDt.split(" ")[1] || "00:00:00";
        cardNumber = cleanCardNumber(getVal("이용카드"));
        approvalNumber = getVal("승인번호");
        merchantName = getVal("가맹점명");
        const domesticAmt = parseAmount(getVal("국내이용금액(원)") || getVal("승인금액"));
        const cancelAmt = parseAmount(getVal("취소금액"));
        if (cancelAmt > 0 || getVal("취소여부") === "Y" || getVal("취소여부") === "취소") {
          status = "취소";
          amount = cancelAmt || domesticAmt;
        } else {
          amount = domesticAmt;
        }
        cardholderName = getVal("사용자명") || getVal("이용자명");
        salesType = getVal("매출종류");
      }
      else if (cardCompanyId === "bc-card") {
        const rawDate = getVal("승인일자");
        const rawTime = getVal("승인시간");
        if (!rawDate) continue;
        let formattedDate = rawDate.replace(/\./g, "-");
        if (rawDate.length === 8) {
          formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
        }
        approvalDate = formattedDate;
        approvalTime = rawTime || "00:00:00";
        cardNumber = cleanCardNumber(getVal("카드번호"));
        approvalNumber = getVal("승인번호");
        merchantName = getVal("가맹점명");
        amount = parseAmount(getVal("승인금액"));
        cardholderName = getVal("카드소지자") || getVal("이용자명");
        if (getVal("상태").includes("취소") || getVal("구분").includes("취소")) {
          status = "취소";
        }
      }
      else if (cardCompanyId === "hana-card") {
        const rawDate = getVal("이용일") || getVal("승인일");
        if (!rawDate) continue;
        approvalDate = rawDate.replace(/\./g, "-");
        approvalTime = getVal("이용시간") || getVal("승인시간") || "00:00:00";
        cardNumber = cleanCardNumber(getVal("카드번호"));
        approvalNumber = getVal("승인번호");
        merchantName = getVal("가맹점명");
        amount = parseAmount(getVal("승인금액"));
        cardholderName = getVal("이용자명");
        if (getVal("승인구분").includes("취소") || parseAmount(getVal("승인취소금액")) > 0) {
          status = "취소";
        }
      }

      if (!approvalDate || !cardNumber) continue;

      const hashSeed = `${cardNumber}_${approvalDate}_${approvalTime}_${approvalNumber}_${amount}_${merchantName}`;
      const uniqueId = crypto.createHash("md5").update(hashSeed).digest("hex");

      if (!existingIds.has(uniqueId)) {
        const uuid = `tx-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        rowsToInsert.push({
          id: uniqueId,
          account_id: targetAccountId,
          card_company_id: cardCompanyId,
          card_number: cardNumber,
          cardholder_name: cardholderName,
          usage_type: usageType || "일시불",
          sales_type: salesType || "일반매출",
          approval_date: approvalDate,
          time: approvalTime,
          approval_number: approvalNumber,
          merchant_name: merchantName,
          amount: amount,
          status: status,
          memo: memo,
          category: "",
          tenant_id: tenantId,
          uuid: uuid,
          updated_at: nowStr,
          updated_by: username
        });
        insertedCount++;
      }
    }

    if (rowsToInsert.length > 0) {
      await insertRows("excel_card_transactions", rowsToInsert);
    }

    return NextResponse.json({
      success: true,
      message: "성공적으로 신용카드 승인내역 엑셀 파일을 적재하였습니다.",
      data: {
        parsedCount: dataRows.length,
        insertedCount
      }
    });
  } catch (error: any) {
    console.error("Card Excel Import Error:", error);
    return NextResponse.json({ success: false, error: error.message || "카드 엑셀 파일 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
