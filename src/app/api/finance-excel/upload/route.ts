export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import {
  queryTable,
  insertRows,
  updateRows,
  executeSQL
} from "../../../../../egdesk-helpers";
import crypto from "crypto";
import * as xlsx from "xlsx";

const safeArray = <T>(arr: any): T[] => Array.isArray(arr) ? arr : [];

// 🔑 세션 토큰 디코딩 및 격리 컨텍스트 획득 헬퍼
async function verifyUserRole() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return { isAuthorized: true, role: 'TENANT_ADMIN', name: 'Admin', username: 'admin', tenantId: 'tenant-admin-id-1111' };
    
    const payload = decodeJwt(token);
    const role = (payload.role as string || '').toUpperCase();
    const name = payload.name as string || payload.username as string || 'Admin';
    const username = payload.username as string || '';
    const tenantId = payload.tenant_id as string || 'tenant-admin-id-1111';
    
    return {
      isAuthorized: true,
      role: role || 'TENANT_ADMIN',
      name,
      username,
      tenantId
    };
  } catch (e) {
    return { isAuthorized: true, role: 'TENANT_ADMIN', name: 'Admin', username: 'admin', tenantId: 'tenant-admin-id-1111' };
  }
}

function normalizeHeader(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str).replace(/\s+/g, "").replace(/·/g, "");
}

function detectBankIdFromExcel(fileName: string, sheet: xlsx.WorkSheet): string {
  const fileUpper = fileName.toUpperCase();
  if (fileUpper.includes("신한")) return "shinhan";
  if (fileUpper.includes("하나")) return "hana";
  if (fileUpper.includes("국민") || fileUpper.includes("KB")) return "kookmin";
  if (fileUpper.includes("기업") || fileUpper.includes("IBK")) return "ibk";
  if (fileUpper.includes("우리")) return "woori";
  if (fileUpper.includes("농협") || fileUpper.includes("NH")) return "nh";
  if (fileUpper.includes("SERP")) return "serp";

  for (const cellRef in sheet) {
    if (cellRef.startsWith("!")) continue;
    const cell = sheet[cellRef];
    if (cell && cell.v) {
      const valStr = String(cell.v).toUpperCase();
      if (valStr.includes("신한은행") || valStr.includes("신한")) return "shinhan";
      if (valStr.includes("하나은행") || valStr.includes("하나")) return "hana";
      if (valStr.includes("국민은행") || valStr.includes("국민") || valStr.includes("KB")) return "kookmin";
      if (valStr.includes("기업은행") || valStr.includes("IBK")) return "ibk";
      if (valStr.includes("우리은행") || valStr.includes("우리")) return "woori";
      if (valStr.includes("농협은행") || valStr.includes("농협") || valStr.includes("NH")) return "nh";
    }
  }
  return "";
}

function parseAmount(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDateTime(
  style: string,
  value: string,
  fallbackTime = "00:00:00"
): { date: string; time: string } {
  if (!value) return { date: "", time: fallbackTime };
  const cleaned = String(value).trim();

  if (style === "shinhan14") {
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length >= 8) {
      const date = `${digits.substring(0, 4)}-${digits.substring(4, 6)}-${digits.substring(6, 8)}`;
      let time = fallbackTime;
      if (digits.length >= 14) {
        time = `${digits.substring(8, 10)}:${digits.substring(10, 12)}:${digits.substring(12, 14)}`;
      } else if (digits.length >= 12) {
        time = `${digits.substring(8, 10)}:${digits.substring(10, 12)}:00`;
      }
      return { date, time };
    }
  }

  if (style === "hanaSpace" || style === "kbSpace" || style === "wooriSpace") {
    const parts = cleaned.split(/\s+/);
    let dateStr = parts[0] || "";
    let timeStr = parts[1] || fallbackTime;

    dateStr = dateStr.replace(/\./g, "-");
    if (dateStr.endsWith("-")) {
      dateStr = dateStr.slice(0, -1);
    }

    const timeParts = timeStr.split(":");
    if (timeParts.length === 2) {
      timeStr = `${timeParts[0]}:${timeParts[1]}:00`;
    }
    return { date: dateStr, time: timeStr };
  }

  let dateStr = cleaned.replace(/\./g, "-");
  if (dateStr.endsWith("-")) {
    dateStr = dateStr.slice(0, -1);
  }
  return { date: dateStr, time: fallbackTime };
}

