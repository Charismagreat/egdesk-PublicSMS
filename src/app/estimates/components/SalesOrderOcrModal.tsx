"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  X, 
  FileText, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  FileSpreadsheet, 
  Link2, 
  Download, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  PackageCheck,
  Bookmark,
  List,
  Save,
  ShieldCheck,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { createPortal } from "react-dom";
import ProcessingOverlay from "../../../components/ProcessingOverlay";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl, SAMPLE_SALES_ORDER_GOOGLE_SHEET_URL } from "../../../lib/google-sheets-storage";
import GoogleSheetPresetModal, { GoogleSheetPreset } from "@/components/GoogleSheetPresetModal";
import { 
  sanitizeDate, 
  sanitizeAmount, 
  sanitizeBusinessNumber, 
  sanitizePhoneNumber, 
  sanitizeQuantity 
} from "@/lib/data-validator";

interface SalesOrderOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// 📦 다중 바이어/다중 발주서 그룹핑 인터페이스
export interface ParsedSalesOrderGroup {
  id: string; // 고유 키
  partner_name: string;
  partner_phone: string;
  partner_manager: string;
  business_number: string;
  representative: string;
  address: string;
  document_number: string;
  document_date: string;
  delivery_date: string;
  document_memo: string;
  approvers?: string[];
  originalTotalAmount: number;
  originalTotalQuantity: number;
  isValid?: boolean;
  validationWarnings?: string[];
  isPartnerEnriched?: boolean;
  isPartnerPending?: boolean;
  matchedPartnerName?: string;
  items: Array<{
    item_code?: string;
    product_name: string;
    spec?: string;
    quantity: number;
    unit_price: number;
    delivery_date?: string;
    validItemCode?: string;
    valid_item_code?: string;
    isValid?: boolean;
    warning?: string;
  }>;
  file_url?: string;
}

