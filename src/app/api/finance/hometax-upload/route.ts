export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { queryTable, insertRows, updateRows, executeSQL } from "../../../../../egdesk-helpers";
import { getTenantId } from "@/lib/tenant";
import { sanitizeDate, sanitizeAmount, reconcileAmounts, sanitizeBusinessNumber } from "@/lib/data-validator";
import { smartSyncPartnersFromInvoices, InvoicePartnerInfo } from "@/lib/partner-sync";

// 금액 및 정수 파싱 헬퍼
function parseAmount(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

// 공백 제거 헬퍼
function cleanStr(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function normalizeHeader(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str).replace(/\s+/g, "").replace(/·/g, "").replace(/\//g, "").toLowerCase();
}

// 🧠 지능형 동적 헤더 및 컬럼 위치 분석 헬퍼
function buildColumnIndexMap(rawRows: any[][]): { headerRowIndex: number; colMap: Record<string, number> } {
  let headerRowIndex = -1;
  const colMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row)) continue;

    const rowStr = row.map(c => normalizeHeader(c)).join(" ");
    if (
      rowStr.includes("작성일자") ||
      rowStr.includes("승인번호") ||
      (rowStr.includes("공급자") && rowStr.includes("공급받는자")) ||
      (rowStr.includes("등록번호") && rowStr.includes("상호")) ||
      rowStr.includes("합계금액")
    ) {
      headerRowIndex = r;
      row.forEach((cell, idx) => {
        const norm = normalizeHeader(cell);
        if (norm) {
          colMap[norm] = idx;
        }
      });
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 5; // 국세청 기본 6행 (index 5) 폴백
  }

  return { headerRowIndex, colMap };
}

function getColValue(row: any[], colMap: Record<string, number>, possibleKeys: string[], fallbackIdx: number): string {
  for (const key of possibleKeys) {
    const normKey = normalizeHeader(key);
    // 1) 완전 일치 검색
    if (colMap[normKey] !== undefined && row[colMap[normKey]] !== undefined && row[colMap[normKey]] !== null) {
      const v = cleanStr(row[colMap[normKey]]);
      if (v) return v;
    }
    // 2) 부분 일치 검색
    for (const [headerName, idx] of Object.entries(colMap)) {
      if (headerName.includes(normKey) || normKey.includes(headerName)) {
        if (row[idx] !== undefined && row[idx] !== null) {
          const v = cleanStr(row[idx]);
          if (v) return v;
        }
      }
    }
  }
  if (fallbackIdx >= 0 && row[fallbackIdx] !== undefined && row[fallbackIdx] !== null) {
    return cleanStr(row[fallbackIdx]);
  }
  return "";
}

