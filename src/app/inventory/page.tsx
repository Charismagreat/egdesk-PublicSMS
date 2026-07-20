"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Sliders, ArrowRightLeft, FileText, Download, Loader2 } from 'lucide-react';
import { usePersistedState } from "@/hooks/usePersistedState";

// 타입 및 유틸리티 임포트
import { InventoryItem, InventoryLog, ScanLog, ItemFormState } from './types';
import { playBeep } from './utils/audio';
import { calculateValuation } from './utils/valuation';

// 하위 서브 컴포넌트 임포트
import { InventoryStats } from './components/InventoryStats';
import { AiVisionTerminal } from './components/AiVisionTerminal';
import { AiVoiceTerminal, voicePresets } from './components/AiVoiceTerminal';
import { InventoryTable } from './components/InventoryTable';
import { InventoryLogTable } from './components/InventoryLogTable';
import { ItemModal } from './components/ItemModal';
import { TransactionModal } from './components/TransactionModal';
import { BarcodeScanModal } from './components/BarcodeScanModal';
import { ExcelGuideModal } from './components/ExcelGuideModal';
import { BarcodePrintModal } from './components/BarcodePrintModal';
import { DeadstockControl } from './components/DeadstockControl';
import InboundExcelModal from './components/InboundExcelModal';
import { InboundOcrModal } from './components/InboundOcrModal';

