/**
 * Base64 문자열을 Blob 객체로 변환하는 헬퍼 함수
 * (PDF 브라우저 보안 CSP 우회용)
 */
export const base64ToBlob = (base64: string, mimeType = "application/pdf"): Blob => {
  const base64WithoutHeader = base64.split(",")[1] || base64;
  const byteCharacters = atob(base64WithoutHeader);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

export interface EstimateMetadata {
  tags: string;
  business_number: string;
  address: string;
  representative: string;
  document_number: string;
  document_date: string;
  document_memo: string;
  delivery_date?: string;
}

/**
 * 하이브리드 JSON 메타데이터 파서
 */
export const parseEstimateMetadata = (tagsString: string): EstimateMetadata => {
  const defaultMeta: EstimateMetadata = {
    tags: "",
    business_number: "",
    address: "",
    representative: "",
    document_number: "",
    document_date: "",
    document_memo: "",
    delivery_date: ""
  };
  
  if (!tagsString) return defaultMeta;
  
  const trimmed = tagsString.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        tags: parsed.tags || "",
        business_number: parsed.business_number || "",
        address: parsed.address || "",
        representative: parsed.representative || "",
        document_number: parsed.document_number || "",
        document_date: parsed.document_date || "",
        document_memo: parsed.document_memo || "",
        delivery_date: parsed.delivery_date || ""
      };
    } catch (e) {
      // 파싱 실패 시 예외 처리 없음
    }
  }
  
  return {
    ...defaultMeta,
    tags: tagsString
  };
};

export interface ExcelParsedPurchaseOrder {
  partner_name: string;
  partner_phone: string;
  representative: string;
  address: string;
  document_number: string;
  document_date: string;
  document_memo: string;
  transaction_type: string;
  header_signature: string;
  business_number?: string;
  partner_manager?: string;
  file_url?: string;
  items: Array<{
    item_code: string;
    product_name: string;
    spec: string;
    quantity: number;
    unit_price: number;
    amount: number;
    billing_type: string;
    billing_type_name: string;
    unit: string;
    delivery_date: string;
    has_cost_breakdown: boolean;
    cost_breakdown: {
      material_cost: number;
      processing_cost: number;
      overhead_cost: number;
      other_expenses: number;
      delivery_expense: number;
    };
  }>;
}

/**
 * 엑셀 발주서를 동적으로 파싱하고 지능형 퍼지 매핑을 수행하는 헬퍼 함수
 */
