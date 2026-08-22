"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, X, FileText, CheckCircle2, RefreshCw, AlertCircle, 
  FileSpreadsheet, Download, Link2, Sparkles, Database, ExternalLink,
  Layers, ChevronDown, ChevronUp, Check, Building2
} from "lucide-react";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl, SAMPLE_GOOGLE_SHEET_URL } from '@/lib/google-sheets-storage';

export interface ParsedEstimateGroup {
  id: string;
  partner_name: string;
  partner_phone: string;
  partner_manager: string;
  business_number: string;
  representative: string;
  address: string;
  document_number: string;
  document_date: string;
  document_memo: string;
  originalTotalAmount: number;
  originalTotalQuantity: number;
  items: Array<{
    item_code?: string;
    product_name: string;
    spec?: string;
    quantity: number;
    unit_price: number;
    validItemCode?: string;
    valid_item_code?: string;
  }>;
}

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

  // 🌟 다중 견적서 그룹 관리 상태
  const [parsedGroups, setParsedGroups] = useState<ParsedEstimateGroup[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // 단일 폼 편집용 상태 (단일 견적서이거나 특정 그룹 선택 시)
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
    setParsedGroups([]);
    setExpandedGroupId(null);
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

  // 📥 표준 엑셀 양식 다운로드 핸들러
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
        ],
        [
          "(주)한성정밀",
          "214-86-54321",
          "이한성",
          "031-777-8899",
          "김수진",
          "EST-20260822-002",
          "2026-08-22",
          "INV-2001",
          "정밀 감속기",
          "1/10 비율",
          3,
          450000,
          1350000,
          135000,
          "성적서 동봉 요망"
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
      XLSX.writeFile(wb, "이지데스크-표준- 받은 견적 등록 양식.xlsx");
    } catch (err: any) {
      alert("표준 엑셀 양식 다운로드 중 오류: " + err.message);
    }
  };

  // 📊 2차원 테이블 데이터 다중 거래처 자동 그룹핑 파서 엔진
  const parseTableDataToEstimate = async (rawRows: any[][], sourceTitle: string) => {
    if (!rawRows || rawRows.length < 2) {
      throw new Error("유효한 데이터 행이 부족합니다. 최소 1개 이상의 헤더와 데이터가 필요합니다.");
    }

    setOcrScanning(true);
    setOcrScanStep("테이블 데이터를 정밀 분석하여 거래처별 견적서를 자동 분류 중...");
    setOcrFilename(sourceTitle);

    // 1. 헤더 행 탐색 및 컬럼 매핑
    let headerRowIdx = -1;
    let colMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
      const row = rawRows[r] || [];
      const tempColMap: Record<string, number> = {};

      row.forEach((colVal, cIdx) => {
        const c = String(colVal || '').trim().toLowerCase().replace(/\s+/g, '');
        if (!c) return;

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

      if (tempColMap["product_name"] !== undefined || (tempColMap["quantity"] !== undefined && tempColMap["unit_price"] !== undefined)) {
        headerRowIdx = r;
        colMap = tempColMap;
        break;
      }
    }

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

    // 2. 상단 단일 메타데이터 (있을 경우 기본값 활용)
    let defaultPartnerName = "";
    let defaultBizNum = "";
    let defaultRep = "";
    let defaultPhone = "";
    let defaultManager = "";
    let defaultDocNo = "";
    let defaultDocDate = "";
    let defaultAddress = "";

    for (let r = 0; r < headerRowIdx; r++) {
      const row = rawRows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || "").trim();
        if (!val) continue;
        if ((val.includes("공급처") || val.includes("거래처") || val.includes("상호") || val.includes("업체명")) && !defaultPartnerName) {
          defaultPartnerName = String(row[c + 1] || (rawRows[r + 1] && rawRows[r + 1][c]) || "").trim();
        }
        if ((val.includes("사업자") || val.includes("등록번호")) && !defaultBizNum) {
          defaultBizNum = String(row[c + 1] || (rawRows[r + 1] && rawRows[r + 1][c]) || "").trim();
        }
        if ((val.includes("대표자") || val.includes("대표")) && !defaultRep) {
          defaultRep = String(row[c + 1] || "").trim();
        }
        if ((val.includes("연락처") || val.includes("전화번호") || val.includes("tel")) && !defaultPhone) {
          defaultPhone = String(row[c + 1] || "").trim();
        }
        if ((val.includes("담당자") || val.includes("담당")) && !defaultManager) {
          defaultManager = String(row[c + 1] || "").trim();
        }
        if ((val.includes("문서번호") || val.includes("견적번호") || val.includes("견적서번호")) && !defaultDocNo) {
          defaultDocNo = String(row[c + 1] || "").trim();
        }
        if ((val.includes("견적일자") || val.includes("발행일자") || val.includes("작성일자") || val.includes("일자")) && !defaultDocDate) {
          defaultDocDate = String(row[c + 1] || "").trim();
        }
        if ((val.includes("소재지") || val.includes("주소")) && !defaultAddress) {
          defaultAddress = String(row[c + 1] || "").trim();
        }
      }
    }

    // 3. 다중 거래처/문서번호 자동 그룹핑 순회
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

    const groupsMap = new Map<string, ParsedEstimateGroup>();
    let currentActiveKey = "DEFAULT_GROUP";

    // 품목 마스터 DB 조회
    let masterProducts: any[] = [];
    try {
      setOcrScanStep("마스터 품목 DB와 대조하여 품목코드(바코드)를 자동 매칭 중...");
      const prodRes = await apiFetch("/api/products?limit=5000");
      const prodData = await prodRes.json();
      if (prodData.success && Array.isArray(prodData.products)) {
        masterProducts = prodData.products;
      }
    } catch (e) {}

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const firstCell = String(row[0] || '').trim();
      const prodCell = String(row[prodIdx] || '').trim();

      if (firstCell.includes("합계") || firstCell.includes("총액") || prodCell.includes("합계") || prodCell.includes("총액") || firstCell.toLowerCase().includes("total")) {
        continue;
      }

      if (!prodCell) continue;

      // 행별 거래처명 및 문서번호 감지
      const rowPartnerName = colMap["partner_name"] !== undefined && row[colMap["partner_name"]] 
        ? String(row[colMap["partner_name"]]).trim() 
        : defaultPartnerName;
      
      const rowDocNo = colMap["document_number"] !== undefined && row[colMap["document_number"]] 
        ? String(row[colMap["document_number"]]).trim() 
        : defaultDocNo;

      const groupKey = `${rowPartnerName || 'NEW_PARTNER'}_${rowDocNo || 'DOC_' + r}`;
      if (rowPartnerName || rowDocNo) {
        currentActiveKey = groupKey;
      }

      if (!groupsMap.has(currentActiveKey)) {
        let dateVal = colMap["document_date"] !== undefined && row[colMap["document_date"]] 
          ? String(row[colMap["document_date"]]).trim() 
          : defaultDocDate;

        if (/^\d{5}$/.test(dateVal)) {
          const jsDate = new Date((Number(dateVal) - 25569) * 86400 * 1000);
          if (!isNaN(jsDate.getTime())) dateVal = jsDate.toISOString().slice(0, 10);
        }

        groupsMap.set(currentActiveKey, {
          id: `grp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          partner_name: rowPartnerName || defaultPartnerName || "(주)신규공급사",
          partner_phone: colMap["partner_phone"] !== undefined && row[colMap["partner_phone"]] ? String(row[colMap["partner_phone"]]).trim() : defaultPhone,
          partner_manager: colMap["partner_manager"] !== undefined && row[colMap["partner_manager"]] ? String(row[colMap["partner_manager"]]).trim() : defaultManager,
          business_number: colMap["business_number"] !== undefined && row[colMap["business_number"]] ? String(row[colMap["business_number"]]).trim() : defaultBizNum,
          representative: colMap["representative"] !== undefined && row[colMap["representative"]] ? String(row[colMap["representative"]]).trim() : defaultRep,
          address: colMap["address"] !== undefined && row[colMap["address"]] ? String(row[colMap["address"]]).trim() : defaultAddress,
          document_number: rowDocNo || defaultDocNo || `EST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 899 + 100)}`,
          document_date: dateVal || new Date().toISOString().slice(0, 10),
          document_memo: colMap["document_memo"] !== undefined && row[colMap["document_memo"]] ? String(row[colMap["document_memo"]]).trim() : `${sourceTitle} 연동 접수`,
          originalTotalAmount: 0,
          originalTotalQuantity: 0,
          items: []
        });
      }

      const targetGroup = groupsMap.get(currentActiveKey)!;

      const rawSpec = specIdx >= 0 ? String(row[specIdx] || '').trim() : '';
      const rawQty = qtyIdx >= 0 ? (numClean(row[qtyIdx]) || 1) : 1;
      let rawPrice = priceIdx >= 0 ? numClean(row[priceIdx]) : 0;
      
      if (rawPrice === 0 && amountIdx >= 0 && row[amountIdx]) {
        const amt = numClean(row[amountIdx]);
        if (amt > 0 && rawQty > 0) rawPrice = Math.round(amt / rawQty);
      }

      const rawCode = codeIdx >= 0 ? String(row[codeIdx] || '').trim() : '';

      let validItemCode = rawCode;
      if (masterProducts.length > 0) {
        const matched = masterProducts.find((mp: any) => 
          mp.name?.trim().toLowerCase() === prodCell.toLowerCase() ||
          (rawCode && mp.barcode === rawCode)
        );
        if (matched) {
          validItemCode = matched.barcode || `INV-${matched.id}`;
        }
      }

      targetGroup.items.push({
        product_name: prodCell,
        spec: rawSpec,
        quantity: rawQty,
        unit_price: rawPrice,
        item_code: rawCode,
        validItemCode: validItemCode,
        valid_item_code: validItemCode
      });

      targetGroup.originalTotalAmount += (rawQty * rawPrice);
      targetGroup.originalTotalQuantity += rawQty;
    }

    const groups = Array.from(groupsMap.values()).filter(g => g.items.length > 0);

    if (groups.length === 0) {
      throw new Error("인식된 품목 데이터가 없습니다. 품목명, 수량, 단가 컬럼을 확인해 주세요.");
    }

    setParsedGroups(groups);
    setExpandedGroupId(groups[0]?.id || null);

    // 1건인 경우 단일 ocrForm에도 동기화
    if (groups.length === 1) {
      const g = groups[0];
      setOcrForm({
        partner_name: g.partner_name,
        partner_phone: g.partner_phone,
        partner_manager: g.partner_manager,
        items: g.items,
        file_url: "",
        business_number: g.business_number,
        representative: g.representative,
        address: g.address,
        document_number: g.document_number,
        document_date: g.document_date,
        document_memo: g.document_memo,
        originalTotalAmount: g.originalTotalAmount,
        originalTotalQuantity: g.originalTotalQuantity
      });
    }

    setReceiverMatched(true);
    setOcrScanning(false);
    setOcrSuccess(true);
  };

  // 📁 엑셀 파일 다중 워크시트(전 탭) 일괄 업로드 핸들러
  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      setOcrScanning(true);
      setOcrScanStep("엑셀 워크시트를 전수 스캔하여 데이터를 취합하는 중...");
      const XLSX = await import("xlsx");
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      // 모든 시트(탭)의 데이터를 순회하여 통합 취합
      let combinedRows: any[][] = [];
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (rows && rows.length > 0) {
          if (combinedRows.length === 0) {
            combinedRows = rows;
          } else {
            // 헤더 제외하고 데이터 행 추가
            combinedRows = combinedRows.concat(rows.slice(1));
          }
        }
      }

      await parseTableDataToEstimate(combinedRows, file.name);
    } catch (err: any) {
      setOcrScanning(false);
      alert("엑셀 파일 파싱 오류: " + err.message);
    }
  };

  // 📊 구글 스프레드시트 실시간 불러오기 핸들러
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

  // HTML5 Canvas 이미지 회전
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

  // 이미지/PDF AI OCR 파일 변경 핸들러
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
          const singleGroup: ParsedEstimateGroup = {
            id: `grp_ocr_${Date.now()}`,
            partner_name: data.partner_name,
            partner_phone: data.partner_phone || "",
            partner_manager: data.partner_manager || "",
            items: data.items,
            business_number: data.partner_business_number || "",
            representative: data.partner_representative || "",
            address: data.partner_address || "",
            document_number: data.document_number || "",
            document_date: data.document_date || "",
            document_memo: data.document_memo || "",
            originalTotalAmount: data.originalTotalAmount || 0,
            originalTotalQuantity: data.originalTotalQuantity || 0
          };
          setParsedGroups([singleGroup]);
          setExpandedGroupId(singleGroup.id);
          setOcrForm({
            ...singleGroup,
            file_url: base64Data
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

  // 단일 폼 수치 계산
  const calculatedTotal = ocrForm.items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);
  const calculatedTotalQuantity = ocrForm.items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const isAmountMatching = ocrForm.originalTotalAmount === calculatedTotal;
  const isQuantityMatching = ocrForm.originalTotalQuantity === calculatedTotalQuantity;

  // 전체 그룹 총액 및 총수량 종합 계산
  const grandTotalAmount = parsedGroups.reduce((sum, g) => sum + g.originalTotalAmount, 0);
  const grandTotalItemsCount = parsedGroups.reduce((sum, g) => sum + g.items.length, 0);

  // 🚀 다중/단일 견적서 일괄 대장 등록 실행
  const handleSaveAllEstimates = async () => {
    const groupsToSave = parsedGroups.length > 0 ? parsedGroups : (ocrForm.partner_name ? [{
      ...ocrForm,
      id: 'single'
    }] : []);

    if (groupsToSave.length === 0) return;

    try {
      let successCount = 0;
      for (const group of groupsToSave) {
        const tagsObj = {
          business_number: group.business_number,
          representative: group.representative,
          address: group.address,
          document_number: group.document_number,
          document_date: group.document_date,
          document_memo: group.document_memo,
          import_source: activeImportTab === 'excel' ? 'EXCEL_FILE' : activeImportTab === 'sheets' ? 'GOOGLE_SHEETS' : 'OCR_SCAN'
        };

        const res = await apiFetch("/api/estimates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "INBOUND",
            direction_status: "REQUESTED",
            partner_name: group.partner_name,
            partner_phone: group.partner_phone,
            partner_manager: group.partner_manager,
            items: group.items,
            ai_parsed: 1,
            file_url: ocrForm.file_url,
            tags: JSON.stringify(tagsObj),
            force_bypass: forceBypass,
            bypass_reason: bypassReason
          })
        });
        const data = await res.json();
        if (data.success) successCount++;
      }

      alert(`총 ${successCount}건의 받은 견적서가 성공적으로 대장에 등록되었습니다!`);
      resetOcrState();
      onSuccess();
      onClose();
    } catch (e) {
      alert("견적서 등록 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">받은 견적서 스마트 접수</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">실물 OCR 스캔, 엑셀 파일(다중 탭), 구글 시트 다중 거래처 연동을 모두 지원합니다.</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 🌟 3-Way 입력 모드 선택 탭 */}
        {!ocrSuccess && (
          <div className="flex items-center gap-2 mt-4 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80">
            <button onClick={() => setActiveImportTab('ocr')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeImportTab === 'ocr' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}>
              <Upload className="w-3.5 h-3.5" />
              <span>📸 실물 스캔 (OCR)</span>
            </button>
            <button onClick={() => setActiveImportTab('excel')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeImportTab === 'excel' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}>
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>📁 엑셀 등록</span>
            </button>
            <button onClick={() => setActiveImportTab('sheets')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeImportTab === 'sheets' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}>
              <Link2 className="w-3.5 h-3.5" />
              <span>📊 구글 시트 연동</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          {/* 1. OCR 채널 */}
          {activeImportTab === 'ocr' && !ocrSuccess && (
            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-3xl p-8 text-center transition-all flex flex-col items-center justify-center min-h-[220px]">
              {ocrScanning ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-extrabold text-indigo-700 animate-pulse">{ocrScanStep || "문서 분석 중..."}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{ocrFilename}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-white text-indigo-600 shadow-sm rounded-2xl flex items-center justify-center mx-auto border border-slate-100">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">견적서 실물 이미지 또는 PDF 문서를 업로드하세요</p>
                    <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, JPEG, PDF 형식 지원 (자동 회전 보정 탑재)</p>
                  </div>
                  <label className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                    견적서 파일 선택 (이미지 / PDF)
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleOcrFileChange} className="hidden" />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* 2. 엑셀 채널 */}
          {activeImportTab === 'excel' && !ocrSuccess && (
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-2xs">
                    <FileSpreadsheet className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs font-black text-emerald-950">엑셀 파일 등록</h4>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadStandardTemplate}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 shrink-0"
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
                      <p className="text-[10px] text-slate-400 mt-1">하나의 파일에 여러 거래처나 여러 탭이 있어도 자동으로 분할 분류됩니다.</p>
                    </div>
                    <label className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                      엑셀 파일 선택 (.xlsx / .csv)
                      <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFileUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. 구글 시트 채널 */}
          {activeImportTab === 'sheets' && !ocrSuccess && (
            <div className="space-y-4 text-left">
              <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-3xl space-y-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-blue-600 text-white rounded-lg shadow-2xs">
                      <Link2 className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-blue-950">구글 시트 연동</h4>
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

          {/* 🌟 다중/단일 견적서 파싱 결과 뷰 */}
          {ocrSuccess && (
            <div className="space-y-4 animate-scale-up">
              {/* 상단 파일 정보 헤더 바 */}
              <div className="flex items-center justify-between p-3 bg-slate-100 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-black">
                    {activeImportTab === 'excel' ? '📁 엑셀 파싱' : activeImportTab === 'sheets' ? '📊 구글 시트' : '📸 OCR'}
                  </span>
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[280px]">{ocrFilename}</span>
                </div>
                <button
                  type="button"
                  onClick={resetOcrState}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>다시 불러오기</span>
                </button>
              </div>

              {/* 🌟 다중 견적서가 감지된 경우 (N > 1) */}
              {parsedGroups.length > 1 ? (
                <div className="space-y-3 text-left">
                  {/* 종합 요약 배너 */}
                  <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 rounded-2xl border border-indigo-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                        <Layers className="w-5 h-5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-extrabold text-indigo-950">
                          총 {parsedGroups.length}건의 거래처별 견적서 자동 분할 완료!
                        </h4>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          총 {grandTotalItemsCount}개 품목 • 전체 합계 금액: <strong className="text-indigo-700 font-mono">{grandTotalAmount.toLocaleString()}원</strong>
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-lg">
                      일괄 접수 대기
                    </span>
                  </div>

                  {/* 거래처별 견적서 카드 목록 */}
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {parsedGroups.map((group, gIdx) => {
                      const isExpanded = expandedGroupId === group.id;
                      return (
                        <div key={group.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden transition-all shadow-3xs">
                          <div 
                            onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                            className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 select-none"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">
                                {gIdx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-black text-slate-800">{group.partner_name}</span>
                                  {group.business_number && (
                                    <span className="text-[10px] text-slate-400 font-mono">({group.business_number})</span>
                                  )}
                                  <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[9px] font-bold rounded">
                                    {group.document_number}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                  <span>일자: {group.document_date}</span>
                                  <span>•</span>
                                  <span>품목 {group.items.length}건</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-indigo-700 font-mono">
                                {group.originalTotalAmount.toLocaleString()}원
                              </span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                          </div>

                          {/* 카드 아코디언 펼침 품목 리스트 */}
                          {isExpanded && (
                            <div className="p-3.5 bg-white border-t border-slate-200/80 space-y-2 animate-fade-in">
                              <div className="grid grid-cols-2 gap-2 text-[10px] pb-2 border-b border-slate-100 text-slate-500">
                                <div>대표자: <strong className="text-slate-700">{group.representative || "-"}</strong></div>
                                <div>연락처: <strong className="text-slate-700">{group.partner_phone || "-"}</strong></div>
                              </div>
                              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                {group.items.map((it, itIdx) => (
                                  <div key={itIdx} className="p-2 bg-slate-50 rounded-xl flex items-center justify-between text-xs font-medium">
                                    <div className="truncate pr-2">
                                      <span className="font-bold text-slate-800">{it.product_name}</span>
                                      {it.spec && <span className="text-[10px] text-slate-400 ml-1.5">({it.spec})</span>}
                                      {it.validItemCode && <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded ml-1.5 font-bold">코드: {it.validItemCode}</span>}
                                    </div>
                                    <div className="text-right shrink-0 font-mono text-[11px]">
                                      <span className="text-slate-600 font-bold">{it.quantity}개</span>
                                      <span className="text-slate-400 mx-1">×</span>
                                      <span className="text-slate-700">{it.unit_price.toLocaleString()}원</span>
                                      <span className="text-indigo-700 font-bold ml-2">= {(it.quantity * it.unit_price).toLocaleString()}원</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* 🌟 단일 견적서인 경우 (N === 1) 상세 편집 폼 제공 */
                <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 space-y-4">
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

                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-bold block">상세 품목 리스트 ({ocrForm.items.length}개)</label>
                      <span className="text-[10px] font-black text-indigo-600 flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        마스터 품목 자동 연동
                      </span>
                    </div>
                    <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                      {ocrForm.items.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col gap-1 text-xs font-semibold text-left shadow-3xs">
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
          )}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4 flex gap-3">
          <button onClick={handleClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-colors">
            취소
          </button>
          <button 
            onClick={handleSaveAllEstimates}
            disabled={!ocrSuccess}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors cursor-pointer shadow-md active:scale-95"
          >
            {parsedGroups.length > 1 
              ? `🚀 총 ${parsedGroups.length}건의 견적서 일괄 등록 승인` 
              : "받은 견적서 등록 승인"}
          </button>
        </div>
      </div>
    </div>
  );
}
