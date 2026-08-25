"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, X, FileText, CheckCircle2, RefreshCw, AlertCircle, 
  FileSpreadsheet, Download, Link2, Sparkles, Database, ExternalLink,
  Layers, ChevronDown, ChevronUp, Check, Building2,
  Bookmark, List, Save, ShieldCheck, AlertTriangle, FileCheck
} from "lucide-react";
import { createPortal } from "react-dom";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl, SAMPLE_GOOGLE_SHEET_URL } from '@/lib/google-sheets-storage';
import GoogleSheetPresetModal, { GoogleSheetPreset } from "@/components/GoogleSheetPresetModal";
import { 
  sanitizeDate, 
  sanitizeAmount, 
  sanitizeBusinessNumber, 
  sanitizePhoneNumber, 
  sanitizeQuantity 
} from "@/lib/data-validator";

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
  isValid?: boolean;
  validationWarnings?: string[];
  items: Array<{
    item_code?: string;
    product_name: string;
    spec?: string;
    quantity: number;
    unit_price: number;
    validItemCode?: string;
    valid_item_code?: string;
    isValid?: boolean;
    warning?: string;
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
  
  const [mounted, setMounted] = useState(false);
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

  // 🌐 구글 시트 프리셋 및 탭 관리 상태
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>("");
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [presets, setPresets] = useState<GoogleSheetPreset[]>([]);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetModalMode, setPresetModalMode] = useState<"save" | "list">("save");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");

  // 🌟 다중 견적서 그룹 관리 상태
  const [parsedGroups, setParsedGroups] = useState<ParsedEstimateGroup[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // 단일 폼 편집용 상태
  const [ocrForm, setOcrForm] = useState({
    partner_name: "",
    partner_phone: "",
    partner_manager: "",
    items: [] as Array<{ item_code?: string; product_name: string; spec?: string; quantity: number; unit_price: number; validItemCode?: string; valid_item_code?: string; isValid?: boolean; warning?: string }>,
    file_url: "",
    business_number: "",
    representative: "",
    address: "",
    document_number: "",
    document_date: "",
    document_memo: "",
    originalTotalAmount: 0,
    originalTotalQuantity: 0,
    isValid: true,
    validationWarnings: [] as string[]
  });

  const fetchPresetsList = async () => {
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets?domain=estimate");
      const data = await res.json();
      if (data.success && Array.isArray(data.presets)) {
        setPresets(data.presets);
        if (data.defaultPreset && !googleSheetUrl) {
          setGoogleSheetUrl(data.defaultPreset.url);
          if (data.defaultPreset.sheetName) {
            setSelectedSheetName(data.defaultPreset.sheetName);
          }
        }
      }
    } catch (e) {
      console.warn("구글 시트 프리셋 목록 조회 실패:", e);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

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
      fetchPresetsList();
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

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
      originalTotalQuantity: 0,
      isValid: true,
      validationWarnings: []
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
      XLSX.writeFile(wb, "이지데스크-표준-받은 견적 등록 양식.xlsx");
    } catch (err: any) {
      alert("표준 엑셀 양식 다운로드 중 오류: " + err.message);
    }
  };

  // 📊 2차원 테이블 데이터 다중 거래처 자동 그룹핑 및 유효성 검증 엔진
  const parseTableDataToEstimate = async (rawRows: any[][], sourceTitle: string) => {
    if (!rawRows || rawRows.length < 2) {
      throw new Error("유효한 데이터 행이 부족합니다. 최소 1개 이상의 헤더와 데이터가 필요합니다.");
    }

    setOcrScanning(true);
    setOcrScanStep("테이블 데이터를 정밀 분석하여 거래처별 견적서를 자동 분류 및 유효성 검증 중...");
    setOcrFilename(sourceTitle);

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

      const rawBiz = colMap["business_number"] !== undefined && row[colMap["business_number"]] ? String(row[colMap["business_number"]]).trim() : defaultBizNum;
      const rawPhone = colMap["partner_phone"] !== undefined && row[colMap["partner_phone"]] ? String(row[colMap["partner_phone"]]).trim() : defaultPhone;
      let rawDate = colMap["document_date"] !== undefined && row[colMap["document_date"]] ? String(row[colMap["document_date"]]).trim() : defaultDocDate;

      // 🛡️ 유효성 검증 정규화
      const dateSan = sanitizeDate(rawDate);
      const bizSan = sanitizeBusinessNumber(rawBiz);
      const phoneSan = sanitizePhoneNumber(rawPhone);

      const groupWarnings: string[] = [];
      if (!dateSan.isValid && rawDate) groupWarnings.push(`견적일자 (${dateSan.warning})`);
      if (!bizSan.isValid && rawBiz) groupWarnings.push(`사업자번호 (${bizSan.warning})`);
      if (!phoneSan.isValid && rawPhone) groupWarnings.push(`연락처 (${phoneSan.warning})`);

      if (!groupsMap.has(currentActiveKey)) {
        groupsMap.set(currentActiveKey, {
          id: `grp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          partner_name: rowPartnerName || defaultPartnerName || "(주)신규공급사",
          partner_phone: phoneSan.value || rawPhone || defaultPhone,
          partner_manager: colMap["partner_manager"] !== undefined && row[colMap["partner_manager"]] ? String(row[colMap["partner_manager"]]).trim() : defaultManager,
          business_number: bizSan.value || rawBiz || defaultBizNum,
          representative: colMap["representative"] !== undefined && row[colMap["representative"]] ? String(row[colMap["representative"]]).trim() : defaultRep,
          address: colMap["address"] !== undefined && row[colMap["address"]] ? String(row[colMap["address"]]).trim() : defaultAddress,
          document_number: rowDocNo || defaultDocNo || `EST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 899 + 100)}`,
          document_date: (dateSan.isValid ? dateSan.value : rawDate) || new Date().toISOString().slice(0, 10),
          document_memo: colMap["document_memo"] !== undefined && row[colMap["document_memo"]] ? String(row[colMap["document_memo"]]).trim() : `${sourceTitle} 연동 접수`,
          originalTotalAmount: 0,
          originalTotalQuantity: 0,
          isValid: groupWarnings.length === 0,
          validationWarnings: groupWarnings,
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

      const qtySan = sanitizeQuantity(rawQty);
      const priceSan = sanitizeAmount(rawPrice);

      const itemWarnings: string[] = [];
      if (!qtySan.isValid) itemWarnings.push(`수량 이상 (${qtySan.warning})`);
      if (!priceSan.isValid) itemWarnings.push(`단가 이상 (${priceSan.warning})`);

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

      const finalQty = qtySan.value || rawQty;
      const finalPrice = priceSan.value || rawPrice;

      targetGroup.items.push({
        product_name: prodCell,
        spec: rawSpec,
        quantity: finalQty,
        unit_price: finalPrice,
        item_code: rawCode,
        validItemCode: validItemCode,
        valid_item_code: validItemCode,
        isValid: itemWarnings.length === 0,
        warning: itemWarnings.join(', ')
      });

      targetGroup.originalTotalAmount += (finalQty * finalPrice);
      targetGroup.originalTotalQuantity += finalQty;
      if (itemWarnings.length > 0) {
        targetGroup.isValid = false;
        targetGroup.validationWarnings = [...(targetGroup.validationWarnings || []), ...itemWarnings];
      }
    }

    const groups = Array.from(groupsMap.values()).filter(g => g.items.length > 0);

    if (groups.length === 0) {
      throw new Error("인식된 품목 데이터가 없습니다. 품목명, 수량, 단가 컬럼을 확인해 주세요.");
    }

    setParsedGroups(groups);
    setExpandedGroupId(groups[0]?.id || null);

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
        originalTotalQuantity: g.originalTotalQuantity,
        isValid: g.isValid !== false,
        validationWarnings: g.validationWarnings || []
      });
    }

    setReceiverMatched(true);
    setOcrScanning(false);
    setOcrSuccess(true);
  };

  // 📁 엑셀 파일 업로드 핸들러
  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      setOcrScanning(true);
      setOcrScanStep("엑셀 워크시트를 전수 스캔하여 데이터를 취합하는 중...");
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      
      let combinedRows: any[][] = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (rows && rows.length > 0) {
          if (combinedRows.length === 0) {
            combinedRows = rows;
          } else {
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

  // 📊 구글 스프레드시트 실시간 불러오기 핸들러 (프리셋 & 탭 선택 대응)
  const handleFetchGoogleSheet = async (overrideSheetName?: string) => {
    if (!googleSheetUrl.trim()) return;
    try {
      setIsFetchingSheet(true);
      setOcrScanning(true);
      const sheetNameToUse = overrideSheetName || selectedSheetName || undefined;
      setSavedGoogleSheetUrl('estimate_inbound_sheet_url', googleSheetUrl.trim(), sheetNameToUse);
      
      const res = await apiFetch("/api/shared/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: googleSheetUrl.trim(),
          sheetUrl: googleSheetUrl.trim(),
          sheetName: sheetNameToUse,
          fetchAllRows: true
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "구글 시트 데이터를 가져오지 못했습니다.");
      
      setSpreadsheetTitle(data.spreadsheetTitle || "구글 스프레드시트");
      if (data.availableSheets && Array.isArray(data.availableSheets)) {
        setAvailableSheets(data.availableSheets);
        if (!selectedSheetName && !overrideSheetName && data.availableSheets.length > 0) {
          setSelectedSheetName(data.sheetName || data.availableSheets[0]);
        }
      }

      const rawRows = data.data || (data.headers ? [data.headers, ...(data.rows || [])] : data.rows || []);
      await parseTableDataToEstimate(rawRows, data.spreadsheetTitle || "구글 스프레드시트 연동");
    } catch (err: any) {
      setOcrScanning(false);
      alert("연동 실패: " + err.message);
    } finally {
      setIsFetchingSheet(false);
    }
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
          const dateSan = sanitizeDate(data.document_date);
          const bizSan = sanitizeBusinessNumber(data.partner_business_number);
          const phoneSan = sanitizePhoneNumber(data.partner_phone);

          const warnings: string[] = [];
          if (!dateSan.isValid && data.document_date) warnings.push(`견적일자 (${dateSan.warning})`);
          if (!bizSan.isValid && data.partner_business_number) warnings.push(`사업자번호 (${bizSan.warning})`);
          if (!phoneSan.isValid && data.partner_phone) warnings.push(`연락처 (${phoneSan.warning})`);

          const validatedItems = (data.items || []).map((it: any) => {
            const qtySan = sanitizeQuantity(it.quantity || 1);
            const priceSan = sanitizeAmount(it.unit_price || 0);
            const itemWarns: string[] = [];
            if (!qtySan.isValid) itemWarns.push(`수량 이상 (${qtySan.warning})`);
            if (!priceSan.isValid) itemWarns.push(`단가 이상 (${priceSan.warning})`);
            return {
              ...it,
              quantity: qtySan.value || it.quantity || 1,
              unit_price: priceSan.value || it.unit_price || 0,
              isValid: itemWarns.length === 0,
              warning: itemWarns.join(', ')
            };
          });

          const singleGroup: ParsedEstimateGroup = {
            id: `grp_ocr_${Date.now()}`,
            partner_name: data.partner_name,
            partner_phone: phoneSan.value || data.partner_phone || "",
            partner_manager: data.partner_manager || "",
            items: validatedItems,
            business_number: bizSan.value || data.partner_business_number || "",
            representative: data.partner_representative || "",
            address: data.partner_address || "",
            document_number: data.document_number || "",
            document_date: (dateSan.isValid ? dateSan.value : data.document_date) || "",
            document_memo: data.document_memo || "",
            originalTotalAmount: data.originalTotalAmount || 0,
            originalTotalQuantity: data.originalTotalQuantity || 0,
            isValid: warnings.length === 0,
            validationWarnings: warnings
          };
          setParsedGroups([singleGroup]);
          setExpandedGroupId(singleGroup.id);
          setOcrForm({
            ...singleGroup,
            file_url: base64Data,
            isValid: warnings.length === 0,
            validationWarnings: warnings
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

  const grandTotalAmount = parsedGroups.reduce((sum, g) => sum + g.originalTotalAmount, 0);
  const grandTotalItemsCount = parsedGroups.reduce((sum, g) => sum + g.items.length, 0);
  const validGroupsCount = parsedGroups.filter(g => g.isValid !== false && (!g.validationWarnings || g.validationWarnings.length === 0)).length;
  const warningGroupsCount = parsedGroups.length - validGroupsCount;

  // 🚀 다중 견적서 일괄 대장 등록 실행
  const handleSaveAllEstimates = async () => {
    const groupsToSave = parsedGroups.length > 0 ? parsedGroups : (ocrForm.partner_name ? [{
      id: "single",
      ...ocrForm
    }] : []);

    if (groupsToSave.length === 0) return;

    // 🛡️ 유효성 검증 경고 컨펌 가드
    const groupsWithWarnings = groupsToSave.filter(g => g.validationWarnings && g.validationWarnings.length > 0);
    if (groupsWithWarnings.length > 0) {
      const confirmProceed = window.confirm(
        `⚠️ ${groupsWithWarnings.length}건의 견적서에 서식 확인 필요 항목(${groupsWithWarnings.map(g => g.partner_name).join(', ')})이 감지되었습니다.\n정말 그대로 견적 등록을 승인하시겠습니까?`
      );
      if (!confirmProceed) return;
    }

    try {
      setOcrScanning(true);
      setOcrScanStep(`총 ${groupsToSave.length}건의 견적서를 대장에 일괄 저장 중...`);

      let savedCount = 0;
      for (const group of groupsToSave) {
        const payload = {
          partner_name: group.partner_name,
          partner_phone: group.partner_phone,
          partner_manager: group.partner_manager,
          business_number: group.business_number,
          representative: group.representative,
          address: group.address,
          document_number: group.document_number,
          document_date: group.document_date,
          document_memo: group.document_memo,
          total_amount: group.originalTotalAmount,
          items: group.items,
          file_url: (group as any).file_url || "",
          receiver_matched: receiverMatched,
          force_bypass: forceBypass,
          bypass_reason: bypassReason,
          approver_name: userName || "시스템운영자",
          approver_role: userRole
        };

        const res = await apiFetch("/api/estimates/save-ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) savedCount++;
      }

      alert(`🎉 총 ${savedCount}건의 견적서가 대장에 성공적으로 등록되었습니다!`);
      resetOcrState();
      onSuccess();
      onClose();
    } catch (e: any) {
      alert("일괄 저장 처리 중 오류: " + e.message);
    } finally {
      setOcrScanning(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* 상단 모달 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-3xs">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>받은 견적서 스마트 접수</span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg">다중 거래처 지원</span>
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">실물 OCR 스캔, 엑셀 파일(다중 탭), 구글 시트 다중 거래처 연동을 모두 지원합니다.</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 채널 3단 전환 탭 (파싱 전) */}
        {!ocrSuccess && (
          <div className="flex items-center gap-2 mt-4 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 shrink-0">
            <button 
              type="button"
              onClick={() => setActiveImportTab('ocr')} 
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${activeImportTab === 'ocr' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📸 실물 스캔 (AI OCR)
            </button>
            <button 
              type="button"
              onClick={() => setActiveImportTab('excel')} 
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${activeImportTab === 'excel' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📁 엑셀 등록
            </button>
            <button 
              type="button"
              onClick={() => setActiveImportTab('sheets')} 
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${activeImportTab === 'sheets' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              📊 구글 시트
            </button>
          </div>
        )}

        {/* 바디 콘텐츠 스크롤 영역 */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
          
          {/* 1. OCR 채널 */}
          {activeImportTab === 'ocr' && !ocrSuccess && (
            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-slate-50/80 rounded-3xl p-8 text-center transition-all flex flex-col items-center justify-center min-h-[190px]">
              {ocrScanning ? (
                <div className="space-y-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-black text-indigo-700 animate-pulse">견적서 AI OCR 분석 중...</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{ocrFilename}</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-indigo-400 mb-4" />
                  <p className="text-xs font-bold text-slate-600">받은 견적서 이미지 또는 PDF 업로드</p>
                  <p className="text-[10px] text-slate-400 mt-1">거래처로부터 받은 견적서 원본 사진이나 스캔 문서를 선택하세요.</p>
                  <label className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700 transition-colors shadow-sm">
                    파일 선택
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleOcrFileChange} className="hidden" />
                  </label>
                </>
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
                    <p className="text-xs font-extrabold text-emerald-700 animate-pulse">{ocrScanStep || "견적서 엑셀 데이터 분석 중..."}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{ocrFilename}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-white text-emerald-600 shadow-sm rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">받은 견적서 엑셀(.xlsx, .xls, .csv) 파일을 선택하세요</p>
                      <p className="text-[10px] text-slate-400 mt-1">한 파일 안에 여러 거래처나 복수의 견적서가 포함되어 있어도 자동 분할됩니다.</p>
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

          {/* 3. 구글 시트 채널 (프리셋 목록 관리 및 탭 선택 탑재) */}
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

                {/* 📋 저장된 구글 시트 프리셋 목록 및 관리 버튼 */}
                <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 flex items-center gap-1">
                      <Bookmark className="w-3.5 h-3.5 text-blue-600" /> 프리셋:
                    </span>
                    <select
                      value={presets.find(p => p.url === googleSheetUrl)?.id || ""}
                      onChange={(e) => {
                        const selected = presets.find(p => p.id === e.target.value);
                        if (selected) {
                          setGoogleSheetUrl(selected.url);
                          if (selected.sheetName) setSelectedSheetName(selected.sheetName);
                        }
                      }}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-blue-500 truncate flex-1"
                    >
                      <option value="">-- 저장된 프리셋 선택 --</option>
                      {presets.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.isDefault ? "⭐ " : ""}{p.title} {p.sheetName ? `(${p.sheetName})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPresetModalMode("save");
                        setIsPresetModalOpen(true);
                      }}
                      disabled={!googleSheetUrl.trim()}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 shadow-3xs active:scale-95"
                      title="현재 입력된 구글 시트 URL을 프리셋으로 저장"
                    >
                      <Save className="w-3 h-3" />
                      <span>프리셋 저장</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPresetModalMode("list");
                        setIsPresetModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-3xs active:scale-95"
                      title="저장된 구글 시트 목록을 관리합니다."
                    >
                      <List className="w-3 h-3" />
                      <span>목록 관리 ({presets.length})</span>
                    </button>
                  </div>
                </div>

                {/* 📑 스프레드시트 내 탭 선택기 (시트가 2개 이상일 때) */}

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
                      onClick={() => handleFetchGoogleSheet()}
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

          {/* 4. 파싱 결과 확인 및 다중 그룹핑 아코디언 뷰 */}
          {ocrSuccess && (
            <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 space-y-4 animate-scale-up">
              
              {/* 상단 완료 배너 & 유효성 검증 카운터 뱃지 */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-black">
                    {activeImportTab === 'excel' ? '📁 엑셀 파싱 완료' : activeImportTab === 'sheets' ? '📊 구글 시트 연동 완료' : '📸 OCR 판독 완료'}
                  </span>
                  <span className="text-xs font-bold text-slate-600 truncate max-w-[280px]">{ocrFilename}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-black flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    정상: {validGroupsCount}건
                  </span>
                  {warningGroupsCount > 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-black flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      확인 필요: {warningGroupsCount}건
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={resetOcrState}
                    className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 cursor-pointer ml-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>다시 불러오기</span>
                  </button>
                </div>
              </div>

              {/* 수신자 불일치 경고 */}
              {!receiverMatched && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs font-bold text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>수신자 불일치: 견적서의 수신자가 '{myCompanyName}'과 다를 수 있습니다. 확인 후 등록하세요.</span>
                </div>
              )}

              {/* 다중 거래처 요약 헤더 (2건 이상일 때) */}
              {parsedGroups.length > 1 && (
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-2xs">
                      <Layers className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <h4 className="text-xs font-black text-indigo-950">총 {parsedGroups.length}건의 거래처 견적서가 자동 분할되었습니다!</h4>
                      <p className="text-[10px] text-indigo-800 font-medium">거래처별 개별 견적으로 분리되어 대장에 일괄 적재됩니다.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold block">전체 견적 총액 (총 {grandTotalItemsCount}개 품목)</span>
                    <span className="text-sm font-black text-indigo-700 font-mono">{grandTotalAmount.toLocaleString()}원</span>
                  </div>
                </div>
              )}

              {/* 거래처별 아코디언 카드 리스트 */}
              {parsedGroups.length > 1 ? (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {parsedGroups.map((group, gIdx) => {
                    const isExpanded = expandedGroupId === group.id;
                    const calcGroupTotal = group.items.reduce((s, it) => s + (it.quantity * it.unit_price), 0);
                    const isGroupValid = group.isValid !== false && (!group.validationWarnings || group.validationWarnings.length === 0);

                    return (
                      <div key={group.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
                        {/* 아코디언 헤더 */}
                        <div 
                          onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 text-left">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">
                              {gIdx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-xs font-black text-slate-800">{group.partner_name}</h5>
                                {group.document_number && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono font-bold">
                                    {group.document_number}
                                  </span>
                                )}
                                {isGroupValid ? (
                                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-black flex items-center gap-0.5">
                                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> 정상
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-black flex items-center gap-0.5" title={group.validationWarnings?.join(', ')}>
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> 확인 필요
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                견적일자: {group.document_date} · {group.items.length}개 품목
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-indigo-700 font-mono">
                              {calcGroupTotal.toLocaleString()}원
                            </span>
                            <span className="p-1 text-slate-400 hover:text-slate-600">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </span>
                          </div>
                        </div>

                        {/* 아코디언 상세 내용 */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 text-left animate-fade-in">
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div><span className="text-slate-400 font-bold">사업자번호:</span> <span className="font-semibold">{group.business_number || '-'}</span></div>
                              <div><span className="text-slate-400 font-bold">대표자:</span> <span className="font-semibold">{group.representative || '-'}</span></div>
                              <div><span className="text-slate-400 font-bold">연락처:</span> <span className="font-semibold">{group.partner_phone || '-'}</span></div>
                              <div><span className="text-slate-400 font-bold">담당자:</span> <span className="font-semibold">{group.partner_manager || '-'}</span></div>
                            </div>

                            {group.validationWarnings && group.validationWarnings.length > 0 && (
                              <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-800 font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>확인 필요: {group.validationWarnings.join(' · ')}</span>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-500 block">견적 품목 리스트</span>
                              <div className="space-y-1 max-h-[160px] overflow-y-auto">
                                {group.items.map((it, iIdx) => (
                                  <div key={iIdx} className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-semibold">
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="font-bold text-slate-800 truncate">{it.product_name}</span>
                                      {it.validItemCode && (
                                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded border border-emerald-200">
                                          {it.validItemCode}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0 flex items-center gap-3">
                                      <span className="text-slate-500">{it.quantity}개 × {it.unit_price.toLocaleString()}원</span>
                                      <span className="font-bold text-slate-800 font-mono">{(it.quantity * it.unit_price).toLocaleString()}원</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 단일 거래처 견적서 상세 폼 */
                <div className="space-y-4">
                  {ocrForm.validationWarnings && ocrForm.validationWarnings.length > 0 && (
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-bold flex items-center gap-1.5 text-left">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>서식 확인 필요: {ocrForm.validationWarnings.join(' · ')}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">공급 거래처명</label>
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
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">견적서 번호</label>
                      <input 
                        type="text" 
                        value={ocrForm.document_number}
                        onChange={e => setOcrForm(prev => ({ ...prev, document_number: e.target.value }))}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">견적일자</label>
                      <input 
                        type="date" 
                        value={ocrForm.document_date}
                        onChange={e => setOcrForm(prev => ({ ...prev, document_date: e.target.value }))}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] text-slate-400 font-bold block">상세 견적 품목 ({ocrForm.items.length}개)</label>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {ocrForm.items.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-semibold">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">{item.product_name}</span>
                              {item.validItemCode && (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded">
                                  {item.validItemCode}
                                </span>
                              )}
                            </div>
                            {item.spec && <span className="text-[10px] text-slate-400 block mt-0.5">규격: {item.spec}</span>}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-700">{item.quantity}개 × {item.unit_price.toLocaleString()}원</span>
                            <span className="text-xs font-black text-indigo-700 block mt-0.5">{(item.quantity * item.unit_price).toLocaleString()}원</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 총액 패널 */}
                  <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 flex items-center justify-between text-left">
                    <span className="text-xs font-extrabold text-slate-600">견적 등록 총액 (총 {ocrForm.items.length}개 품목)</span>
                    <span className="text-lg font-black text-indigo-700 font-mono">
                      {ocrForm.items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0).toLocaleString()}원
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 확인 버튼 */}
        <div className="mt-6 border-t border-slate-100 pt-4 flex gap-3 shrink-0">
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

      {/* 📋 구글 시트 프리셋 저장 및 목록 관리 통합 모달 */}
      <GoogleSheetPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        domain="estimate"
        currentUrl={googleSheetUrl}
        currentSheetName={selectedSheetName}
        availableSheets={availableSheets}
        spreadsheetTitle={spreadsheetTitle}
        initialMode={presetModalMode}
        onSelectPreset={(preset) => {
          setGoogleSheetUrl(preset.url);
          if (preset.sheetName) setSelectedSheetName(preset.sheetName);
        }}
        onPresetsUpdated={(updatedList) => {
          setPresets(updatedList);
        }}
      />
    </div>,
    document.body
  );
}
