"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, Receipt, AlertCircle, CheckCircle2, X, Loader2, RefreshCw, Check, ArrowDownLeft, ArrowUpRight, ShieldCheck, AlertTriangle, Bookmark, History, Sparkles, List
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSavedGoogleSheetUrl, setSavedGoogleSheetUrl, loadSavedGoogleSheetConfig } from "@/lib/google-sheets-storage";
import { sanitizeDate, sanitizeAmount, reconcileAmounts, sanitizeBusinessNumber } from "@/lib/data-validator";

import GoogleSheetPresetModal, { GoogleSheetPreset } from "@/components/GoogleSheetPresetModal";

interface HometaxGoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedHometaxInvoice {
  issue_date: string;
  approval_no: string;
  type: 'PURCHASE' | 'SALES';
  invoice_kind?: 'TAX_INVOICE' | 'TAX_EXEMPT_INVOICE' | 'CASH_RECEIPT';
  supplier_corp_num: string;
  supplier_corp_name: string;
  supplier_ceo_name: string;
  supplier_address?: string;
  supplier_email?: string;
  buyer_corp_num: string;
  buyer_corp_name: string;
  buyer_ceo_name: string;
  buyer_address?: string;
  buyer_email?: string;
  supply_amount: number;
  tax_amount: number;
  total_amount: number;
  item_name: string;
  remark: string;
  isValid?: boolean;
  validationWarning?: string;
}