export const parsePurchaseOrderExcel = async (file: File): Promise<ExcelParsedPurchaseOrder> => {
  const arrayBuffer = await file.arrayBuffer();
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 2차원 배열로 가져오기 (빈 셀 무결성 유지 위해 header: 1 사용)
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  let partner_name = "";
  let partner_phone = "";
  let representative = "";
  let address = "";
  let document_number = "";
  let document_date = "";
  let document_memo = "";
  let items: any[] = [];
  let headerRowIndex = -1;
  let headerCols: string[] = [];

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row) continue;

    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || "").trim();
      if (!val) continue;

      // 공급처 상호 감지
      if ((val.includes("공급처") || val.includes("거래처") || val.includes("상호") || val.includes("업체명")) && !partner_name) {
        if (row[c + 1]) partner_name = String(row[c + 1]).trim();
        else if (rawRows[r + 1] && rawRows[r + 1][c]) partner_name = String(rawRows[r + 1][c]).trim();
      }
      // 연락처 감지
      if ((val.includes("연락처") || val.includes("전화번호") || val.includes("휴대폰") || val.includes("전화")) && !partner_phone) {
        if (row[c + 1]) partner_phone = String(row[c + 1]).trim();
      }
      // 대표자 감지
      if ((val.includes("대표") || val.includes("대표자") || val.includes("성명")) && !representative) {
        if (row[c + 1]) representative = String(row[c + 1]).trim();
      }
      // 주소 감지
      if ((val.includes("주소") || val.includes("소재지") || val.includes("사업장")) && !address) {
        if (row[c + 1]) address = String(row[c + 1]).trim();
      }
      // 문서번호 감지
      if ((val.includes("발주번호") || val.includes("주문번호") || val.includes("문서번호")) && !document_number) {
        if (row[c + 1]) document_number = String(row[c + 1]).trim();
      }
      // 문서일자 감지
      if ((val.includes("발주일자") || val.includes("등록일자") || val.includes("일자")) && !document_date) {
        if (row[c + 1]) document_date = String(row[c + 1]).trim();
      }

      // 품명 또는 상품명이 들어간 행을 헤더로 감지
      if ((val === "품명" || val === "상품명" || val === "품목명" || val === "Product" || val === "Item") && headerRowIndex === -1) {
        headerRowIndex = r;
        headerCols = row.map(v => String(v || "").trim());
      }
    }
  }

  // 거래 유형 감출/추천
  const textToSearch = `${file.name} ${document_memo}`.toLowerCase();
  let recommendedType = "자재구매";
  if (
    textToSearch.includes("임가공") || 
    textToSearch.includes("가공") || 
    textToSearch.includes("도금") || 
    textToSearch.includes("절삭") || 
    textToSearch.includes("도장") ||
    textToSearch.includes("cnc") ||
    textToSearch.includes("밀링")
  ) {
    recommendedType = "임가공";
  } else if (
    textToSearch.includes("외주") || 
    textToSearch.includes("작업") || 
    textToSearch.includes("용역") || 
    textToSearch.includes("공사") || 
    textToSearch.includes("설치") || 
    textToSearch.includes("시공") || 
    textToSearch.includes("개발")
  ) {
    recommendedType = "외주작업";
  }

  let finalHeaderCols: string[] = [];

  if (headerRowIndex !== -1) {
    finalHeaderCols = headerCols.filter(c => c !== "");
    const nameIdx = headerCols.findIndex(c => c.includes("품명") || c.includes("상품명") || c.includes("품목명") || c.includes("Product") || c.includes("Item"));
    const codeIdx = headerCols.findIndex(c => c.includes("품목코드") || c.includes("코드") || c.includes("code") || c.includes("Code"));
    const specIdx = headerCols.findIndex(c => c.includes("규격") || c.includes("사양") || c.includes("spec") || c.includes("Spec"));
    const qtyIdx = headerCols.findIndex(c => c.includes("수량") || c.includes("qty") || c.includes("Qty") || c.includes("quantity"));
    const priceIdx = headerCols.findIndex(c => c.includes("단가") || c.includes("price") || c.includes("Price") || c.includes("cost"));
    const unitIdx = headerCols.findIndex(c => c.includes("단위") || c.includes("unit") || c.includes("Unit"));

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row) continue;

      const productName = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : "";
      if (!productName) continue;

      const itemCode = codeIdx !== -1 && row[codeIdx] ? String(row[codeIdx]).trim() : "";
      const spec = specIdx !== -1 && row[specIdx] ? String(row[specIdx]).trim() : "";
      const qty = qtyIdx !== -1 && row[qtyIdx] ? Number(row[qtyIdx]) || 1 : 1;
      const price = priceIdx !== -1 && row[priceIdx] ? Number(row[priceIdx]) || 0 : 0;
      const unit = unitIdx !== -1 && row[unitIdx] ? String(row[unitIdx]).trim() : "EA";

      items.push({
        item_code: itemCode,
        product_name: productName,
        spec: spec,
        quantity: qty,
        unit_price: price,
        amount: qty * price,
        billing_type: "general",
        billing_type_name: "일반단가",
        unit: unit,
        delivery_date: "",
        has_cost_breakdown: false,
        cost_breakdown: {
          material_cost: 0,
          processing_cost: 0,
          overhead_cost: 0,
          other_expenses: 0,
          delivery_expense: 0
        }
      });
    }
  } else {
    // 헤더 행이 검출되지 않는 경우 시트 전체를 json 오브젝트 배열로 가져옴
    const fallbackRows = XLSX.utils.sheet_to_json(worksheet) as any[];
    if (fallbackRows.length > 0) {
      finalHeaderCols = Object.keys(fallbackRows[0]);
    }
    fallbackRows.forEach((row: any) => {
      const productName = row["품명"] || row["상품명"] || row["품목명"] || row["Product"] || row["Item"] || "";
      if (!productName) return;

      const itemCode = row["품목코드"] || row["코드"] || row["code"] || row["Code"] || "";
      const spec = row["규격"] || row["사양"] || row["spec"] || row["Spec"] || "";
      const qty = Number(row["수량"] || row["qty"] || row["Qty"] || row["quantity"]) || 1;
      const price = Number(row["단가"] || row["price"] || row["Price"] || row["cost"]) || 0;
      const unit = row["단위"] || row["unit"] || row["Unit"] || "EA";

      items.push({
        item_code: itemCode,
        product_name: productName,
        spec: spec,
        quantity: qty,
        unit_price: price,
        amount: qty * price,
        billing_type: "general",
        billing_type_name: "일반단가",
        unit: unit,
        delivery_date: "",
        has_cost_breakdown: false,
        cost_breakdown: {
          material_cost: 0,
          processing_cost: 0,
          overhead_cost: 0,
          other_expenses: 0,
          delivery_expense: 0
        }
      });
    });
  }

  // 엑셀 시트 헤더 시그니처 생성 (순서가 유지된 컬럼 목록을 파이프 문자로 조인)
  const header_signature = finalHeaderCols.join("|");

  return {
    partner_name,
    partner_phone,
    representative,
    address,
    document_number,
    document_date,
    document_memo,
    transaction_type: recommendedType,
    header_signature,
    items
  };
};

