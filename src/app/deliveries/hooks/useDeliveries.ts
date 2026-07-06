"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { Delivery, DeliveryForm } from "../types";
import { usePersistedState } from "@/hooks/usePersistedState";

export function useDeliveries() {
  const [data, setData] = useState<Delivery[]>([]);
  const [form, setForm, isFormRestored] = usePersistedState<DeliveryForm>('egdesk_deliveries_form', { 
    customerName: '', 
    customerPhone: '', 
    address: '', 
    courier: '대한통운', 
    trackingNumber: '' 
  });
  const [activeOrderId, setActiveOrderId, isActiveOrderIdRestored] = usePersistedState<string | null>('egdesk_deliveries_activeOrderId', null);
  const [searchQuery, setSearchQuery, isSearchQueryRestored] = usePersistedState('egdesk_deliveries_searchQuery', '');
  const [currentPage, setCurrentPage, isCurrentPageRestored] = usePersistedState('egdesk_deliveries_currentPage', 1);
  const [itemsPerPage, setItemsPerPage, isItemsPerPageRestored] = usePersistedState('egdesk_deliveries_itemsPerPage', 10);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);

  // 모든 세션 상태 복원이 완료되었는지 감시하는 플래그
  const isRestored = isFormRestored && isActiveOrderIdRestored && isSearchQueryRestored && isCurrentPageRestored && isItemsPerPageRestored;

  // 검색어 입력 시 페이지 번호 초기화 (세션 복원 완료 가드 탑재)
  useEffect(() => {
    if (isRestored) {
      setCurrentPage(1);
    }
  }, [searchQuery, isRestored]);

  useEffect(() => { 
    if (isRestored) {
      fetchData(); 
    }
  }, [isRestored]);

  const fetchData = async () => {
    try {
      const res = await apiFetch('/api/deliveries');
      const json = await res.json();
      if (json.success) setData(json.deliveries || []);
    } catch (e) {
      console.error("배송 데이터 로드 실패:", e);
    }
  };

  // 🕒 엑셀 일괄 업로드 처리 핸들러 (지능형 퍼지 매핑 탑재)
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingExcel(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataVal = event.target?.result;
        if (!dataVal) return;

        try {
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(dataVal, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (rawRows.length === 0) {
            alert('엑셀 시트에 데이터가 존재하지 않습니다.');
            setIsUploadingExcel(false);
            return;
          }

          const mappedDeliveries = rawRows.map((row: any) => {
            const customerNameVal = row['고객명'] || row['고객'] || row['이름'] || row['수령인'] || row['customerName'] || row['name'] || '';
            const customerPhoneVal = row['연락처'] || row['전화번호'] || row['휴대폰'] || row['전화'] || row['phone'] || row['customerPhone'] || '';
            const addressVal = row['배송지 주소'] || row['배송지'] || row['주소'] || row['address'] || '';
            const courierVal = row['택배사'] || row['택배'] || row['courier'] || '대한통운';
            const trackingNumberVal = row['운송장번호'] || row['운송장'] || row['송장번호'] || row['송장'] || row['trackingNumber'] || '';
            const statusVal = row['상태'] || row['배송상태'] || row['status'] || '상품준비중';

            return {
              customerName: customerNameVal,
              customerPhone: customerPhoneVal,
              address: addressVal,
              courier: courierVal,
              trackingNumber: trackingNumberVal,
              status: statusVal
            };
          }).filter(d => d.customerName && d.customerPhone && d.address);

          if (mappedDeliveries.length === 0) {
            alert('필수 정보인 [고객명], [연락처], [배송지 주소]가 모두 기재된 유효한 행을 찾을 수 없습니다.');
            setIsUploadingExcel(false);
            return;
          }

          const resUpload = await apiFetch('/api/deliveries/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deliveries: mappedDeliveries })
          });
          const jsonUpload = await resUpload.json();

          if (jsonUpload.success) {
            alert(`🎉 엑셀 일괄 등록 완료!\n수신 데이터: ${jsonUpload.totalReceived}개 중 ${jsonUpload.count}개의 배송 내역이 성공적으로 등록되었습니다.`);
            fetchData();
          } else {
            alert('일괄 등록 실패: ' + (jsonUpload.error || '알 수 없는 오류'));
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
    } catch (eErr) {
      console.error(eErr);
      alert('파일 읽기 오류');
      setIsUploadingExcel(false);
    }
  };

  // 📄 표준 샘플 양식 다운로드 핸들러
  const handleDownloadSample = async () => {
    try {
      const XLSX = await import('xlsx');

      const headers = ['고객명', '연락처', '배송지 주소', '택배사', '운송장번호'];
      const mockRows = [
        {
          '고객명': '홍길동',
          '연락처': '010-1234-5678',
          '배송지 주소': '서울특별시 강남구 테헤란로 123 이지빌딩 5층',
          '택배사': '우체국',
          '운송장번호': '6543210987654'
        },
        {
          '고객명': '이순신',
          '연락처': '010-9876-5432',
          '배송지 주소': '부산광역시 해운대구 우동 456 센텀아파트 101동 202호',
          '택배사': '대한통운',
          '운송장번호': '123456789012'
        }
      ];

      const aoaData = [headers];
      mockRows.forEach((row) => {
        const rowData = headers.map((header) => row[header as keyof typeof row] ?? '');
        aoaData.push(rowData);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '배송일괄등록_샘플서식');

      XLSX.writeFile(workbook, '이지데스크_배송일괄등록_샘플양식.xlsx');
    } catch (err) {
      console.error('샘플 양식 다운로드 에러:', err);
      alert('템플릿 파일 생성에 실패했습니다.');
    }
  };

  const addData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.address) {
      return alert('필수 입력 누락');
    }
    try {
      const res = await apiFetch('/api/deliveries', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form) 
      });
      const json = await res.json();
      if (json.success) { 
        setForm({
          customerName: '',
          customerPhone: '',
          address: '',
          courier: '대한통운',
          trackingNumber: ''
        }); 
        fetchData(); 
      }
    } catch (eErr) {
      console.error("배송 정보 등록 실패:", eErr);
    }
  };

  const deleteData = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      const res = await apiFetch('/api/deliveries?id=' + id, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) fetchData();
    } catch (eErr) {
      console.error("배송 정보 삭제 실패:", eErr);
    }
  };

  const filteredData = data.filter(t => {
    const query = searchQuery.toLowerCase();
    return (
      (t.customer_name && t.customer_name.toLowerCase().includes(query)) ||
      (t.customer_phone && t.customer_phone.toLowerCase().includes(query)) ||
      (t.address && t.address.toLowerCase().includes(query)) ||
      (t.tracking_number && t.tracking_number.toLowerCase().includes(query))
    );
  });

  // 페이지네이션 슬라이싱 로직
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return {
    data,
    form, setForm,
    activeOrderId, setActiveOrderId,
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    isUploadingExcel,
    handleExcelUpload,
    handleDownloadSample,
    addData,
    deleteData,
    filteredData,
    totalPages,
    startIndex,
    endIndex,
    paginatedData
  };
}
