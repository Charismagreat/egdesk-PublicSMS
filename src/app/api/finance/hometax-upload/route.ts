export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { queryTable, insertRows, executeSQL } from "../../../../../egdesk-helpers";

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

    // 기존 승인번호 리스트 가져오기
    const existingApprovalNos = new Set<string>();
    try {
      const checkRes = await executeSQL(`SELECT 승인번호 FROM ${tableName}`);
      if (checkRes && checkRes.rows) {
        checkRes.rows.forEach((r: any) => {
          if (r.승인번호) existingApprovalNos.add(String(r.승인번호).trim());
        });
      }
    } catch (err: any) {
      console.warn(`${tableName} table read warning:`, err.message);
    }

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

      // 헤더: 6행 (index 5), 데이터: 7행 (index 6+)
      const headerRowIndex = 5;
      const dataRows = rawRows.slice(headerRowIndex + 1);
      const dates: string[] = [];
      const rowsToInsert: any[] = [];

      for (const row of dataRows) {
        if (!row || !Array.isArray(row) || row.length < 2) continue;
        
        const writingDate = cleanStr(row[0]); // 작성일자 (YYYYMMDD)
        const approvalNo = cleanStr(row[1]);  // 승인번호
        if (!writingDate || !approvalNo) continue;

        // 작성일자 포맷 정규화 (YYYYMMDD -> YYYY-MM-DD)
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

        rowsToInsert.push({
          business_number: businessNumber,
          invoice_type: kind, // 'sales' | 'purchase'
          작성일자: formattedDate,
          승인번호: approvalNo,
          발급일자: cleanStr(row[2]),
          전송일자: cleanStr(row[3]),
          공급자사업자등록번호: cleanStr(row[4]),
          공급자종사업장번호: cleanStr(row[5]),
          공급자상호: cleanStr(row[6]),
          공급자대표자명: cleanStr(row[7]),
          공급자주소: cleanStr(row[8]),
          공급받는자사업자등록번호: cleanStr(row[9]),
          공급받는자종사업장번호: cleanStr(row[10]),
          공급받는자상호: cleanStr(row[11]),
          공급받는자대표자명: cleanStr(row[12]),
          공급받는자주소: cleanStr(row[13]),
          합계금액: parseAmount(row[14]),
          공급가액: parseAmount(row[15]),
          세액: parseAmount(row[16]),
          전자세금계산서분류: cleanStr(row[17]),
          전자세금계산서종류: cleanStr(row[18]),
          발급유형: cleanStr(row[19]),
          비고: cleanStr(row[20]),
          영수청구구분: cleanStr(row[21]),
          공급자이메일: cleanStr(row[22]),
          공급받는자이메일1: cleanStr(row[23]),
          공급받는자이메일2: cleanStr(row[24]),
          품목일자: cleanStr(row[25]),
          품목명: cleanStr(row[26]),
          품목규격: cleanStr(row[27]),
          품목수량: cleanStr(row[28]),
          품목단가: cleanStr(row[29]),
          품목공급가액: parseAmount(row[30]),
          품목세액: parseAmount(row[31]),
          품목비고: cleanStr(row[32]),
          excel_file_path: file.name
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
    // B. 면세 전자계산서 (면세 매출/매입)
    // ==========================================
    else if (kind === "tax-exempt-sales" || kind === "tax-exempt-purchase") {
      // 메타데이터 행(1행 index 0)에서 사업자등록번호 백필용 추출
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
      const invoiceType = kind === "tax-exempt-sales" ? "sales" : "purchase";
      const rowsToInsert: any[] = [];

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

        rowsToInsert.push({
          business_number: businessNumber,
          invoice_type: invoiceType,
          작성일자: formattedDate,
          승인번호: approvalNo,
          발급일자: cleanStr(row[2]),
          전송일자: cleanStr(row[3]),
          공급자사업자등록번호: cleanStr(row[4]),
          공급자종사업장번호: cleanStr(row[5]),
          공급자상호: cleanStr(row[6]),
          공급자대표자명: cleanStr(row[7]),
          공급자주소: cleanStr(row[8]),
          공급받는자사업자등록번호: cleanStr(row[9]),
          공급받는자종사업장번호: cleanStr(row[10]),
          공급받는자상호: cleanStr(row[11]),
          공급받는자대표자명: cleanStr(row[12]),
          공급받는자주소: cleanStr(row[13]),
          합계금액: parseAmount(row[14]),
          공급가액: parseAmount(row[15]),
          세액: 0, // 면세 강제 0
          전자세금계산서분류: cleanStr(row[16]),
          전자세금계산서종류: cleanStr(row[17]),
          발급유형: cleanStr(row[18]),
          비고: cleanStr(row[19]),
          영수청구구분: cleanStr(row[20]),
          공급자이메일: cleanStr(row[21]),
          공급받는자이메일1: cleanStr(row[22]),
          공급받는자이메일2: cleanStr(row[23]),
          품목일자: cleanStr(row[24]),
          품목명: cleanStr(row[25]),
          품목규격: cleanStr(row[26]),
          품목수량: cleanStr(row[27]),
          품목단가: cleanStr(row[28]),
          품목공급가액: parseAmount(row[29]),
          품목세액: 0, // 면세 강제 0
          품목비고: cleanStr(row[30]),
          excel_file_path: file.name
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

        const datePart = receiptDateTime.split(" ")[0] || "";
        if (datePart) dates.push(datePart);

        if (existingApprovalNos.has(approvalNo)) {
          duplicateCount++;
          continue;
        }

        rowsToInsert.push({
          business_number: businessNumber,
          발행구분: cleanStr(row[0]),
          매출일시: receiptDateTime,
          공급가액: parseAmount(row[2]),
          부가세: parseAmount(row[3]),
          봉사료: parseAmount(row[4]),
          총금액: parseAmount(row[5]),
          승인번호: approvalNo,
          신분확인뒷4자리: cleanStr(row[7]),
          거래구분: cleanStr(row[8]),
          용도구분: cleanStr(row[9]),
          비고: cleanStr(row[10]),
          excel_file_path: file.name
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
    // D. 홈택스 동기화 역사 테이블 기록 (hometax_sync_operations)
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
      message: "성공적으로 홈택스 엑셀 파일을 세무 데이터베이스에 병합 적재하였습니다.",
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
    return NextResponse.json(
      {
        success: false,
        error: error.message || "홈택스 파일 파싱 및 이지데스크 서버 저장 중 시스템 에러가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
