import * as XLSX from 'xlsx';

export interface InboundExcelParsedItem {
  item_name: string;      // 품목명 (필수)
  item_code: string;      // 품목코드 (선택)
  barcode: string;        // 바코드 (선택)
  spec: string;           // 규격
  quantity: number;       // 수량
  unit_price: number;     // 단가
  unit_type: string;      // 단위
  box_contains: number;   // 박스당 입수량
  item_type: string;      // 구분 (자재/제품)
  category: string;       // 카테고리
  location: string;       // 적재위치
  note: string;           // 비고 (매핑안된 데이터 병합 수집)
}

export interface InboundExcelParsedResult {
  header_signature: string;
  partner_name: string;
  inbound_date: string;
  items: InboundExcelParsedItem[];
  rawRows?: any[][];
  headerRowIndex?: number;
}

/**
 * 엑셀/CSV 파일에서 첫 행의 헤더 열 이름들을 추출하여 파이프(|)로 연결한 시그니처 문자열을 생성합니다.
 */
export const parseInboundExcelHeader = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 빈 셀 무결성 보존을 위해 2차원 배열로 전환
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  if (!rawRows || rawRows.length === 0) return "";

  // 유효한 첫 행(헤더) 탐색
  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (row && row.length > 0) {
      const headers = row.map(v => String(v || "").trim()).filter(Boolean);
      if (headers.length > 0) {
        return headers.join('|');
      }
    }
  }
  return "";
};

/**
 * 엑셀/CSV 파일에서 전체 행 데이터(rawRows) 및 헤더 행의 인덱스를 추출합니다.
 */
export const getExcelColumnsAndRawData = async (
  file: File
): Promise<{ rawRows: any[][]; headerRowIndex: number; headers: string[] }> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  let headerRowIndex = -1;
  let headers: string[] = [];

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row) continue;

    // 핵심 컬럼 추정 일반 단어로 첫 헤더 행 지능형 검출
    const rowText = row.map(v => String(v || "").trim());
    const hasCoreColumn = rowText.some(v => 
      v.includes("품명") || v.includes("상품명") || v.includes("품목명") || 
      v.includes("바코드") || v.includes("코드") || v.includes("수량") || v.includes("단가")
    );

    if (hasCoreColumn && headerRowIndex === -1) {
      headerRowIndex = r;
      headers = row.map(v => String(v || "").trim());
      break;
    }
  }

  // 지능형 헤더 검출 실패 시 첫 번째 유효 행을 강제 헤더로 사용
  if (headerRowIndex === -1) {
    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (row && row.length > 0) {
        headerRowIndex = r;
        headers = row.map(v => String(v || "").trim());
        break;
      }
    }
  }

  return { rawRows, headerRowIndex, headers };
};

/**
 * 저장된 매핑(열 인덱스 및 설정) 정보를 바탕으로 엑셀 로우(rawRows) 데이터를 해석하여 자율 입고 품목 목록을 빌드합니다.
 * 매핑되지 않은 모든 컬럼들의 셀 값은 'note(비고)' 필드에 기타 정보로 수집 및 병합됩니다.
 */