const bankNames: Record<string, string> = {
  shinhan: "신한은행",
  hana: "하나은행",
  kookmin: "KB국민은행",
  ibk: "IBK기업은행",
  woori: "우리은행",
  nh: "NH농협은행"
};

export async function POST(request: NextRequest) {
  try {
    const { isAuthorized, tenantId, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    let bankId = formData.get("bankId") as string;
    const accountId = formData.get("accountId") as string;

    if (!file) {
      return NextResponse.json({ success: false, error: "업로드된 엑셀 파일이 존재하지 않습니다." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return NextResponse.json({ success: false, error: "엑셀 시트 데이터를 읽을 수 없습니다." }, { status: 400 });
    }

    const detectedBankId = detectBankIdFromExcel(file.name, sheet);
    if (detectedBankId) {
      bankId = detectedBankId;
    }

    if (!bankId) {
      return NextResponse.json({ success: false, error: "엑셀 파일 분석 결과 은행 코드를 판별할 수 없습니다. 파일명이나 내용을 확인해 주세요." }, { status: 400 });
    }

    // 엑셀 내 계좌번호 자동 감지
    let extractedAccountNumber = "";
    for (const cellRef in sheet) {
      if (cellRef.startsWith("!")) continue;
      const cell = sheet[cellRef];
      if (cell && cell.v) {
        const valStr = String(cell.v).trim();
        const match = valStr.match(/\b\d{3,6}-\d{2,6}-\d{3,7}\b/);
        if (match) {
          extractedAccountNumber = match[0].replace(/\D/g, "");
          break;
        }
        const numMatch = valStr.match(/\b\d{10,15}\b/);
        if (numMatch) {
          extractedAccountNumber = numMatch[0];
          break;
        }
      }
    }

    if (!extractedAccountNumber && file.name) {
      const match = file.name.match(/\b\d{3,6}-\d{2,6}-\d{3,7}\b/);
      if (match) extractedAccountNumber = match[0].replace(/\D/g, "");
    }

    // 계좌 매핑 및 자동 생성 준비
    const accountsRes = await queryTable('excel_accounts', { filters: { tenant_id: tenantId } });
    const accounts = safeArray<any>(accountsRes?.rows || []);
    let targetAccount = accounts.find((acc: any) => acc.id === accountId);

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    if (!targetAccount && bankId !== "serp") {
      const accountNumber = extractedAccountNumber || `MANUAL-IMPORT-${bankId.toUpperCase()}`;
      const cleanedAccNum = accountNumber.replace(/\D/g, "");
      
      targetAccount = accounts.find((acc: any) => 
        acc.bank_id === bankId && 
        acc.account_number.replace(/\D/g, "") === cleanedAccNum
      );

      if (!targetAccount) {
        const bankName = bankNames[bankId] || "수동연동";
        const newAccId = `${bankId.toUpperCase()}-${cleanedAccNum}`;
        const uuid = `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await insertRows('excel_accounts', [{
          id: newAccId,
          bank_id: bankId,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: `${bankName} 자동등록 계좌`,
          balance: 0,
          currency: "KRW",
          tenant_id: tenantId,
          uuid: uuid,
          updated_at: nowStr,
          updated_by: username
        }]);

        const updatedAccountsRes = await queryTable('excel_accounts', { filters: { tenant_id: tenantId } });
        const updatedAccounts = safeArray<any>(updatedAccountsRes?.rows || []);
        targetAccount = updatedAccounts.find((acc: any) => acc.id === newAccId);
      }
    }

    const accountData = {
      accountNumber: (targetAccount?.account_number || extractedAccountNumber || `MANUAL-IMPORT-${bankId.toUpperCase()}`).replace(/\D/g, ""),
      accountName: targetAccount?.account_name || "자동 임포트 계좌",
      balance: targetAccount?.balance || 0
    };

    const rawRows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });
    let headerRowIndex = 0;
    let datetimeStyle = "";

    switch (bankId) {
      case "shinhan":
        headerRowIndex = 1 - 1;
        datetimeStyle = "shinhan14";
        break;
      case "hana":
        headerRowIndex = 7 - 1;
        datetimeStyle = "hanaSpace";
        break;
      case "kookmin":
        headerRowIndex = 7 - 1;
        datetimeStyle = "kbSpace";
        break;
      case "ibk":
        headerRowIndex = 3 - 1;
        datetimeStyle = "hanaSpace";
        break;
      case "woori":
        headerRowIndex = 4 - 1;
        datetimeStyle = "wooriSpace";
        break;
      case "nh":
        headerRowIndex = 10 - 1;
        datetimeStyle = "none";
        break;
      case "serp":
        headerRowIndex = 6 - 1;
        datetimeStyle = "none";
        break;
      default:
        return NextResponse.json({ success: false, error: "지원하지 않는 은행 코드입니다." }, { status: 400 });
    }

    if (rawRows.length <= headerRowIndex) {
      return NextResponse.json({ success: false, error: `엑셀 행 수가 지정된 헤더 위치보다 적습니다.` }, { status: 400 });
    }

    const headerRow = rawRows[headerRowIndex];
    if (!headerRow || !Array.isArray(headerRow)) {
      return NextResponse.json({ success: false, error: "엑셀 헤더 행을 읽을 수 없습니다." }, { status: 400 });
    }

    const headersNormalized = headerRow.map((h: any) => normalizeHeader(h));
    const headerIndices: Record<string, number> = {};
    headersNormalized.forEach((header, index) => {
      if (header) {
        headerIndices[header] = index;
      }
    });

    const transactions: any[] = [];
    const dataRows = rawRows.slice(headerRowIndex + 1);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const rowHasData = row.some((val) => val !== null && val !== undefined && String(val).trim() !== "");
      if (!rowHasData) continue;

      const getVal = (colName: string): string => {
        const idx = headerIndices[colName];
        if (idx === undefined || idx >= row.length) return "";
        const v = row[idx];
        return v === null || v === undefined ? "" : String(v).trim();
      };

      let txDate = "";
      let txTime = "00:00:00";
      let description = "";
      let deposit = 0;
      let withdrawal = 0;
      let balance = 0;
      let branch = "";
      let counterpartyAccount = "";
      let counterparty = "";
      const extra: Record<string, string> = {};

      if (bankId === "shinhan") {
        const dtVal = getVal("거래일시");
        if (!dtVal) continue;
        const dt = parseDateTime(datetimeStyle, dtVal);
        txDate = dt.date;
        txTime = dt.time;
        description = getVal("적요");
        deposit = parseAmount(getVal("입금액"));
        withdrawal = parseAmount(getVal("출금액"));
        balance = parseAmount(getVal("잔액"));
        branch = getVal("거래점명");
        extra["내용"] = getVal("내용");
      } 
      else if (bankId === "hana") {
        const dtVal = getVal("거래일시");
        if (!dtVal) continue;
        const dt = parseDateTime(datetimeStyle, dtVal);
        txDate = dt.date;
        txTime = dt.time;
        description = getVal("적요");
        deposit = parseAmount(getVal("입금"));
        withdrawal = parseAmount(getVal("출금"));
        balance = parseAmount(getVal("거래후잔액"));
        branch = getVal("거래점");
        counterparty = getVal("의뢰인/수취인") || getVal("의뢰인수취인");
        extra["거래특이사항"] = getVal("거래특이사항");
        extra["추가메모"] = getVal("추가메모");
        extra["구분"] = getVal("구분");
      } 
      else if (bankId === "kookmin") {
        const dtVal = getVal("거래일시");
        if (!dtVal) continue;
        const dt = parseDateTime(datetimeStyle, dtVal);
        txDate = dt.date;
        txTime = dt.time;
        counterparty = getVal("보낸분/받는분") || getVal("보낸분받는분");
        description = getVal("적요");
        deposit = parseAmount(getVal("입금액(원)"));
        withdrawal = parseAmount(getVal("출금액(원)"));
        balance = parseAmount(getVal("잔액(원)"));
        branch = getVal("처리점");
        extra["내통장표시"] = getVal("내통장표시");
        extra["구분"] = getVal("구분");
      } 
      else if (bankId === "nh") {
        txDate = parseDateTime("none", getVal("거래일자")).date;
        txTime = getVal("거래시간") || "00:00:00";
        if (txTime.split(":").length === 2) {
          txTime = `${txTime}:00`;
        }
        description = getVal("거래기록사항");
        deposit = parseAmount(getVal("입금금액(원)"));
        withdrawal = parseAmount(getVal("출금금액(원)"));
        balance = parseAmount(getVal("거래후잔액(원)"));
        branch = getVal("거래점");
        extra["거래내용"] = getVal("거래내용");
        extra["이체메모"] = getVal("이체메모");
      } 
      else if (bankId === "ibk") {
        const dtVal = getVal("거래일시") || getVal("납입일자");
        if (!dtVal) continue;
        const dt = parseDateTime(datetimeStyle, dtVal);
        txDate = dt.date;
        txTime = dt.time;
        description = getVal("거래내용") || getVal("비고");
        deposit = parseAmount(getVal("입금") || getVal("납입금액"));
        withdrawal = parseAmount(getVal("출금"));
        balance = parseAmount(getVal("거래후잔액") || getVal("잔액"));
        counterpartyAccount = getVal("상대계좌번호") || getVal("상대계좌");
        counterparty = getVal("상대계좌예금주명");
        extra["거래구분"] = getVal("거래구분");
        extra["수표어음금액"] = getVal("수표어음금액");
        extra["CMS코드"] = getVal("CMS코드");
        extra["상대은행"] = getVal("상대은행");
      } 
      else if (bankId === "woori") {
        const dtVal = getVal("거래일시");
        if (!dtVal) continue;
        const dt = parseDateTime(datetimeStyle, dtVal);
        txDate = dt.date;
        txTime = dt.time;
        description = getVal("적요");
        deposit = parseAmount(getVal("입금(원)"));
        withdrawal = parseAmount(getVal("지급(원)"));
        balance = parseAmount(getVal("거래후잔액(원)"));
        branch = getVal("취급점");
        extra["기재내용"] = getVal("기재내용");
        extra["표어음증권금액(원)"] = getVal("표어음증권금액(원)");
      } 
      else if (bankId === "serp") {
        txDate = parseDateTime("none", getVal("거래일자")).date;
        txTime = getVal("거래시간") || "00:00:00";
        if (txTime.split(":").length === 2) {
          txTime = `${txTime}:00`;
        }
        description = getVal("적요1");
        deposit = parseAmount(getVal("입금"));
        withdrawal = parseAmount(getVal("출금"));
        balance = parseAmount(getVal("잔액"));
        branch = getVal("취급지점");
        counterpartyAccount = getVal("상대계좌");
        counterparty = getVal("상대계좌예금주명");
        extra["은행"] = getVal("은행");
        extra["계좌번호"] = getVal("계좌번호");
        extra["계좌별칭"] = getVal("계좌별칭");
        extra["비고"] = getVal("비고");
        extra["적요2"] = getVal("적요2");
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!txDate || !dateRegex.test(txDate)) continue;
      if (!description) description = "인터넷뱅킹 입출금";

      const description2Obj: Record<string, string> = {};
      Object.entries(extra).forEach(([key, val]) => {
        if (val) description2Obj[key] = val;
      });
      const description2 = JSON.stringify(description2Obj);

      transactions.push({
        date: txDate,
        time: txTime,
        description,
        description2,
        deposit,
        withdrawal,
        balance,
        branch,
        counterpartyAccount,
        counterparty
      });
    }

    if (transactions.length === 0) {
      return NextResponse.json({ success: false, error: "엑셀 시트에서 유효한 거래 내역 행을 찾을 수 없습니다." }, { status: 400 });
    }

    const dates = transactions.map((t) => t.date).filter(Boolean);
    const sortedDates = [...dates].sort();
    const queryPeriodStart = sortedDates[0] || nowStr.split(" ")[0];
    const queryPeriodEnd = sortedDates[sortedDates.length - 1] || nowStr.split(" ")[0];

    const targetAccountId = targetAccount?.id || `${bankId.toUpperCase()}-${accountData.accountNumber.replace(/\D/g, "")}`;

    // 1. 기존 거래내역 해시 중복 체크 준비
    const existingTxIds = new Set<string>();
    try {
      const existingRes = await executeSQL(`SELECT id FROM excel_bank_transactions WHERE account_id = '${targetAccountId}' AND tenant_id = '${tenantId}'`);
      if (existingRes && existingRes.rows) {
        existingRes.rows.forEach((r: any) => {
          if (r.id) existingTxIds.add(String(r.id));
        });
      }
    } catch (err: any) {
      console.warn("excel_bank_transactions read warning:", err.message);
    }

    const rowsToInsert: any[] = [];
    let insertedCount = 0;

    for (const row of transactions) {
      const hashSeed = `${accountData.accountNumber}_${row.date}_${row.time}_${row.deposit}_${row.withdrawal}_${row.balance}_${row.description}`;
      const uniqueId = crypto.createHash("md5").update(hashSeed).digest("hex");

      if (!existingTxIds.has(uniqueId)) {
        const uuid = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        rowsToInsert.push({
          id: uniqueId,
          account_id: targetAccountId,
          bank_id: bankId,
          transaction_date: row.date,
          transaction_time: row.time,
          account_number: accountData.accountNumber,
          deposit: row.deposit,
          withdrawal: row.withdrawal,
          balance: row.balance,
          branch: row.branch,
          description: row.description,
          memo: "",
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
      await insertRows("excel_bank_transactions", rowsToInsert);
    }

    // 2. 최신 계좌 잔액 동기화
    try {
      const latestTxRes = await executeSQL(`
        SELECT balance FROM excel_bank_transactions 
        WHERE account_id = '${targetAccountId}' AND tenant_id = '${tenantId}' AND deleted_at IS NULL
        ORDER BY transaction_date DESC, transaction_time DESC, id DESC 
        LIMIT 1
      `);
      const latestTx = latestTxRes.rows?.[0];
      
      if (latestTx) {
        await updateRows("excel_accounts", {
          balance: latestTx.balance,
          updated_at: nowStr,
          updated_by: username
        }, {
          filters: { id: targetAccountId, tenant_id: tenantId }
        });
      }
    } catch (syncErr: any) {
      console.warn("⚠️ Excel account balance sync failed:", syncErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "성공적으로 인터넷뱅킹 엑셀 파일을 가져왔습니다.",
      data: {
        parsedCount: transactions.length,
        insertedCount,
        queryPeriodStart,
        queryPeriodEnd,
        accountNumber: accountData.accountNumber,
        accountName: accountData.accountName
      }
    });
  } catch (error: any) {
    console.error("Banking Excel Import Error:", error);
    return NextResponse.json({ success: false, error: error.message || "엑셀 파일 처리 중 시스템 오류가 발생했습니다." }, { status: 500 });
  }
}