export interface ExcelColumnMapping {
  partner_name: string;
  partner_phone: string;
  business_number: string;
  representative: string;
  partner_manager: string;
  document_number: string;
  document_date: string;
  address: string;
  document_memo: string;
  item_code: string;
  product_name: string;
  spec: string;
  quantity: string;
  unit_price: string;
  delivery_date: string;
}

/**
 * 엑셀 파일에서 모든 행(Row) 데이터를 2차원 배열 형태로 추출하고, 
 * 가장 컬럼이 많이 감지되거나 헤더로 의심되는 유효 컬럼 키 목록을 반환하는 함수
 */
export const getExcelColumnsAndRawData = async (file: File): Promise<{
  columns: string[];
  rawRows: any[][];
  headerRowIndex: number;
}> => {
  const arrayBuffer = await file.arrayBuffer();
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  let headerRowIndex = -1;
  let columns: string[] = [];

  // 품명 또는 상품명이 들어간 행을 헤더 행으로 우선 감지
  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || "").trim();
      if (val === "품명" || val === "상품명" || val === "품목명" || val === "Product" || val === "Item") {
        headerRowIndex = r;
        columns = row.map(v => String(v || "").trim()).filter(Boolean);
        break;
      }
    }
    if (headerRowIndex !== -1) break;
  }

  // 감지되지 않았다면 컬럼이 가장 많은 행을 후보로 탐색
  if (headerRowIndex === -1 && rawRows.length > 0) {
    let maxCols = 0;
    let bestRowIdx = 0;
    for (let r = 0; r < Math.min(rawRows.length, 20); r++) {
      const row = rawRows[r];
      if (row && row.filter(Boolean).length > maxCols) {
        maxCols = row.filter(Boolean).length;
        bestRowIdx = r;
      }
    }
    headerRowIndex = bestRowIdx;
    columns = (rawRows[bestRowIdx] || []).map(v => String(v || "").trim()).filter(Boolean);
  }

  // 그래도 비어있다면 fallback 키 추출
  if (columns.length === 0) {
    const fallbackRows = XLSX.utils.sheet_to_json(worksheet) as any[];
    if (fallbackRows.length > 0) {
      columns = Object.keys(fallbackRows[0]);
    }
  }

  // 중복 제거 및 공백 제거
  columns = Array.from(new Set(columns.map(c => c.trim()))).filter(Boolean);

  return {
    columns,
    rawRows,
    headerRowIndex
  };
};

