export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import {
  listAccounts,
  upsertFinanceHubAccount,
  importFinanceHubTransactions,
  queryTable,
  insertRows,
  updateRows,
  executeSQL
} from "../../../../../egdesk-helpers";
import crypto from "crypto";
import * as xlsx from "xlsx";

// 헤더 텍스트 정규화 헬퍼 (공백 및 특수 점 문자 제거)
function normalizeHeader(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str).replace(/\s+/g, "").replace(/·/g, "");
}

// 파일명 및 엑셀 시트 내용으로부터 은행 코드를 스마트하게 자동 감지하는 헬퍼 함수
function detectBankIdFromExcel(fileName: string, sheet: xlsx.WorkSheet): string {
  const fileUpper = fileName.toUpperCase();
  
  // 1단계: 파일명 우선 판별
  if (fileUpper.includes("신한")) return "shinhan";
  if (fileUpper.includes("하나")) return "hana";
  if (fileUpper.includes("국민") || fileUpper.includes("KB")) return "kookmin";
  if (fileUpper.includes("기업") || fileUpper.includes("IBK")) return "ibk";
  if (fileUpper.includes("우리")) return "woori";
  if (fileUpper.includes("농협") || fileUpper.includes("NH")) return "nh";
  if (fileUpper.includes("SERP")) return "serp";

  // 2단계: 시트 셀 내용 판별 (전수 조사)
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

// 금액 및 수치 텍스트 파싱 헬퍼
function parseAmount(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

// 날짜 및 시간 파싱 헬퍼
function parseDateTime(
  style: string,
  value: string,
  fallbackTime = "00:00:00"
): { date: string; time: string } {
  if (!value) return { date: "", time: fallbackTime };
  const cleaned = String(value).trim();

  // 1. 신한 포맷 (YYYYMMDDHHMMSS)
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

  // 2. 하나, 국민, 우리 및 공백으로 구분되는 포맷 (YYYY-MM-DD HH:MM:SS 등)
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

  // 기본 (단일 날짜만 있는 경우)
  let dateStr = cleaned.replace(/\./g, "-");
  if (dateStr.endsWith("-")) {
    dateStr = dateStr.slice(0, -1);
  }
  return { date: dateStr, time: fallbackTime };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    let bankId = formData.get("bankId") as string;
    const accountId = formData.get("accountId") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "업로드된 엑셀 파일이 존재하지 않습니다." },
        { status: 400 }
      );
    }

    // 1. 엑셀 파일 로드 및 버퍼 변환 (계좌 파싱을 위해 먼저 실행)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return NextResponse.json(
        { success: false, error: "엑셀 시트 데이터를 읽을 수 없습니다." },
        { status: 400 }
      );
    }

    // [스마트 은행 코드 자동 감지] 파일명 및 시트 내용으로부터 은행 자동 식별
    const detectedBankId = detectBankIdFromExcel(file.name, sheet);
    if (detectedBankId) {
      bankId = detectedBankId;
    }

    if (!bankId) {
      return NextResponse.json(
        { success: false, error: "엑셀 파일 분석 결과 은행 코드를 판별할 수 없습니다. 파일명이나 내용을 확인해 주세요." },
        { status: 400 }
      );
    }

    // 엑셀 시트 내 모든 셀에서 계좌번호(숫자-숫자-숫자 패턴 혹은 10-15자리 숫자)를 정규식으로 자동 추출
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

    // 파일명에서도 계좌번호 포맷 검색 시도 (폴백)
    if (!extractedAccountNumber && file.name) {
      const match = file.name.match(/\b\d{3,6}-\d{2,6}-\d{3,7}\b/);
      if (match) extractedAccountNumber = match[0].replace(/\D/g, "");
    }

    // 2. 계좌 정보 확인 및 데이터 획득 (listAccounts 반환 객체에서 accounts 배열 추출)
    const accountsRes = await listAccounts().catch(() => ({ accounts: [] }));
    const accounts = Array.isArray(accountsRes) ? accountsRes : (accountsRes?.accounts || []);
    let targetAccount = accounts.find((acc: any) => acc.id === accountId);

    // 만약 개별 은행 업로드 시 연동 계좌가 지정되지 않았거나 등록되어 있지 않다면 계좌 자동 개설
    if (!targetAccount && bankId !== "serp") {
      const accountNumber = extractedAccountNumber || `MANUAL-IMPORT-${bankId.toUpperCase()}`;
      const cleanedAccNum = accountNumber.replace(/\D/g, "");
      
      // 이미 동일한 계좌번호의 계좌가 등록되어 있는지 대조
      targetAccount = accounts.find((acc: any) => 
        acc.bank_id === bankId && 
        acc.account_number.replace(/\D/g, "") === cleanedAccNum
      );

      // 없다면 upsertFinanceHubAccount를 호출하여 자동으로 계좌 추가
      if (!targetAccount) {
        const bankNames: Record<string, string> = {
          shinhan: "신한은행",
          hana: "하나은행",
          kookmin: "KB국민은행",
          ibk: "IBK기업은행",
          woori: "우리은행",
          nh: "NH농협은행"
        };
        const bankName = bankNames[bankId] || "수동연동";
        
        await upsertFinanceHubAccount({
          bankId,
          accountNumber,
          accountName: `${bankName} 자동등록 계좌`,
          balance: 0
        }).catch((e) => console.warn("Auto Account creation failed:", e.message));

        // 생성 후 목록을 최신화하여 targetAccount에 셋팅
        const updatedAccountsRes = await listAccounts().catch(() => ({ accounts: [] }));
        const updatedAccounts = Array.isArray(updatedAccountsRes) ? updatedAccountsRes : (updatedAccountsRes?.accounts || []);
        
        targetAccount = updatedAccounts.find((acc: any) => 
          acc.bank_id === bankId && 
          acc.account_number.replace(/\D/g, "") === cleanedAccNum
        );
      }
    }

    const accountData = {
      accountNumber: (targetAccount?.accountNumber || targetAccount?.account_number || extractedAccountNumber || `MANUAL-IMPORT-${bankId.toUpperCase()}`).replace(/\D/g, ""),
      accountName: targetAccount?.accountName || targetAccount?.account_name || "자동 임포트 계좌",
      customerName: targetAccount?.customerName || targetAccount?.customer_name || "본사",
      balance: targetAccount?.balance || 0
    };

    // 2차원 배열 형태로 시트 파싱 (헤더 위 여백 및 빈 행 처리를 용이하게 하기 위함)
    const rawRows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });

    // 3. 은행별 파싱 메타 규칙 바인딩
    // BANK_EXCEL_HEADER_ROW_1BASED 기준
    let headerRowIndex = 0; // 0-based
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
        datetimeStyle = "hanaSpace"; // IBK와 하나는 공백형 포맷 공유
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
        return NextResponse.json(
          { success: false, error: "지원하지 않는 은행 코드입니다." },
          { status: 400 }
        );
    }

    if (rawRows.length <= headerRowIndex) {
      return NextResponse.json(
        {
          success: false,
          error: `엑셀 행 수(${rawRows.length})가 지정된 헤더 위치(행 ${headerRowIndex + 1})보다 적습니다.`
        },
        { status: 400 }
      );
    }

    // 헤더 정보 파싱 및 표준화
    const headerRow = rawRows[headerRowIndex];
    if (!headerRow || !Array.isArray(headerRow)) {
      return NextResponse.json(
        { success: false, error: "엑셀 헤더 행을 읽을 수 없습니다." },
        { status: 400 }
      );
    }

    const headersNormalized = headerRow.map((h: any) => normalizeHeader(h));
    const headerIndices: Record<string, number> = {};
    headersNormalized.forEach((header, index) => {
      if (header) {
        headerIndices[header] = index;
      }
    });

    // 4. 데이터 행 순회 파싱
    const transactions: any[] = [];
    const dataRows = rawRows.slice(headerRowIndex + 1);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      // 행의 첫 번째 컬럼이 비어있거나, 완전히 빈 줄인 경우 스킵 방지
      const rowHasData = row.some((val) => val !== null && val !== undefined && String(val).trim() !== "");
      if (!rowHasData) continue;

      // 컬럼 값 추출기
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

      // 5. 은행별 열 매핑 가이드 적용
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

        extra["내통장표시"] = getVal("내통장표시") || getVal("내통장표시");
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
        balance = parseAmount(getVal("거래후잔액(원)") || getVal("거래후잔액(원)"));
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
        balance = parseAmount(getVal("거래후잔액(원)") || getVal("거래후잔액(원)"));
        branch = getVal("취급점");

        extra["기재내용"] = getVal("기재내용");
        extra["표어음증권금액(원)"] = getVal("표어음증권금액(원)") || getVal("표어음증권금액(원)");
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
        extra["수기"] = getVal("수기");
        extra["적요2"] = getVal("적요2");
      }

      // 날짜 유효성 검증: YYYY-MM-DD 포맷을 충족해야 유효한 거래 행으로 인정
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!txDate || !dateRegex.test(txDate)) {
        console.log(`[Excel Import Skip] 올바르지 않은 날짜 형식 스킵: ${txDate}`);
        continue;
      }

      // 비어 있는 적요 항목 방어 코드
      if (!description) description = "인터넷뱅킹 입출금";

      // 적요2 번들링 규칙 적용
      // 비어있지 않은 extra 필드들만 수집하여 description2로 JSON 직렬화
      const description2Obj: Record<string, string> = {};
      Object.entries(extra).forEach(([key, val]) => {
        if (val) description2Obj[key] = val;
      });
      const description2 = JSON.stringify(description2Obj);

      // 데이터 정규화 객체 생성 (데이터베이스/API 형태 동시 대응)
      const txObj = {
        date: txDate,
        time: txTime,
        description,
        description2,
        deposit,
        withdrawal,
        amount: deposit > 0 ? deposit : withdrawal,
        balance,
        branch,
        counterpartyAccount,
        counterparty,
        type: deposit > 0 ? "deposit" : "withdrawal"
      };

      transactions.push(txObj);
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: "엑셀 시트에서 유효한 거래 내역 행을 찾을 수 없습니다." },
        { status: 400 }
      );
    }

    // 6. 조회 기간 메타데이터 계산
    const dates = transactions.map((t) => t.date).filter(Boolean);
    const sortedDates = [...dates].sort();
    const queryPeriodStart = sortedDates[0] || new Date().toISOString().split("T")[0];
    const queryPeriodEnd = sortedDates[sortedDates.length - 1] || new Date().toISOString().split("T")[0];

    // 7. egdesk-helpers를 사용하여 거래 내역 가져오기 실행 (에러 발생 시 로컬 SQLite 직접 주입 폴백 작동)
    const mappedTransactions = transactions.map(t => ({
      transaction_date: t.date,
      transaction_time: t.time,
      description: t.description,
      description2: t.description2,
      deposit: t.deposit,
      withdrawal: t.withdrawal,
      amount: t.amount,
      balance: t.balance,
      branch: t.branch,
      counterparty_account: t.counterpartyAccount,
      counterparty_name: t.counterparty
    }));

    let insertedCount = 0;
    let fallbackUsed = false;

    try {
      const importRes = await importFinanceHubTransactions({
        bankId,
        accountData: {
          accountNumber: accountData.accountNumber,
          accountName: accountData.accountName,
          customerName: accountData.customerName,
          balance: accountData.balance,
        },
        transactions: mappedTransactions,
        syncMetadata: {
          queryPeriodStart,
          queryPeriodEnd,
          filePath: file.name
        }
      });
      insertedCount = importRes?.count ?? importRes?.insertedCount ?? transactions.length;
    } catch (mcpErr: any) {
      console.warn("MCP import tool failed (trying local DB fallback):", mcpErr.message);
      fallbackUsed = true;

      try {
        const targetAccountId = targetAccount?.id || `${bankId}-${accountData.accountNumber.replace(/\D/g, "")}`;

        // [SQLite 외래 키 방어 로직] accounts 테이블에 계좌가 실제로 존재하는지 조회하고, 없으면 수동 개설(폴백)합니다.
        try {
          const checkAccRes = await queryTable("accounts", { filters: { id: targetAccountId } });
          if (!checkAccRes.rows || checkAccRes.rows.length === 0) {
            console.log(`[Local DB Fallback] accounts에 연동 계좌가 없어 자동 폴백 삽입합니다: ${targetAccountId}`);
            await insertRows("accounts", [{
              id: targetAccountId,
              bank_id: bankId,
              account_number: accountData.accountNumber,
              account_name: accountData.accountName || "자동등록 계좌",
              balance: accountData.balance || 0,
              currency: 'KRW',
              is_active: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
          }
        } catch (accErr: any) {
          console.warn("⚠️ Local DB auto account insertion warning:", accErr.message);
        }

        const existingTxIds = new Set<string>();
        try {
          const existingRes = await executeSQL(`SELECT id FROM bank_transactions WHERE account_id = '${targetAccountId}'`);
          if (existingRes && existingRes.rows) {
            existingRes.rows.forEach((r: any) => {
              if (r.id) existingTxIds.add(String(r.id));
            });
          }
        } catch (err: any) {
          console.warn("bank_transactions read warning:", err.message);
        }

        const rowsToInsert: any[] = [];
        const nowStr = new Date().toISOString();

        for (const row of transactions) {
          const hashSeed = `${accountData.accountNumber}_${row.date}_${row.time}_${row.deposit}_${row.withdrawal}_${row.balance}_${row.description}`;
          const uniqueId = crypto.createHash("md5").update(hashSeed).digest("hex");

          if (!existingTxIds.has(uniqueId)) {
            rowsToInsert.push({
              id: uniqueId,
              account_id: targetAccountId,
              bank_id: bankId,
              transaction_date: row.date,
              transaction_time: row.time,
              transaction_datetime: `${row.date} ${row.time}`,
              account_number: accountData.accountNumber,
              account_name: accountData.accountName,
              deposit: row.deposit,
              withdrawal: row.withdrawal,
              balance: row.balance,
              branch: row.branch,
              counterparty_account: row.counterpartyAccount,
              counterparty_name: row.counterparty,
              description: row.description,
              description2: row.description2,
              is_manual: 1,
              created_at: nowStr,
              updated_at: nowStr
            });
            insertedCount++;
          }
        }

        if (rowsToInsert.length > 0) {
          await insertRows("bank_transactions", rowsToInsert);
        }

        // [최신 계좌 잔액 동기화 UPDATE] 방금 적재한 거래 내역 중 가장 최신의 거래 잔액을 쿼리하여 accounts 테이블에 갱신시킵니다.
        try {
          const latestTxRes = await executeSQL(`
            SELECT balance FROM bank_transactions 
            WHERE account_id = '${targetAccountId}' 
            ORDER BY transaction_datetime DESC, id DESC 
            LIMIT 1
          `);
          const latestTx = latestTxRes.rows?.[0];
          
          if (latestTx) {
            console.log(`[Local DB Fallback] accounts 계좌 실잔액 갱신: ${targetAccountId} -> ₩${latestTx.balance.toLocaleString()}`);
            await updateRows("accounts", {
              balance: latestTx.balance,
              updated_at: new Date().toISOString()
            }, {
              filters: { id: targetAccountId }
            });
          }
        } catch (syncErr: any) {
          console.warn("⚠️ Local DB account balance synchronization failed:", syncErr.message);
        }
      } catch (dbErr: any) {
        console.error("Local DB Fallback Insertion Failed:", dbErr);
        throw new Error(`거래 내역 적재 실패: 공식 MCP 도구를 호출할 수 없고, 로컬 DB 백업 쓰기도 실패했습니다. (${dbErr.message})`);
      }
    }

    // [공통 계좌 실잔액 갱신 보증 장치]
    // 헬퍼의 API 호출 성공 및 폴백 여부와 전혀 상관없이, 최종 적재된 DB 내의 거래 기준 최종 잔액을 구해 accounts 테이블에 강제 반영시킵니다.
    try {
      const targetAccountId = targetAccount?.id || `${bankId}-${accountData.accountNumber.replace(/\D/g, "")}`;
      
      // 1. 혹시 계좌 마스터 레코드가 없을 수 있으니 선제적으로 확인 후 삽입
      const checkAccRes = await queryTable("accounts", { filters: { id: targetAccountId } });
      if (!checkAccRes.rows || checkAccRes.rows.length === 0) {
        await insertRows("accounts", [{
          id: targetAccountId,
          bank_id: bankId,
          account_number: accountData.accountNumber,
          account_name: accountData.accountName || "자동등록 계좌",
          balance: accountData.balance || 0,
          currency: 'KRW',
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
      }

      // 2. 가장 최신의 거래 명세(정상 날짜 포맷 형태)의 balance 값을 가져옵니다.
      // 날짜 필터링을 주어 '합계' 등의 비정상 텍스트 행이 아닌 실제 날짜 데이터의 잔액을 조회하도록 견고하게 쿼리를 짭니다.
      const latestTxRes = await executeSQL(`
        SELECT balance FROM bank_transactions 
        WHERE account_id = '${targetAccountId}' AND transaction_date LIKE '2%'
        ORDER BY transaction_date DESC, transaction_time DESC, id DESC 
        LIMIT 1
      `);
      const latestTx = latestTxRes.rows?.[0];
      
      if (latestTx) {
        console.log(`[Common balance sync] 계좌 실잔액 강제 동기화: ${targetAccountId} -> ₩${latestTx.balance.toLocaleString()}`);
        await updateRows("accounts", {
          balance: latestTx.balance,
          updated_at: new Date().toISOString()
        }, {
          filters: { id: targetAccountId }
        });
      }
    } catch (syncErr: any) {
      console.warn("⚠️ Common balance sync failed:", syncErr.message);
    }

    return NextResponse.json({
      success: true,
      message: fallbackUsed 
        ? "공식 헬퍼가 미지원되는 환경이므로 안전하게 로컬 DB 폴백을 수행해 엑셀 파일을 가져왔습니다."
        : "성공적으로 인터넷뱅킹 엑셀 파일을 가져왔습니다.",
      data: {
        parsedCount: transactions.length,
        insertedCount,
        queryPeriodStart,
        queryPeriodEnd,
        accountNumber: accountData.accountNumber,
        accountName: accountData.accountName,
        fallbackUsed
      }
    });
  } catch (error: any) {
    console.error("Banking Excel Import Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "엑셀 파일 처리 및 전송 중 시스템 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
