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

function normalizeHeader(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str).replace(/\s+/g, "").replace(/·/g, "");
}

function detectHometaxKindFromExcel(fileName: string, rawRows: any[][]): string {
  const fileUpper = fileName.toUpperCase();
  if (fileUpper.includes("현금영수증")) return "cash-receipt";
  
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

  if (fileUpper.includes("매출")) return "sales";
  if (fileUpper.includes("매입")) return "purchase";
  return "sales";
}

export async function POST(request: NextRequest) {
  try {
    const { isAuthorized, tenantId, username } = await verifyUserRole();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    let kind = formData.get("kind") as string; 
    let businessNumber = formData.get("businessNumber") as string;

    if (!file) {
      return NextResponse.json({ success: false, error: "업로드된 세무 엑셀 파일이 없습니다." }, { status: 400 });
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

    const detectedKind = detectHometaxKindFromExcel(file.name, rawRows);
    if (detectedKind) {
      kind = detectedKind;
    }

    if (!kind) {
      return NextResponse.json({ success: false, error: "업로드된 엑셀 분석 결과 증빙 종류를 식별할 수 없습니다." }, { status: 400 });
    }

    if (!businessNumber || businessNumber === "MANUAL-IMPORT") {
      // 파일명이나 시트 내에서 사업자번호 자동감지 시도
      const match = file.name.match(/\b\d{3}-\d{2}-\d{5}\b/) || file.name.match(/\b\d{10}\b/);
      if (match) {
        businessNumber = match[0].replace(/\D/g, "");
      } else {
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
    if (kind === "sales" || kind === "purchase" || kind === "tax-exempt-sales" || kind === "tax-exempt-purchase") {
      tableName = "excel_hometax_invoices";
    } else if (kind === "cash-receipt") {
      tableName = "excel_hometax_cash_receipts";
    }

    if (!tableName) {
      return NextResponse.json({ success: false, error: "알 수 없는 증빙 종류입니다." }, { status: 400 });
    }

    let insertedCount = 0;
    let duplicateCount = 0;
    let queryPeriodStart = "";
    let queryPeriodEnd = "";

    const existingApprovalNos = new Set<string>();
    try {
      const checkRes = await executeSQL(`SELECT id FROM ${tableName} WHERE tenant_id = '${tenantId}'`);
      if (checkRes && checkRes.rows) {
        checkRes.rows.forEach((r: any) => {
          if (r.id) existingApprovalNos.add(String(r.id).trim());
        });
      }
    } catch (err: any) {
      console.warn(`${tableName} table read warning:`, err.message);
    }

    const nowStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

    // ==========================================
    // A. 전자세금계산서 / 계산서
    // ==========================================
    if (tableName === "excel_hometax_invoices") {
      const metaRow = rawRows[0];
      let extractedBN = "";
      if (metaRow && Array.isArray(metaRow) && metaRow[1]) {
        extractedBN = String(metaRow[1]).replace(/\D/g, "");
      }
      if (businessNumber === "MANUAL-IMPORT" && extractedBN) {
        businessNumber = extractedBN;
      }

      // 헤더 자동 감지 (작성일자가 첫 번째 열인 행 검색, fallback index 5)
      let headerRowIndex = 5;
      for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
        const rRow = rawRows[r];
        if (rRow && rRow[0] === "작성일자" && rRow[1] === "승인번호") {
          headerRowIndex = r;
          break;
        }
      }

      const dataRows = rawRows.slice(headerRowIndex + 1);
      const dates: string[] = [];
      const rowsToInsert: any[] = [];
      const isExempt = kind.includes("tax-exempt") ? 1 : 0;
      const invoiceType = kind.includes("purchase") ? "purchase" : "sales";

      for (const row of dataRows) {
        if (!row || !Array.isArray(row) || row.length < 2) continue;
        
        const writingDate = cleanStr(row[0]); 
        const approvalNo = cleanStr(row[1]);  
        if (!writingDate || !approvalNo) continue;

        let formattedDate = writingDate;
        if (writingDate.replace(/\D/g, "").length === 8) {
          const d = writingDate.replace(/\D/g, "");
          formattedDate = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;
        }
        dates.push(formattedDate);

        if (existingApprovalNos.has(approvalNo)) {
          duplicateCount++;
          continue;
        }

        const uuid = `ht-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        rowsToInsert.push({
          id: approvalNo,
          issue_date: formattedDate,
          supplier_name: cleanStr(row[6]),
          supplier_business_number: cleanStr(row[4]),
          buyer_name: cleanStr(row[11]),
          buyer_business_number: cleanStr(row[9]),
          supply_amount: parseAmount(row[15]),
          tax_amount: isExempt === 1 ? 0 : parseAmount(row[16]),
          total_amount: parseAmount(row[14]),
          item_name: cleanStr(row[26] || row[25] || ""),
          invoice_type: invoiceType,
          memo: "",
          is_exempt: isExempt,
          tenant_id: tenantId,
          uuid: uuid,
          updated_at: nowStr,
          updated_by: username
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
    // B. 현금영수증
    // ==========================================
    else if (tableName === "excel_hometax_cash_receipts") {
      if (businessNumber === "MANUAL-IMPORT") {
        return NextResponse.json({ success: false, error: "현금영수증 임포트 시 사업자등록번호는 필수입니다." }, { status: 400 });
      }
      businessNumber = businessNumber.replace(/\D/g, "");

      const dataRows = rawRows.slice(1);
      const dates: string[] = [];
      const rowsToInsert: any[] = [];

      for (const row of dataRows) {
        if (!row || !Array.isArray(row) || row.length < 7) continue;

        const approvalNo = cleanStr(row[6]); 
        const receiptDateTime = cleanStr(row[1]); 
        if (!approvalNo || !receiptDateTime) continue;

        const datePart = receiptDateTime.split(" ")[0] || "";
        if (datePart) dates.push(datePart);

        if (existingApprovalNos.has(approvalNo)) {
          duplicateCount++;
          continue;
        }

        const uuid = `cash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        rowsToInsert.push({
          id: approvalNo,
          transaction_date: receiptDateTime,
          franchise_name: cleanStr(row[10] || "국세청 현금영수증"),
          purpose: cleanStr(row[9]),
          supply_amount: parseAmount(row[2]),
          tax_amount: parseAmount(row[3]),
          total_amount: parseAmount(row[5]),
          approval_number: approvalNo,
          memo: "",
          tenant_id: tenantId,
          uuid: uuid,
          updated_at: nowStr,
          updated_by: username
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

    return NextResponse.json({
      success: true,
      message: "성공적으로 홈택스 세무 엑셀 파일을 세무 데이터베이스에 병합 적재하였습니다.",
      data: {
        tableName,
        kind,
        businessNumber,
        queryPeriodStart,
        queryPeriodEnd,
        totalCount: insertedCount + duplicateCount,
        insertedCount,
        duplicateCount
      }
    });
  } catch (error: any) {
    console.error("Hometax Excel Import API Error:", error);
    return NextResponse.json({ success: false, error: error.message || "홈택스 파일 파싱 중 시스템 오류가 발생했습니다." }, { status: 500 });
  }
}
