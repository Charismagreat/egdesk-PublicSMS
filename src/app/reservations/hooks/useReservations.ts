"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { Reservation, ReservationForm } from "../types";

export function useReservations() {
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [data, setData] = useState<Reservation[]>([]);
  const [form, setForm] = useState<ReservationForm>({
    customerName: "",
    customerPhone: "",
    serviceName: "",
    reservationDate: "",
    reservationTime: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);

  // 검색어 입력 시 페이지 번호 초기화
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await apiFetch("/api/reservations");
      const json = await res.json();
      if (json.success) {
        setData(json.reservations || []);
      }
    } catch (e) {
      console.error("예약 목록 조회 에러:", e);
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
          const XLSX = await import("xlsx");
          const workbook = XLSX.read(dataVal, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (rawRows.length === 0) {
            alert("엑셀 시트에 데이터가 존재하지 않습니다.");
            setIsUploadingExcel(false);
            return;
          }

          const mappedReservations = rawRows.map((row: any) => {
            const customerNameVal = row["고객명"] || row["고객"] || row["이름"] || row["customerName"] || row["name"] || "";
            const customerPhoneVal = row["연락처"] || row["전화번호"] || row["휴대폰"] || row["전화"] || row["phone"] || row["customerPhone"] || "";
            const serviceNameVal = row["예약서비스"] || row["예약 서비스"] || row["서비스"] || row["서비스명"] || row["serviceName"] || "";
            const reservationDateVal = row["예약일자"] || row["예약일"] || row["날짜"] || row["reservationDate"] || row["date"] || "";
            const reservationTimeVal = row["예약시간"] || row["예약 시간"] || row["시간"] || row["reservationTime"] || row["time"] || "";
            const amountVal = row["금액"] || row["예약금"] || row["가격"] || row["amount"] || row["price"] || "";

            return {
              customerName: customerNameVal,
              customerPhone: customerPhoneVal,
              serviceName: serviceNameVal,
              reservationDate: reservationDateVal,
              reservationTime: reservationTimeVal,
              amount: amountVal
            };
          }).filter(r => r.customerName && r.customerPhone && r.serviceName);

          if (mappedReservations.length === 0) {
            alert("필수 정보인 [고객명, 연락처, 예약서비스]가 모두 기재된 유효한 행을 찾을 수 없습니다.");
            setIsUploadingExcel(false);
            return;
          }

          const resUpload = await apiFetch("/api/reservations/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reservations: mappedReservations })
          });
          const jsonUpload = await resUpload.json();

          if (jsonUpload.success) {
            alert(`🎉 엑셀 일괄 등록 완료!\n수신 데이터: ${jsonUpload.totalReceived}개 중 ${jsonUpload.count}개의 예약이 성공적으로 등록되었습니다.\n(예약 내역 생성, 결제대기 거래처 연동, 알림톡 스케줄링이 자동 완료되었습니다.)`);
            fetchData();
          } else {
            alert("일괄 등록 실패: " + (jsonUpload.error || "알 수 없는 오류"));
          }
        } catch (err: any) {
          console.error(err);
          alert("엑셀 파일 파싱 중 오류가 발생했습니다. 서식을 확인해 주세요.");
        } finally {
          setIsUploadingExcel(false);
          e.target.value = "";
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (eErr) {
      console.error(eErr);
      alert("파일 읽기 오류");
      setIsUploadingExcel(false);
    }
  };

  // 📄 표준 샘플 양식 다운로드 핸들러
  const handleDownloadSample = async () => {
    try {
      const XLSX = await import("xlsx");

      const headers = ["고객명", "연락처", "예약서비스", "예약일자", "예약시간", "금액"];
      const mockRows = [
        {
          "고객명": "홍길동",
          "연락처": "010-1234-5678",
          "예약서비스": "프리미엄 1:1 퍼스널 트레이닝 10회",
          "예약일자": "2026-06-01",
          "예약시간": "14:00",
          "금액": "550000"
        },
        {
          "고객명": "김영희",
          "연락처": "010-9876-5432",
          "예약서비스": "모발 두피 케어 스페셜 코스",
          "예약일자": "2026-06-02",
          "예약시간": "10:30",
          "금액": "98000"
        }
      ];

      const aoaData = [headers];
      mockRows.forEach((row) => {
        const rowData = headers.map((header) => row[header as keyof typeof row] ?? "");
        aoaData.push(rowData);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "예약일괄등록_샘플서식");

      XLSX.writeFile(workbook, "이지데스크_예약일괄등록_샘플양식.xlsx");
    } catch (err) {
      console.error("샘플 양식 다운로드 에러:", err);
      alert("템플릿 파일 생성에 실패했습니다.");
    }
  };

  const filteredData = data.filter(t => {
    const query = searchQuery.toLowerCase();
    return (
      (t.customer_name && t.customer_name.toLowerCase().includes(query)) ||
      (t.customer_phone && t.customer_phone.toLowerCase().includes(query)) ||
      (t.service_name && t.service_name.toLowerCase().includes(query))
    );
  });

  // 페이지네이션 슬라이싱 로직
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const addData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.serviceName) {
      alert("필수 입력 누락");
      return;
    }
    try {
      const res = await apiFetch("/api/reservations", {
        method: "POST",
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (json.success) {
        setForm({
          customerName: "",
          customerPhone: "",
          serviceName: "",
          reservationDate: "",
          reservationTime: ""
        });
        fetchData();
      }
    } catch (err) {
      console.error("예약 추가 실패:", err);
    }
  };

  const deleteData = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    try {
      const res = await apiFetch("/api/reservations?id=" + id, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchData();
      }
    } catch (err) {
      console.error("예약 삭제 실패:", err);
    }
  };

  return {
    activeOrderId,
    setActiveOrderId,
    data,
    form,
    setForm,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    isUploadingExcel,
    filteredData,
    totalPages,
    startIndex,
    endIndex,
    paginatedData,
    handleExcelUpload,
    handleDownloadSample,
    addData,
    deleteData
  };
}