// 파일명, 셀 내용, 헤더 구조 기반으로 국세청 홈택스 엑셀 종류를 자동 추적 식별하는 헬퍼 함수
function detectHometaxKindFromExcel(fileName: string, rawRows: any[][]): string {
  const fileUpper = fileName.toUpperCase();
  
  // 1단계: 파일명 기반 감지
  if (fileUpper.includes("현금영수증")) {
    return "cash-receipt";
  }
  
  const isTaxExempt = fileUpper.includes("계산서") && !fileUpper.includes("세금계산서");
  const isTaxInvoice = fileUpper.includes("세금계산서");
  const isSales = fileUpper.includes("매출") || fileUpper.includes("발행");
  const isPurchase = fileUpper.includes("매입") || fileUpper.includes("수취");

  if (isTaxInvoice) {
    if (isSales) return "sales";
    if (isPurchase) return "purchase";
  }
  if (isTaxExempt) {
    if (isSales) return "tax-exempt-sales";
    if (isPurchase) return "tax-exempt-purchase";
  }

  // 2단계: 시트 내부 셀 내용 기반 감지
  let cellText = "";
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (row && Array.isArray(row)) {
      cellText += " " + row.join(" ");
    }
  }

  if (cellText.includes("발행구분") && cellText.includes("매출일시") && cellText.includes("신분확인")) {
    return "cash-receipt";
  }

  const hasTaxInvoice = cellText.includes("세금계산서");
  const hasTaxExempt = cellText.includes("계산서") && !cellText.includes("세금계산서");
  const hasSales = cellText.includes("매출") || cellText.includes("공급자");
  const hasPurchase = cellText.includes("매입") || cellText.includes("공급받는자");

  if (hasTaxInvoice) {
    if (hasSales && !hasPurchase) return "sales";
    if (hasPurchase && !hasSales) return "purchase";
  }
  
  if (hasTaxExempt) {
    if (hasSales && !hasPurchase) return "tax-exempt-sales";
    if (hasPurchase && !hasSales) return "tax-exempt-purchase";
  }

  // 3단계: 헤더 구조 및 타이틀명 기반 감지
  const headerRow = rawRows[5];
  if (headerRow && Array.isArray(headerRow)) {
    const headers = headerRow.map(h => String(h).trim());
    if (headers.includes("작성일자") && headers.includes("승인번호")) {
      const isExempt = cellText.includes("전자계산서") && !cellText.includes("전자세금계산서");
      
      const metaRow = rawRows[0];
      if (metaRow && Array.isArray(metaRow)) {
        const title = String(metaRow[0]);
        if (title.includes("매출")) {
          return isExempt ? "tax-exempt-sales" : "sales";
        }
        if (title.includes("매입")) {
          return isExempt ? "tax-exempt-purchase" : "purchase";
        }
      }
    }
  }

  // 최종 폴백 기본값 설정
  if (fileUpper.includes("매출")) return "sales";
  if (fileUpper.includes("매입")) return "purchase";

  return "sales"; // 기본 폴백
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    let kind = formData.get("kind") as string; // 'sales', 'purchase', 'tax-exempt-sales', 'tax-exempt-purchase', 'cash-receipt'
    let businessNumber = formData.get("businessNumber") as string;

    const rawTenantId = (await getTenantId()) || request.headers.get("x-egdesk-project-id") || request.headers.get("X-EGDesk-Project-Id") || "";
    const tenantId = rawTenantId || 'tenant-default-id';

    if (!file) {
      return NextResponse.json(
        { success: false, error: "업로드된 세무 엑셀 파일이 없습니다." },
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

    // [스마트 홈택스 자료 종류 자동 감지]
    const detectedKind = detectHometaxKindFromExcel(file.name, rawRows);
    if (detectedKind) {
      console.log(`[Smart Hometax Detect] 감지된 자료 종류: ${detectedKind} (기존 선택: ${kind})`);
      kind = detectedKind;
    }

    if (!kind) {
      return NextResponse.json(
        { success: false, error: "업로드된 엑셀 분석 결과 증빙 종류를 식별할 수 없습니다. 파일명을 확인해 주세요." },
        { status: 400 }
      );
    }

    // [스마트 사업자등록번호 검색 및 백필]
    if (!businessNumber) {
      // 1. 파일명에서 검색 (10자리 숫자 패턴)
      const match = file.name.match(/\b\d{3}-\d{2}-\d{5}\b/) || file.name.match(/\b\d{10}\b/);
      if (match) {
        businessNumber = match[0].replace(/\D/g, "");
      } else {
        // 2. 엑셀 셀 내용에서 검색 (10자리 숫자 패턴)
        for (const row of rawRows) {
          if (row && Array.isArray(row)) {
            for (const cell of row) {
              if (cell) {
                const cellStr = String(cell).replace(/\s+/g, "");
                const innerMatch = cellStr.match(/\b\d{3}-\d{2}-\d{5}\b/) || cellStr.match(/\b\d{10}\b/);
                if (innerMatch) {
                  businessNumber = innerMatch[0].replace(/\D/g, "");
                  break;
                }
              }
            }
          }
          if (businessNumber) break;
        }
      }
    }

    if (!businessNumber) {
      businessNumber = "MANUAL-IMPORT";
    }

    let tableName = "";
    if (kind === "sales" || kind === "purchase") {
      tableName = "tax_invoices";
    } else if (kind === "tax-exempt-sales" || kind === "tax-exempt-purchase") {
      tableName = "tax_exempt_invoices";
    } else if (kind === "cash-receipt") {
      tableName = "cash_receipts";
    }

    if (!tableName) {
      return NextResponse.json(
        { success: false, error: "알 수 없는 증빙 종류입니다." },
        { status: 400 }
      );
    }

    let insertedCount = 0;
    let duplicateCount = 0;
    let queryPeriodStart = "";
    let queryPeriodEnd = "";
    const nowStr = new Date().toISOString();

    // 1. 기존 DB 내 세금계산서 맵 구축 (해당 테넌트 격리 중복 방지 및 누락된 주소/이메일 스마트 백필용)
    const existingInvoices = new Map<string, any>();
    try {
      const checkRes = await queryTable(tableName, { limit: 5000, filters: { tenant_id: tenantId } });
      if (checkRes && checkRes.rows) {
        checkRes.rows.forEach((r: any) => {
          const appNo = (r.승인번호 || r.approval_no || '').trim();
          if (appNo) existingInvoices.set(appNo, r);
        });
      }
    } catch (err: any) {
      console.warn(`${tableName} table read warning:`, err.message);
    }

    const partnerSyncList: InvoicePartnerInfo[] = [];

    // ==========================================
    // A. 전자세금계산서 (과세 매출/매입)
    // ==========================================
    if (kind === "sales" || kind === "purchase") {
      // 메타데이터 행(1행 index 0)에서 사업자등록번호 백필용 추출
      const metaRow = rawRows[0];
      let extractedBN = "";
      if (metaRow && Array.isArray(metaRow) && metaRow[1]) {
        extractedBN = String(metaRow[1]).replace(/\D/g, "");
      }
      if (businessNumber === "MANUAL-IMPORT" && extractedBN) {
        businessNumber = extractedBN;
      }

      // 🧠 동적 헤더 및 컬럼 매핑 분석
      const { headerRowIndex, colMap } = buildColumnIndexMap(rawRows);
      const dataRows = rawRows.slice(headerRowIndex + 1);
      const dates: string[] = [];
      const rowsToInsert: any[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || !Array.isArray(row) || row.length < 3) continue;

        const approvalNo = getColValue(row, colMap, ["승인번호", "국세청승인번호", "승인No"], 1);
        if (!approvalNo) continue;

        const dateStr = getColValue(row, colMap, ["작성일자", "작성일", "일자"], 0);
        const dateSan = sanitizeDate(dateStr);
        const formattedDate = dateSan.isValid ? dateSan.value : (dateStr.replace(/\./g, "-") || nowStr.substring(0, 10));
        dates.push(formattedDate);

        const supplierBnRaw = getColValue(row, colMap, ["공급자등록번호", "공급자사업자등록번호", "공급자사업자번호"], 3);
        const buyerBnRaw = getColValue(row, colMap, ["공급받는자등록번호", "공급받는자사업자등록번호", "공급받는자사업자번호"], 8);
        const supplierBn = sanitizeBusinessNumber(supplierBnRaw);
        const buyerBn = sanitizeBusinessNumber(buyerBnRaw);

        const supplierNum = supplierBn.formatted || supplierBnRaw;
        const supplierBranch = getColValue(row, colMap, ["공급자종사업장번호", "공급자종사업장"], 4);
        const supplierName = getColValue(row, colMap, ["공급자상호", "공급자상호(법인명)", "공급자회사명", "공급자상호명"], 5);
        const supplierCeo = getColValue(row, colMap, ["공급자성명", "공급자대표자명", "공급자대표자", "공급자대표"], 6);
        const supplierAddr = getColValue(row, colMap, ["공급자사업장주소", "공급자주소", "공급자사업장", "공급자소재지"], 7);
        const supplierEmail = getColValue(row, colMap, ["공급자이메일", "공급자이메일주소", "공급자전자우편", "공급자Email", "공급자이메일1"], 22);

        const buyerNum = buyerBn.formatted || buyerBnRaw;
        const buyerBranch = getColValue(row, colMap, ["공급받는자종사업장번호", "공급받는자종사업장"], 9);
        const buyerName = getColValue(row, colMap, ["공급받는자상호", "공급받는자상호(법인명)", "공급받는자회사명", "공급받는자상호명"], 10);
        const buyerCeo = getColValue(row, colMap, ["공급받는자성명", "공급받는자대표자명", "공급받는자대표자", "공급받는자대표"], 11);
        const buyerAddr = getColValue(row, colMap, ["공급받는자사업장주소", "공급받는자주소", "공급받는자사업장", "공급받는자소재지"], 12);
        const buyerEmail1 = getColValue(row, colMap, ["공급받는자이메일1", "공급받는자이메일", "공급받는자전자우편1", "공급받는자Email1"], 23);
        const buyerEmail2 = getColValue(row, colMap, ["공급받는자이메일2", "공급받는자전자우편2", "공급받는자Email2"], 24);

        const supplyAmt = parseAmount(getColValue(row, colMap, ["공급가액", "공급금액"], 13));
        const taxAmt = parseAmount(getColValue(row, colMap, ["세액", "부가가치세", "부가세"], 14));
        const totalAmt = parseAmount(getColValue(row, colMap, ["합계금액", "합계", "총금액"], 15));
        const reconciled = reconcileAmounts(supplyAmt, taxAmt, totalAmt);

        const sendDate = getColValue(row, colMap, ["발급일자", "전송일자"], 2);
        const invoiceCategory = getColValue(row, colMap, ["전자세금계산서분류", "세금계산서분류", "분류"], 17);
        const invoiceKind = getColValue(row, colMap, ["전자세금계산서종류", "세금계산서종류", "종류"], 18);
        const issueType = getColValue(row, colMap, ["발급유형"], 19);
        const remark = getColValue(row, colMap, ["비고", "적요"], 20);
        const receiptType = getColValue(row, colMap, ["영수청구구분", "영수/청구", "영수청구"], 21);

        const itemDate = getColValue(row, colMap, ["품목일자", "일자"], 25);
        const itemName = getColValue(row, colMap, ["품목명", "품목", "품목(규격)"], 26);
        const itemSpec = getColValue(row, colMap, ["품목규격", "규격"], 27);
        const itemQty = getColValue(row, colMap, ["품목수량", "수량"], 28);
        const itemPrice = getColValue(row, colMap, ["품목단가", "단가"], 29);
        const itemSupply = parseAmount(getColValue(row, colMap, ["품목공급가액", "품목공급금액"], 30));
        const itemTax = parseAmount(getColValue(row, colMap, ["품목세액", "품목부가세"], 31));
        const itemRemark = getColValue(row, colMap, ["품목비고"], 32);

        // 🛡️ 중복 레코드 판별 및 스마트 백필 (Smart Upsert)
        if (existingInvoices.has(approvalNo)) {
          duplicateCount++;
          const existing = existingInvoices.get(approvalNo);

          // 기존 DB에 주소나 이메일이 없는데 엑셀에 들어온 경우 보정 업데이트
          const patchUpdates: Record<string, any> = {};
          if (!existing.공급자주소 && supplierAddr) patchUpdates.공급자주소 = supplierAddr;
          if (!existing.공급자이메일 && supplierEmail) patchUpdates.공급자이메일 = supplierEmail;
          if (!existing.공급받는자주소 && buyerAddr) patchUpdates.공급받는자주소 = buyerAddr;
          if (!existing.공급받는자이메일1 && (buyerEmail1 || buyerEmail2)) patchUpdates.공급받는자이메일1 = buyerEmail1 || buyerEmail2;

          if (Object.keys(patchUpdates).length > 0) {
            await updateRows(tableName, patchUpdates, { filters: { id: String(existing.id) } });
          }

          // 거래처 대장 동기화 큐에도 포함하여 거래처 대장의 주소/이메일 백필
          if (kind === "sales" && (buyerName || buyerNum)) {
            partnerSyncList.push({
              type: 'BUYER',
              companyName: buyerName,
              businessNumber: buyerNum,
              representative: buyerCeo,
              address: buyerAddr,
              email: buyerEmail1 || buyerEmail2
            });
          } else if (kind === "purchase" && (supplierName || supplierNum)) {
            partnerSyncList.push({
              type: 'VENDOR',
              companyName: supplierName,
              businessNumber: supplierNum,
              representative: supplierCeo,
              address: supplierAddr,
              email: supplierEmail
            });
          }
          continue;
        }

        // 신규 레코드 삽입
        rowsToInsert.push({
          business_number: businessNumber,
          issue_date: formattedDate,
          작성일자: formattedDate,
          발급일자: sendDate,
          전송일자: sendDate,
          approval_no: approvalNo,
          승인번호: approvalNo,
          invoice_type: kind,
          type: kind === 'sales' ? 'SALES' : 'PURCHASE',
          invoice_kind: 'TAX_INVOICE',
          supplier_corp_num: supplierNum,
          공급자사업자등록번호: supplierNum,
          공급자종사업장번호: supplierBranch,
          supplier_corp_name: supplierName,
          공급자상호: supplierName,
          supplier_ceo_name: supplierCeo,
          공급자대표자명: supplierCeo,
          공급자주소: supplierAddr,
          buyer_corp_num: buyerNum,
          공급받는자사업자등록번호: buyerNum,
          공급받는자종사업장번호: buyerBranch,
          buyer_corp_name: buyerName,
          공급받는자상호: buyerName,
          buyer_ceo_name: buyerCeo,
          공급받는자대표자명: buyerCeo,
          공급받는자주소: buyerAddr,
          total_amount: reconciled.total,
          합계금액: reconciled.total,
          공급가액: reconciled.supply,
          supply_amount: reconciled.supply,
          세액: reconciled.tax,
          tax_amount: reconciled.tax,
          전자세금계산서분류: invoiceCategory,
          전자세금계산서종류: invoiceKind,
          발급유형: issueType,
          비고: remark,
          remark: remark,
          영수청구구분: receiptType,
          공급자이메일: supplierEmail,
          공급받는자이메일1: buyerEmail1,
          공급받는자이메일2: buyerEmail2,
          품목일자: itemDate,
          품목명: itemName,
          item_name: itemName,
          품목규격: itemSpec,
          품목수량: itemQty,
          품목단가: itemPrice,
          품목공급가액: itemSupply,
          품목세액: itemTax,
          품목비고: itemRemark,
          excel_file_path: file.name,
          status: 'CONFIRMED',
          tenant_id: tenantId
        });
        insertedCount++;

        if (kind === "sales" && (buyerName || buyerNum)) {
          partnerSyncList.push({
            type: 'BUYER',
            companyName: buyerName,
            businessNumber: buyerNum,
            representative: buyerCeo,
            address: buyerAddr,
            email: buyerEmail1 || buyerEmail2
          });
        } else if (kind === "purchase" && (supplierName || supplierNum)) {
          partnerSyncList.push({
            type: 'VENDOR',
            companyName: supplierName,
            businessNumber: supplierNum,
            representative: supplierCeo,
            address: supplierAddr,
            email: supplierEmail
          });
        }
      }

      if (rowsToInsert.length > 0) {
        await insertRows(tableName, rowsToInsert);
      }

      if (dates.length > 0) {
        dates.sort();
        queryPeriodStart = dates[0];
        queryPeriodEnd = dates[dates.length - 1];
      }
    }
    // ==========================================
    // B. 면세 전자계산서 (면세 매출/매입)
    // ==========================================
    else if (kind === "tax-exempt-sales" || kind === "tax-exempt-purchase") {
      const metaRow = rawRows[0];
      let extractedBN = "";
      if (metaRow && Array.isArray(metaRow) && metaRow[1]) {
        extractedBN = String(metaRow[1]).replace(/\D/g, "");
      }
      if (businessNumber === "MANUAL-IMPORT" && extractedBN) {
        businessNumber = extractedBN;
      }

      const { headerRowIndex, colMap } = buildColumnIndexMap(rawRows);
      const dataRows = rawRows.slice(headerRowIndex + 1);
      const dates: string[] = [];
      const invoiceType = kind === "tax-exempt-sales" ? "sales" : "purchase";
      const rowsToInsert: any[] = [];

      for (const row of dataRows) {
        if (!row || !Array.isArray(row) || row.length < 2) continue;

        const approvalNo = getColValue(row, colMap, ["승인번호", "국세청승인번호", "승인No"], 1);
        const rawWritingDate = getColValue(row, colMap, ["작성일자", "작성일", "일자"], 0);
        if (!rawWritingDate && !approvalNo) continue;

        const dateRes = sanitizeDate(rawWritingDate);
        const formattedDate = dateRes.isValid ? dateRes.value : (rawWritingDate || new Date().toISOString().split('T')[0]);
        dates.push(formattedDate);

        const supplierBnRaw = getColValue(row, colMap, ["공급자등록번호", "공급자사업자등록번호", "공급자사업자번호"], 4);
        const buyerBnRaw = getColValue(row, colMap, ["공급받는자등록번호", "공급받는자사업자등록번호", "공급받는자사업자번호"], 9);
        const supplierBn = sanitizeBusinessNumber(supplierBnRaw);
        const buyerBn = sanitizeBusinessNumber(buyerBnRaw);
        const supplierNum = supplierBn.formatted || supplierBnRaw;
        const buyerNum = buyerBn.formatted || buyerBnRaw;

        const supplierName = getColValue(row, colMap, ["공급자상호", "공급자상호(법인명)", "공급자회사명"], 6);
        const supplierCeo = getColValue(row, colMap, ["공급자성명", "공급자대표자명", "공급자대표"], 7);
        const supplierAddr = getColValue(row, colMap, ["공급자사업장주소", "공급자주소"], 8);
        const supplierEmail = getColValue(row, colMap, ["공급자이메일", "공급자전자우편"], 21);

        const buyerName = getColValue(row, colMap, ["공급받는자상호", "공급받는자상호(법인명)", "공급받는자회사명"], 11);
        const buyerCeo = getColValue(row, colMap, ["공급받는자성명", "공급받는자대표자명", "공급받는자대표"], 12);
        const buyerAddr = getColValue(row, colMap, ["공급받는자사업장주소", "공급받는자주소"], 13);
        const buyerEmail1 = getColValue(row, colMap, ["공급받는자이메일1", "공급받는자이메일"], 22);
        const buyerEmail2 = getColValue(row, colMap, ["공급받는자이메일2"], 23);

        const supplySan = sanitizeAmount(getColValue(row, colMap, ["공급가액", "공급금액"], 15));
        const totalSan = sanitizeAmount(getColValue(row, colMap, ["합계금액", "합계"], 14));
        const finalAmt = supplySan.value || totalSan.value || 0;

        if (existingInvoices.has(approvalNo)) {
          duplicateCount++;
          const existing = existingInvoices.get(approvalNo);
          const patchUpdates: Record<string, any> = {};
          if (!existing.공급자주소 && supplierAddr) patchUpdates.공급자주소 = supplierAddr;
          if (!existing.공급자이메일 && supplierEmail) patchUpdates.공급자이메일 = supplierEmail;
          if (!existing.공급받는자주소 && buyerAddr) patchUpdates.공급받는자주소 = buyerAddr;
          if (!existing.공급받는자이메일1 && (buyerEmail1 || buyerEmail2)) patchUpdates.공급받는자이메일1 = buyerEmail1 || buyerEmail2;

          if (Object.keys(patchUpdates).length > 0) {
            await updateRows(tableName, patchUpdates, { filters: { id: String(existing.id) } });
          }

          if (invoiceType === "sales" && (buyerName || buyerNum)) {
            partnerSyncList.push({
              type: 'BUYER',
              companyName: buyerName,
              businessNumber: buyerNum,
              representative: buyerCeo,
              address: buyerAddr,
              email: buyerEmail1 || buyerEmail2
            });
          } else if (invoiceType === "purchase" && (supplierName || supplierNum)) {
            partnerSyncList.push({
              type: 'VENDOR',
              companyName: supplierName,
              businessNumber: supplierNum,
              representative: supplierCeo,
              address: supplierAddr,
              email: supplierEmail
            });
          }
          continue;
        }

        rowsToInsert.push({
          business_number: businessNumber,
          invoice_type: invoiceType,
          type: invoiceType === 'sales' ? 'SALES' : 'PURCHASE',
          invoice_kind: 'TAX_EXEMPT_INVOICE',
          작성일자: formattedDate,
          issue_date: formattedDate,
          승인번호: approvalNo,
          approval_no: approvalNo,
          발급일자: getColValue(row, colMap, ["발급일자"], 2),
          전송일자: getColValue(row, colMap, ["전송일자"], 3),
          공급자사업자등록번호: supplierNum,
          supplier_corp_num: supplierNum,
          공급자종사업장번호: getColValue(row, colMap, ["공급자종사업장번호"], 5),
          공급자상호: supplierName,
          supplier_corp_name: supplierName,
          공급자대표자명: supplierCeo,
          supplier_ceo_name: supplierCeo,
          공급자주소: supplierAddr,
          공급받는자사업자등록번호: buyerNum,
          buyer_corp_num: buyerNum,
          공급받는자종사업장번호: getColValue(row, colMap, ["공급받는자종사업장번호"], 10),
          공급받는자상호: buyerName,
          buyer_corp_name: buyerName,
          공급받는자대표자명: buyerCeo,
          buyer_ceo_name: buyerCeo,
          공급받는자주소: buyerAddr,
          합계금액: finalAmt,
          total_amount: finalAmt,
          공급가액: finalAmt,
          supply_amount: finalAmt,
          세액: 0,
          tax_amount: 0,
          전자세금계산서분류: getColValue(row, colMap, ["전자세금계산서분류"], 16),
          전자세금계산서종류: getColValue(row, colMap, ["전자세금계산서종류"], 17),
          발급유형: getColValue(row, colMap, ["발급유형"], 18),
          비고: getColValue(row, colMap, ["비고"], 19),
          remark: getColValue(row, colMap, ["비고"], 19),
          영수청구구분: getColValue(row, colMap, ["영수청구구분"], 20),
          공급자이메일: supplierEmail,
          공급받는자이메일1: buyerEmail1,
          공급받는자이메일2: buyerEmail2,
          품목일자: getColValue(row, colMap, ["품목일자"], 24),
          품목명: getColValue(row, colMap, ["품목명"], 25),
          item_name: getColValue(row, colMap, ["품목명"], 25),
          품목규격: getColValue(row, colMap, ["품목규격"], 26),
          품목수량: getColValue(row, colMap, ["품목수량"], 27),
          품목단가: getColValue(row, colMap, ["품목단가"], 28),
          품목공급가액: parseAmount(getColValue(row, colMap, ["품목공급가액"], 29)),
          품목세액: 0,
          품목비고: getColValue(row, colMap, ["품목비고"], 30),
          excel_file_path: file.name,
          status: 'CONFIRMED',
          tenant_id: tenantId
        });
        insertedCount++;

        if (invoiceType === "sales" && (buyerName || buyerNum)) {
          partnerSyncList.push({
            type: 'BUYER',
            companyName: buyerName,
            businessNumber: buyerNum,
            representative: buyerCeo,
            address: buyerAddr,
            email: buyerEmail1 || buyerEmail2
          });
        } else if (invoiceType === "purchase" && (supplierName || supplierNum)) {
          partnerSyncList.push({
            type: 'VENDOR',
            companyName: supplierName,
            businessNumber: supplierNum,
            representative: supplierCeo,
            address: supplierAddr,
            email: supplierEmail
          });
        }
      }

      if (rowsToInsert.length > 0) {
        await insertRows(tableName, rowsToInsert);
      }

      if (dates.length > 0) {
        dates.sort();
        queryPeriodStart = dates[0];
        queryPeriodEnd = dates[dates.length - 1];
      }
    }
    // ==========================================
    // C. 현금영수증 (매출내역)
    // ==========================================
    else if (kind === "cash-receipt") {
      if (businessNumber === "MANUAL-IMPORT") {
        return NextResponse.json(
          { success: false, error: "현금영수증 임포트 시 사업자등록번호(businessNumber)는 필수입니다." },
          { status: 400 }
        );
      }
      businessNumber = businessNumber.replace(/\D/g, "");

      // 헤더: 1행 (index 0), 데이터: 2행 (index 1+)
      const dataRows = rawRows.slice(1);
      const dates: string[] = [];
      const rowsToInsert: any[] = [];

      for (const row of dataRows) {
        if (!row || !Array.isArray(row) || row.length < 7) continue;

        const approvalNo = cleanStr(row[6]); // 승인번호
        const receiptDateTime = cleanStr(row[1]); // 매출일시 (YYYY-MM-DD HH:MM:SS)
        if (!approvalNo || !receiptDateTime) continue;

        const dateSan = sanitizeDate(receiptDateTime);
        const formattedDate = dateSan.isValid ? dateSan.value : receiptDateTime.split(" ")[0];
        if (formattedDate) dates.push(formattedDate);

        if (existingApprovalNos.has(approvalNo)) {
          duplicateCount++;
          continue;
        }

        const supplySan = sanitizeAmount(row[2]);
        const taxSan = sanitizeAmount(row[3]);
        const totalSan = sanitizeAmount(row[5]);
        const reconciled = reconcileAmounts(supplySan.value, taxSan.value, totalSan.value);

        rowsToInsert.push({
          business_number: businessNumber,
          발행구분: cleanStr(row[0]) || '매출',
          매출일시: receiptDateTime,
          transaction_date: formattedDate,
          공급가액: reconciled.supply,
          supply_amount: reconciled.supply,
          부가세: reconciled.tax,
          tax_amount: reconciled.tax,
          봉사료: parseAmount(row[4]),
          총금액: reconciled.total,
          total_amount: reconciled.total,
          승인번호: approvalNo,
          approval_number: approvalNo,
          신분확인뒷4자리: cleanStr(row[7]),
          거래구분: cleanStr(row[8]),
          용도구분: cleanStr(row[9]),
          비고: cleanStr(row[10]),
          excel_file_path: file.name,
          status: 'CONFIRMED',
          tenant_id: tenantId
        });
        insertedCount++;
      }

      if (rowsToInsert.length > 0) {
        await insertRows(tableName, rowsToInsert);
      }

      if (dates.length > 0) {
        dates.sort();
        queryPeriodStart = dates[0];
        queryPeriodEnd = dates[dates.length - 1];
      }
    }

    // ==========================================
    // D. 거래처(crm_partners) 스마트 머지 동기화 (Smart Merge Upsert)
    // ==========================================
    let partnerSyncStats = { added: 0, updated: 0 };
    if (partnerSyncList.length > 0) {
      try {
        partnerSyncStats = await smartSyncPartnersFromInvoices(partnerSyncList, tenantId);
        console.log(`[Hometax Upload Partner Sync] 신규 거래처 등록: ${partnerSyncStats.added}건, 기존 거래처 갱신: ${partnerSyncStats.updated}건`);
      } catch (syncErr: any) {
        console.warn("⚠️ Partner smart sync error:", syncErr.message);
      }
    }

    // ==========================================
    // E. 홈택스 동기화 역사 테이블 기록 (hometax_sync_operations)
    // ==========================================
    try {
      const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19);
      const isSalesType = kind.includes("sales") || kind === "cash-receipt";
      
      await insertRows("hometax_sync_operations", [{
        business_number: businessNumber,
        status: "success",
        start_date: queryPeriodStart || nowStr.substring(0, 10),
        end_date: queryPeriodEnd || nowStr.substring(0, 10),
        sales_count: isSalesType ? (insertedCount + duplicateCount) : 0,
        sales_new: isSalesType ? insertedCount : 0,
        sales_duplicate: isSalesType ? duplicateCount : 0,
        purchase_count: !isSalesType ? (insertedCount + duplicateCount) : 0,
        purchase_new: !isSalesType ? insertedCount : 0,
        purchase_duplicate: !isSalesType ? duplicateCount : 0,
        sales_excel_path: file.name,
        started_at: nowStr,
        completed_at: nowStr,
        duration: 0
      }]);
    } catch (e: any) {
      console.warn("Could not log hometax sync operation:", e.message);
    }

    return NextResponse.json({
      success: true,
      message: "성공적으로 홈택스 엑셀 파일을 세무 데이터베이스 및 거래처 대장에 병합 적재하였습니다.",
      data: {
        tableName,
        kind,
        businessNumber,
        queryPeriodStart,
        queryPeriodEnd,
        totalCount: insertedCount + duplicateCount,
        insertedCount,
        duplicateCount,
        partnerSync: partnerSyncStats
      }
    });
  } catch (error: any) {
    console.error("Hometax Excel Import API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "홈택스 파일 파싱 및 이지데스크 서버 저장 중 시스템 에러가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