export default function HometaxGoogleSheetsModal({
  isOpen,
  onClose,
  onSuccess
}: HometaxGoogleSheetsModalProps) {
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>("");
  const [presets, setPresets] = useState<GoogleSheetPreset[]>([]);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetModalMode, setPresetModalMode] = useState<"save" | "list">("save");
  const [parsedInvoices, setParsedInvoices] = useState<ParsedHometaxInvoice[]>([]);
  const [userTypeSelection, setUserTypeSelection] = useState<"AUTO" | "SALES" | "PURCHASE">("AUTO");
  const [userKindSelection, setUserKindSelection] = useState<"AUTO" | "TAX_INVOICE" | "TAX_EXEMPT_INVOICE" | "CASH_RECEIPT">("AUTO");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPresetsList = async () => {
    try {
      const res = await apiFetch("/api/shared/google-sheets/presets?domain=hometax");
      const data = await res.json();
      if (data.success && data.presets) {
        setPresets(data.presets);
        if (data.defaultPreset && !sheetUrl) {
          setSheetUrl(data.defaultPreset.url);
          if (data.defaultPreset.sheetName) setSelectedSheetName(data.defaultPreset.sheetName);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) {
      const cachedUrl = getSavedGoogleSheetUrl('hometax_inbound_sheet_url') || getSavedGoogleSheetUrl();
      setSheetUrl(cachedUrl);
      setParsedInvoices([]);
      setUserTypeSelection("AUTO");
      setUserKindSelection("AUTO");
      setStatusMsg(null);
      setIsPresetModalOpen(false);
      fetchPresetsList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTypeSelectionChange = (newType: "AUTO" | "SALES" | "PURCHASE") => {
    setUserTypeSelection(newType);
    if (newType !== "AUTO" && parsedInvoices.length > 0) {
      setParsedInvoices(prev => prev.map(inv => ({ ...inv, type: newType })));
    }
  };

  const handleKindSelectionChange = (newKind: "AUTO" | "TAX_INVOICE" | "TAX_EXEMPT_INVOICE" | "CASH_RECEIPT") => {
    setUserKindSelection(newKind);
    if (newKind !== "AUTO" && parsedInvoices.length > 0) {
      setParsedInvoices(prev => prev.map(inv => ({ ...inv, invoice_kind: newKind })));
    }
  };

  const toggleRowType = (index: number) => {
    setParsedInvoices(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          type: next[index].type === 'SALES' ? 'PURCHASE' : 'SALES'
        };
      }
      return next;
    });
  };

  const handleFetchSheetData = async (overrideSheetName?: string) => {
    if (!sheetUrl.trim()) {
      setStatusMsg({ type: 'error', text: '구글 스프레드시트 URL 또는 ID를 입력해 주세요.' });
      return;
    }

    setIsLoading(true);
    setStatusMsg(null);
    setParsedInvoices([]);

    try {
      setSavedGoogleSheetUrl('hometax_inbound_sheet_url', sheetUrl, overrideSheetName || selectedSheetName);

      const res = await apiFetch("/api/shared/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sheetUrl.trim(),
          sheetName: overrideSheetName || selectedSheetName || undefined,
          fetchAllRows: true
        })
      });

      const data = await res.json();
      if (!data.success) {
        setStatusMsg({ type: 'error', text: data.error || '구글 시트 데이터를 가져오지 못했습니다.' });
        return;
      }

      setSpreadsheetTitle(data.spreadsheetTitle || "");
      setAvailableSheets(data.availableSheets || []);

      // 서버에서 gid 또는 요청에 따라 정확히 결정한 시트명을 최우선 사용
      let curSheet = overrideSheetName || data.sheetName;

      // 만약 URL에 gid가 없고 특정 탭도 선택하지 않은 경우에만 홈택스 관련 탭으로 스마트 추천
      if (!overrideSheetName && !selectedSheetName && !sheetUrl.includes("gid=") && data.availableSheets) {
        const hometaxTab = data.availableSheets.find((s: string) => 
          s.includes("홈택스") || s.includes("세금계산서") || s.includes("계산서") || s.includes("면세") || s.includes("현금영수증") || s.includes("매입") || s.includes("매출")
        );
        if (hometaxTab && hometaxTab !== curSheet) {
          setSelectedSheetName(hometaxTab);
          return handleFetchSheetData(hometaxTab);
        }
      }
      setSelectedSheetName(curSheet);

      const headers: string[] = data.headers || [];
      const rows: any[][] = data.rows || [];

      if (rows.length === 0) {
        setStatusMsg({ type: 'error', text: `[${curSheet}] 시트에 데이터 행이 존재하지 않습니다.` });
        return;
      }

      // 탭 이름으로 기본 구분/유형 추론 (과세 매출/매입, 면세 매출/매입, 현금영수증)
      const isCash = curSheet.includes("현금영수증") || curSheet.includes("현금");
      const isExempt = curSheet.includes("면세") || (curSheet.includes("계산서") && !curSheet.includes("세금계산서"));
      const isPurchase = curSheet.includes("매입");
      let defaultType: 'PURCHASE' | 'SALES' = isPurchase ? 'PURCHASE' : 'SALES';
      let defaultKind: 'TAX_INVOICE' | 'TAX_EXEMPT_INVOICE' | 'CASH_RECEIPT' = isCash ? 'CASH_RECEIPT' : (isExempt ? 'TAX_EXEMPT_INVOICE' : 'TAX_INVOICE');

      if (userTypeSelection !== 'AUTO') {
        defaultType = userTypeSelection;
      }
      if (userKindSelection !== 'AUTO') {
        defaultKind = userKindSelection;
      }

      // 1. 헤더 및 데이터 행 지정 (백엔드에서 이미 검증 완료된 headers 및 rows 사용)
      let actualHeaders = headers;
      let dataRows = rows;

      // 만약 백엔드가 넘겨준 headers가 비어있거나 1개뿐인 비표준 시트일 경우에만 rows의 0번째 행을 헤더로 보정
      if ((!actualHeaders || actualHeaders.length <= 1) && rows.length > 0) {
        actualHeaders = (rows[0] || []).map(h => String(h || '').trim());
        dataRows = rows.slice(1);
      }

      // 2. 컬럼 인덱스 매핑 (헤더명 매칭 및 중복 헤더 분리)
      let colIssueDate = -1;
      let colApprovalNo = -1;
      let colSupplierNum = -1;
      let colSupplierName = -1;
      let colSupplierCeo = -1;
      let colSupplierAddress = -1;
      let colSupplierEmail = -1;
      let colBuyerNum = -1;
      let colBuyerName = -1;
      let colBuyerCeo = -1;
      let colBuyerAddress = -1;
      let colBuyerEmail = -1;
      let colTotalAmount = -1;
      let colSupplyAmount = -1;
      let colTaxAmount = -1;
      let colItemName = -1;
      let colRemark = -1;
      let colType = -1;
      let colKind = -1;

      // 1단계: 명시적 공급자/공급받는자 및 작성일자 컬럼 탐색
      actualHeaders.forEach((h, idx) => {
        const clean = String(h || '').replace(/\s+/g, '').toLowerCase();
        if (!clean) return;

        if (clean === '작성일자' || (clean.includes('작성일자') && !clean.includes('당초') && colIssueDate === -1)) {
          colIssueDate = idx;
        } else if (clean.includes('발급일자') && colIssueDate === -1) {
          colIssueDate = idx;
        } else if ((clean === '매출일시' || clean === '거래일자' || clean === '일자') && colIssueDate === -1) {
          colIssueDate = idx;
        } else if ((clean === '승인번호' || clean.includes('승인번호')) && !clean.includes('당초') && colApprovalNo === -1) {
          colApprovalNo = idx;
        } else if (clean.includes('공급자사업자등록번호') || (clean.includes('공급자') && clean.includes('등록번호'))) {
          colSupplierNum = idx;
        } else if (clean.includes('공급자상호') || clean.includes('공급자법인명') || (clean.includes('공급자') && clean.includes('상호'))) {
          colSupplierName = idx;
        } else if (clean.includes('공급자대표자') || clean.includes('공급자성명') || (clean.includes('공급자') && (clean.includes('대표') || clean.includes('성명')))) {
          colSupplierCeo = idx;
        } else if (clean.includes('공급자사업장주소') || clean.includes('공급자주소') || (clean.includes('공급자') && clean.includes('주소'))) {
          colSupplierAddress = idx;
        } else if (clean.includes('공급자이메일') || clean.includes('공급자전자우편') || (clean.includes('공급자') && clean.includes('이메일'))) {
          colSupplierEmail = idx;
        } else if (clean.includes('공급받는자사업자등록번호') || (clean.includes('공급받는자') && clean.includes('등록번호'))) {
          colBuyerNum = idx;
        } else if (clean.includes('공급받는자상호') || clean.includes('공급받는자법인명') || (clean.includes('공급받는자') && clean.includes('상호'))) {
          colBuyerName = idx;
        } else if (clean.includes('공급받는자대표자') || clean.includes('공급받는자성명') || (clean.includes('공급받는자') && (clean.includes('대표') || clean.includes('성명')))) {
          colBuyerCeo = idx;
        } else if (clean.includes('공급받는자사업장주소') || clean.includes('공급받는자주소') || (clean.includes('공급받는자') && clean.includes('주소'))) {
          colBuyerAddress = idx;
        } else if (clean.includes('공급받는자이메일') || clean.includes('공급받는자전자우편') || (clean.includes('공급받는자') && clean.includes('이메일'))) {
          colBuyerEmail = idx;
        } else if (clean === '합계금액' || clean === '총액' || clean === '총금액' || (clean.includes('합계금액') && !clean.includes('품목'))) {
          colTotalAmount = idx;
        } else if ((clean === '공급가액' || clean.includes('공급가액')) && !clean.includes('품목')) {
          colSupplyAmount = idx;
        } else if ((clean === '세액' || clean === '부가세' || clean.includes('세액')) && !clean.includes('품목')) {
          colTaxAmount = idx;
        } else if (clean.includes('품목명') || clean === '품목' || clean.includes('용도구분')) {
          if (colItemName === -1 || clean.includes('품목명')) colItemName = idx;
        } else if (clean === '비고' || clean.includes('비고') || clean === '적요') {
          colRemark = idx;
        } else if (clean === '구분' || clean === '유형' || clean === '매출매입' || clean === '거래구분') {
          colType = idx;
        } else if (clean.includes('분류') || clean.includes('종류')) {
          colKind = idx;
        }
      });

      // 2단계: 중복 헤더(예: '상호'가 2개인 경우 - 첫번째는 공급자, 두번째는 공급받는자)
      let businessNumCount = 0;
      let nameCount = 0;
      let ceoCount = 0;
      let addressCount = 0;
      let emailCount = 0;
      actualHeaders.forEach((h, idx) => {
        const clean = String(h || '').replace(/\s+/g, '').toLowerCase();
        if (clean === '사업자등록번호' || clean === '등록번호' || clean === '사업자번호') {
          businessNumCount++;
          if (businessNumCount === 1 && colSupplierNum === -1) colSupplierNum = idx;
          if (businessNumCount === 2 && colBuyerNum === -1) colBuyerNum = idx;
        }
        if (clean === '상호' || clean === '상호(법인명)' || clean === '법인명' || clean === '거래처명' || clean === '가맹점명') {
          nameCount++;
          if (nameCount === 1 && colSupplierName === -1) colSupplierName = idx;
          if (nameCount === 2 && colBuyerName === -1) colBuyerName = idx;
        }
        if (clean === '대표자' || clean === '대표자명' || clean === '성명' || clean === '성명(대표자)') {
          ceoCount++;
          if (ceoCount === 1 && colSupplierCeo === -1) colSupplierCeo = idx;
          if (ceoCount === 2 && colBuyerCeo === -1) colBuyerCeo = idx;
        }
        if (clean === '주소' || clean === '사업장주소' || clean === '사업장' || (clean.includes('주소') && !clean.includes('이메일'))) {
          addressCount++;
          if (addressCount === 1 && colSupplierAddress === -1) colSupplierAddress = idx;
          if (addressCount === 2 && colBuyerAddress === -1) colBuyerAddress = idx;
        }
        if (clean === '이메일' || clean === '이메일주소' || clean === '전자우편' || clean.includes('이메일') || clean.includes('email')) {
          emailCount++;
          if (emailCount === 1 && colSupplierEmail === -1) colSupplierEmail = idx;
          if (emailCount === 2 && colBuyerEmail === -1) colBuyerEmail = idx;
        }
      });

      // 3단계: 홈택스 엑셀 표준 33컬럼 포지션 폴백
      if (colIssueDate === -1 && actualHeaders.length >= 17) colIssueDate = 0;
      if (colApprovalNo === -1 && actualHeaders.length >= 17) colApprovalNo = 1;
      if (colSupplierNum === -1 && actualHeaders.length >= 17) colSupplierNum = 4;
      if (colSupplierName === -1 && actualHeaders.length >= 17) colSupplierName = 6;
      if (colSupplierCeo === -1 && actualHeaders.length >= 17) colSupplierCeo = 7;
      if (colSupplierAddress === -1 && actualHeaders.length >= 9) colSupplierAddress = 8;
      if (colBuyerNum === -1 && actualHeaders.length >= 17) colBuyerNum = 9;
      if (colBuyerName === -1 && actualHeaders.length >= 17) colBuyerName = 11;
      if (colBuyerCeo === -1 && actualHeaders.length >= 17) colBuyerCeo = 12;
      if (colBuyerAddress === -1 && actualHeaders.length >= 14) colBuyerAddress = 13;
      if (colTotalAmount === -1 && actualHeaders.length >= 17) colTotalAmount = 14;
      if (colSupplyAmount === -1 && actualHeaders.length >= 17) colSupplyAmount = 15;
      if (colTaxAmount === -1 && actualHeaders.length >= 17) colTaxAmount = 16;
      if (colSupplierEmail === -1 && actualHeaders.length >= 20) colSupplierEmail = 18;
      if (colBuyerEmail === -1 && actualHeaders.length >= 21) colBuyerEmail = 19;
      if (colRemark === -1 && actualHeaders.length >= 21) colRemark = 20;
      if (colItemName === -1 && actualHeaders.length >= 27) colItemName = 26;

      const parseAmount = (val: any): number => {
        if (typeof val === 'number') return Math.floor(val);
        if (!val) return 0;
        const numStr = String(val).replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(numStr);
        return isNaN(parsed) ? 0 : Math.floor(parsed);
      };

      const list: ParsedHometaxInvoice[] = [];

      dataRows.forEach((rowArr) => {
        if (!rowArr || !Array.isArray(rowArr) || rowArr.length === 0) return;

        const rawIssueDate = colIssueDate !== -1 ? String(rowArr[colIssueDate] || '').trim() : '';
        const rawApprovalNo = colApprovalNo !== -1 ? String(rowArr[colApprovalNo] || '').trim() : '';
        const rawSupplierNum = colSupplierNum !== -1 ? String(rowArr[colSupplierNum] || '').trim() : '';
        const supplier_corp_name = colSupplierName !== -1 ? String(rowArr[colSupplierName] || '').trim() : '';
        const supplier_ceo_name = colSupplierCeo !== -1 ? String(rowArr[colSupplierCeo] || '').trim() : '';
        const supplier_address = colSupplierAddress !== -1 ? String(rowArr[colSupplierAddress] || '').trim() : '';
        const supplier_email = colSupplierEmail !== -1 ? String(rowArr[colSupplierEmail] || '').trim() : '';

        const rawBuyerNum = colBuyerNum !== -1 ? String(rowArr[colBuyerNum] || '').trim() : '';
        const buyer_corp_name = colBuyerName !== -1 ? String(rowArr[colBuyerName] || '').trim() : '';
        const buyer_ceo_name = colBuyerCeo !== -1 ? String(rowArr[colBuyerCeo] || '').trim() : '';
        const buyer_address = colBuyerAddress !== -1 ? String(rowArr[colBuyerAddress] || '').trim() : '';
        const buyer_email = colBuyerEmail !== -1 ? String(rowArr[colBuyerEmail] || '').trim() : '';

        let item_name = colItemName !== -1 ? String(rowArr[colItemName] || '').trim() : '';
        let remark = colRemark !== -1 ? String(rowArr[colRemark] || '').trim() : '';

        // 품목명이 숫자나 기호만으로 들어간 경우 정리
        if (/^[0-9,.\s]+$/.test(item_name)) {
          item_name = '';
        }

        let rowType = defaultType;
        if (userTypeSelection === 'AUTO' && colType !== -1) {
          const typeVal = String(rowArr[colType] || '').trim();
          if (typeVal.includes('매출')) rowType = 'SALES';
          else if (typeVal.includes('매입')) rowType = 'PURCHASE';
        } else if (userTypeSelection !== 'AUTO') {
          rowType = userTypeSelection;
        }

        let rowKind = defaultKind;
        if (userKindSelection === 'AUTO' && colKind !== -1) {
          const kindVal = String(rowArr[colKind] || '').trim();
          if (kindVal.includes('면세') || (kindVal.includes('계산서') && !kindVal.includes('세금'))) rowKind = 'TAX_EXEMPT_INVOICE';
        } else if (userKindSelection !== 'AUTO') {
          rowKind = userKindSelection;
        }

        // 1. 날짜 정밀 유효성 검사 및 정규화
        const dateSanitized = sanitizeDate(rawIssueDate);
        const issueDate = dateSanitized.isValid ? dateSanitized.value : rawIssueDate;

        // 2. 금액 정밀 유효성 검사 및 삼각 대조 보정
        const supplySanitized = sanitizeAmount(colSupplyAmount !== -1 ? rowArr[colSupplyAmount] : 0);
        const taxSanitized = sanitizeAmount(colTaxAmount !== -1 ? rowArr[colTaxAmount] : 0);
        const totalSanitized = sanitizeAmount(colTotalAmount !== -1 ? rowArr[colTotalAmount] : 0);

        const reconciled = reconcileAmounts(supplySanitized.value, taxSanitized.value, totalSanitized.value);

        // 3. 사업자등록번호 검증 및 포맷팅
        const supplierBn = sanitizeBusinessNumber(rawSupplierNum);
        const buyerBn = sanitizeBusinessNumber(rawBuyerNum);

        // 유효성 경고 수집
        const warnings: string[] = [];
        if (!dateSanitized.isValid && dateSanitized.warning) warnings.push(dateSanitized.warning);
        if (reconciled.warning) warnings.push(reconciled.warning);
        if (rawSupplierNum && !supplierBn.isValid && supplierBn.warning) warnings.push(`공급자 ${supplierBn.warning}`);
        if (rawBuyerNum && !buyerBn.isValid && buyerBn.warning) warnings.push(`공급받는자 ${buyerBn.warning}`);

        const isValid = dateSanitized.isValid && (reconciled.isBalanced || reconciled.total > 0);

        if (rawIssueDate || rawApprovalNo || supplier_corp_name || buyer_corp_name) {
          list.push({
            issue_date: issueDate || new Date().toISOString().split('T')[0],
            approval_no: rawApprovalNo || `HT-${Math.floor(100000 + Math.random() * 900000)}`,
            type: rowType,
            invoice_kind: rowKind,
            supplier_corp_num: supplierBn.formatted || rawSupplierNum,
            supplier_corp_name,
            supplier_ceo_name,
            supplier_address,
            supplier_email,
            buyer_corp_num: buyerBn.formatted || rawBuyerNum,
            buyer_corp_name,
            buyer_ceo_name,
            buyer_address,
            buyer_email,
            supply_amount: reconciled.supply,
            tax_amount: reconciled.tax,
            total_amount: reconciled.total,
            item_name,
            remark,
            isValid,
            validationWarning: warnings.length > 0 ? warnings.join(', ') : undefined
          });
        }
      });

      const kindLabel = defaultKind === 'CASH_RECEIPT' ? '현금영수증' : (defaultKind === 'TAX_EXEMPT_INVOICE' ? '면세 계산서' : '세금계산서');
      const typeLabel = defaultType === 'SALES' ? '매출' : '매입';

      setParsedInvoices(list);
      setStatusMsg({
        type: 'success',
        text: `✅ [${data.spreadsheetTitle}] '${curSheet}' 탭에서 총 ${list.length}건 (${typeLabel} ${kindLabel})을 판독했습니다!`
      });
    } catch (err: any) {
      console.error("Hometax Google Sheets error:", err);
      setStatusMsg({ type: 'error', text: `연동 오류: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = async () => {
    if (parsedInvoices.length === 0) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await apiFetch("/api/finance/hometax-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoices: parsedInvoices })
      });

      const data = await res.json();
      if (data.success) {
        const inserted = data.insertedCount || 0;
        const duplicate = data.duplicateCount || 0;
        const partnerAdded = data.partnerSync?.added || 0;
        const partnerUpdated = data.partnerSync?.updated || 0;

        let msg = `🎉 총 ${parsedInvoices.length}건 중 신규 ${inserted}건 적재 완료`;
        if (duplicate > 0) {
          msg += ` (기존 중복 ${duplicate}건 건너뜀)`;
        }
        if (partnerUpdated > 0 || partnerAdded > 0) {
          msg += ` [거래처: 신규 ${partnerAdded}개사, 갱신 ${partnerUpdated}개사]`;
        }

        setStatusMsg({
          type: 'success',
          text: msg
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1600);
      } else {
        setStatusMsg({ type: 'error', text: `등록 실패: ${data.error || '오류 발생'}` });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `서버 통신 오류: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-700 rounded-2xl">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                국세청 홈택스 구글 스프레드시트 연동
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">구글 시트의 홈택스 매입/매출 세금계산서 탭을 실시간으로 읽어와 회계 장부에 일괄 적재합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-600">
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-600" />
                구글 스프레드시트 URL 또는 Spreadsheet ID
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPresetModalMode("save");
                    setIsPresetModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="현재 입력된 구글 시트 주소를 이름과 함께 저장합니다."
                >
                  <Bookmark className="w-3.5 h-3.5 text-teal-600" />
                  <span>시트 주소 저장</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPresetModalMode("list");
                    setIsPresetModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="저장된 구글 시트 목록을 조회하고 선택합니다."
                >
                  <List className="w-3.5 h-3.5 text-slate-500" />
                  <span>저장 목록 ({presets.length})</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleFetchSheetData();
                  }
                }}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => handleFetchSheetData()}
                disabled={isLoading || !sheetUrl.trim()}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isLoading || !sheetUrl.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20 active:scale-95"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>조회 중...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>데이터 가져오기</span>
                  </>
                )}
              </button>
            </div>

            {availableSheets.length > 1 && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 text-xs">
                <span className="font-bold text-slate-600 shrink-0">대상 탭 선택:</span>
                <select
                  value={selectedSheetName}
                  onChange={(e) => {
                    setSelectedSheetName(e.target.value);
                    handleFetchSheetData(e.target.value);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {availableSheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400">('세금계산서(매입)', '세금계산서(매출)' 등 선택 가능)</span>
              </div>
            )}

            {/* 거래 구분 및 증빙 종류 선택 컨트롤 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-teal-600" />
                  거래 구분 (매출 / 매입)
                </span>
                <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleTypeSelectionChange("AUTO")}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                      userTypeSelection === "AUTO" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🤖 자동 감지
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeSelectionChange("SALES")}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                      userTypeSelection === "SALES" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    🟢 매출 (발행)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeSelectionChange("PURCHASE")}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                      userTypeSelection === "PURCHASE" ? "bg-rose-600 text-white shadow-xs" : "text-rose-700 hover:bg-rose-50"
                    }`}
                  >
                    🔵 매입 (수취)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-teal-600" />
                  증빙 종류 (과세 / 면세 / 현금)
                </span>
                <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleKindSelectionChange("AUTO")}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                      userKindSelection === "AUTO" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    🤖 자동
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKindSelectionChange("TAX_INVOICE")}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                      userKindSelection === "TAX_INVOICE" ? "bg-indigo-600 text-white shadow-xs" : "text-indigo-700 hover:bg-indigo-50"
                    }`}
                  >
                    과세
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKindSelectionChange("TAX_EXEMPT_INVOICE")}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                      userKindSelection === "TAX_EXEMPT_INVOICE" ? "bg-teal-600 text-white shadow-xs" : "text-teal-700 hover:bg-teal-50"
                    }`}
                  >
                    면세
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKindSelectionChange("CASH_RECEIPT")}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                      userKindSelection === "CASH_RECEIPT" ? "bg-amber-600 text-white shadow-xs" : "text-amber-700 hover:bg-amber-50"
                    }`}
                  >
                    현금
                  </button>
                </div>
              </div>
            </div>
          </div>

          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                statusMsg.type === "success"
                  ? "bg-teal-50 text-teal-900 border border-teal-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {parsedInvoices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-teal-600" />
                  <h4 className="font-bold text-slate-800 text-xs">
                    판독된 세금계산서 목록 미리보기 ({parsedInvoices.length}건)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">💡 [구분] 뱃지를 클릭하면 개별 매출/매입을 전환할 수 있습니다.</span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-80 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap w-16">검증</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">구분</th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">종류</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">작성일자</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">공급자 상호</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">공급받는자 상호</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">공급가액</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">세액</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">합계금액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedInvoices.map((inv, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {inv.isValid !== false ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200" title="날짜·금액·사업자번호 검증 완료">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              정상
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title={inv.validationWarning || "형식 확인 필요"}>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              확인
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleRowType(i)}
                            title="클릭하여 매출/매입 전환"
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-90 ${
                              inv.type === 'SALES' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                            }`}
                          >
                            {inv.type === 'SALES' ? '매출' : '매입'}
                          </button>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {inv.invoice_kind === 'CASH_RECEIPT' ? '현금' : (inv.invoice_kind === 'TAX_EXEMPT_INVOICE' ? '면세' : '과세')}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">{inv.issue_date}</td>
                        <td className="py-2 px-3 font-bold text-slate-800 whitespace-nowrap">{inv.supplier_corp_name || '-'}</td>
                        <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{inv.buyer_corp_name || '-'}</td>
                        <td className="py-2 px-3 font-mono text-right text-slate-600 whitespace-nowrap">
                          {inv.supply_amount.toLocaleString()}원
                        </td>
                        <td className="py-2 px-3 font-mono text-right text-slate-500 whitespace-nowrap">
                          {inv.tax_amount.toLocaleString()}원
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-right text-indigo-600 whitespace-nowrap">
                          {inv.total_amount.toLocaleString()}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            disabled={parsedInvoices.length === 0 || isSubmitting}
            onClick={handleApplyImport}
            className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              parsedInvoices.length === 0 || isSubmitting
                ? "bg-slate-200 text-slate-400 shadow-none cursor-not-allowed"
                : "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20 active:scale-95"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>등록 중...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{parsedInvoices.length}건 세금계산서 일괄 등록</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 구글 시트 프리셋 저장/목록 모달 */}
      <GoogleSheetPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        domain="hometax"
        currentUrl={sheetUrl}
        currentSheetName={selectedSheetName}
        initialMode={presetModalMode}
        onSelectPreset={(preset) => {
          setSheetUrl(preset.url);
          if (preset.sheetName) setSelectedSheetName(preset.sheetName);
          setIsPresetModalOpen(false);
          // 선택 후 즉시 데이터 조회 가동
          setTimeout(() => {
            handleFetchSheetData(preset.sheetName);
          }, 100);
        }}
        onPresetsUpdated={(updatedPresets) => {
          setPresets(updatedPresets);
        }}
      />
    </div>
  );
}
