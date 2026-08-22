"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useRef, useEffect } from "react";
import { Upload, X, FileText, CheckCircle2, RefreshCw, AlertCircle, FileSpreadsheet, Download, Link2, Sparkles, Database, ExternalLink } from "lucide-react";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl, SAMPLE_GOOGLE_SHEET_URL } from '@/lib/google-sheets-storage';

interface EstimateOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EstimateOcrModal({
  isOpen,
  onClose,
  onSuccess
}: EstimateOcrModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  
  const [activeImportTab, setActiveImportTab] = useState<'ocr' | 'excel' | 'sheets'>('ocr');
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrFilename, setOcrFilename] = useState("");
  const [ocrScanStep, setOcrScanStep] = useState("");
  const [receiverMatched, setReceiverMatched] = useState<boolean>(true);
  const [myCompanyName, setMyCompanyName] = useState<string>("주식회사 쿠스");
  const [userRole, setUserRole] = useState<string>("SUB_OPERATOR");
  const [userName, setUserName] = useState<string>("");
  const [forceBypass, setForceBypass] = useState<boolean>(false);
  const [bypassReason, setBypassReason] = useState<string>("");

  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>("");
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);

  const [ocrForm, setOcrForm] = useState({
    partner_name: "",
    partner_phone: "",
    partner_manager: "",
    items: [] as Array<{ item_code?: string; product_name: string; spec?: string; quantity: number; unit_price: number; validItemCode?: string; valid_item_code?: string }>,
    file_url: "",
    business_number: "",
    representative: "",
    address: "",
    document_number: "",
    document_date: "",
    document_memo: "",
    originalTotalAmount: 0,
    originalTotalQuantity: 0
  });

  useEffect(() => {
    async function fetchUserRoleAndSettings() {
      try {
        const res = await apiFetch("/api/auth/me");
        const data = await res.json();
        if (data.success) {
          setUserRole(data.role || "SUB_OPERATOR");
          setUserName(data.username || "");
        }
      } catch (e) {
        console.error("세션 조회 실패:", e);
      }
      try {
        const savedUrl = getSavedGoogleSheetUrl('estimate_inbound_sheet_url');
        if (savedUrl && !savedUrl.includes("1t3OiWthLbcZDgcrLJSI-XVKX")) {
          setGoogleSheetUrl(savedUrl);
        } else {
          setGoogleSheetUrl("");
        }
      } catch (e) {
        setGoogleSheetUrl("");
      }
    }
    if (isOpen) {
      fetchUserRoleAndSettings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetOcrState = () => {
    setOcrScanning(false);
    setOcrSuccess(false);
    setOcrFilename("");
    setOcrScanStep("");
    setReceiverMatched(true);
    setMyCompanyName("주식회사 쿠스");
    setForceBypass(false);
    setBypassReason("");
    setOcrForm({
      partner_name: "",
      partner_phone: "",
      partner_manager: "",
      items: [],
      file_url: "",
      business_number: "",
      representative: "",
      address: "",
      document_number: "",
      document_date: "",
      document_memo: "",
      originalTotalAmount: 0,
      originalTotalQuantity: 0
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  const handleClose = () => {
    resetOcrState();
    onClose();
  };

  const handleDownloadStandardTemplate = async () => {
    try {
      const XLSX = await import("xlsx");
      const headers = [
        "거래처명",
        "사업자번호",
        "대표자명",
        "연락처",
        "담당자",
        "견적서번호",
        "견적일자",
        "품목코드",
        "품목명",
        "규격",
        "수량",
        "단가",
        "공급가액",
        "세액",
        "비고"
      ];
      const sampleRows = [
        [
          "(주)대선기공",
          "120-81-12345",
          "박대선",
          "02-555-1234",
          "박민우",
          "EST-20260822-001",
          "2026-08-22",
          "INV-1002",
          "고성능 서보 모터",
          "100W / 220V",
          10,
          150000,
          1500000,
          150000,
          "납기 3일 이내 납품 요망"
        ],
        [
          "(주)대선기공",
          "120-81-12345",
          "박대선",
          "02-555-1234",
          "박민우",
          "EST-20260822-001",
          "2026-08-22",
          "INV-1008",
          "인버터 컨트롤러",
          "V-02 정밀 제어형",
          5,
          300000,
          1500000,
          150000,
          "KC 인증서 동봉 필수"
        ]
      ];
      const wsData = [headers, ...sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      ws['!cols'] = [
        { wch: 16 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
        { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 16 },
        { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 24 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "견적서");
      XLSX.writeFile(wb, "이지데스크_표준_견적서_양식.xlsx");
    } catch (err: any) {
      alert("표준 엑셀 양식 다운로드 중 오류: " + err.message);
    }
  };

  const parseTableDataToEstimate = async (rawRows: any[][], sourceTitle: string) => {
    if (!rawRows || rawRows.length < 2) {
      throw new Error("유효한 데이터 행이 부족합니다. 최소 1개 이상의 헤더와 데이터가 필요합니다.");
    }

    setOcrScanning(true);
    setOcrScanStep("테이블 데이터를 정밀 분석하여 거래처 정보 및 품목 내역을 스마트 매핑 중...");
    setOcrFilename(sourceTitle);

    let partner_name = "";
    let partner_phone = "";
    let partner_manager = "";
    let business_number = "";
    let representative = "";
    let address = "";
    let document_number = "";
    let document_date = "";
    let document_memo = "";

    // 1. 헤더 행 탐색 및 정밀 컬럼 매핑 (키워드 우선순위 정규화)
    let headerRowIdx = -1;
    let colMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
      const row = rawRows[r] || [];
      const tempColMap: Record<string, number> = {};

      row.forEach((colVal, cIdx) => {
        const c = String(colVal || '').trim().toLowerCase().replace(/\s+/g, '');
        if (!c) return;

        // 품목코드 우선 검사 (품목명과 충돌 방지)
        if (c.includes("품목코드") || c.includes("상품코드") || c.includes("품번") || c.includes("바코드") || c === "코드" || c === "code" || c === "itemcode") {
          tempColMap["item_code"] = cIdx;
        } else if (c.includes("품목명") || c.includes("품명") || c.includes("상품명") || c.includes("물품명") || c.includes("제품명") || c === "품목" || c === "item" || c === "description") {
          tempColMap["product_name"] = cIdx;
        } else if (c.includes("규격") || c.includes("사양") || c.includes("옵션") || c.includes("spec") || c.includes("specification")) {
          tempColMap["spec"] = cIdx;
        } else if (c.includes("수량") || c.includes("qty") || c.includes("ea") || c.includes("수량(ea)") || c === "개수" || c === "수량(개)") {
          tempColMap["quantity"] = cIdx;
        } else if (c.includes("단가") || c.includes("공급단가") || c.includes("price") || c.includes("unitprice") || c.includes("단가(원)")) {
          tempColMap["unit_price"] = cIdx;
        } else if (c.includes("공급가액") || c.includes("공급가") || c.includes("합계금액") || c.includes("금액") || c.includes("amount") || c.includes("합계(원)")) {
          tempColMap["amount"] = cIdx;
        } else if (c.includes("거래처") || c.includes("공급처") || c.includes("상호") || c.includes("업체명") || c === "업체" || c === "거래처명") {
          tempColMap["partner_name"] = cIdx;
        } else if (c.includes("사업자") || c.includes("등록번호") || c.includes("사업자번호") || c.includes("사업자등록번호")) {
          tempColMap["business_number"] = cIdx;
        } else if (c.includes("대표자") || c.includes("대표명") || c === "대표" || c === "대표자명" || c === "성명") {
          tempColMap["representative"] = cIdx;
        } else if (c.includes("연락처") || c.includes("전화번호") || c.includes("휴대폰") || c.includes("tel") || c.includes("phone")) {
          tempColMap["partner_phone"] = cIdx;
        } else if (c.includes("담당자") || c.includes("담당") || c.includes("매니저") || c.includes("작성자")) {
          tempColMap["partner_manager"] = cIdx;
        } else if (c.includes("견적서번호") || c.includes("견적번호") || c.includes("문서번호") || c.includes("관리번호") || c.includes("docno") || c.includes("no")) {
          tempColMap["document_number"] = cIdx;
        } else if (c.includes("견적일자") || c.includes("발행일자") || c.includes("작성일자") || c.includes("일자") || c.includes("날짜") || c.includes("date")) {
          tempColMap["document_date"] = cIdx;
        } else if (c.includes("소재지") || c.includes("주소") || c.includes("사업장") || c.includes("address")) {
          tempColMap["address"] = cIdx;
        } else if (c.includes("비고") || c.includes("메모") || c.includes("참조") || c.includes("memo") || c.includes("remark")) {
          tempColMap["document_memo"] = cIdx;
        }
      });

      // 품목명 또는 (수량/단가)가 감지된 행을 헤더 행으로 채택
      if (tempColMap["product_name"] !== undefined || (tempColMap["quantity"] !== undefined && tempColMap["unit_price"] !== undefined)) {
        headerRowIdx = r;
        colMap = tempColMap;
        break;
      }
    }

    // 헤더 행을 못 찾은 경우 첫 번째 행을 기본 헤더로 매핑
    if (headerRowIdx === -1) {
      headerRowIdx = 0;
      (rawRows[0] || []).forEach((colVal, cIdx) => {
        const c = String(colVal || '').trim().toLowerCase();
        if (c.includes("품목명") || c.includes("품명") || c.includes("상품명")) colMap["product_name"] = cIdx;
        if (c.includes("규격")) colMap["spec"] = cIdx;
        if (c.includes("수량")) colMap["quantity"] = cIdx;
        if (c.includes("단가")) colMap["unit_price"] = cIdx;
        if (c.includes("거래처") || c.includes("상호")) colMap["partner_name"] = cIdx;
      });
    }

    // 2. 헤더 이전 Key-Value 형태의 메타데이터 추출 (있을 경우)
    for (let r = 0; r < headerRowIdx; r++) {
      const row = rawRows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || "").trim();
        if (!val) continue;
        if ((val.includes("공급처") || val.includes("거래처") || val.includes("상호") || val.includes("업체명")) && !partner_name) {
          partner_name = String(row[c + 1] || (rawRows[r + 1] && rawRows[r + 1][c]) || "").trim();
        }
        if ((val.includes("사업자") || val.includes("등록번호")) && !business_number) {
          business_number = String(row[c + 1] || (rawRows[r + 1] && rawRows[r + 1][c]) || "").trim();
        }
        if ((val.includes("대표자") || val.includes("대표")) && !representative) {
          representative = String(row[c + 1] || "").trim();
        }
        if ((val.includes("연락처") || val.includes("전화번호") || val.includes("tel")) && !partner_phone) {
          partner_phone = String(row[c + 1] || "").trim();
        }
        if ((val.includes("담당자") || val.includes("담당")) && !partner_manager) {
          partner_manager = String(row[c + 1] || "").trim();
        }
        if ((val.includes("문서번호") || val.includes("견적번호") || val.includes("견적서번호")) && !document_number) {
          document_number = String(row[c + 1] || "").trim();
        }
        if ((val.includes("견적일자") || val.includes("발행일자") || val.includes("작성일자") || val.includes("일자")) && !document_date) {
          document_date = String(row[c + 1] || "").trim();
        }
        if ((val.includes("소재지") || val.includes("주소")) && !address) {
          address = String(row[c + 1] || "").trim();
        }
      }
    }

    // 3. 본문 품목 행들 파싱 및 데이터 컬럼에서 메타데이터 보강
    const items: Array<any> = [];
    const numClean = (val: any) => {
      if (typeof val === 'number') return val;
      const str = String(val || '').replace(/[^0-9.-]/g, '');
      return parseFloat(str) || 0;
    };

    const prodIdx = colMap["product_name"] !== undefined ? colMap["product_name"] : (colMap["item_code"] !== undefined ? colMap["item_code"] + 1 : 0);
    const specIdx = colMap["spec"] !== undefined ? colMap["spec"] : -1;
    const qtyIdx = colMap["quantity"] !== undefined ? colMap["quantity"] : -1;
    const priceIdx = colMap["unit_price"] !== undefined ? colMap["unit_price"] : -1;
    const codeIdx = colMap["item_code"] !== undefined ? colMap["item_code"] : -1;
    const amountIdx = colMap["amount"] !== undefined ? colMap["amount"] : -1;

    let originalTotalAmountFromSheet = 0;
    let originalTotalQuantityFromSheet = 0;

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const firstCell = String(row[0] || '').trim();
      const prodCell = String(row[prodIdx] || '').trim();

      // 합계/총액 행 감지 시 실물 합계액 추출
      if (firstCell.includes("합계") || firstCell.includes("총액") || prodCell.includes("합계") || prodCell.includes("총액") || firstCell.toLowerCase().includes("total")) {
        if (amountIdx >= 0 && row[amountIdx]) {
          originalTotalAmountFromSheet = numClean(row[amountIdx]);
        }
        if (qtyIdx >= 0 && row[qtyIdx]) {
          originalTotalQuantityFromSheet = numClean(row[qtyIdx]);
        }
        continue;
      }

      if (!prodCell) continue;

      // 데이터 행 컬럼에서 거래처 메타데이터 추출 (비어있는 경우 백필)
      if (!partner_name && colMap["partner_name"] !== undefined && row[colMap["partner_name"]]) {
        partner_name = String(row[colMap["partner_name"]]).trim();
      }
      if (!business_number && colMap["business_number"] !== undefined && row[colMap["business_number"]]) {
        business_number = String(row[colMap["business_number"]]).trim();
      }
      if (!representative && colMap["representative"] !== undefined && row[colMap["representative"]]) {
        representative = String(row[colMap["representative"]]).trim();
      }
      if (!partner_phone && colMap["partner_phone"] !== undefined && row[colMap["partner_phone"]]) {
        partner_phone = String(row[colMap["partner_phone"]]).trim();
      }
      if (!partner_manager && colMap["partner_manager"] !== undefined && row[colMap["partner_manager"]]) {
        partner_manager = String(row[colMap["partner_manager"]]).trim();
      }
      if (!document_number && colMap["document_number"] !== undefined && row[colMap["document_number"]]) {
        document_number = String(row[colMap["document_number"]]).trim();
      }
      if (!document_date && colMap["document_date"] !== undefined && row[colMap["document_date"]]) {
        let dateVal = String(row[colMap["document_date"]]).trim();
        // 엑셀 시리얼 날짜 숫자 처리
        if (/^\d{5}$/.test(dateVal)) {
          const jsDate = new Date((Number(dateVal) - 25569) * 86400 * 1000);
          if (!isNaN(jsDate.getTime())) dateVal = jsDate.toISOString().slice(0, 10);
        }
        document_date = dateVal;
      }
      if (!address && colMap["address"] !== undefined && row[colMap["address"]]) {
        address = String(row[colMap["address"]]).trim();
      }
      if (!document_memo && colMap["document_memo"] !== undefined && row[colMap["document_memo"]]) {
        document_memo = String(row[colMap["document_memo"]]).trim();
      }

      const rawSpec = specIdx >= 0 ? String(row[specIdx] || '').trim() : '';
      const rawQty = qtyIdx >= 0 ? (numClean(row[qtyIdx]) || 1) : 1;
      let rawPrice = priceIdx >= 0 ? numClean(row[priceIdx]) : 0;
      
      // 단가가 없고 공급가액만 있는 경우 단가 역산
      if (rawPrice === 0 && amountIdx >= 0 && row[amountIdx]) {
        const amt = numClean(row[amountIdx]);
        if (amt > 0 && rawQty > 0) rawPrice = Math.round(amt / rawQty);
      }

      const rawCode = codeIdx >= 0 ? String(row[codeIdx] || '').trim() : '';

      items.push({
        product_name: prodCell,
        spec: rawSpec,
        quantity: rawQty,
        unit_price: rawPrice,
        item_code: rawCode
      });
    }

    if (items.length === 0) {
      throw new Error("인식된 품목 데이터가 없습니다. 엑셀의 품목명, 수량, 단가 컬럼을 확인해 주세요.");
    }

    // 4. 품목 마스터 DB 조회 후 validItemCode 자동 매칭
    try {
      setOcrScanStep("마스터 품목 DB와 대조하여 품목코드(바코드)를 자동 매칭 중...");
      const prodRes = await apiFetch("/api/products?limit=5000");
      const prodData = await prodRes.json();
      if (prodData.success && Array.isArray(prodData.products)) {
        const masterProducts = prodData.products;
        items.forEach(it => {
          const matched = masterProducts.find((mp: any) => 
            mp.name?.trim().toLowerCase() === it.product_name.toLowerCase() ||
            (it.item_code && mp.barcode === it.item_code)
          );
          if (matched) {
            it.validItemCode = matched.barcode || `INV-${matched.id}`;
            it.valid_item_code = it.validItemCode;
            if (!it.spec && matched.spec) it.spec = matched.spec;
          } else if (it.item_code) {
            it.validItemCode = it.item_code;
          }
        });
      }
    } catch (e) {
      console.warn("품목 매칭 건너뜀:", e);
    }

    const calculatedTotalAmt = items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);
    const calculatedTotalQty = items.reduce((sum, it) => sum + it.quantity, 0);

    setOcrForm({
      partner_name: partner_name || "(주)신규공급사",
      partner_phone: partner_phone || "",
      partner_manager: partner_manager || "",
      items: items,
      file_url: "",
      business_number: business_number || "",
      representative: representative || "",
      address: address || "",
      document_number: document_number || `EST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 899 + 100)}`,
      document_date: document_date || new Date().toISOString().slice(0, 10),
      document_memo: document_memo || `${sourceTitle} 연동 접수`,
      originalTotalAmount: originalTotalAmountFromSheet || calculatedTotalAmt,
      originalTotalQuantity: originalTotalQuantityFromSheet || calculatedTotalQty
    });

    setReceiverMatched(true);
    setOcrScanning(false);
    setOcrSuccess(true);
  };

  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setOcrScanning(true);
      const XLSX = await import("xlsx");
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[][];
      await parseTableDataToEstimate(rawRows, file.name);
    } catch (err: any) {
      setOcrScanning(false);
      alert("엑셀 파일 파싱 오류: " + err.message);
    }
  };

  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) return;
    try {
      setIsFetchingSheet(true);
      setOcrScanning(true);
      setSavedGoogleSheetUrl('estimate_inbound_sheet_url', googleSheetUrl.trim());
      const res = await apiFetch("/api/shared/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: googleSheetUrl.trim(),
          sheetUrl: googleSheetUrl.trim(),
          fetchAllRows: true
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "구글 시트 데이터를 가져오지 못했습니다.");
      
      const rawRows = data.data || (data.headers ? [data.headers, ...(data.rows || [])] : data.rows || []);
      await parseTableDataToEstimate(rawRows, data.spreadsheetTitle || "구글 스프레드시트 연동");
    } catch (err: any) {
      setOcrScanning(false);
      alert("연동 실패: " + err.message);
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const rotateImageBase64 = (base64: string, degrees: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject();
        if (degrees === 90 || degrees === 270) { canvas.width = img.height; canvas.height = img.width; }
        else { canvas.width = img.width; canvas.height = img.height; }
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      };
      img.src = base64;
    });
  };

  const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrScanning(true);
    setOcrFilename(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      let base64Data = reader.result as string;
      try {
        const res = await apiFetch("/api/estimates/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64Data, filename: file.name, document_type: "estimate" })
        });
        const data = await res.json();
        if (data.success) {
          setOcrForm({
            partner_name: data.partner_name,
            partner_phone: data.partner_phone || "",
            partner_manager: data.partner_manager || "",
            items: data.items,
            file_url: base64Data,
            business_number: data.partner_business_number || "",
            representative: data.partner_representative || "",
            address: data.partner_address || "",
            document_number: data.document_number || "",
            document_date: data.document_date || "",
            document_memo: data.document_memo || "",
            originalTotalAmount: data.originalTotalAmount || 0,
            originalTotalQuantity: data.originalTotalQuantity || 0
          });
          setOcrScanning(false);
          setOcrSuccess(true);
        }
      } catch (err) {
        setOcrScanning(false);
        alert("OCR 실패");
      }
    };
    reader.readAsDataURL(file);
  };

  const calculatedTotal = ocrForm.items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);
  const calculatedTotalQuantity = ocrForm.items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const isAmountMatching = ocrForm.originalTotalAmount === calculatedTotal;
  const isQuantityMatching = ocrForm.originalTotalQuantity === calculatedTotalQuantity;

  const handleSaveOcrEstimate = async () => {
    try {
      const res = await apiFetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ocrForm,
          type: "INBOUND",
          direction_status: "REQUESTED",
          ai_parsed: 1,
          import_source: activeImportTab === 'excel' ? 'EXCEL_FILE' : activeImportTab === 'sheets' ? 'GOOGLE_SHEETS' : 'OCR_SCAN',
          force_bypass: forceBypass,
          bypass_reason: bypassReason
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("등록 성공!");
        resetOcrState();
        onSuccess();
        onClose();
      } else alert(data.error);
    } catch (e) {
      alert("등록 오류");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">받은 견적서 스마트 접수</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">실물 스캔, 엑셀, 구글 시트를 모두 지원합니다.</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!ocrSuccess && (
          <div className="flex items-center gap-2 mt-4 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80">
            <button onClick={() => setActiveImportTab('ocr')} className={`flex-1 py-2.5 rounded-xl text-xs font-black ${activeImportTab === 'ocr' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>📸 실물 스캔</button>
            <button onClick={() => setActiveImportTab('excel')} className={`flex-1 py-2.5 rounded-xl text-xs font-black ${activeImportTab === 'excel' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>📁 엑셀 등록</button>
            <button onClick={() => setActiveImportTab('sheets')} className={`flex-1 py-2.5 rounded-xl text-xs font-black ${activeImportTab === 'sheets' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>📊 구글 시트</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          {activeImportTab === 'ocr' && !ocrSuccess && (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
              <Upload className="w-8 h-8 text-indigo-400 mb-4" />
              <p className="text-xs font-bold text-slate-600">견적서 이미지 또는 PDF 업로드</p>
              <label className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer">
                파일 선택
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleOcrFileChange} className="hidden" />
              </label>
            </div>
          )}

          {activeImportTab === 'excel' && !ocrSuccess && (
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                    <FileSpreadsheet className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs font-black text-emerald-950 block">표준 엑셀 템플릿 제공</span>
                    <span className="text-[10px] text-emerald-700 font-medium">거래처에 배포하거나 직접 작성할 수 있는 정갈한 서식을 다운로드하세요.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadStandardTemplate}
                  className="px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>표준 양식 (.xlsx)</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/20 hover:bg-emerald-50/40 rounded-3xl p-8 text-center transition-all flex flex-col items-center justify-center min-h-[190px]">
                {ocrScanning ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-extrabold text-emerald-700 animate-pulse">{ocrScanStep || "엑셀 데이터 분석 중..."}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{ocrFilename}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-white text-emerald-600 shadow-sm rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">견적서 엑셀(.xlsx, .xls, .csv) 파일을 선택하세요</p>
                      <p className="text-[10px] text-slate-400 mt-1">표준 양식 및 거래처 자체 엑셀 양식 모두 스마트 자동 매핑됩니다.</p>
                    </div>
                    <label className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                      엑셀 파일 선택 (.xlsx / .csv)
                      <input 
                        ref={excelInputRef}
                        type="file" 
                        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                        onChange={handleExcelFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeImportTab === 'sheets' && !ocrSuccess && (
            <div className="space-y-4 text-left">
              <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-3xl space-y-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-blue-600 text-white rounded-lg shadow-2xs">
                      <Link2 className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-blue-950">구글 스프레드시트 실시간 데이터 연동</h4>
                      <p className="text-[10px] text-blue-700 font-medium">공유된 구글 스프레드시트 링크를 통해 최신 견적 데이터를 1초 만에 가져옵니다.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(SAMPLE_GOOGLE_SHEET_URL, "_blank")}
                      className="px-2.5 py-1.5 bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-3xs cursor-pointer active:scale-95"
                      title="시스템 표준 샘플 구글 스프레드시트를 새 창에서 열람합니다."
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>샘플 시트 보기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoogleSheetUrl(SAMPLE_GOOGLE_SHEET_URL)}
                      className="px-2.5 py-1.5 bg-blue-100/80 hover:bg-blue-200 text-blue-800 rounded-lg text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                      title="샘플 주소를 입력창에 자동으로 채워 즉시 테스트합니다."
                    >
                      <span>샘플 URL 입력</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 block">구글 시트 공유 링크 (URL) *</label>
                    {googleSheetUrl && (
                      <button
                        type="button"
                        onClick={() => setGoogleSheetUrl("")}
                        className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                      >
                        입력 초기화
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="url"
                      value={googleSheetUrl}
                      onChange={(e) => setGoogleSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                      className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800 placeholder:text-slate-350"
                    />
                    <button
                      type="button"
                      onClick={handleFetchGoogleSheet}
                      disabled={isFetchingSheet || ocrScanning || !googleSheetUrl.trim()}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-40 shadow-sm cursor-pointer active:scale-95"
                    >
                      {isFetchingSheet ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>데이터 불러오기</span>
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 font-medium leading-relaxed bg-white/70 p-2.5 rounded-xl border border-blue-100">
                  💡 구글 시트 상단 [공유] 메뉴에서 <strong>'링크가 있는 모든 사용자에게 공개 (보기 권한)'</strong>로 설정되어 있어야 안전하게 데이터를 읽어올 수 있습니다.
                </p>
              </div>

              {ocrScanning && (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-extrabold text-blue-700 animate-pulse">{ocrScanStep || "구글 시트 데이터 분석 중..."}</p>
                </div>
              )}
            </div>
          )}

          {/* 공통 파싱 결과 폼 & 이중 가드 수치 대조 */}
          {ocrSuccess && (
            <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 space-y-4 animate-scale-up">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-black">
                    {activeImportTab === 'excel' ? '📁 엑셀 파싱 완료' : activeImportTab === 'sheets' ? '📊 구글 시트 연동 완료' : '📸 OCR 판독 완료'}
                  </span>
                  <span className="text-xs font-bold text-slate-600 truncate max-w-[280px]">{ocrFilename}</span>
                </div>
                <button
                  type="button"
                  onClick={resetOcrState}
                  className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>다시 불러오기</span>
                </button>
              </div>

              {/* 금액 및 수량 실시간 대조 배지 바 */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-2.5 rounded-2xl text-[10px] border border-slate-200 text-left">
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-slate-500">실물총액:</span>
                  <input
                    type="number"
                    value={ocrForm.originalTotalAmount || ''}
                    onChange={(e) => setOcrForm({ ...ocrForm, originalTotalAmount: Number(e.target.value) || 0 })}
                    className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-slate-800 font-mono font-bold text-right focus:outline-none focus:border-indigo-500 bg-white"
                    placeholder="수동 입력"
                    title="명세서에 적힌 원본 최종 합계금액"
                  />
                  <span className="font-bold text-slate-500">원</span>
                </div>
                
                <div className="h-3 w-px bg-slate-350 hidden md:block"></div>

                <div className="flex items-center space-x-1">
                  <span className="font-bold text-slate-500">계산액:</span>
                  <span className="font-mono font-black text-slate-800">{calculatedTotal.toLocaleString()}원</span>
                </div>

                <div className="h-3 w-px bg-slate-350"></div>
                {isAmountMatching ? (
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[9px] font-black flex items-center gap-0.5 leading-none">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    금액 일치
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9px] font-black flex items-center gap-0.5 leading-none animate-pulse">
                     <AlertCircle className="w-2.5 h-2.5" />
                     금액 불일치
                  </span>
                )}

                <div className="h-4 w-px bg-slate-300 w-full md:w-px md:h-3"></div>

                <div className="flex items-center space-x-1">
                  <span className="font-bold text-slate-500">실물수량:</span>
                  <input
                    type="number"
                    value={ocrForm.originalTotalQuantity || ''}
                    onChange={(e) => setOcrForm({ ...ocrForm, originalTotalQuantity: Number(e.target.value) || 0 })}
                    className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-slate-800 font-mono font-bold text-right focus:outline-none focus:border-indigo-500 bg-white"
                    placeholder="수동 입력"
                    title="명세서에 적힌 원본 최종 합계 수량"
                  />
                  <span className="font-bold text-slate-500">개</span>
                </div>

                <div className="h-3 w-px bg-slate-350 hidden md:block"></div>

                <div className="flex items-center space-x-1">
                  <span className="font-bold text-slate-500">계산수량:</span>
                  <span className="font-mono font-black text-slate-800">{calculatedTotalQuantity.toLocaleString()}개</span>
                </div>

                <div className="h-3 w-px bg-slate-350"></div>
                {isQuantityMatching ? (
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded text-[9px] font-black flex items-center gap-0.5 leading-none">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    수량 일치
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[9px] font-black flex items-center gap-0.5 leading-none animate-pulse">
                    <AlertCircle className="w-2.5 h-2.5" />
                    수량 불일치
                  </span>
                )}
              </div>

              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left">분석 결과 자동입력 확인</span>
              
              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">공급처명</label>
                  <input 
                    type="text" 
                    value={ocrForm.partner_name}
                    onChange={e => setOcrForm(prev => ({ ...prev, partner_name: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">연락처</label>
                  <input 
                    type="text" 
                    value={ocrForm.partner_phone}
                    onChange={e => setOcrForm(prev => ({ ...prev, partner_phone: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">사업자번호</label>
                  <input 
                    type="text" 
                    value={ocrForm.business_number}
                    onChange={e => setOcrForm(prev => ({ ...prev, business_number: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">대표자명</label>
                  <input 
                    type="text" 
                    value={ocrForm.representative}
                    onChange={e => setOcrForm(prev => ({ ...prev, representative: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">담당자명</label>
                  <input 
                    type="text" 
                    value={ocrForm.partner_manager}
                    onChange={e => setOcrForm(prev => ({ ...prev, partner_manager: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">문서번호</label>
                  <input 
                    type="text" 
                    value={ocrForm.document_number}
                    onChange={e => setOcrForm(prev => ({ ...prev, document_number: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">발행일자</label>
                  <input 
                    type="text" 
                    value={ocrForm.document_date}
                    onChange={e => setOcrForm(prev => ({ ...prev, document_date: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">소재지 주소</label>
                  <input 
                    type="text" 
                    value={ocrForm.address}
                    onChange={e => setOcrForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="text-left">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">기타 비고</label>
                <textarea 
                  value={ocrForm.document_memo}
                  onChange={e => setOcrForm(prev => ({ ...prev, document_memo: e.target.value }))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold resize-none text-slate-800"
                  rows={2}
                />
              </div>

              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-400 font-bold block">상세 품목 리스트 ({ocrForm.items.length}개)</label>
                  <span className="text-[10px] font-black text-indigo-600 flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    마스터 품목 자동 연동
                  </span>
                </div>
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {ocrForm.items.map((item, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-1 text-xs font-semibold text-left shadow-3xs">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 truncate pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800">{item.product_name}</span>
                            {item.item_code && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded">
                                {item.item_code}
                              </span>
                            )}
                            {(item.validItemCode || item.valid_item_code) && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded border border-emerald-200">
                                유효코드: {item.validItemCode || item.valid_item_code}
                              </span>
                            )}
                          </div>
                          {item.spec && (
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              규격: {item.spec}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            단가: {item.unit_price.toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded text-center">{item.quantity}개</span>
                          <span className="text-[10px] font-black text-indigo-650 mt-1">
                            금액: {(item.quantity * item.unit_price).toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 총액 패널 */}
              <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 flex items-center justify-between text-left shrink-0">
                <span className="text-xs font-extrabold text-slate-600">견적 등록 예정 총액 (총 {ocrForm.items.length}개 품목)</span>
                <span className="text-lg font-black text-indigo-700 font-mono">
                  {ocrForm.items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0).toLocaleString()}원
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4 flex gap-3">
          <button onClick={handleClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-colors">
            취소
          </button>
          <button 
            onClick={handleSaveOcrEstimate}
            disabled={!ocrSuccess || (!receiverMatched && !forceBypass) || (forceBypass && bypassReason.trim().length < 5)}
            className={`flex-1 py-3 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors cursor-pointer ${
              forceBypass 
                ? "bg-amber-600 hover:bg-amber-700" 
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {forceBypass ? "⚠️ 관리자 강제 승인 및 등록" : "받은 견적서 등록 승인"}
          </button>
        </div>
      </div>
    </div>
  );
}