export const parseInboundExcelWithMapping = (
  rawRows: any[][],
  headerRowIndex: number,
  mapping: {
    item_name: number;
    item_code?: number;
    barcode?: number;
    spec: number;
    quantity: number;
    unit_price: number;
    unit_type?: number;
    box_contains?: number;
    item_type?: number;
    category?: number;
    location?: number;
    note?: number;
    partner_name?: number;
    inbound_date?: number;
    direct_values?: {
      item_name?: string;
      item_code?: string;
      barcode?: string;
      spec?: string;
      quantity?: string;
      unit_price?: string;
      unit_type?: string;
      box_contains?: string;
      item_type?: string;
      category?: string;
      location?: string;
      note?: string;
      partner_name?: string;
      inbound_date?: string;
    };
  },
  filename: string
): InboundExcelParsedResult => {
  const items: InboundExcelParsedItem[] = [];
  let partner_name = "";
  let inbound_date = "";

  // 1. 헤더 행의 실제 컬럼들 추출
  const headerRow = rawRows[headerRowIndex] || [];
  const headerCols = headerRow.map(v => String(v || "").trim()).filter(Boolean);
  const header_signature = headerCols.join('|');

  // 직접입력 고정값 데이터 바인딩
  const direct = mapping.direct_values || {};

  // 매핑에 사용된 실제 '엑셀 내 인덱스' 목록 (0 이상인 유효 열만 수집)
  const usedIndices = [
    mapping.item_name,
    mapping.item_code,
    mapping.barcode,
    mapping.spec,
    mapping.quantity,
    mapping.unit_price,
    mapping.unit_type,
    mapping.box_contains,
    mapping.item_type,
    mapping.category,
    mapping.location,
    mapping.note,
    mapping.partner_name,
    mapping.inbound_date
  ].filter((idx): idx is number => idx !== undefined && idx >= 0);

  // 2. 헤더 행 다음 라인부터 데이터를 매핑하여 읽어옴
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    // A. 품목명 (필수)
    const nameIdx = mapping.item_name;
    let item_name = "";
    if (nameIdx === -2) {
      item_name = String(direct.item_name || "").trim();
    } else if (nameIdx !== undefined && nameIdx >= 0 && row[nameIdx] !== undefined) {
      item_name = String(row[nameIdx]).trim();
    }
    if (!item_name) continue; // 품목명이 없으면 행 스킵

    // B. 품목코드 (선택)
    const codeIdx = mapping.item_code;
    let item_code = "";
    if (codeIdx === -2) {
      item_code = String(direct.item_code || "").trim();
    } else if (codeIdx !== undefined && codeIdx >= 0 && row[codeIdx] !== undefined) {
      item_code = String(row[codeIdx]).trim();
    }

    // C. 바코드 (선택)
    const barcodeIdx = mapping.barcode;
    let barcode = "";
    if (barcodeIdx === -2) {
      barcode = String(direct.barcode || "").trim();
    } else if (barcodeIdx !== undefined && barcodeIdx >= 0 && row[barcodeIdx] !== undefined) {
      barcode = String(row[barcodeIdx]).trim();
    }

    // D. 규격 (선택)
    const specIdx = mapping.spec;
    let spec = "";
    if (specIdx === -2) {
      spec = String(direct.spec || "").trim();
    } else if (specIdx !== undefined && specIdx >= 0 && row[specIdx] !== undefined) {
      spec = String(row[specIdx]).trim();
    }

    // E. 수량 (필수)
    const qtyIdx = mapping.quantity;
    let quantity = 1;
    if (qtyIdx === -2) {
      quantity = Number(direct.quantity) || 1;
    } else if (qtyIdx !== undefined && qtyIdx >= 0 && row[qtyIdx] !== undefined) {
      quantity = Number(row[qtyIdx]) || 1;
    }

    // F. 단가 (선택)
    const priceIdx = mapping.unit_price;
    let unit_price = 0;
    if (priceIdx === -2) {
      unit_price = Number(direct.unit_price) || 0;
    } else if (priceIdx !== undefined && priceIdx >= 0 && row[priceIdx] !== undefined) {
      unit_price = Number(row[priceIdx]) || 0;
    }

    // G. 단위 (선택)
    const unitIdx = mapping.unit_type;
    let unit_type = "개";
    if (unitIdx === -2) {
      unit_type = String(direct.unit_type || "개").trim();
    } else if (unitIdx !== undefined && unitIdx >= 0 && row[unitIdx] !== undefined) {
      unit_type = String(row[unitIdx]).trim();
    }

    // H. 박스당 입수량 (선택)
    const boxIdx = mapping.box_contains;
    let box_contains = 1;
    if (boxIdx === -2) {
      box_contains = Number(direct.box_contains) || 1;
    } else if (boxIdx !== undefined && boxIdx >= 0 && row[boxIdx] !== undefined) {
      box_contains = Number(row[boxIdx]) || 1;
    }

    // I. 구분 (자재/제품 - 선택)
    const typeIdx = mapping.item_type;
    let item_type = "자재";
    if (typeIdx === -2) {
      item_type = String(direct.item_type || "자재").trim();
    } else if (typeIdx !== undefined && typeIdx >= 0 && row[typeIdx] !== undefined) {
      item_type = String(row[typeIdx]).trim();
    }

    // J. 카테고리 (선택)
    const catIdx = mapping.category;
    let category = "기타";
    if (catIdx === -2) {
      category = String(direct.category || "기타").trim();
    } else if (catIdx !== undefined && catIdx >= 0 && row[catIdx] !== undefined) {
      category = String(row[catIdx]).trim();
    }

    // K. 적재위치 (선택)
    const locIdx = mapping.location;
    let location = "자율입고창고";
    if (locIdx === -2) {
      location = String(direct.location || "자율입고창고").trim();
    } else if (locIdx !== undefined && locIdx >= 0 && row[locIdx] !== undefined) {
      location = String(row[locIdx]).trim();
    }

    // L. 매핑안된 나머지 컬럼 데이터 수집
    const unmappedData = row
      .map((val, idx) => {
        if (usedIndices.includes(idx)) return null;
        if (val === undefined || val === null || String(val).trim() === '') return null;
        const headerName = headerRow[idx] || `열${idx + 1}`;
        return `${headerName}: ${String(val).trim()}`;
      })
      .filter(Boolean)
      .join(', ');

    // M. 비고 데이터 처리
    const noteIdx = mapping.note;
    let explicitNote = "";
    if (noteIdx === -2) {
      explicitNote = String(direct.note || "").trim();
    } else if (noteIdx !== undefined && noteIdx >= 0 && row[noteIdx] !== undefined) {
      explicitNote = String(row[noteIdx]).trim();
    }

    const note = [explicitNote, unmappedData ? `[기타정보] ${unmappedData}` : ''].filter(Boolean).join(' | ');

    // N. 공급처 정보 수집 (첫 번째 유효 행의 값을 사용)
    const partnerIdx = mapping.partner_name;
    if (partnerIdx === -2 && !partner_name) {
      partner_name = String(direct.partner_name || "").trim();
    } else if (partnerIdx !== undefined && partnerIdx >= 0 && row[partnerIdx] && !partner_name) {
      partner_name = String(row[partnerIdx]).trim();
    }

    // O. 입고일 정보 수집 (첫 번째 유효 행의 값을 사용)
    const dateIdx = mapping.inbound_date;
    if (dateIdx === -2 && !inbound_date) {
      inbound_date = String(direct.inbound_date || "").trim();
    } else if (dateIdx !== undefined && dateIdx >= 0 && row[dateIdx] && !inbound_date) {
      inbound_date = String(row[dateIdx]).trim();
    }

    items.push({
      item_name,
      item_code,
      barcode,
      spec,
      quantity,
      unit_price,
      unit_type,
      box_contains,
      item_type,
      category,
      location,
      note
    });
  }

  // 공급처명이 끝내 비어있을 시 자동 포맷팅
  if (!partner_name) {
    const cleanName = filename.replace(/\.[^/.]+$/, ""); // 확장자 제거
    partner_name = cleanName.includes("입고") ? cleanName.split("입고")[0].trim() : "일반공급처";
  }

  // 입고일이 없을 시 오늘 날짜로 보정
  if (!inbound_date) {
    inbound_date = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  return {
    header_signature,
    partner_name,
    inbound_date,
    items
  };
};