export default function SalesOrderOcrModal({
  isOpen,
  onClose,
  onSuccess
}: SalesOrderOcrModalProps) {
  // 채널 탭: 'ocr' | 'excel' | 'sheets'
  const [activeImportTab, setActiveImportTab] = useState<'ocr' | 'excel' | 'sheets'>('ocr');
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrScanStep, setOcrScanStep] = useState("");
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrFilename, setOcrFilename] = useState("");
  const [receiverMatched, setReceiverMatched] = useState<boolean>(true);
  const [myCompanyName, setMyCompanyName] = useState<string>("주식회사 쿠스");
  const [userRole, setUserRole] = useState<string>("SUB_OPERATOR");
  const [userName, setUserName] = useState<string>("");
  const [forceBypass, setForceBypass] = useState<boolean>(false);
  const [bypassReason, setBypassReason] = useState<string>("");

  // 🌐 구글 시트 프리셋 및 탭 상태
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>("");
  const [isFetchingSheet, setIsFetchingSheet] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [presets, setPresets] = useState<GoogleSheetPreset[]>([]);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetModalMode, setPresetModalMode] = useState<"save" | "list">("save");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");

  // 📦 다중 발주서 그룹 배열 상태
  const [parsedGroups, setParsedGroups] = useState<ParsedSalesOrderGroup[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  // 📝 단일 폼 폴백 상태
  const [ocrForm, setOcrForm] = useState<ParsedSalesOrderGroup>({
    id: "single",
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
    delivery_date: "",
    document_memo: "",
    approvers: [],
    originalTotalAmount: 0,
    originalTotalQuantity: 0,
    isValid: true,
    validationWarnings: []
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // 구글 시트 프리셋 목록 조회
  const fetchPresetsList = async () => {
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets?domain=sales_order");
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
    async function fetchUserRole() {
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
    }
    if (isOpen) {
      fetchUserRole();
      fetchPresetsList();
      const savedUrl = getSavedGoogleSheetUrl('sales_order_inbound_sheet_url');
      if (savedUrl) setGoogleSheetUrl(savedUrl);
    }
  }, [isOpen]);

  const resetOcrState = () => {
    setOcrSuccess(false);
    setOcrFilename("");
    setOcrScanning(false);
    setOcrScanStep("");
    setReceiverMatched(true);
    setForceBypass(false);
    setBypassReason("");
    setParsedGroups([]);
    setExpandedGroupIds(new Set());
    setOcrForm({
      id: "single",
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
      delivery_date: "",
      document_memo: "",
      approvers: [],
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

  // 아코디언 카드 토글
  const toggleGroupAccordion = (groupId: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // 📥 표준 엑셀 양식 다운로드 핸들러
  const handleDownloadStandardTemplate = async () => {
    try {
      const XLSX = await import("xlsx");
      const headers = [
        "바이어명",
        "사업자번호",
        "대표자명",
        "연락처",
        "담당자",
        "발주번호",
        "발주일자",
        "납기요청일",
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
          "(주)현대모빌스",
          "101-86-12345",
          "정현대",
          "02-123-4567",
          "강동원 과장",
          "PO-HD-20260822-01",
          "2026-08-22",
          "2026-08-30",
          "INV-1002",
          "고성능 서보 모터",
          "100W / 220V",
          20,
          150000,
          3000000,
          300000,
          "울산 제1공장 하역장 직배송"
        ],
        [
          "(주)현대모빌스",
          "101-86-12345",
          "정현대",
          "02-123-4567",
          "강동원 과장",
          "PO-HD-20260822-01",
          "2026-08-22",
          "2026-08-30",
          "INV-1008",
          "인버터 컨트롤러",
          "V-02 정밀 제어형",
          10,
          300000,
          3000000,
          300000,
          "시험성적서 1부 필착"
        ],
        [
          "(주)삼성에스엔티",
          "220-81-99887",
          "이삼성",
          "031-987-6543",
          "이지은 대리",
          "PO-SS-20260822-02",
          "2026-08-22",
          "2026-09-05",
          "INV-2001",
          "정밀 감속기",
          "1/10 비율",
          5,
          450000,
          2250000,
          225000,
          "수원 R&D 센터 검수 납품"
        ]
      ];
      const wsData = [headers, ...sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      ws['!cols'] = [
        { wch: 16 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
        { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 22 },
        { wch: 16 }, { wch: 8 },  { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 26 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "수주등록");
      XLSX.writeFile(wb, "이지데스크-표준-받은 발주서(수주) 등록 양식.xlsx");
    } catch (err: any) {
      alert("표준 엑셀 양식 다운로드 중 오류: " + err.message);
    }
  };

  // 📊 2차원 테이블 데이터 다중 바이어 자동 그룹핑 및 데이터 유효성 검증 엔진
  const parseTableDataToSalesOrder = async (rawRows: any[][], sourceTitle: string) => {
    if (!rawRows || rawRows.length < 2) {
      throw new Error("유효한 데이터 행이 부족합니다. 최소 1개 이상의 헤더와 데이터가 필요합니다.");
    }

    setOcrScanning(true);
    setOcrScanStep("테이블 데이터를 정밀 분석하여 바이어별 발주서를 자동 분류 및 유효성 검증 중...");
    setOcrFilename(sourceTitle);

    let headerIdx = -1;
    let prodIdx = -1;
    let qtyIdx = -1;
    let priceIdx = -1;
    let specIdx = -1;
    let codeIdx = -1;
    let partnerIdx = -1;
    let bizNoIdx = -1;
    let repIdx = -1;
    let phoneIdx = -1;
    let mgrIdx = -1;
    let docNoIdx = -1;
    let dateIdx = -1;
    let dlvDateIdx = -1;
    let memoIdx = -1;

    for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
      const row = rawRows[i];
      if (!Array.isArray(row)) continue;

      const strRow = row.map(c => String(c || '').trim().toLowerCase().replace(/\s+/g, ''));
      
      const pIdx = strRow.findIndex(c => 
        (c.includes('품목명') || c.includes('품명') || c.includes('상품명') || c.includes('자재명') || c.includes('규격및품명') || c.includes('description') || c.includes('itemname')) &&
        !c.includes('품목코드') && !c.includes('품번') && !c.includes('바코드')
      );
      
      const qIdx = strRow.findIndex(c => 
        c.includes('수량') || c.includes('qty') || c.includes('quantity') || c.includes('단위수량')
      );
      
      const prIdx = strRow.findIndex(c => 
        c.includes('단가') || c.includes('unitprice') || c.includes('수주단가') || c.includes('단가(원)') || c.includes('금액') || c.includes('price') || c.includes('amount')
      );

      if (pIdx >= 0 && (qIdx >= 0 || prIdx >= 0)) {
        headerIdx = i;
        prodIdx = pIdx;
        qtyIdx = qIdx;
        priceIdx = prIdx;
        
        specIdx = strRow.findIndex(c => c.includes('규격') || c.includes('사양') || c.includes('spec') || c.includes('dimension') || c.includes('모델명'));
        codeIdx = strRow.findIndex(c => c.includes('품목코드') || c.includes('코드') || c.includes('품번') || c.includes('바코드') || c.includes('itemcode') || c.includes('partno'));
        partnerIdx = strRow.findIndex(c => c.includes('바이어') || c.includes('고객사') || c.includes('거래처') || c.includes('수신처') || c.includes('상호') || c.includes('회사명') || c.includes('partner') || c.includes('customer') || c.includes('buyer'));
        bizNoIdx = strRow.findIndex(c => c.includes('사업자') || c.includes('등록번호') || c.includes('bizno'));
        repIdx = strRow.findIndex(c => c.includes('대표자') || c.includes('대표') || c.includes('대표명') || c.includes('ceo'));
        phoneIdx = strRow.findIndex(c => c.includes('연락처') || c.includes('전화') || c.includes('tel') || c.includes('phone') || c.includes('핸드폰'));
        mgrIdx = strRow.findIndex(c => c.includes('담당자') || c.includes('담당') || c.includes('manager') || c.includes('발주자'));
        docNoIdx = strRow.findIndex(c => c.includes('발주번호') || c.includes('주문번호') || c.includes('po') || c.includes('pono') || c.includes('문서번호') || c.includes('no'));
        dateIdx = strRow.findIndex(c => c.includes('발주일자') || c.includes('주문일자') || c.includes('일자') || c.includes('발행일') || c.includes('date'));
        dlvDateIdx = strRow.findIndex(c => c.includes('납기') || c.includes('납기요청') || c.includes('납기일') || c.includes('delivery'));
        memoIdx = strRow.findIndex(c => c.includes('비고') || c.includes('메모') || c.includes('특이사항') || c.includes('memo') || c.includes('remark'));
        break;
      }
    }

    if (headerIdx < 0 || prodIdx < 0) {
      throw new Error("품목명(상품명) 또는 수량/단가 헤더 열을 찾을 수 없습니다.");
    }

    // 마스터 품목 및 마스터 거래처 연동
    let masterProducts: any[] = [];
    let masterPartners: any[] = [];
    try {
      const [prodRes, partnerRes] = await Promise.all([
        apiFetch("/api/inventory?action=list").then(r => r.json()).catch(() => ({})),
        apiFetch("/api/partners?action=list").then(r => r.json()).catch(() => ({}))
      ]);
      if (prodRes?.success && Array.isArray(prodRes.items)) {
        masterProducts = prodRes.items;
      }
      if (partnerRes?.success && Array.isArray(partnerRes.partners)) {
        masterPartners = partnerRes.partners;
      }
    } catch (e) {
      console.warn("마스터 데이터 로드 건너뜀:", e);
    }

    const groupsMap = new Map();
    // 파일명에서 상호명 정제 (예: "LS발주서.xlsx" -> "LS")
    const cleanFileNamePartner = sourceTitle
      .replace(/\.[^/.]+$/, "")
      .replace(/발주서|수주서|주문서|명세서|엑셀|리스트/gi, "")
      .replace(/[-_]/g, " ")
      .trim();

    let fallbackPartner = cleanFileNamePartner || "바이어";

    for (let r = headerIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const prodCell = String(row[prodIdx] || '').trim();
      if (!prodCell || prodCell === '-' || prodCell === '합계' || prodCell === '총계' || prodCell === '소계' || prodCell.toLowerCase().includes('total')) {
        continue;
      }

      const rowPartner = partnerIdx >= 0 ? String(row[partnerIdx] || '').trim() : '';
      const rowBizNo = bizNoIdx >= 0 ? String(row[bizNoIdx] || '').trim() : '';
      const rowRep = repIdx >= 0 ? String(row[repIdx] || '').trim() : '';
      const rowPhone = phoneIdx >= 0 ? String(row[phoneIdx] || '').trim() : '';
      const rowMgr = mgrIdx >= 0 ? String(row[mgrIdx] || '').trim() : '';
      const rowDocNo = docNoIdx >= 0 ? String(row[docNoIdx] || '').trim() : '';
      const rowDate = dateIdx >= 0 ? String(row[dateIdx] || '').trim() : '';
      const rowDlvDate = dlvDateIdx >= 0 ? String(row[dlvDateIdx] || '').trim() : '';
      const rowMemo = memoIdx >= 0 ? String(row[memoIdx] || '').trim() : '';

      // 🏢 [1안: 기존 거래처 스마트 매칭 및 자동 보강 (Auto-Enrichment)]
      let enrichedPartnerName = rowPartner || '';
      let enrichedBizNo = rowBizNo;
      let enrichedRep = rowRep;
      let enrichedPhone = rowPhone;
      let enrichedAddress = '';
      let isPartnerEnriched = false;
      let isPartnerPending = false;

      // 매칭 검색 키워드 정제 (rowPartner 우선, 없으면 담당자명/파일명 참고 매칭 시도)
      const searchTarget = rowPartner || cleanFileNamePartner || '';
      const cleanKeyword = searchTarget
        .replace(/발주서|수주서|주문서|견적서|\.xlsx|\.xls|\.pdf/gi, '')
        .replace(/\(주\)|주식회사/g, '')
        .trim().toLowerCase();

      if (masterPartners.length > 0) {
        const matched = masterPartners.find((p: any) => {
          const pName = (p.company_name || p.name || '').toLowerCase();
          const pMgr = (p.manager_name || '').toLowerCase();
          const pBiz = (p.business_number || '').replace(/[^0-9]/g, '');
          const rowCleanBiz = (rowBizNo || '').replace(/[^0-9]/g, '');

          if (rowCleanBiz && pBiz && rowCleanBiz === pBiz) return true;
          if (cleanKeyword && cleanKeyword.length >= 2 && (pName.includes(cleanKeyword) || cleanKeyword.includes(pName))) return true;
          if (rowMgr && pMgr && (pMgr.includes(rowMgr.toLowerCase()) || rowMgr.toLowerCase().includes(pMgr))) return true;
          return false;
        });

        if (matched) {
          enrichedPartnerName = matched.company_name || matched.name || enrichedPartnerName;
          enrichedBizNo = matched.business_number || enrichedBizNo;
          enrichedRep = matched.representative || enrichedRep;
          enrichedPhone = matched.phone || enrichedPhone;
          enrichedAddress = matched.address || '';
          isPartnerEnriched = true;
        }
      }

      if (!isPartnerEnriched && !enrichedPartnerName) {
        isPartnerPending = true; // [3안: 발주처 미기재 - 수주 우선 승인 및 사후 보완 관리]
      } else if (!isPartnerEnriched && (!enrichedBizNo || !enrichedRep)) {
        isPartnerPending = true;
      }

      // 🛡️ 중앙 검증 엔진(data-validator)을 통한 정규화 및 가드
      const dateSan = sanitizeDate(rowDate);
      const dlvDateSan = sanitizeDate(rowDlvDate);
      const bizSan = sanitizeBusinessNumber(enrichedBizNo);
      const phoneSan = sanitizePhoneNumber(enrichedPhone);

      const groupWarnings = [];
      if (!dateSan.isValid && rowDate) groupWarnings.push(`발주일자 (${dateSan.warning})`);
      if (!dlvDateSan.isValid && rowDlvDate) groupWarnings.push(`납기일자 (${dlvDateSan.warning})`);
      // 사업자번호가 비어있는 것은 후보완이 가능하므로 에러 경고로 차단하지 않음
      if (enrichedBizNo && !bizSan.isValid) groupWarnings.push(`사업자번호 (${bizSan.warning})`);
      if (enrichedPhone && !phoneSan.isValid) groupWarnings.push(`연락처 (${phoneSan.warning})`);

      const currentPartnerName = enrichedPartnerName;
      // 발주번호(PO) 기준 또는 거래처 기준으로 고유 그룹 분할
      const groupKey = rowDocNo ? `PO_${rowDocNo}` : (currentPartnerName ? `${currentPartnerName}_ROW${r}` : `ORDER_ROW${r}`);

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          id: groupKey,
          partner_name: currentPartnerName,
          partner_phone: phoneSan.value || enrichedPhone || "",
          partner_manager: rowMgr || "",
          business_number: bizSan.value || enrichedBizNo || "",
          representative: enrichedRep || "",
          address: enrichedAddress,
          document_number: rowDocNo || `PO-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${String(groupsMap.size + 1).padStart(3, '0')}`,
          document_date: (dateSan.isValid ? dateSan.value : rowDate) || new Date().toISOString().substring(0, 10),
          delivery_date: (dlvDateSan.isValid ? dlvDateSan.value : rowDlvDate) || new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10),
          document_memo: rowMemo || "바이어 발주서 연동 등록",
          approvers: [],
          originalTotalAmount: 0,
          originalTotalQuantity: 0,
          isValid: groupWarnings.length === 0,
          validationWarnings: groupWarnings,
          isPartnerEnriched,
          isPartnerPending,
          items: []
        });
      }

      const targetGroup = groupsMap.get(groupKey);

      // 수량 & 단가 유효성 검증
      let rawQty = 1;
      if (qtyIdx >= 0) {
        const parsedQ = parseFloat(String(row[qtyIdx] || '').replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsedQ) && parsedQ > 0) rawQty = parsedQ;
      }
      const qtySan = sanitizeQuantity(rawQty);

      let rawPrice = 0;
      if (priceIdx >= 0) {
        const parsedP = parseFloat(String(row[priceIdx] || '').replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsedP)) rawPrice = parsedP;
      }
      const priceSan = sanitizeAmount(rawPrice);

      const itemWarnings = [];
      if (!qtySan.isValid) itemWarnings.push(`수량 이상 (${qtySan.warning})`);
      if (!priceSan.isValid) itemWarnings.push(`단가 이상 (${priceSan.warning})`);

      let rawSpec = specIdx >= 0 ? String(row[specIdx] || '').trim() : '';
      const rawCode = codeIdx >= 0 ? String(row[codeIdx] || '').trim() : '';

      let validItemCode = rawCode;
      if (masterProducts.length > 0) {
        const matched = masterProducts.find((mp) => 
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
        delivery_date: (dlvDateSan.isValid ? dlvDateSan.value : rowDlvDate) || targetGroup.delivery_date,
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
      throw new Error("유효한 발주서 품목 데이터를 추출하지 못했습니다.");
    }

    setParsedGroups(groups);
    setExpandedGroupIds(new Set(groups.map(g => g.id)));

    // 단일 그룹인 경우 기본 폼에도 동기화
    if (groups.length === 1) {
      setOcrForm(groups[0]);
    }

    setOcrScanning(false);
    setOcrSuccess(true);
  };

  // 📂 엑셀 파일 업로드 핸들러
  const handleExcelFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import("xlsx");
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      
      let combinedRows = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (sheetRows && sheetRows.length > 0) {
          combinedRows = combinedRows.concat(sheetRows);
        }
      }

      await parseTableDataToSalesOrder(combinedRows, file.name);
    } catch (err) {
      setOcrScanning(false);
      alert("엑셀 파일 파싱 오류: " + err.message);
    }
  };

  // 📊 구글 스프레드시트 실시간 불러오기 핸들러 (프리셋 & 탭 선택 대응)
  const handleFetchGoogleSheet = async (overrideSheetName) => {
    if (!googleSheetUrl.trim()) return;
    try {
      setIsFetchingSheet(true);
      setOcrScanning(true);
      const sheetNameToUse = overrideSheetName || selectedSheetName || undefined;
      setSavedGoogleSheetUrl('sales_order_inbound_sheet_url', googleSheetUrl.trim(), sheetNameToUse);
      
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
      await parseTableDataToSalesOrder(rawRows, data.spreadsheetTitle || "구글 스프레드시트 연동");
    } catch (err) {
      setOcrScanning(false);
      alert("연동 실패: " + err.message);
    } finally {
      setIsFetchingSheet(false);
    }
  };

  // 이미지/PDF AI OCR 파일 변경 핸들러
  const handleOcrFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrScanning(true);
    setOcrFilename(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      let base64Data = reader.result;
      try {
        const res = await apiFetch("/api/estimates/ocr-sales-order?action=analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64Data, filename: file.name })
        });
        const data = await res.json();
        if (data.success) {
          // 데이터 정규화 및 검증
          const dateSan = sanitizeDate(data.document_date);
          const dlvDateSan = sanitizeDate(data.delivery_date);
          const bizSan = sanitizeBusinessNumber(data.business_number);
          const phoneSan = sanitizePhoneNumber(data.partner_phone);

          const warnings = [];
          if (!dateSan.isValid && data.document_date) warnings.push(`발주일자 (${dateSan.warning})`);
          if (!dlvDateSan.isValid && data.delivery_date) warnings.push(`납기일자 (${dlvDateSan.warning})`);
          if (!bizSan.isValid && data.business_number) warnings.push(`사업자번호 (${bizSan.warning})`);
          if (!phoneSan.isValid && data.partner_phone) warnings.push(`연락처 (${phoneSan.warning})`);

          const validatedItems = (data.items || []).map((it) => {
            const qtySan = sanitizeQuantity(it.quantity || 1);
            const priceSan = sanitizeAmount(it.unit_price || 0);
            const itemWarns = [];
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

          const singleGroup = {
            id: 'single_ocr',
            partner_name: data.partner_name || "바이어",
            partner_phone: phoneSan.value || data.partner_phone || "",
            partner_manager: data.partner_manager || "",
            items: validatedItems,
            file_url: data.file_url || base64Data,
            business_number: bizSan.value || data.business_number || "",
            representative: data.representative || "",
            address: data.address || "",
            document_number: data.document_number || "",
            document_date: (dateSan.isValid ? dateSan.value : data.document_date) || "",
            delivery_date: (dlvDateSan.isValid ? dlvDateSan.value : data.delivery_date) || "",
            document_memo: data.document_memo || "",
            approvers: data.approvers || [],
            originalTotalAmount: data.originalTotalAmount || 0,
            originalTotalQuantity: data.originalTotalQuantity || 0,
            isValid: warnings.length === 0,
            validationWarnings: warnings
          };
          setParsedGroups([singleGroup]);
          setExpandedGroupIds(new Set([singleGroup.id]));
          setOcrForm(singleGroup);
          setReceiverMatched(data.receiver_matched !== false);
          setMyCompanyName(data.my_company_name || "주식회사 쿠스");
          setOcrScanning(false);
          setOcrSuccess(true);
        } else {
          setOcrScanning(false);
          alert("OCR 분석 실패: " + (data.error || "알 수 없는 오류"));
        }
      } catch (err) {
        setOcrScanning(false);
        alert("OCR 통신 오류 발생");
      }
    };
    reader.readAsDataURL(file);
  };

  // 전체 그룹 총액 및 총수량 종합 계산
  const grandTotalAmount = parsedGroups.reduce((sum, g) => sum + g.originalTotalAmount, 0);
  const grandTotalItemsCount = parsedGroups.reduce((sum, g) => sum + g.items.length, 0);
  const validGroupsCount = parsedGroups.filter(g => g.isValid !== false && (!g.validationWarnings || g.validationWarnings.length === 0)).length;
  const warningGroupsCount = parsedGroups.length - validGroupsCount;

  // 🚀 다중/단일 발주서 일괄 수주 대장 등록 실행
  const handleSaveAllSalesOrders = async () => {
    const groupsToSave = parsedGroups.length > 0 ? parsedGroups : (ocrForm.partner_name ? [{
      ...ocrForm,
      id: 'single'
    }] : []);

    if (groupsToSave.length === 0) return;

    // 🛡️ 유효성 검증 경고가 있는 경우 최종 확인 컨펌 가드
    const groupsWithWarnings = groupsToSave.filter(g => g.validationWarnings && g.validationWarnings.length > 0);
    if (groupsWithWarnings.length > 0) {
      const confirmProceed = window.confirm(
        `⚠️ ${groupsWithWarnings.length}건의 발주서에 서식 확인 필요 항목(${groupsWithWarnings.map(g => g.partner_name).join(', ')})이 감지되었습니다.\n정말 그대로 수주 등록을 승인하시겠습니까?`
      );
      if (!confirmProceed) return;
    }

    try {
      setIsProcessing(true);
      let successCount = 0;
      for (const group of groupsToSave) {
        const res = await apiFetch("/api/estimates/ocr-sales-order?action=save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...group,
            force_bypass: forceBypass,
            bypass_reason: bypassReason
          })
        });

        const data = await res.json();
        if (data.success) {
          successCount++;
        }
      }

      alert(`🎉 총 ${successCount}건의 바이어 발주서가 수주 대장에 성공적으로 등록되었습니다!`);
      resetOcrState();
      onSuccess();
      onClose();
    } catch (e) {
      alert("발주서 일괄 수주 등록 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <ProcessingOverlay isVisible={isProcessing} message="바이어 발주서를 수주 대장에 일괄 적재 중입니다..." />

      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* 상단 모달 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-3xs">
              <PackageCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>받은 발주서 스마트 접수 (수주 등록)</span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg">다중 바이어 지원</span>
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">바이어 발주서 실물 스캔, 엑셀, 구글 시트를 통해 단일 또는 다중 수주를 원클릭 등록합니다.</p>
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
                  <p className="text-xs font-black text-indigo-700 animate-pulse">발주서 AI OCR 분석 중...</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{ocrFilename}</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-indigo-400 mb-4" />
                  <p className="text-xs font-bold text-slate-600">바이어 발주서 이미지 또는 PDF 업로드</p>
                  <p className="text-[10px] text-slate-400 mt-1">고객사로부터 받은 발주서 원본 사진이나 스캔 문서를 선택하세요.</p>
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
                    <p className="text-xs font-extrabold text-emerald-700 animate-pulse">{ocrScanStep || "발주서 엑셀 데이터 분석 중..."}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{ocrFilename}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-white text-emerald-600 shadow-sm rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">바이어 발주서 엑셀(.xlsx, .xls, .csv) 파일을 선택하세요</p>
                      <p className="text-[10px] text-slate-400 mt-1">한 파일 안에 여러 바이어나 복수의 발주서가 포함되어 있어도 자동 분할됩니다.</p>
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
                      onClick={() => window.open(SAMPLE_SALES_ORDER_GOOGLE_SHEET_URL, "_blank")}
                      className="px-2.5 py-1.5 bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-3xs cursor-pointer active:scale-95"
                      title="시스템 표준 샘플 구글 스프레드시트를 새 창에서 열람합니다."
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>샘플 시트 보기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoogleSheetUrl(SAMPLE_SALES_ORDER_GOOGLE_SHEET_URL)}
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
                  <span>수신자 불일치: 발주서의 수신자가 '{myCompanyName}'과 다를 수 있습니다. 확인 후 등록하세요.</span>
                </div>
              )}

              {/* 다중 바이어 요약 헤더 (2건 이상일 때) */}
              {parsedGroups.length > 1 && (
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-2xs">
                      <Layers className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <h4 className="text-xs font-black text-indigo-950">총 {parsedGroups.length}건의 바이어 발주서가 자동 분할되었습니다!</h4>
                      <p className="text-[10px] text-indigo-800 font-medium">바이어별 개별 수주로 분리되어 대장에 일괄 적재됩니다.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold block">전체 수주 총액 (총 {grandTotalItemsCount}개 품목)</span>
                    <span className="text-sm font-black text-indigo-700 font-mono">{grandTotalAmount.toLocaleString()}원</span>
                  </div>
                </div>
              )}

              {/* 바이어별 아코디언 카드 리스트 */}
              {parsedGroups.length > 1 ? (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {parsedGroups.map((group, gIdx) => {
                    const isExpanded = expandedGroupIds.has(group.id);
                    const calcGroupTotal = group.items.reduce((s, it) => s + (it.quantity * it.unit_price), 0);
                    const isGroupValid = group.isValid !== false && (!group.validationWarnings || group.validationWarnings.length === 0);

                    return (
                      <div key={group.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
                        {/* 아코디언 헤더 */}
                        <div 
                          onClick={() => toggleGroupAccordion(group.id)}
                          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 text-left">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">
                              {gIdx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-xs font-black text-slate-800">
                                  {group.partner_name || (
                                    <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                      발주처 미기재
                                    </span>
                                  )}
                                </h5>
                                {group.document_number && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono font-bold">
                                    {group.document_number}
                                  </span>
                                )}
                                {group.isPartnerEnriched ? (
                                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9px] font-black flex items-center gap-0.5">
                                    <ShieldCheck className="w-2.5 h-2.5 text-blue-600" /> 거래처 자동 완성
                                  </span>
                                ) : group.isPartnerPending ? (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-black flex items-center gap-0.5" title="발주처 상호/사업자번호 미기재 (수주 우선 승인 후 거래처 원장 보완 가능)">
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> 신규 바이어 (후보완 가능)
                                  </span>
                                ) : null}
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
                                발주: {group.document_date} · 납기: {group.delivery_date} · {group.items.length}개 품목
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
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-3 rounded-xl border border-slate-200/80">
                              <div>
                                <span className="text-slate-400 font-bold">발주처(상호명):</span>{' '}
                                <span className="font-bold">{group.partner_name || (
                                  <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                    미기재 (후보완 가능)
                                  </span>
                                )}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold">사업자번호:</span>{' '}
                                <span className="font-semibold">{group.business_number || (
                                  <span className="text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded text-[10px]">미기재 (후보완 가능)</span>
                                )}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold">대표자명:</span>{' '}
                                <span className="font-semibold">{group.representative || (
                                  <span className="text-slate-400 font-medium">-</span>
                                )}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold">담당자(발주자):</span>{' '}
                                <span className="font-semibold text-indigo-900">{group.partner_manager || '-'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold">연락처:</span>{' '}
                                <span className="font-semibold">{group.partner_phone || '-'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold">납기요청일:</span>{' '}
                                <span className="font-semibold text-emerald-700">{group.delivery_date || '-'}</span>
                              </div>
                            </div>

                            {group.validationWarnings && group.validationWarnings.length > 0 && (
                              <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-800 font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>확인 필요: {group.validationWarnings.join(' · ')}</span>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-500 block">발주 품목 리스트</span>
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
                /* 단일 바이어 발주서인 경우 상세 폼 */
                <div className="space-y-4">
                  {ocrForm.validationWarnings && ocrForm.validationWarnings.length > 0 && (
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-bold flex items-center gap-1.5 text-left">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>서식 확인 필요: {ocrForm.validationWarnings.join(' · ')}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">바이어명</label>
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
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">발주번호</label>
                      <input 
                        type="text" 
                        value={ocrForm.document_number}
                        onChange={e => setOcrForm(prev => ({ ...prev, document_number: e.target.value }))}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">납기요청일</label>
                      <input 
                        type="date" 
                        value={ocrForm.delivery_date}
                        onChange={e => setOcrForm(prev => ({ ...prev, delivery_date: e.target.value }))}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] text-slate-400 font-bold block">상세 발주 품목 ({ocrForm.items.length}개)</label>
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
                    <span className="text-xs font-extrabold text-slate-600">수주 등록 총액 (총 {ocrForm.items.length}개 품목)</span>
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
            onClick={handleSaveAllSalesOrders}
            disabled={!ocrSuccess}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-colors cursor-pointer shadow-md active:scale-95"
          >
            {parsedGroups.length > 1 
              ? `🚀 총 ${parsedGroups.length}건의 발주서 일괄 수주 등록 승인` 
              : "받은 발주서 수주 등록 승인"}
          </button>
        </div>
      </div>

      {/* 📋 구글 시트 프리셋 저장 및 목록 관리 통합 모달 */}
      <GoogleSheetPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        domain="sales_order"
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
