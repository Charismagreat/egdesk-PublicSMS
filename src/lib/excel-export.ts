import * as XLSX from 'xlsx';

export interface ExcelColumn {
  key: string;
  label: string;
  width?: number;
  format?: 'currency' | 'date' | 'text' | 'number';
}

export interface ExportExcelOptions {
  filename: string;
  sheetName?: string;
  columns: ExcelColumn[];
  data: any[];
}

/**
 * 대장 데이터를 정규 서식의 .xlsx 엑셀 파일로 브라우저 즉시 다운로드
 */
export function exportToExcel({
  filename,
  sheetName = '대장내역',
  columns,
  data
}: ExportExcelOptions): void {
  if (!data || data.length === 0) {
    alert('내보낼 데이터가 없습니다.');
    return;
  }

  // 1. 헤더 행 생성
  const headerRow = columns.map(c => c.label);

  // 2. 데이터 행 변환
  const rows = data.map(item => {
    return columns.map(col => {
      let val = item[col.key];
      if (val === null || val === undefined) return '';

      if (col.format === 'currency' || col.format === 'number') {
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? 0 : num;
      }
      return String(val);
    });
  });

  // 3. 워크시트 생성
  const wsData = [headerRow, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 4. 컬럼 너비 설정
  ws['!cols'] = columns.map(col => ({
    wch: col.width || Math.max(col.label.length * 2 + 4, 12)
  }));

  // 5. 워크북 생성 및 다운로드
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const todayStr = new Date().toISOString().split('T')[0];
  const finalFilename = filename.endsWith('.xlsx') ? filename : `${todayStr}_${filename}.xlsx`;

  XLSX.writeFile(wb, finalFilename);
}

/**
 * 대장 데이터를 구글 스프레드시트 또는 연동된 시트로 실시간 열기
 */
export function openGoogleSheetsViewer(savedUrl?: string): void {
  if (savedUrl && (savedUrl.includes('docs.google.com') || savedUrl.startsWith('http'))) {
    window.open(savedUrl, '_blank', 'noopener,noreferrer');
  } else {
    window.open('https://docs.google.com/spreadsheets/u/0/', '_blank', 'noopener,noreferrer');
  }
}