/**
 * 엑셀 또는 문자열 수치 데이터에서 통화 기호, 콤마 등을 정제하고 안전하게 숫자로 변환하는 헬퍼
 */
const parseNumeric = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  const clean = String(val).replace(/[^0-9.-]/g, "");
  const num = Number(clean);
  return isNaN(num) ? 0 : num;
};

/**
 * 다양한 날짜 형식(Date 객체, 슬래시/점 구분자, 엑셀 시리얼 번호 등)을 YYYY-MM-DD 형태로 변환하는 헬퍼
 */
const formatExcelDate = (val: any): string => {
  if (val === undefined || val === null) return "";
  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, "0");
    const dd = String(val.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const str = String(val).trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const cleaned = str.replace(/[\/.]/g, "-");
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, "0");
    const d = parts[2].padStart(2, "0");
    if (y.length === 4 && m.length === 2 && d.length === 2) {
      return `${y}-${m}-${d}`;
    }
  }
  const numVal = Number(str);
  if (!isNaN(numVal) && numVal > 30000 && numVal < 70000) {
    const date = new Date((numVal - 25569) * 86400 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return str;
};

/**
 * 사용자가 정의한 컬럼 매핑 관계를 바탕으로 엑셀 데이터를 정밀 파싱하는 함수
 */
export const parseExcelWithMapping = (
  rawRows: any[][],
  headerRowIndex: number,
  mapping: ExcelColumnMapping,
  fileName: string
): ExcelParsedPurchaseOrder => {
  let partner_name = "";
  let partner_phone = "";
  let representative = "";
  let address = "";
  let document_number = "";
  let document_date = "";
  let document_memo = "";
  let business_number = "";
  let partner_manager = "";
  let items: any[] = [];

  // 사용된 모든 매핑 대상 컬럼명 모음 (직접입력 제외)
  const mappedCols = new Set<string>();
  Object.values(mapping).forEach(val => {
    if (val && typeof val === "string" && !val.startsWith("__DIRECT_VALUE__:")) {
      mappedCols.add(val.trim());
    }
  });

  const startRow = headerRowIndex !== -1 ? headerRowIndex : 0;
  const headerCols = rawRows[startRow] ? rawRows[startRow].map(v => String(v || "").trim()) : [];

  const getColIdx = (colName: string): number => {
    if (!colName) return -1;
    if (colName.startsWith("__DIRECT_VALUE__:")) return -99;
    return headerCols.findIndex(c => c === colName);
  };

  const nameIdx = getColIdx(mapping.product_name);
  const codeIdx = getColIdx(mapping.item_code);
  const specIdx = getColIdx(mapping.spec);
  const qtyIdx = getColIdx(mapping.quantity);
  const priceIdx = getColIdx(mapping.unit_price);
  const delivIdx = getColIdx(mapping.delivery_date);

  // 1. 거래처 메타 정보 파싱 (헤더 매핑 기반)
  // 바이어 메타 정보는 헤더 행 이전이나 시트 전체에서 검색
  const getMetaVal = (colName: string): string => {
    if (!colName) return "";
    if (colName.startsWith("__DIRECT_VALUE__:")) {
      return colName.substring("__DIRECT_VALUE__:".length);
    }
    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || "").trim();
        if (val === colName) {
          let nextVal = "";
          if (row[c + 1] !== undefined) nextVal = String(row[c + 1]).trim();
          else if (rawRows[r + 1] && rawRows[r + 1][c] !== undefined) nextVal = String(rawRows[r + 1][c]).trim();
          
          if (nextVal) {
            // 방어 코드: 수집된 값이 엑셀의 다른 헤더 컬럼명 중 하나라면 오탐지로 판단하여 빈값 무시
            if (headerCols.includes(nextVal)) {
              continue;
            }
            return nextVal;
          }
        }
      }
    }
    return "";
  };

  // 단일 테이블형 엑셀을 위한 메타 및 품목행 컬럼 통합 조회 헬퍼
  const getMetaOrRowVal = (colName: string): string => {
    if (!colName) return "";
    if (colName.startsWith("__DIRECT_VALUE__:")) {
      return colName.substring("__DIRECT_VALUE__:".length);
    }

    // 만약 지정된 컬럼명이 품목 헤더 행에 존재하는 열 이름인 경우 행 데이터에서 값을 추출 (대소문자/공백 무시)
    const colIdx = headerCols.findIndex(c => c.toLowerCase().trim() === colName.toLowerCase().trim());
    if (colIdx !== -1) {
      for (let r = startRow + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (row && row[colIdx] !== undefined && String(row[colIdx]).trim() !== "") {
          const val = String(row[colIdx]).trim();
          const nameVal = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : "";
          // 합계/소계 행을 제외하고 첫 번째 유효 데이터 행의 값 반환
          if (nameVal && !nameVal.includes("합계") && !nameVal.includes("소계") && !nameVal.includes("총계")) {
            return val;
          }
        }
      }
    }

    // 품목 헤더에 없거나 값을 찾지 못한 경우 기존 메타 검색 활용
    return getMetaVal(colName);
  };

  partner_name = getMetaOrRowVal(mapping.partner_name);
  partner_phone = getMetaOrRowVal(mapping.partner_phone);
  representative = getMetaOrRowVal(mapping.representative);
  address = getMetaOrRowVal(mapping.address);
  document_number = getMetaOrRowVal(mapping.document_number);
  document_date = formatExcelDate(getMetaOrRowVal(mapping.document_date));
  const originalMemo = getMetaOrRowVal(mapping.document_memo);
  business_number = getMetaOrRowVal(mapping.business_number);
  partner_manager = getMetaOrRowVal(mapping.partner_manager);

  // 매핑되지 않은 메타 영역 정보 수집
  const unmappedMetaList: Array<{ key: string; val: string }> = [];

  for (let r = 0; r < startRow; r++) {
    const row = rawRows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || "").trim();
      if (!cellVal) continue;
      
      // 이 셀의 텍스트가 어떤 매핑(예: "바이어 상호" 등)에도 쓰이지 않은 경우
      if (!mappedCols.has(cellVal)) {
        if (cellVal.includes(":") && cellVal.length > 2) {
          unmappedMetaList.push({ 
            key: cellVal.split(":")[0].trim(), 
            val: cellVal.substring(cellVal.indexOf(":") + 1).trim() 
          });
        } else {
          let nextVal = "";
          if (row[c + 1] !== undefined && String(row[c + 1]).trim() !== "") {
            nextVal = String(row[c + 1]).trim();
          } else if (rawRows[r + 1] && rawRows[r + 1][c] !== undefined && String(rawRows[r + 1][c]).trim() !== "") {
            nextVal = String(rawRows[r + 1][c]).trim();
          }
          
          if (nextVal) {
            if (!mappedCols.has(nextVal) && nextVal.length < 100) {
              unmappedMetaList.push({ key: cellVal, val: nextVal });
            }
          }
        }
      }
    }
  }

  // 2. 품목 리스트 파싱
  for (let r = startRow + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row) continue;

    // 품명은 필수
    const productName = nameIdx === -99 
      ? mapping.product_name.substring("__DIRECT_VALUE__:".length)
      : (nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : "");
    if (!productName) continue;

    // 합계나 소계 행 스킵
    if (productName.includes("합계") || productName.includes("소계") || productName.includes("총계")) {
      continue;
    }

    const itemCode = codeIdx === -99 ? mapping.item_code.substring("__DIRECT_VALUE__:".length) : (codeIdx !== -1 && row[codeIdx] ? String(row[codeIdx]).trim() : "");
    const spec = specIdx === -99 ? mapping.spec.substring("__DIRECT_VALUE__:".length) : (specIdx !== -1 && row[specIdx] ? String(row[specIdx]).trim() : "");
    const qty = qtyIdx === -99 ? parseNumeric(mapping.quantity.substring("__DIRECT_VALUE__:".length)) : (qtyIdx !== -1 ? parseNumeric(row[qtyIdx]) : 1);
    const price = priceIdx === -99 ? parseNumeric(mapping.unit_price.substring("__DIRECT_VALUE__:".length)) : (priceIdx !== -1 ? parseNumeric(row[priceIdx]) : 0);
    const itemDeliveryDate = delivIdx === -99 ? mapping.delivery_date.substring("__DIRECT_VALUE__:".length) : (delivIdx !== -1 ? formatExcelDate(row[delivIdx]) : "");

    items.push({
      item_code: itemCode,
      product_name: productName,
      spec: spec,
      quantity: qty,
      unit_price: price,
      amount: qty * price,
      billing_type: "general",
      billing_type_name: "일반단가",
      unit: "EA",
      delivery_date: itemDeliveryDate,
      has_cost_breakdown: false,
      cost_breakdown: {
        material_cost: 0,
        processing_cost: 0,
        overhead_cost: 0,
        other_expenses: 0,
        delivery_expense: 0
      }
    });
  }

  // 매핑되지 않은 남은 메타 정보들을 종합하여 document_memo에 병합
  const extraMemoParts: string[] = [];
  const seenMeta = new Set<string>();

  if (unmappedMetaList.length > 0) {
    const metaLines: string[] = [];
    unmappedMetaList.forEach(item => {
      if (item.key && item.val && item.key !== item.val) {
        const pairKey = `${item.key}:${item.val}`;
        if (!seenMeta.has(pairKey)) {
          seenMeta.add(pairKey);
          metaLines.push(`- ${item.key}: ${item.val}`);
        }
      }
    });
    if (metaLines.length > 0) {
      extraMemoParts.push("[매핑 제외 메타 정보]");
      extraMemoParts.push(...metaLines);
    }
  }

  if (extraMemoParts.length > 0) {
    const divider = originalMemo ? "\n\n" : "";
    document_memo = `${originalMemo}${divider}${extraMemoParts.join("\n")}`;
  } else {
    document_memo = originalMemo;
  }

  // 거래 유형 감출/추천
  const textToSearch = `${fileName} ${document_memo}`.toLowerCase();
  let recommendedType = "자재구매";
  if (
    textToSearch.includes("임가공") || 
    textToSearch.includes("가공") || 
    textToSearch.includes("도금") || 
    textToSearch.includes("절삭") || 
    textToSearch.includes("도장") ||
    textToSearch.includes("cnc") ||
    textToSearch.includes("밀링")
  ) {
    recommendedType = "임가공";
  } else if (
    textToSearch.includes("외주") || 
    textToSearch.includes("작업") || 
    textToSearch.includes("용역") || 
    textToSearch.includes("공사") || 
    textToSearch.includes("설치") || 
    textToSearch.includes("시공") || 
    textToSearch.includes("개발")
  ) {
    recommendedType = "외주작업";
  }

  // 시그니처 생성
  const finalHeaderCols = headerCols.filter(Boolean);
  const header_signature = finalHeaderCols.join("|");

  return {
    partner_name,
    partner_phone,
    representative,
    address,
    document_number,
    document_date,
    document_memo,
    transaction_type: recommendedType,
    header_signature,
    business_number,
    partner_manager,
    items
  };
};
