"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { usePersistedState } from "@/hooks/usePersistedState";

export interface Customer {
  id: number;
  name: string;
  phone: string;
  tags: string;
}

export interface AdTemplate {
  id: string;
  name: string;
  header: string;
  footer: string;
  optOut: string;
}

export interface MessageTemplate {
  id: number;
  title: string;
  content: string;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  url: string;
}

export interface Transaction {
  id: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  amount: string;
  orderDate: string;
  status: string;
}

const SPAM_KEYWORDS = ["무료", "당일특가", "할인", "http://", "https://", "!!", "지금", "마감", "100%"];

export function useSms() {
  const [message, setMessage, isMessageRestored] = usePersistedState("egdesk_sms_message", "");
  const [isConnected, setIsConnected] = useState(false);
  const [isPairing, setIsPairing] = useState(false);

  // 등록된 문자 발송 기기 리스트 상태
  const [smsDevices, setSmsDevices] = useState<Array<{ phoneNumber: string; name: string; isConnected: boolean; dailyLimit: number; todaySent: number }>>([
    { phoneNumber: "default", name: "기본 스마트폰 기기", isConnected: false, dailyLimit: 150, todaySent: 0 }
  ]);
  const [selectedDeviceId, setSelectedDeviceId, isSelectedDeviceIdRestored] = usePersistedState<string>("egdesk_sms_selectedDeviceId", "default");
  const [newDevicePhone, setNewDevicePhone] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Excel Upload States
  const [targetMode, setTargetMode, isTargetModeRestored] = usePersistedState<'db' | 'excel'>('egdesk_sms_targetMode', 'db');
  const [excelCustomers, setExcelCustomers] = useState<Customer[]>([]);
  const [selectedExcelIds, setSelectedExcelIds] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Anti-Spam States
  const [isAd, setIsAd, isAdRestored] = usePersistedState("egdesk_sms_isAd", false);
  const [adHeader, setAdHeader, isAdHeaderRestored] = usePersistedState("egdesk_sms_adHeader", "(광고) [EGDesk]");
  const [adFooter, setAdFooter, isAdFooterRestored] = usePersistedState("egdesk_sms_adFooter", "무료수신거부:");
  const [optOutPhone, setOptOutPhone, isOptOutPhoneRestored] = usePersistedState("egdesk_sms_optOutPhone", "010-0000-0000");
  const [spamRisk, setSpamRisk] = useState<{ score: number, words: string[] }>({ score: 0, words: [] });
  const [adTemplates, setAdTemplates] = useState<AdTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId, isSelectedTemplateIdRestored] = usePersistedState("egdesk_sms_selectedTemplateId", "");
  
  // Product States
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId, isSelectedProductIdRestored] = usePersistedState("egdesk_sms_selectedProductId", "");
  
  // Transaction States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Message Template States
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  
  // Sending States
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });

  // Test Send States
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testDeviceId, setTestDeviceId] = useState("default");

  // AI States
  const [aiPrompt, setAiPrompt, isAiPromptRestored] = usePersistedState("egdesk_sms_aiPrompt", "");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // DB 연동 고객 검색 및 페이지네이션 상태
  const [dbSearchQuery, setDbSearchQuery, isDbSearchQueryRestored] = usePersistedState('egdesk_sms_dbSearchQuery', '');
  const [dbCurrentPage, setDbCurrentPage, isDbCurrentPageRestored] = usePersistedState('egdesk_sms_dbCurrentPage', 1);
  const [dbItemsPerPage, setDbItemsPerPage, isDbItemsPerPageRestored] = usePersistedState('egdesk_sms_dbItemsPerPage', 10);

  // 엑셀 업로드 고객 검색 및 페이지네이션 상태
  const [excelSearchQuery, setExcelSearchQuery, isExcelSearchQueryRestored] = usePersistedState('egdesk_sms_excelSearchQuery', '');
  const [excelCurrentPage, setExcelCurrentPage, isExcelCurrentPageRestored] = usePersistedState('egdesk_sms_excelCurrentPage', 1);
  const [excelItemsPerPage, setExcelItemsPerPage, isExcelItemsPerPageRestored] = usePersistedState('egdesk_sms_excelItemsPerPage', 10);

  // 모든 세션 상태 복원이 완료되었는지 감시하는 플래그
  const isRestored = isMessageRestored && isSelectedDeviceIdRestored && isTargetModeRestored && isAdRestored && isAdHeaderRestored && isAdFooterRestored && isOptOutPhoneRestored && isSelectedTemplateIdRestored && isSelectedProductIdRestored && isAiPromptRestored && isDbSearchQueryRestored && isDbCurrentPageRestored && isDbItemsPerPageRestored && isExcelSearchQueryRestored && isExcelCurrentPageRestored && isExcelItemsPerPageRestored;

  // 검색어 입력 시 페이지 번호 초기화 (세션 복원 가드 추가)
  useEffect(() => {
    if (isRestored) {
      setDbCurrentPage(1);
    }
  }, [dbSearchQuery, isRestored]);

  useEffect(() => {
    if (isRestored) {
      setExcelCurrentPage(1);
    }
  }, [excelSearchQuery, isRestored]);

  // 발송 대상 모드 변경 시 페이지 번호 초기화 (세션 복원 가드 추가)
  useEffect(() => {
    if (isRestored) {
      setDbCurrentPage(1);
      setExcelCurrentPage(1);
    }
  }, [targetMode, isRestored]);

  // DB 연동 고객 필터링 및 슬라이싱 파생 변수 연산
  const filteredDbCustomers = customers.filter(c => {
    const query = dbSearchQuery.toLowerCase().trim();
    if (!query) return true;
    const nameMatch = c.name?.toLowerCase().includes(query) || false;
    const phoneMatch = c.phone?.toLowerCase().includes(query) || false;
    const tagMatch = c.tags?.toLowerCase().includes(query) || false;
    return nameMatch || phoneMatch || tagMatch;
  });

  const totalDbPages = Math.ceil(filteredDbCustomers.length / dbItemsPerPage);
  const startDbIndex = (dbCurrentPage - 1) * dbItemsPerPage;
  const endDbIndex = startDbIndex + dbItemsPerPage;
  const paginatedDbCustomers = filteredDbCustomers.slice(startDbIndex, endDbIndex);

  // 엑셀 업로드 고객 필터링 및 슬라이싱 파생 변수 연산
  const filteredExcelCustomers = excelCustomers.filter(c => {
    const query = excelSearchQuery.toLowerCase().trim();
    if (!query) return true;
    const nameMatch = c.name?.toLowerCase().includes(query) || false;
    const phoneMatch = c.phone?.toLowerCase().includes(query) || false;
    const tagMatch = c.tags?.toLowerCase().includes(query) || false;
    return nameMatch || phoneMatch || tagMatch;
  });

  const totalExcelPages = Math.ceil(filteredExcelCustomers.length / excelItemsPerPage);
  const startExcelIndex = (excelCurrentPage - 1) * excelItemsPerPage;
  const endExcelIndex = startExcelIndex + excelItemsPerPage;
  const paginatedExcelCustomers = filteredExcelCustomers.slice(startExcelIndex, endExcelIndex);

  // 📱 [AI 멀티채널 확장] 등록된 기기 리스트 DB 로드 및 실시간 연동 체크
  const checkAllDevicesConnection = async (devicesList: typeof smsDevices) => {
    try {
      const connectionStatuses = await Promise.all(
        devicesList.map(async (dev) => {
          try {
            const res = await apiFetch(`/api/sms/status?deviceId=${dev.phoneNumber}`);
            const json = await res.json();
            return {
              phoneNumber: dev.phoneNumber,
              isConnected: json.success && json.isConnected
            };
          } catch (e) {
            return { phoneNumber: dev.phoneNumber, isConnected: false };
          }
        })
      );

      let logs: any[] = [];
      try {
        const logsRes = await apiFetch('/api/message-logs');
        const logsJson = await logsRes.json();
        if (logsJson.success && Array.isArray(logsJson.logs)) {
          logs = logsJson.logs;
        }
      } catch (e) {
        console.error("Failed to fetch message logs:", e);
      }

      const nowKst = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
      const startKst = new Date(nowKst);
      startKst.setUTCHours(0, 0, 0, 0);
      const startUtc = new Date(startKst.getTime() - 9 * 60 * 60 * 1000);
      const startUtcTime = startUtc.getTime();

      const todaySuccessLogs = logs.filter(log => {
        if (log.status !== 'SUCCESS') return false;
        const logTime = new Date(log.created_at).getTime();
        return logTime >= startUtcTime;
      });

      const updated = devicesList.map((dev) => {
        const conn = connectionStatuses.find(c => c.phoneNumber === dev.phoneNumber);
        const devId = dev.phoneNumber;
        const devSentCount = todaySuccessLogs.filter(log => {
          const msg = log.message || '';
          if (devId === 'default') {
            return msg.includes(`[sender_device: default]`) || !msg.includes('[sender_device:');
          }
          return msg.includes(`[sender_device: ${devId}]`);
        }).length;

        return {
          ...dev,
          isConnected: conn ? conn.isConnected : false,
          todaySent: devSentCount,
          dailyLimit: dev.dailyLimit || 150
        };
      });

      setSmsDevices(updated);
      const currentActive = updated.find(d => d.phoneNumber === selectedDeviceId);
      setIsConnected(currentActive ? currentActive.isConnected : false);
    } catch (e) {
      console.error("Failed to check all devices connection:", e);
    }
  };

  const loadDevicesAndStatus = async () => {
    try {
      const res = await apiFetch("/api/settings?key=sms_devices");
      const data = await res.json();
      let currentDevices = [
        { phoneNumber: "default", name: "기본 스마트폰 기기", isConnected: false, dailyLimit: 150, todaySent: 0 }
      ];
      if (data.success && data.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentDevices = parsed;
          }
        } catch (e) {
          console.error("Failed to parse sms devices:", e);
        }
      }
      setSmsDevices(currentDevices);
      await checkAllDevicesConnection(currentDevices);
    } catch (err) {
      console.error("SMS devices load error:", err);
    }
  };

  const handleUpdateDeviceLimit = async (phone: string, limitVal: number) => {
    const updated = smsDevices.map(d => {
      if (d.phoneNumber === phone) {
        return { ...d, dailyLimit: limitVal };
      }
      return d;
    });
    setSmsDevices(updated);

    try {
      await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "sms_devices",
          value: JSON.stringify(updated)
        })
      });
    } catch (e) {
      console.error("Failed to save device limit settings:", e);
    }
  };

  useEffect(() => {
    const currentActive = smsDevices.find(d => d.phoneNumber === selectedDeviceId);
    setIsConnected(currentActive ? currentActive.isConnected : false);
  }, [selectedDeviceId, smsDevices]);

  const fetchMessageTemplates = async () => {
    try {
      const res = await apiFetch('/api/message-templates');
      const json = await res.json();
      if (json.success) {
        setMessageTemplates(json.templates);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await apiFetch('/api/transactions');
      const json = await res.json();
      if (json.success) {
        setTransactions(json.transactions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiFetch('/api/products');
      const json = await res.json();
      if (json.success) {
        setProducts(json.products);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdTemplates = async () => {
    try {
      const res = await apiFetch('/api/ad-templates');
      const json = await res.json();
      if (json.success) {
        setAdTemplates(json.templates);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await apiFetch('/api/customers');
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data.rows || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isRestored) {
      fetchCustomers();
      loadDevicesAndStatus();
      fetchAdTemplates();
      fetchProducts();
      fetchTransactions();
      fetchMessageTemplates();
    }
  }, [isRestored]);

  useEffect(() => {
    const foundWords = SPAM_KEYWORDS.filter(word => message.includes(word));
    setSpamRisk({
      score: foundWords.length,
      words: foundWords
    });
  }, [message]);

  const handleAiGenerate = async () => {
    if (!aiPrompt) return alert("프롬프트를 입력해주세요.");
    
    setIsAiLoading(true);
    setAiError("");
    try {
      const res = await apiFetch('/api/ai-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, customers: targetMode === 'db' ? customers : excelCustomers })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      if (data.targetIds && data.targetIds.length > 0) {
        if (targetMode === 'db') setSelectedIds(new Set(data.targetIds));
        else setSelectedExcelIds(new Set(data.targetIds));
      } else {
        alert("AI가 조건에 맞는 고객을 찾지 못했습니다.");
      }
      
      if (data.messageContent) {
        setMessage(data.messageContent);
      }
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePairing = async (deviceIdToPair: string = selectedDeviceId) => {
    setIsPairing(true);
    try {
      const res = await apiFetch(`/api/sms/setup?deviceId=${deviceIdToPair}`);
      const json = await res.json();
      if (json.message === '연동 성공') {
        alert("Google 메시지 연동이 완료되었습니다.");
        await loadDevicesAndStatus();
      } else {
        alert("연동 실패: " + (json.error || "알 수 없는 오류"));
      }
    } catch (err) {
      alert("서버 연결에 실패했습니다.");
    } finally {
      setIsPairing(false);
    }
  };

  const handleAddDevice = async () => {
    if (!newDevicePhone || !newDeviceName) return alert("기기 명칭과 전화번호를 정확히 입력해 주세요.");
    const cleanPhone = newDevicePhone.replace(/[^0-9]/g, "");
    if (!cleanPhone) return alert("숫자로 된 전화번호를 입력해 주세요.");

    setIsAddingDevice(true);
    const newDevice = {
      phoneNumber: cleanPhone,
      name: newDeviceName,
      isConnected: false,
      dailyLimit: 200,
      todaySent: 0
    };

    const updatedDevices = [...smsDevices, newDevice];
    
    try {
      const saveRes = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "sms_devices",
          value: JSON.stringify(updatedDevices)
        })
      });
      const saveData = await saveRes.json();
      if (saveData.success) {
        setSmsDevices(updatedDevices);
        setSelectedDeviceId(cleanPhone);
        setNewDevicePhone("");
        setNewDeviceName("");
        setShowAddDeviceModal(false);
        alert(`신규 기기 '${newDeviceName}'가 성공적으로 등록되었습니다. 리스트 우측의 연동하기 버튼을 눌러 페어링을 완수해 주세요.`);
        await checkAllDevicesConnection(updatedDevices);
      } else {
        alert("기기 등록 실패: " + saveData.error);
      }
    } catch (e) {
      alert("서버 연결 중 오류가 발생했습니다.");
    } finally {
      setIsAddingDevice(false);
    }
  };

  const handleDeleteDevice = async (phone: string) => {
    if (phone === "default") return alert("기본 기기는 삭제할 수 없습니다.");
    if (!confirm("해당 발송 기기를 시스템에서 분리하시겠습니까?")) return;

    const updatedDevices = smsDevices.filter(d => d.phoneNumber !== phone);
    try {
      const saveRes = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "sms_devices",
          value: JSON.stringify(updatedDevices)
        })
      });
      if ((await saveRes.json()).success) {
        setSmsDevices(updatedDevices);
        if (selectedDeviceId === phone) {
          setSelectedDeviceId("default");
        }
        alert("기기가 성공적으로 분리되었습니다.");
        await checkAllDevicesConnection(updatedDevices);
      }
    } catch (e) {
      alert("기기 분리 중 오류가 발생했습니다.");
    }
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (targetMode === 'db') {
      const newSet = new Set(selectedIds);
      paginatedDbCustomers.forEach(c => {
        if (e.target.checked) newSet.add(c.id);
        else newSet.delete(c.id);
      });
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedExcelIds);
      paginatedExcelCustomers.forEach(c => {
        if (e.target.checked) newSet.add(c.id);
        else newSet.delete(c.id);
      });
      setSelectedExcelIds(newSet);
    }
  };

  const toggleSelect = (id: number) => {
    if (targetMode === 'db') {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedExcelIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedExcelIds(newSet);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const parsedCustomers: Customer[] = data.map((row: any, index) => {
          const name = row['이름'] || row['성명'] || row['name'] || row['Name'] || '';
          const phone = row['연락처'] || row['전화번호'] || row['휴대폰'] || row['phone'] || row['Phone'] || '';
          const tags = row['태그'] || row['메모'] || row['tags'] || row['Tags'] || '엑셀업로드';
          
          return {
            id: -(index + 1),
            name: String(name),
            phone: String(phone),
            tags: String(tags)
          };
        }).filter(c => c.name && c.phone);

        if (parsedCustomers.length === 0) {
          alert("유효한 데이터가 없습니다. '이름', '연락처' 열이 첫 번째 줄(헤더)에 포함되어 있는지 확인해주세요.");
          return;
        }

        setExcelCustomers(parsedCustomers);
        setSelectedExcelIds(new Set(parsedCustomers.map(c => c.id)));
        alert(`${parsedCustomers.length}명의 고객 명단을 성공적으로 불러왔습니다.`);
      } catch (err) {
        alert("엑셀 파일을 읽는 중 오류가 발생했습니다.");
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  const handleDeleteSelectedExcel = () => {
    if (selectedExcelIds.size === 0) return;
    if (!confirm(`선택한 ${selectedExcelIds.size}명의 명단을 삭제하시겠습니까?`)) return;
    
    setExcelCustomers(prev => prev.filter(c => !selectedExcelIds.has(c.id)));
    setSelectedExcelIds(new Set());
  };

  const downloadSampleExcel = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 이름: "홍길동", 연락처: "010-1234-5678", 태그: "VIP" },
      { 이름: "김철수", 연락처: "010-9876-5432", 태그: "단골" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "고객명단");
    XLSX.writeFile(wb, "문자발송_엑셀업로드_양식.xlsx");
  };

  const insertVariable = (variable: string) => {
    setMessage(prev => prev + variable);
  };

  const saveAdTemplate = async () => {
    const name = prompt("현재 헤더/푸터 설정을 저장할 템플릿 이름을 입력하세요:");
    if (!name) return;
    
    const newTemplate = {
      id: Date.now().toString(),
      name,
      header: adHeader,
      footer: adFooter,
      optOut: optOutPhone
    };
    
    try {
      const res = await apiFetch('/api/ad-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      });
      const json = await res.json();
      if (json.success) {
        setAdTemplates([...adTemplates, { ...newTemplate, id: json.id }]);
        alert("템플릿이 DB에 저장되었습니다.");
      } else {
        alert("저장 실패: " + json.error);
      }
    } catch (e) {
      alert("템플릿 저장 중 오류가 발생했습니다.");
    }
  };

  const loadAdTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedTemplateId(id);
    if (!id) return;
    
    const t = adTemplates.find(x => x.id === id);
    if (t) {
      setAdHeader(t.header);
      setAdFooter(t.footer);
      setOptOutPhone(t.optOut);
    }
  };

  const deleteAdTemplate = async () => {
    if (!selectedTemplateId) return;
    if (!confirm("이 템플릿을 DB에서 완전히 삭제하시겠습니까?")) return;
    
    try {
      const res = await apiFetch(`/api/ad-templates?id=${selectedTemplateId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setAdTemplates(adTemplates.filter(t => t.id !== selectedTemplateId));
        setSelectedTemplateId("");
      } else {
        alert("삭제 실패: " + json.error);
      }
    } catch (e) {
      alert("템플릿 삭제 중 오류가 발생했습니다.");
    }
  };

  const saveProduct = async () => {
    const name = prompt("광고할 상품명을 입력하세요 (예: 여름 특가 에어컨):");
    if (!name) return;
    const price = prompt("가격을 입력하세요 (선택사항, 예: 1,500,000원):") || "";
    const url = prompt("랜딩 URL을 입력하세요 (선택사항, 예: https://egdesk.com):") || "";
    
    const newProduct = {
      id: Date.now().toString(),
      name,
      price,
      url
    };
    
    try {
      const res = await apiFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      const json = await res.json();
      if (json.success) {
        setProducts([...products, { ...newProduct, id: json.id }]);
        setSelectedProductId(json.id);
        alert("상품이 등록되었습니다.");
      } else {
        alert("상품 등록 실패: " + json.error);
      }
    } catch (e) {
      alert("상품 등록 중 오류가 발생했습니다.");
    }
  };

  const deleteProduct = async () => {
    if (!selectedProductId) return;
    if (!confirm("이 상품을 DB에서 삭제하시겠습니까?")) return;
    
    try {
      const res = await apiFetch(`/api/products?id=${selectedProductId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setProducts(products.filter(p => p.id !== selectedProductId));
        setSelectedProductId("");
      } else {
        alert("삭제 실패: " + json.error);
      }
    } catch (e) {
      alert("상품 삭제 중 오류가 발생했습니다.");
    }
  };

  const generateFinalMessage = useCallback((baseMessage: string, customer: Customer, isAd: boolean, optOut: string, header: string, footer: string, product?: Product, assignedCouponCode?: string) => {
    let finalMsg = baseMessage.replace(/{이름}/g, customer.name).replace(/{연락처}/g, customer.phone);
    
    if (finalMsg.includes("{최근구매내역}")) {
      const customerTx = transactions.filter(t => t.customerPhone === customer.phone);
      const latestTx = customerTx.length > 0 ? customerTx[0].productName : (customer.tags || "상품");
      finalMsg = finalMsg.replace(/{최근구매내역}/g, latestTx);
    }

    if (assignedCouponCode) {
      finalMsg = finalMsg.replace(/{쿠폰코드}/g, assignedCouponCode);
    } else if (finalMsg.includes("{쿠폰코드}")) {
      finalMsg = finalMsg.replace(/{쿠폰코드}/g, "COUPON-XXXX-XXXX");
    }

    if (product) {
      finalMsg = finalMsg
        .replace(/{상품명}/g, product.name)
        .replace(/{금액}/g, product.price)
        .replace(/{URL}/g, product.url);
    }
    if (isAd) {
      finalMsg = `${header}\n${finalMsg}\n${footer} ${optOut}`;
    }
    return finalMsg;
  }, [transactions]);

  const handleTestSend = async () => {
    if (!isConnected) {
      alert("구글 메시지 앱과 연동되어 있지 않습니다. 우측 상단의 [QR 코드로 연동하기] 버튼을 눌러 연동을 먼저 진행해주세요.");
      return;
    }
    if (!testPhone) {
      alert("테스트 수신 번호를 입력해주세요.");
      return;
    }
    if (!message) {
      alert("메시지를 입력해주세요.");
      return;
    }

    const dummyCustomer = { id: 0, name: "홍길동", phone: testPhone, tags: "테스트" };
    const selectedProduct = products.find(p => p.id === selectedProductId);
    const testCouponCode = message.includes("{쿠폰코드}") ? "TEST-COUPON-1234" : undefined;
    const finalMsg = generateFinalMessage(message, dummyCustomer, isAd, optOutPhone, adHeader, adFooter, selectedProduct, testCouponCode);
    
    setIsSending(true);
    try {
      const res = await apiFetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testPhone,
          message: finalMsg,
          customerId: null,
          deviceId: testDeviceId
        })
      });
      const json = await res.json();
      if (json.success) {
        alert("테스트 발송이 완료되었습니다.");
        setShowTestModal(false);
      } else {
        alert("발송 실패: " + json.error);
      }
    } catch (e) {
      alert("발송 요청 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    if (!isConnected) {
      alert("구글 메시지 앱과 연동되어 있지 않습니다. 우측 상단의 [QR 코드로 연동하기] 버튼을 눌러 연동을 먼저 진행해주세요.");
      return;
    }
    if (targetMode === 'db' && selectedIds.size === 0) {
      alert("발송 대상을 선택해주세요.");
      return;
    }
    if (targetMode === 'excel' && selectedExcelIds.size === 0) {
      alert("발송 대상을 선택해주세요.");
      return;
    }
    if (!message) {
      alert("메시지를 입력해주세요.");
      return;
    }

    const totalTargets = targetMode === 'db' ? selectedIds.size : selectedExcelIds.size;
    let activeCoupons: any[] = [];

    if (message.includes("{쿠폰코드}")) {
      try {
        const res = await apiFetch('/api/coupons');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "쿠폰 목록을 가져올 수 없습니다.");
        
        activeCoupons = (json.coupons || []).filter((c: any) => c.status === 'active');
        
        if (activeCoupons.length < totalTargets) {
          alert(`사용 가능한 활성 쿠폰이 부족하여 발송을 취소합니다.\n\n필요한 쿠폰: ${totalTargets}장\n남은 활성 쿠폰: ${activeCoupons.length}장\n\n쿠폰 관리 페이지에서 쿠폰을 추가로 발급해 주세요.`);
          return;
        }

        if (!confirm(`사용 가능한 활성 쿠폰이 확인되었습니다. (잔여: ${activeCoupons.length}장)\n발송 시 각 고객별로 쿠폰이 1장씩 자동 매핑되어 발송되며, 사용('used') 상태로 즉시 변경됩니다. 발송하시겠습니까?`)) {
          return;
        }
      } catch (error: any) {
        alert("쿠폰 정보를 확인하는 과정에서 오류가 발생했습니다: " + error.message);
        return;
      }
    }

    setIsSending(true);
    setSendProgress({ current: 0, total: totalTargets });

    const selectedCustomers = targetMode === 'db' 
      ? customers.filter(c => selectedIds.has(c.id))
      : excelCustomers.filter(c => selectedExcelIds.has(c.id));
    const selectedProduct = products.find(p => p.id === selectedProductId);

    for (let i = 0; i < selectedCustomers.length; i++) {
      const customer = selectedCustomers[i];
      const assignedCoupon = message.includes("{쿠폰코드}") ? activeCoupons[i] : null;
      const assignedCouponCode = assignedCoupon ? assignedCoupon.code : undefined;

      const finalMsg = generateFinalMessage(message, customer, isAd, optOutPhone, adHeader, adFooter, selectedProduct, assignedCouponCode);
      
      try {
        const sendRes = await apiFetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: customer.phone,
            message: finalMsg,
            customerId: customer.id,
            deviceId: selectedDeviceId
          })
        });
        
        const sendJson = await sendRes.json();
        
        if (sendJson.success && assignedCoupon) {
          await apiFetch('/api/coupons', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: assignedCoupon.id,
              status: 'used'
            })
          });
        }
      } catch (e) {
        console.error("Failed to send to", customer.name, e);
      }

      setSendProgress({ current: i + 1, total: selectedCustomers.length });

      if (i < selectedCustomers.length - 1) {
        const delay = Math.floor(Math.random() * 4000) + 3500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setIsSending(false);
    alert("전체 발송이 완료되었습니다.");
    await loadDevicesAndStatus(); // 발송량 실시간 갱신
  };

  // ⚡ 실시간 문자 바이트 계산 기능 추가 (SMS 80바이트 한글 40자 제한 지원)
  const getByteLength = (str: string) => {
    let byteLength = 0;
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      if (charCode <= 127) {
        byteLength += 1;
      } else {
        byteLength += 2;
      }
    }
    return byteLength;
  };

  const messageBytes = getByteLength(message);
  const messageType = messageBytes <= 80 ? "SMS" : "LMS";

  return {
    message, setMessage,
    messageBytes, messageType,
    isConnected, setIsConnected,
    isPairing, setIsPairing,
    smsDevices, setSmsDevices,
    selectedDeviceId, setSelectedDeviceId,
    newDevicePhone, setNewDevicePhone,
    newDeviceName, setNewDeviceName,
    showAddDeviceModal, setShowAddDeviceModal,
    isAddingDevice, setIsAddingDevice,
    customers, setCustomers,
    selectedIds, setSelectedIds,
    targetMode, setTargetMode,
    excelCustomers, setExcelCustomers,
    selectedExcelIds, setSelectedExcelIds,
    fileInputRef,
    isAd, setIsAd,
    adHeader, setAdHeader,
    adFooter, setAdFooter,
    optOutPhone, setOptOutPhone,
    spamRisk, setSpamRisk,
    adTemplates, setAdTemplates,
    selectedTemplateId, setSelectedTemplateId,
    products, setProducts,
    selectedProductId, setSelectedProductId,
    transactions, setTransactions,
    messageTemplates, setMessageTemplates,
    editingTemplate, setEditingTemplate,
    isSending, setIsSending,
    sendProgress, setSendProgress,
    showTestModal, setShowTestModal,
    testPhone, setTestPhone,
    testDeviceId, setTestDeviceId,
    aiPrompt, setAiPrompt,
    isAiLoading, setIsAiLoading,
    aiError, setAiError,
    dbSearchQuery, setDbSearchQuery,
    dbCurrentPage, setDbCurrentPage,
    dbItemsPerPage, setDbItemsPerPage,
    excelSearchQuery, setExcelSearchQuery,
    excelCurrentPage, setExcelCurrentPage,
    excelItemsPerPage, setExcelItemsPerPage,
    filteredDbCustomers, totalDbPages, startDbIndex, endDbIndex, paginatedDbCustomers,
    filteredExcelCustomers, totalExcelPages, startExcelIndex, endExcelIndex, paginatedExcelCustomers,
    loadDevicesAndStatus,
    checkAllDevicesConnection,
    handleUpdateDeviceLimit,
    fetchMessageTemplates,
    fetchTransactions,
    fetchProducts,
    fetchAdTemplates,
    fetchCustomers,
    handleAiGenerate,
    handlePairing,
    handleAddDevice,
    handleDeleteDevice,
    toggleSelectAll,
    toggleSelect,
    handleExcelUpload,
    handleDeleteSelectedExcel,
    downloadSampleExcel,
    insertVariable,
    saveAdTemplate,
    loadAdTemplate,
    deleteAdTemplate,
    saveProduct,
    deleteProduct,
    generateFinalMessage,
    handleTestSend,
    handleSend
  };
}