export default function InventoryPage() {
  // 상태 정의
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [dbTags, setDbTags] = useState<{ id: string; name: string }[]>([]);
  const [autocompleteData, setAutocompleteData] = useState<{
    partners: string[];
    staff: string[];
    departments: string[];
    projects: string[];
  }>({ partners: [], staff: [], departments: [], projects: [] });
  const [activeTab, setActiveTab, isActiveTabRestored] = usePersistedState<'material' | 'product' | 'deadstock'>('egdesk_inventory_activeTab', 'material');
  const [lastActiveTab, setLastActiveTab] = usePersistedState<'material' | 'product'>('egdesk_inventory_lastActiveTab', 'material');
  const [inbounds, setInbounds] = useState<any[]>([]);
  const [selectedInboundId, setSelectedInboundId] = useState<string | null>(null);
  const [inboundDetails, setInboundDetails] = useState<any[]>([]);
  const [isInboundModalOpen, setIsInboundModalOpen] = useState(false);
  const [loadingInbounds, setLoadingInbounds] = useState(false);
  const [searchQuery, setSearchQuery, isSearchQueryRestored] = usePersistedState('egdesk_inventory_searchQuery', '');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage, isCurrentPageRestored] = usePersistedState('egdesk_inventory_currentPage', 1);
  const [itemsPerPage, setItemsPerPage, isItemsPerPageRestored] = usePersistedState('egdesk_inventory_itemsPerPage', 10);
  const [selectedTags, setSelectedTags, isSelectedTagsRestored] = usePersistedState<string[]>('egdesk_inventory_selectedTags', []);
  const [sortKey, setSortKey, isSortKeyRestored] = usePersistedState<string>('egdesk_inventory_sortKey', 'createdAt');
  const [sortDir, setSortDir, isSortDirRestored] = usePersistedState<'ASC' | 'DESC'>('egdesk_inventory_sortDir', 'DESC');
  const [selectedCategories, setSelectedCategories, isSelectedCategoriesRestored] = usePersistedState<string[]>('egdesk_inventory_selectedCategories', []);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [dbStats, setDbStats] = useState({
    totalMaterialStock: 0,
    totalProductStock: 0,
    totalMaterialValue: 0,
    totalProductValue: 0,
    outOfStockCount: 0
  });
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [materialCount, setMaterialCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [valuationMethod, setValuationMethod, isValuationMethodRestored] = usePersistedState<'moving_average' | 'fifo' | 'lifo'>('egdesk_inventory_valuationMethod', 'moving_average');

  // 모든 세션 상태 복원이 완료되었는지 감시하는 플래그
  const isRestored = isActiveTabRestored && isSearchQueryRestored && isCurrentPageRestored && isItemsPerPageRestored && isSelectedTagsRestored && isValuationMethodRestored && isSortKeyRestored && isSortDirRestored && isSelectedCategoriesRestored;

  // 💡 [DB 재고 평가방법 동적 동기화] 마운트 시 최초 DB 설정값 로드
  useEffect(() => {
    const fetchDbValuationMethod = async () => {
      try {
        const res = await fetch('/api/settings?key=inventory_valuation_method');
        const json = await res.json();
        if (json.success && json.value) {
          setValuationMethod(json.value);
        }
      } catch (err) {
        console.warn('Failed to load database valuation method:', err);
      }
    };
    fetchDbValuationMethod();
  }, []);

  // 💡 [DB 재고 평가방법 동적 동기화] 평가법 변경 시 DB 설정 즉시 업데이트
  useEffect(() => {
    if (isRestored && valuationMethod) {
      const saveDbValuationMethod = async () => {
        try {
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: 'inventory_valuation_method',
              value: valuationMethod
            })
          });
        } catch (err) {
          console.warn('Failed to save database valuation method:', err);
        }
      };
      saveDbValuationMethod();
    }
  }, [valuationMethod, isRestored]);

  // 검색어, 탭, 정렬, 카테고리 변경 시 페이지 번호 1페이지로 세팅
  useEffect(() => {
    if (isRestored) {
      setCurrentPage(1);
    }
  }, [searchQuery, activeTab, sortKey, sortDir, selectedCategories, isRestored]);

  // activeTab이 자재 또는 제품일 때 직전 활성 탭 상태 기록
  useEffect(() => {
    if (activeTab === 'material' || activeTab === 'product') {
      setLastActiveTab(activeTab);
    }
  }, [activeTab, setLastActiveTab]);

  // 데이터 로드는 복원 완료 시점에 맞춰서 기동
  useEffect(() => {
    if (isRestored) {
      fetchData();
    }
  }, [searchQuery, activeTab, currentPage, itemsPerPage, sortKey, sortDir, selectedCategories, isRestored]);

  // 모달 상태
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isInboundExcelModalOpen, setIsInboundExcelModalOpen] = useState(false);
  const [isInboundOcrModalOpen, setIsInboundOcrModalOpen] = useState(false);
  const [inboundOcrFile, setInboundOcrFile] = useState<File | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const handleOcrFileSelect = (file: File) => {
    setInboundOcrFile(file);
    setIsInboundOcrModalOpen(true);
  };
  
  // 신규 품목 폼 상태
  const [itemForm, setItemForm] = useState<ItemFormState>({
    type: 'material' as 'material' | 'product',
    name: '',
    category: '',
    price: '',
    purchasePrice: '',
    partner: '',
    stock: '',
    safeStock: '',
    location: '',
    barcode: '',
    description: '',
    spec: '',
    unitType: 'count',
    unitValue: '개',
    boxContains: ''
  });

  // 입출고 거래/조정 폼 상태
  const [txType, setTxType] = useState<'in' | 'out' | 'adjust'>('in');
  const [txForm, setTxForm] = useState({
    itemId: '',
    quantity: '',
    price: '',
    operator: '홍길동 과장',
    note: ''
  });

  // AI 비전 입고 분석 상태
  const [aiVisionLoading, setAiVisionLoading] = useState(false);
  const [aiVisionSuccess, setAiVisionSuccess] = useState(false);
  const [scanningLine, setScanningLine] = useState(false);

  // AI 음성/자연어 출고 분석 상태
  const [aiVoiceLoading, setAiVoiceLoading] = useState(false);
  const [aiVoiceSuccess, setAiVoiceSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [selectedVoicePreset, setSelectedVoicePreset] = useState<number | null>(null);
  const [highlightFields, setHighlightFields] = useState<Record<string, boolean>>({});

  // 엑셀 일괄 등록용 상태
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [showExcelGuideModal, setShowExcelGuideModal] = useState(false);

  // 글로벌 마스터 태그 풀 및 품목 바인딩 태그용 상태
  const [globalTags, setGlobalTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // 바코드 스캔 및 라벨 인쇄 관련 상태
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'in' | 'out'>('in');
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [isLabelPrintModalOpen, setIsLabelPrintModalOpen] = useState(false);
  const [selectedPrintItem, setSelectedPrintItem] = useState<InventoryItem | null>(null);

  // 타이핑 애니메이션 레프 및 상태
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 최초 로드 시 글로벌 태그 풀 로딩
  useEffect(() => {
    initGlobalTags();
  }, []);

  // 바코드 스캔 처리 핵심 트랜잭션 함수
  const handleBarcodeScanned = async (barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;
    
    // 만약 스캔 모달이 열려 있지 않다면 강제로 열어줍니다.
    setIsScanModalOpen(true);
    
    try {
      const res = await apiFetch('/api/inventory/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: cleanBarcode,
          mode: scanMode,
          operator: '최고관리자'
        })
      });
      
      const json = await res.json();
      
      if (json.success) {
        // 성공 사운드
        playBeep('success');
        
        // 스캔 로그 적재
        const newLog: ScanLog = {
          id: String(Date.now()),
          time: new Date().toLocaleTimeString('ko-KR'),
          name: json.item.name,
          type: json.item.type === 'material' ? '자재' : '완제품',
          beforeStock: scanMode === 'in' ? json.item.stock - 1 : json.item.stock + 1,
          afterStock: json.item.stock,
          success: true,
          barcode: cleanBarcode
        };
        
        setScanLogs(prev => [newLog, ...prev]);
        fetchData(); // 전체 화면 새로고침
        
      } else {
        // 실패 사운드
        playBeep('error');
        
        const errorLog: ScanLog = {
          id: String(Date.now()),
          time: new Date().toLocaleTimeString('ko-KR'),
          name: '등록되지 않은 품목',
          type: '-',
          beforeStock: 0,
          afterStock: 0,
          success: false,
          barcode: cleanBarcode,
          errorMsg: '시스템에 미등록된 바코드입니다.'
        };
        setScanLogs(prev => [errorLog, ...prev]);
      }
    } catch (e: any) {
      playBeep('error');
      console.error('Scan handling failed:', e);
    }
  };

  // 글로벌 바코드 스캐너 전역 감청 감지 이펙트
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      
      // 바코드 수동 기입 인풋을 제외한 곳에서 전역 스캔 감지
      if (isInput && (activeEl as HTMLInputElement).name !== 'barcode_capture') {
        if (!isScanModalOpen) return;
      }

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // 입력 간격이 35ms 이상이면 수동 키보드 입력으로 간주하여 초기화
      if (diff > 35) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 2) {
          const barcode = buffer;
          buffer = '';
          e.preventDefault();
          handleBarcodeScanned(barcode);
        }
      } else {
        if (e.key.length === 1) {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isScanModalOpen, scanMode, items]);

  // 글로벌 태그 풀 로드 및 Seeding
  const initGlobalTags = () => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('egdesk_inventory_global_tags') : null;
    if (saved) {
      try {
        setGlobalTags(JSON.parse(saved));
      } catch (e) {
        const defaults = ['사용중', '보류', '사용중단', '판매중', '판매중단제품'];
        setGlobalTags(defaults);
        localStorage.setItem('egdesk_inventory_global_tags', JSON.stringify(defaults));
      }
    } else {
      const defaults = ['사용중', '보류', '사용중단', '판매중', '판매중단제품'];
      setGlobalTags(defaults);
      localStorage.setItem('egdesk_inventory_global_tags', JSON.stringify(defaults));
    }
  };

  // 마스터 풀에 태그 누적 추가
  const addGlobalTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (globalTags.includes(trimmed)) return;

    const updated = [...globalTags, trimmed];
    setGlobalTags(updated);
    localStorage.setItem('egdesk_inventory_global_tags', JSON.stringify(updated));
  };

  // 마스터 풀에서 태그 영구 삭제
  const removeGlobalTag = (tag: string) => {
    const updated = globalTags.filter(t => t !== tag);
    setGlobalTags(updated);
    localStorage.setItem('egdesk_inventory_global_tags', JSON.stringify(updated));

    // 품목 바인딩 태그에서도 즉시 제거 처리
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 공통 태그 목록 로드
      try {
        const tagsRes = await apiFetch('/api/expenses/tags');
        const tagsData = await tagsRes.json();
        if (tagsData.success && Array.isArray(tagsData.tags)) {
          // scope가 'global'(또는 비어있음)이거나 'inventory'인 태그만 필터링
          const filteredTags = tagsData.tags.filter((t: any) => 
            !t.scope || t.scope === 'global' || t.scope === 'inventory'
          );
          setDbTags(filteredTags);
        }
      } catch (err) {
        console.warn('공통 태그 목록 로드 실패:', err);
      }

      // 전사 자동완성 마스터 데이터 로드
      try {
        const autoRes = await apiFetch('/api/expenses/autocomplete');
        const autoData = await autoRes.json();
        if (autoData.success && autoData.data) {
          setAutocompleteData(autoData.data);
        }
      } catch (err) {
        console.warn('자동완성 마스터 데이터 로드 실패:', err);
      }

      const catsParam = selectedCategories.join(',');
      const tagsParam = selectedTags.join(',');
      const itemsRes = await apiFetch(`/api/inventory?page=${currentPage}&limit=${itemsPerPage}&type=${activeTab}&search=${searchQuery}&orderBy=${sortKey}&orderDirection=${sortDir}&categories=${catsParam}&tags=${tagsParam}`);
      const itemsData = await itemsRes.json();
      if (itemsData.success) {
        setItems(Array.isArray(itemsData.data) ? itemsData.data : []);
        setTotalItems(itemsData.total || 0);
        setMaterialCount(itemsData.materialCount || 0);
        setProductCount(itemsData.productCount || 0);
        setDbCategories(itemsData.categoriesList || []);
        if (itemsData.stats) {
          setDbStats(itemsData.stats);
        }
      } else {
        setItems([]);
        setTotalItems(0);
        setMaterialCount(0);
        setProductCount(0);
        setDbCategories([]);
      }

      const logsRes = await apiFetch('/api/inventory/logs');
      const logsData = await logsRes.json();
      if (logsData.success) {
        setLogs(Array.isArray(logsData.data) ? logsData.data : []);
      } else {
        setLogs([]);
      }

      // 자율 입고 내역 가져오기
      const inboundsRes = await apiFetch('/api/inventory/inbounds');
      const inboundsData = await inboundsRes.json();
      if (inboundsData.success) {
        setInbounds(Array.isArray(inboundsData.data) ? inboundsData.data : []);
      } else {
        setInbounds([]);
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setItems([]);
      setLogs([]);
      setInbounds([]);
    } finally {
      setLoading(false);
    }
  };

  // 자율 입고 상세 정보 로드
  const openInboundDetail = async (inboundId: string) => {
    setSelectedInboundId(inboundId);
    setIsInboundModalOpen(true);
    setLoadingInbounds(true);
    try {
      const res = await apiFetch(`/api/inventory/inbounds?inbound_id=${inboundId}`);
      const data = await res.json();
      if (data.success) {
        setInboundDetails(Array.isArray(data.data) ? data.data : []);
      } else {
        setInboundDetails([]);
      }
    } catch (err) {
      console.error('입고 상세 로드 실패:', err);
      setInboundDetails([]);
    } finally {
      setLoadingInbounds(false);
    }
  };

  // 품목 추가/수정 처리
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!selectedItem;
      const url = '/api/inventory';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit 
        ? { ...itemForm, id: selectedItem.id, tags: selectedTags.join(',') } 
        : { ...itemForm, tags: selectedTags.join(',') };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setIsItemModalOpen(false);
        setSelectedItem(null);
        resetItemForm();
        fetchData();
      } else {
        alert(data.error || '처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('품목 저장 오류:', error);
    }
  };

  // 품목 삭제 처리
  const handleItemDelete = async (id: number) => {
    if (!confirm('정말로 이 품목과 관련 변동 로그를 모두 삭제하시겠습니까?')) return;
    try {
      const res = await apiFetch(`/api/inventory?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || '삭제 실패');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
    }
  };

  // 엑셀 일괄 등록 처리
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingExcel(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        if (!data) return;

        try {
          // SheetJS 동적 임포트
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (rawRows.length === 0) {
            alert('엑셀 시트에 데이터가 존재하지 않습니다.');
            setIsUploadingExcel(false);
            return;
          }

          // 지능형 퍼지 매핑
          const mappedItems = rawRows.map((row: any) => {
            const typeVal = row['종류'] || row['구분'] || row['type'] || '자재';
            const nameVal = row['품목명'] || row['이름'] || row['name'] || '';
            const categoryVal = row['카테고리'] || row['분류'] || row['category'] || '';
            const priceVal = row['단가'] || row['공급 단가'] || row['공급단가'] || row['매입가'] || row['판매가'] || row['price'] || 0;
            const purchasePriceVal = row['구매 단가'] || row['구매단가'] || row['매입 원가'] || row['매입원가'] || row['purchasePrice'] || 0;
            const partnerVal = row['거래처'] || row['매입처'] || row['주매입거래처'] || row['partner'] || '';
            const locationVal = row['적재 위치'] || row['창고 위치'] || row['적재위치'] || row['location'] || '';
            const specVal = row['규격'] || row['세부 스펙'] || row['spec'] || '';
            const unitTypeVal = row['단위 구분'] || row['unitType'] || '개수';
            const unitValueVal = row['세부 단위'] || row['단위'] || row['unitValue'] || '';
            const boxContainsVal = row['입수량'] || row['박스당입수량'] || row['박스당 입수량'] || row['n개입'] || row['boxContains'] || '';
            const safeStockVal = row['안전 재고'] || row['적정 재고'] || row['안전재고량'] || row['safeStock'] || 0;
            const stockVal = row['최초 재고'] || row['현재 재고'] || row['최초기초재고'] || row['stock'] || 0;
            const barcodeVal = row['바코드'] || row['품목코드'] || row['바코드/품목코드'] || row['코드'] || row['barcode'] || '';
            const descriptionVal = row['비고'] || row['상세 설명'] || row['description'] || '';

            return {
              type: typeVal === '제품' ? 'product' : 'material',
              name: nameVal,
              category: categoryVal,
              price: priceVal,
              purchasePrice: purchasePriceVal,
              partner: partnerVal,
              location: locationVal,
              spec: specVal,
              unitType: unitTypeVal === '박스' ? 'box' : unitTypeVal === '중량' ? 'weight' : 'count',
              unitValue: unitValueVal,
              boxContains: boxContainsVal,
              safeStock: safeStockVal,
              stock: stockVal,
              barcode: barcodeVal,
              description: descriptionVal
            };
          }).filter(item => item.name);

          if (mappedItems.length === 0) {
            alert('필수 정보인 [품목명]이 기재된 유효한 행을 찾을 수 없습니다.');
            setIsUploadingExcel(false);
            return;
          }

          const res = await apiFetch('/api/inventory/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: mappedItems })
          });
          const json = await res.json();

          if (json.success) {
            alert(`🎉 엑셀 일괄 등록 완료!\n수신 데이터: ${json.totalReceived}개 중 ${json.count}개의 신규 품목이 등록되었습니다.\n(중복된 동일 바코드/품목코드의 데이터는 자동 스킵되었습니다.)`);
            fetchData();
          } else {
            alert('일괄 등록 실패: ' + (json.error || '알 수 없는 오류'));
          }
        } catch (err: any) {
          console.error(err);
          alert('엑셀 파일 파싱 중 오류가 발생했습니다. 서식을 확인해 주세요.');
        } finally {
          setIsUploadingExcel(false);
          e.target.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (e) {
      alert('파일 읽기 오류가 발생했습니다.');
      setIsUploadingExcel(false);
    }
  };

  // 엑셀 양식 서식 다운로드 기능
  const downloadExcelTemplate = async () => {
    try {
      const XLSX = await import('xlsx');

      const headers = [
        '구분',
        '품목명',
        '바코드/품목코드',
        '카테고리',
        '규격',
        '단위',
        '박스당 입수량',
        '판매단가',
        '구매단가',
        '거래처',
        '적재 위치',
        '안전 재고',
        '최초 재고',
        '비고'
      ];

      const mockRows = [
        {
          '구분': '자재',
          '품목명': '초경량 BLDC 모터 V2',
          '바코드/품목코드': 'MTR-BLDC-002',
          '카테고리': '전동부품',
          '규격': '15mm x 150mm',
          '단위': '박스',
          '박스당 입수량': 10,
          '판매단가': 15000,
          '구매단가': 12500,
          '거래처': '한성정밀(주)',
          '적재 위치': 'A홀 3번 선반',
          '안전 재고': 15,
          '최초 재고': 50,
          '비고': '고효율 긴수명 모터 브라켓 미포함'
        },
        {
          '구분': '제품',
          '품목명': '써모글로우 텀블러 500ml',
          '바코드/품목코드': 'PD-TMB-500G',
          '카테고리': '리빙웨어',
          '규격': '고진공 스테인리스 이중벽',
          '단위': '개수',
          '박스당 입수량': '',
          '판매단가': 19800,
          '구매단가': 8700,
          '거래처': '글로벌 트레이딩',
          '적재 위치': 'B홀 12번 적재함',
          '안전 재고': 30,
          '최초 재고': 120,
          '비고': '보온보냉 고진공 텀블러 완제품'
        }
      ];

      const aoaData: any[][] = [headers];
      mockRows.forEach((row) => {
        const rowData = headers.map((header) => row[header as keyof typeof row] ?? '');
        aoaData.push(rowData);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '재고일괄등록_샘플서식');

      XLSX.writeFile(workbook, '이지데스크_재고일괄등록_샘플양식.xlsx');
    } catch (err) {
      console.error('템플릿 생성 중 에러:', err);
      alert('템플릿 파일을 생성하지 못했습니다. 다시 시도해 주세요.');
    }
  };

  // 실시간 재고자산 대장 목록 전체 엑셀 내보내기 기능
  const exportInventoryToExcel = async () => {
    if (isExportingExcel) return;
    setIsExportingExcel(true);
    try {
      const catsParam = selectedCategories.join(',');
      const tagsParam = selectedTags.join(',');
      // 페이징 없이 전체 조회를 위해 limit=10000 쿼리
      const res = await apiFetch(`/api/inventory?page=1&limit=10000&type=${activeTab}&search=${searchQuery}&orderBy=${sortKey}&orderDirection=${sortDir}&categories=${catsParam}&tags=${tagsParam}`);
      const json = await res.json();
      
      if (!json.success || !Array.isArray(json.data)) {
        alert(json.error || '대장 데이터를 가져오지 못했습니다.');
        setIsExportingExcel(false);
        return;
      }

      const allItems = json.data;

      // SheetJS 동적 임포트
      const XLSX = await import('xlsx');

      const headers = [
        '품목구분',
        '품목코드',
        '바코드',
        '카테고리',
        '품목명',
        '태그',
        '규격',
        '단위',
        '입수량',
        '적재 위치',
        '현재고',
        '안전재고',
        '구매단가',
        '평가 가치액',
        '상세 설명'
      ];

      const rows = allItems.map((item: any) => {
        const displayBarcode = item.barcode && item.barcode !== '-' && item.barcode !== 'null' ? item.barcode : '';
        const code = `INV-${item.id}`;
        const valuation = calculateValuation(item, logs, valuationMethod);
        const isProd = item.type === 'product' || (item.type as string) === '완제품' || (item.type as string) === '제품';
        const basePrice = isProd ? (item.purchasePrice || 0) : item.price;
        const displayPrice = valuation.unitPrice > 0 ? valuation.unitPrice : basePrice;

        return {
          '품목구분': item.type === 'product' ? '완제품' : '원부자재',
          '품목코드': code,
          '바코드': displayBarcode,
          '카테고리': item.category || '미분류',
          '품목명': item.name,
          '태그': item.tags || '',
          '규격': item.spec || '-',
          '단위': item.unitValue || '개',
          '입수량': item.boxContains ? `${item.boxContains}개입` : '-',
          '적재 위치': item.location || '위치 미지정',
          '현재고': item.stock,
          '안전재고': item.safeStock,
          '구매단가': displayPrice,
          '평가 가치액': valuation.totalValue,
          '상세 설명': item.description || ''
        };
      });

      const aoaData: any[][] = [headers];
      rows.forEach((row) => {
        const rowData = headers.map((header) => row[header as keyof typeof row] ?? '');
        aoaData.push(rowData);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      const tabName = activeTab === 'product' ? '완제품 대장' : activeTab === 'material' ? '원부자재 대장' : '전체 대장';
      XLSX.utils.book_append_sheet(workbook, worksheet, tabName);

      const filename = `실시간_재고자산_대장_${activeTab === 'product' ? '완제품' : '원부자재'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error('엑셀 내보내기 에러:', err);
      alert('엑셀 파일을 내보내는 중 에러가 발생했습니다.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // 입출고 및 조정 등록 처리
  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.itemId) {
      alert('품목을 선택해 주세요.');
      return;
    }
    try {
      const res = await apiFetch('/api/inventory/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: Number(txForm.itemId),
          changeType: txType,
          quantity: Number(txForm.quantity),
          price: Number(txForm.price),
          operator: txForm.operator,
          note: txForm.note
        })
      });
      const data = await res.json();

      if (data.success) {
        setIsTxModalOpen(false);
        resetTxForm();
        fetchData();
      } else {
        alert(data.error || '등록 실패');
      }
    } catch (error) {
      console.error('거래 등록 오류:', error);
    }
  };

  // 폼 리셋
  const resetItemForm = () => {
    setItemForm({
      type: activeTab === 'deadstock' ? 'material' : activeTab,
      name: '',
      category: '',
      price: '',
      purchasePrice: '',
      partner: '',
      stock: '',
      safeStock: '',
      location: '',
      barcode: '',
      description: '',
      spec: '',
      unitType: 'count',
      unitValue: '개',
      boxContains: ''
    });
    setSelectedTags([]);
  };

  const resetTxForm = () => {
    setTxForm({
      itemId: '',
      quantity: '',
      price: '',
      operator: '홍길동 과장',
      note: ''
    });
  };

  // 품목 신규 추가 클릭 시 모달 열기
  const openNewItemModal = () => {
    setSelectedItem(null);
    setItemForm({
      type: activeTab === 'deadstock' ? 'material' : activeTab,
      name: '',
      category: '',
      price: '',
      partner: '',
      stock: '0',
      safeStock: '10',
      location: '',
      barcode: '',
      description: '',
      spec: '',
      unitType: 'count',
      unitValue: '개',
      boxContains: ''
    });
    setSelectedTags(activeTab === 'product' ? ['판매중'] : ['사용중']);
    setIsItemModalOpen(true);
  };

  // 품목 수정 클릭 시 모달 열기
  const openEditItemModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemForm({
      type: item.type,
      name: item.name,
      category: item.category,
      price: String(item.price),
      purchasePrice: item.purchasePrice ? String(item.purchasePrice) : '',
      partner: item.partner || '',
      stock: String(item.stock),
      safeStock: String(item.safeStock),
      location: item.location || '',
      barcode: item.barcode || '',
      description: item.description || '',
      spec: item.spec || '',
      unitType: item.unitType || 'count',
      unitValue: item.unitValue || '개',
      boxContains: item.boxContains || ''
    });
    setSelectedTags(item.tags ? item.tags.split(',') : []);
    setIsItemModalOpen(true);
  };

  // 원클릭 입출고/조정 모달 열기
  const openTxModal = (type: 'in' | 'out' | 'adjust', item?: InventoryItem) => {
    setTxType(type);
    resetTxForm();
    if (item) {
      setTxForm({
        itemId: String(item.id),
        quantity: '',
        price: String(item.price),
        operator: '홍길동 과장',
        note: ''
      });
    }
    setIsTxModalOpen(true);
  };

  // 🔥 [AI 기능 2] AI 음성 및 자연어 출고 명령 분석기
  const triggerAiVoiceAnalysis = (textToAnalyze?: string) => {
    const rawText = textToAnalyze || voiceText;
    if (!rawText.trim()) {
      alert('음성 인식 텍스트 또는 자연어 명령을 입력하거나 프리셋을 선택해 주세요.');
      return;
    }

    setAiVoiceLoading(true);
    setAiVoiceSuccess(false);

    // 0.8초 고속 지능형 자연어 구문 분석 NLP 시뮬레이션
    setTimeout(() => {
      const matchedPreset = (voicePresets || []).find(p => p && p.parsed && (rawText.includes(p.parsed.itemName) || p.text === rawText));
      
      let parsedResult = {
        itemName: '써모글로우 텀블러',
        quantity: '5',
        price: '8700',
        note: '자연어 분석 즉시 출고'
      };

      if (matchedPreset) {
        parsedResult = matchedPreset.parsed;
      } else {
        const numMatch = rawText.match(/(\d+)개/);
        const qty = numMatch ? numMatch[1] : '1';
        
        const foundItem = items.find(it => rawText.includes(it.name));
        parsedResult = {
          itemName: foundItem ? foundItem.name : (items[0]?.name || '등록된 품목 없음'),
          quantity: qty,
          price: foundItem ? String(foundItem.price) : '0',
          note: rawText
        };
      }

      const dbItem = items.find(it => it.name.trim() === parsedResult.itemName.trim());
      
      setAiVoiceLoading(false);
      setAiVoiceSuccess(true);

      if (dbItem) {
        setTxForm({
          itemId: String(dbItem.id),
          quantity: parsedResult.quantity,
          price: parsedResult.price,
          operator: '홍길동 과장 (음성 자동)',
          note: parsedResult.note
        });

        // 입력 필드 강조 활성화
        setHighlightFields({ itemId: true, quantity: true, note: true });
        setTimeout(() => {
          setHighlightFields({});
        }, 1500);

        // 출고 모달 즉시 실행
        setTxType('out');
        setIsTxModalOpen(true);
      } else {
        alert(`분석 완료: '${parsedResult.itemName}' 품목이 현재 재고 시스템에 등록되어 있지 않습니다. 신규 품목 등록 후 출고해 주세요.`);
      }
    }, 800);
  };

  // 모의 마이크 녹음 시뮬레이터
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      const fallbackPreset = { id: 999, text: "써모글로우 텀블러 5개 출고하고 VIP 발송이라고 메모해줘" };
      const randomPreset = voicePresets && voicePresets.length > 0 
        ? voicePresets[Math.floor(Math.random() * voicePresets.length)]
        : fallbackPreset;
      setVoiceText(randomPreset.text);
      setSelectedVoicePreset(randomPreset.id);
    } else {
      setIsRecording(true);
      setVoiceText('음성을 분석하는 중...');
      setSelectedVoicePreset(null);
      setAiVoiceSuccess(false);
    }
  };

  // ⚡ 대시보드 요약 카드는 페이징된 10개 기준이 아닌 DB 전체 누적 통계(dbStats)를 바인딩합니다.
  const totalMaterialStock = dbStats.totalMaterialStock;
  const totalProductStock = dbStats.totalProductStock;
  const totalMaterialValue = dbStats.totalMaterialValue;
  const totalProductValue = dbStats.totalProductValue;
  const outOfStockCount = dbStats.outOfStockCount;

  const currentMonthLogs = logs.filter(log => {
    const logDate = new Date(log.createdAt);
    const now = new Date();
    return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
  });
  const monthlyTxCount = currentMonthLogs.length;

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 text-slate-800" data-easybot-hint="재고 관리 AI: 품목별 현재고 관리, 안전 재고 임계값 설정 및 출고 리스크를 모니터링합니다.">
      
      {/* 상단 타이틀 헤더 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-200 relative z-10 shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center">
            <Package className="w-8 h-8 text-indigo-600 mr-3" />
            재고 관리 AI
          </h1>
        </div>

        <div className="flex gap-3 flex-wrap relative z-10">
          <button 
            onClick={() => setIsScanModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-3 rounded-xl border border-indigo-500 active:scale-95 transition-all flex items-center space-x-2 shadow-lg shadow-indigo-950/10 cursor-pointer"
          >
            <Sliders className="w-4.5 h-4.5 text-indigo-200 animate-pulse" />
            <span>바코드스캔 입출고</span>
          </button>

          <button
            onClick={() => setIsInboundExcelModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-3 rounded-xl border border-indigo-500 active:scale-95 transition-all flex items-center space-x-2 shadow-lg shadow-indigo-950/10 cursor-pointer"
          >
            <FileText className="w-4.5 h-4.5 text-indigo-200" />
            <span>입고등록(엑셀)</span>
          </button>

          <button 
            onClick={openNewItemModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-3 rounded-xl border border-indigo-500 active:scale-95 transition-all flex items-center space-x-2 shadow-lg shadow-indigo-950/10 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5 text-indigo-200" />
            <span>품목등록(건별)</span>
          </button>

          <label className={`bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-3 rounded-xl border border-indigo-500 active:scale-95 transition-all flex items-center space-x-2 shadow-lg shadow-indigo-950/10 ${isUploadingExcel ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
            {isUploadingExcel ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>업로드 중...</span>
              </>
            ) : (
              <>
                <FileText className="w-4.5 h-4.5 text-indigo-200" />
                <span>품목등록(엑셀)</span>
              </>
            )}
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              onChange={handleExcelUpload}
              disabled={isUploadingExcel}
            />
          </label>

          <button 
            onClick={downloadExcelTemplate}
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-3 rounded-xl border border-slate-250 active:scale-95 transition-all flex items-center space-x-2 shadow-sm cursor-pointer"
            title="표준 엑셀 샘플 서식 (.xlsx) 다운로드"
          >
            <Download className="w-4.5 h-4.5 text-slate-500" />
            <span>품목등록용 엑셀</span>
          </button>

          <button 
            onClick={() => openTxModal('in')}
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-3 rounded-xl border border-slate-250 active:scale-95 transition-all flex items-center space-x-2 shadow-sm cursor-pointer"
          >
            <ArrowRightLeft className="w-4.5 h-4.5 text-slate-500" />
            <span>실사조정</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">

        {/* 📊 재고 자산 평가 방법 선택 Glassmorphic 어드민 패널 */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-650 rounded-xl">
              <Sliders className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                📊 재고 자산 평가 방법 선택 <span className="text-[10px] font-normal text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">실시간 회계 역추적</span>
              </h4>
              <p className="text-xs text-slate-400">입출고 이력(Batch) 데이터를 수학적으로 계산하여 자산 가치를 실시간 역추적합니다.</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setValuationMethod('moving_average')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                valuationMethod === 'moving_average'
                  ? 'bg-white text-indigo-650 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              이동평균법
            </button>
            <button
              onClick={() => setValuationMethod('fifo')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                valuationMethod === 'fifo'
                  ? 'bg-white text-indigo-650 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              선입선출법 (FIFO)
            </button>
            <button
              onClick={() => setValuationMethod('lifo')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                valuationMethod === 'lifo'
                  ? 'bg-white text-indigo-650 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              후입선출법 (LIFO)
            </button>
          </div>
        </div>

        {/* 1. 상단 물류 요약 대시보드 카드 4종 */}
        <InventoryStats
          totalMaterialStock={totalMaterialStock}
          totalMaterialValue={totalMaterialValue}
          totalProductStock={totalProductStock}
          totalProductValue={totalProductValue}
          outOfStockCount={outOfStockCount}
          monthlyTxCount={monthlyTxCount}
          materialCount={materialCount}
          productCount={productCount}
        />

        {/* 2. 🔥 AI 인공지능 샌드박스 터미널 (비전 & 음성/자연어 2개 기둥) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AiVisionTerminal
            aiVisionLoading={aiVisionLoading}
            scanningLine={scanningLine}
            onOpenItemModal={() => setIsItemModalOpen(true)}
            onFileSelect={handleOcrFileSelect}
          />

          <AiVoiceTerminal
            voiceText={voiceText}
            setVoiceText={setVoiceText}
            selectedVoicePreset={selectedVoicePreset}
            setSelectedVoicePreset={setSelectedVoicePreset}
            isRecording={isRecording}
            aiVoiceLoading={aiVoiceLoading}
            aiVoiceSuccess={aiVoiceSuccess}
            onVoiceAnalysisTrigger={triggerAiVoiceAnalysis}
            onToggleRecording={toggleRecording}
            onResetSuccess={() => setAiVoiceSuccess(false)}
          />
        </div>

        {/* 3. 메인 콘텐츠 영역: 탭 및 재고 품목 목록 테이블 또는 불용자재 AI 관제 화면 */}
        {activeTab === 'deadstock' ? (
          <DeadstockControl 
            items={items}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            lastActiveTab={lastActiveTab}
          />
        ) : (
          <InventoryTable
            items={items}
            logs={logs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            loading={loading}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            valuationMethod={valuationMethod}
            onOpenTxModal={openTxModal}
            onOpenEditItemModal={openEditItemModal}
            onOpenLabelPrintModal={(item) => { setSelectedPrintItem(item); setIsLabelPrintModalOpen(true); }}
            onDeleteItem={handleItemDelete}
            inbounds={inbounds}
            onOpenInboundDetail={openInboundDetail}
            totalItemsCount={totalItems}
            materialCount={materialCount}
            productCount={productCount}
            sortKey={sortKey}
            setSortKey={setSortKey}
            sortDir={sortDir}
            setSortDir={setSortDir}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            dbCategories={dbCategories}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            dbTags={dbTags}
            onExportExcel={exportInventoryToExcel}
            isExportingExcel={isExportingExcel}
          />
        )}

        {/* 4. 하단 입출고 변동 로그 히스토리 테이블 */}
        <InventoryLogTable logs={logs} />

      </div>

      {/* 5. 신규 품목 등록 & 정보 수정 모달 */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => { setIsItemModalOpen(false); resetItemForm(); }}
        selectedItem={selectedItem}
        itemForm={itemForm}
        setItemForm={setItemForm}
        onSubmit={handleItemSubmit}
        globalTags={globalTags}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        newTagInput={newTagInput}
        setNewTagInput={setNewTagInput}
        onAddGlobalTag={addGlobalTag}
        onRemoveGlobalTag={removeGlobalTag}
      />

      {/* 6. 입고 / 출고 / 실사 조정 통합 모달 */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => { setIsTxModalOpen(false); resetTxForm(); }}
        txType={txType}
        txForm={txForm}
        setTxForm={setTxForm}
        items={items}
        onSubmit={handleTxSubmit}
        highlightFields={highlightFields}
        commonTags={dbTags}
        autocompleteData={autocompleteData}
      />

      {/* 7. 하드웨어 바코드 리더기 퀵 스캔 수불 모달 */}
      <BarcodeScanModal
        isOpen={isScanModalOpen}
        onClose={() => { setIsScanModalOpen(false); setScanLogs([]); }}
        scanMode={scanMode}
        setScanMode={setScanMode}
        scanLogs={scanLogs}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* 8. 엑셀 업로드 서식 도움말 모달 */}
      <ExcelGuideModal
        isOpen={showExcelGuideModal}
        onClose={() => setShowExcelGuideModal(false)}
        onDownloadTemplate={downloadExcelTemplate}
      />

      {/* 9. 바코드 라벨 프린터용 인쇄 및 동적 생성 모달 */}
      <BarcodePrintModal
        isOpen={isLabelPrintModalOpen}
        onClose={() => { setIsLabelPrintModalOpen(false); setSelectedPrintItem(null); }}
        selectedPrintItem={selectedPrintItem}
      />



      <InboundExcelModal
        isOpen={isInboundExcelModalOpen}
        onClose={() => setIsInboundExcelModalOpen(false)}
        onSuccess={(msg) => {
          alert(msg);
          fetchData();
        }}
      />

      <InboundOcrModal
        isOpen={isInboundOcrModalOpen}
        onClose={() => { setIsInboundOcrModalOpen(false); setInboundOcrFile(null); }}
        onSuccess={fetchData}
        initialFile={inboundOcrFile}
      />
    </div>
  );
}
