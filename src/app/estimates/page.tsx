"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";

// 분리한 타입 및 모달 컴포넌트 가져오기
import { Estimate, PurchaseOrder, SalesOrder, Partner } from "./types";
import EstimateDetailModal from "./components/EstimateDetailModal";
import EstimateOcrModal from "./components/EstimateOcrModal";
import InboundInspectModal from "./components/InboundInspectModal";
import EstimateWriteModal from "./components/EstimateWriteModal";
import SalesOrderOcrModal from "./components/SalesOrderOcrModal";
import InboundStatementOcrModal from "./components/InboundStatementOcrModal";
import ProcessingOverlay from "../../components/ProcessingOverlay";

// 신설한 격리 하위 컴포넌트 가져오기
import EstimatesHeader from "./components/EstimatesHeader";
import InboundHub from "./components/InboundHub";
import OutboundHub from "./components/OutboundHub";

export default function EstimatesDashboard() {
  const [activeTab, setActiveTab, isActiveTabRestored] = usePersistedState<"inbound" | "outbound">("egdesk_estimates_activeTab", "inbound");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // 데이터 리스트 상태
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);

  // 유저 권한 세션 상태
  const [userRole, setUserRole] = useState<string>("SUB_OPERATOR");
  const [dbTags, setDbTags] = useState<any[]>([]);

  // 모달 제어 상태
  const [isDetailModalOpen, setIsDetailModalOpen, isDetailModalOpenRestored] = usePersistedState("egdesk_estimates_isDetailModalOpen", false);
  const [selectedEstimateId, setSelectedEstimateId, isSelectedEstimateIdRestored] = usePersistedState<string | null>("egdesk_estimates_selectedEstimateId", null);

  // 모든 세션 상태 복원이 완료되었는지 감시하는 플래그
  const isRestored = isActiveTabRestored && isDetailModalOpenRestored && isSelectedEstimateIdRestored;

  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [inspectPo, setInspectPo] = useState<PurchaseOrder | null>(null);

  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isSoOcrOpen, setIsSoOcrOpen] = useState(false);
  const [isInboundStatementOcrOpen, setIsInboundStatementOcrOpen] = useState(false);

  // 📂 태그 프리셋 로드
  useEffect(() => {
    apiFetch("/api/expenses/tags")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setDbTags(json.tags || []);
        }
      })
      .catch((e) => console.error("태그 로드 에러:", e));
  }, []);

  // 유저 세션 로드
  const fetchUserRole = async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.role) {
        setUserRole(data.role);
      }
    } catch (e) {
      console.error("사용자 권한 세션 패치 실패", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. 견적 목록 패치
      const estRes = await apiFetch("/api/estimates?action=list");
      const estData = await estRes.json();
      if (estData.success) setEstimates(estData.estimates || []);

      // 2. 발주서 목록 패치
      let poData = null;
      try {
        const poRes = await apiFetch("/api/estimates/process?action=po_list").catch(() => null);
        if (poRes && poRes.ok) {
          poData = await poRes.json();
        }
      } catch (err) {
        console.error("발주서 목록 파싱 에러:", err);
      }

      if (poData && poData.success) {
        setPurchaseOrders(poData.purchaseOrders || []);
      } else {
        setPurchaseOrders([]);
      }

      // 3. 수주서 목록 패치
      let soData = null;
      try {
        const soRes = await apiFetch("/api/estimates/process?action=so_list").catch(() => null);
        if (soRes && soRes.ok) {
          soData = await soRes.json();
        }
      } catch (err) {
        console.error("수주서 목록 파싱 에러:", err);
      }

      if (soData && soData.success) {
        setSalesOrders(soData.salesOrders || []);
      } else {
        setSalesOrders([]);
      }

      // 4. 거래처 목록 패치
      let ptData = null;
      try {
        const ptRes = await apiFetch("/api/partners").catch(() => null);
        if (ptRes && ptRes.ok) {
          ptData = await ptRes.json();
        }
      } catch (err) {
        console.error("거래처 목록 파싱 에러:", err);
      }
      if (ptData && ptData.success) {
        setPartners(ptData.partners || []);
      }
    } catch (e) {
      console.error("데이터 조회 실패", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRestored) {
      fetchData();
      fetchUserRole();
    }
  }, [isRestored]);

  useEffect(() => {

    // 이지봇 연동을 통한 상세 모달 자동 팝업 처리 (마운트 시점 감지)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const detailId = params.get("detail_id");
      if (detailId) {
        setSelectedEstimateId(detailId);
        setIsDetailModalOpen(true);

        // 중복 팝업 및 리로드 방지를 위해 클린업
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }

      // 이미 마운트된 상태에서 전송되는 커스텀 이벤트 감지 리스너 등록
      const handleOpenDetailEvent = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail && customEvent.detail.estimateId) {
          setSelectedEstimateId(customEvent.detail.estimateId);
          setIsDetailModalOpen(true);
          
          // 클린업
          const newUrl = window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        }
      };

      window.addEventListener('open-estimate-detail', handleOpenDetailEvent);
      return () => {
        window.removeEventListener('open-estimate-detail', handleOpenDetailEvent);
      };
    }
  }, []);

  // 인라인 태그 저장 실행
  const handleUpdateEstimateTags = async (estId: string, tagsValue: string) => {
    try {
      const res = await apiFetch("/api/estimates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateId: estId,
          tags: tagsValue,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || "비고 수정에 실패했습니다.");
      }
    } catch (e) {
      alert("오류가 발생했습니다.");
    }
  };

  // 상세 모달 호출
  const handleOpenDetailModal = (estimateId: string) => {
    setSelectedEstimateId(estimateId);
    setIsDetailModalOpen(true);
  };

  // 발주서 전환
  const handleConvertToPo = async (est: Estimate) => {
    if (!confirm(`${est.partner_name}의 견적서를 발주서로 자동 전환하시겠습니까?`)) return;
    try {
      const res = await apiFetch("/api/estimates/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_purchase_order",
          estimateId: est.id,
          partner_name: est.partner_name,
          partner_phone: est.partner_phone,
          total_amount: est.total_amount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        alert(`발주서(번호: ${data.poId}) 생성이 완료되었습니다. 거래처 문자로 발송 완료!`);
      }
    } catch (e) {
      alert("전환 실패");
    }
  };

  // 수주 전환
  const handleConvertToSo = async (est: Estimate) => {
    const salesOrderNumber = prompt(
      `${est.partner_name} 바이어의 견적 수락에 따라 수주로 전환하시겠습니까?\n바이어의 수주(발주)번호가 있다면 입력해주세요 (생략 시 자동 생성됩니다):`
    );
    if (salesOrderNumber === null) return; // 취소 누를 시 중단

    const todayStr = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const orderDate = prompt(
      `발주서상에 기재된 수주일자를 입력해주세요 (형식: YYYY-MM-DD, 기본값: 오늘):`,
      todayStr
    );
    if (orderDate === null) return; // 취소 누를 시 중단

    try {
      const res = await apiFetch("/api/estimates/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_sales_order",
          estimateId: est.id,
          partner_name: est.partner_name,
          partner_phone: est.partner_phone,
          total_amount: est.total_amount,
          sales_order_number: salesOrderNumber.trim() || undefined,
          order_date: orderDate.trim() || todayStr,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        alert(`수주 번호 ${data.soId} 로 대장에 자동 등록되었습니다. 수주 관리 탭에서 확인하세요!`);
      }
    } catch (e) {
      alert("수주 전환 실패");
    }
  };

  // 수주 확정
  const handleConfirmSalesOrder = async (so: SalesOrder) => {
    try {
      const res = await apiFetch("/api/estimates/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_sales_order",
          orderId: so.id,
          partner_name: so.customer_name,
          partner_phone: so.customer_phone,
          total_amount: so.total_amount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        alert(
          "수주 확정 처리가 최종 승인되었으며, 바이어에게 '수주 확인 영수 서한'이 카카오톡으로 자동 발송되었습니다!"
        );
      }
    } catch (e) {
      alert("수주 확정 처리 실패");
    }
  };

  // 수주 건 삭제
  const handleDeleteSalesOrder = async (so: SalesOrder) => {
    if (!confirm(`수주 번호 ${so.id} 건을 정말로 삭제하시겠습니까?\n이 작업은 데이터를 안전하게 소프트 삭제하며 복구하기 전까지 대장에서 제외됩니다.`)) return;
    try {
      setIsProcessing(true);
      const res = await apiFetch("/api/estimates/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_sales_order",
          orderId: so.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("수주 등록 건이 성공적으로 삭제되었습니다.");
      } else {
        alert(data.error || "삭제에 실패했습니다.");
      }
    } catch (e) {
      alert("삭제 처리 중 에러가 발생했습니다.");
    } finally {
      fetchData();
      setIsProcessing(false);
    }
  };

  // 견적서 삭제
  const handleDeleteEstimate = async (est: Estimate) => {
    if (!confirm(`견적 번호 ${est.id} 건을 정말로 삭제하시겠습니까?\n이 작업은 데이터를 안전하게 소프트 삭제하며 복구하기 전까지 대장에서 제외됩니다.`)) return;
    try {
      setIsProcessing(true);
      const res = await apiFetch(`/api/estimates?estimateId=${est.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("견적서가 성공적으로 삭제되었습니다.");
      } else {
        alert(data.error || "삭제에 실패했습니다.");
      }
    } catch (e) {
      alert("삭제 처리 중 에러가 발생했습니다.");
    } finally {
      fetchData();
      setIsProcessing(false);
    }
  };

  // 발주서 삭제
  const handleDeletePurchaseOrder = async (po: PurchaseOrder) => {
    if (!confirm(`발주 번호 ${po.id} 건을 정말로 삭제하시겠습니까?\n이 작업은 데이터를 안전하게 소프트 삭제하며 복구하기 전까지 대장에서 제외됩니다.`)) return;
    try {
      setIsProcessing(true);
      const res = await apiFetch("/api/estimates/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_purchase_order",
          orderId: po.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("발주 등록 건이 성공적으로 삭제되었습니다.");
      } else {
        alert(data.error || "삭제에 실패했습니다.");
      }
    } catch (e) {
      alert("삭제 처리 중 에러가 발생했습니다.");
    } finally {
      fetchData();
      setIsProcessing(false);
    }
  };

  // 일괄 발주 전환
  const handleBulkConvertToPo = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}건의 견적서를 일괄 발주서로 전환하시겠습니까?`)) return;

    let successCount = 0;
    for (const id of ids) {
      const est = estimates.find((e) => e.id === id);
      if (est && est.direction_status === "REQUESTED") {
        try {
          const res = await apiFetch("/api/estimates/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "create_purchase_order",
              estimateId: est.id,
              partner_name: est.partner_name,
              partner_phone: est.partner_phone,
              total_amount: est.total_amount,
            }),
          });
          const data = await res.json();
          if (data.success) successCount++;
        } catch (e) {
          console.error("일괄 전환 오류:", e);
        }
      }
    }
    fetchData();
    alert(`총 ${successCount}건의 견적서가 성공적으로 발주 전환 및 발송 완료되었습니다.`);
  };

  // 일괄 수주확인서 발송
  const handleBulkConfirmSalesOrder = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}건의 수주에 대해 일괄 수주확인서를 발송하시겠습니까?`)) return;

    let successCount = 0;
    for (const id of ids) {
      const so = salesOrders.find((s) => s.id === id);
      if (so && so.status === "REGISTERED") {
        try {
          const res = await apiFetch("/api/estimates/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "confirm_sales_order",
              orderId: so.id,
              partner_name: so.customer_name,
              partner_phone: so.customer_phone,
              total_amount: so.total_amount,
            }),
          });
          const data = await res.json();
          if (data.success) successCount++;
        } catch (e) {
          console.error("일괄 수주확인 오류:", e);
        }
      }
    }
    fetchData();
    alert(`총 ${successCount}건의 수주확인서 발송 처리가 승인 완료되었습니다.`);
  };

  // 일괄 엑셀 다운로드 (CSV 변환)
  const handleBulkExportExcel = (
    type: "inbound_est" | "inbound_po" | "inbound_statement" | "outbound_est" | "outbound_so",
    selectedIds: Set<string>
  ) => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = "";

    const isStatementEstimate = (tagsStr: string) => {
      if (!tagsStr) return false;
      try {
        const parsed = JSON.parse(tagsStr);
        return parsed && parsed.is_statement === true;
      } catch {
        return false;
      }
    };

    if (type === "inbound_est") {
      const targetIds =
        selectedIds.size > 0
          ? selectedIds
          : new Set(estimates.filter((e) => e.type === "INBOUND" && !isStatementEstimate(e.tags || "")).map((e) => e.id));
      const selected = estimates.filter(
        (e) => e.type === "INBOUND" && !isStatementEstimate(e.tags || "") && targetIds.has(e.id)
      );
      headers = [
        "견적번호", "공급/요청처", "연락처", "담당자명", "총 견적액", "상태", "AI스캔여부", "작성일",
        "첨부파일", "사업자등록증", "연계발주번호", "품목코드", "품목명", "규격", "수량", "단가", "금액", "품목납기일", "상세비고"
      ];
      selected.forEach((e: any) => {
        const estItems = e.items && e.items.length > 0 ? e.items : [{}];
        estItems.forEach((item: any) => {
          rows.push([
            e.id,
            e.partner_name,
            e.partner_phone,
            e.partner_manager || "-",
            e.total_amount,
            e.direction_status === "REQUESTED" ? "견적접수" : "발주완료",
            e.ai_parsed ? "AI OCR" : "수동",
            e.created_at,
            e.file_url || "-",
            e.business_license_url || "-",
            e.purchase_order_number || "-",
            item.item_code || "-",
            item.product_name || "-",
            item.spec || "-",
            item.quantity !== undefined ? item.quantity : "",
            item.unit_price !== undefined ? item.unit_price : "",
            item.amount !== undefined ? item.amount : "",
            item.delivery_date || "-",
            e.document_memo_search || "-"
          ]);
        });
      });
      filename = `받은견적대장_${selectedIds.size > 0 ? "선택출력" : "전체출력"}.csv`;
    } else if (type === "inbound_statement") {
      const targetIds =
        selectedIds.size > 0
          ? selectedIds
          : new Set(estimates.filter((e) => e.type === "INBOUND" && isStatementEstimate(e.tags || "")).map((e) => e.id));
      const selected = estimates.filter(
        (e) => e.type === "INBOUND" && isStatementEstimate(e.tags || "") && targetIds.has(e.id)
      );
      headers = [
        "명세서번호", "공급/요청처", "연락처", "담당자명", "총 명세 금액", "상태", "AI스캔여부", "작성일",
        "첨부파일", "품목코드", "품목명", "규격", "수량", "단가", "금액", "상세비고"
      ];
      selected.forEach((e: any) => {
        const estItems = e.items && e.items.length > 0 ? e.items : [{}];
        estItems.forEach((item: any) => {
          rows.push([
            e.id,
            e.partner_name,
            e.partner_phone,
            e.partner_manager || "-",
            e.total_amount,
            "명세접수",
            e.ai_parsed ? "AI OCR" : "수동",
            e.created_at,
            e.file_url || "-",
            item.item_code || "-",
            item.product_name || "-",
            item.spec || "-",
            item.quantity !== undefined ? item.quantity : "",
            item.unit_price !== undefined ? item.unit_price : "",
            item.amount !== undefined ? item.amount : "",
            e.document_memo_search || "-"
          ]);
        });
      });
      filename = `받은거래명세대장_${selectedIds.size > 0 ? "선택출력" : "전체출력"}.csv`;
    } else if (type === "inbound_po") {
      const targetIds =
        selectedIds.size > 0 ? selectedIds : new Set(purchaseOrders.map((p) => p.id));
      const selected = purchaseOrders.filter((p) => targetIds.has(p.id));
      headers = [
        "발주등록번호/발주번호", "견적번호", "공급처명", "연락처", "총 발주액", "상태", "발주일시",
        "입고완료일시", "품목코드", "품목명", "규격", "수량", "단가", "금액", "품목납기일", "상세비고"
      ];
      selected.forEach((p: any) => {
        const poItems = p.items && p.items.length > 0 ? p.items : [{}];
        poItems.forEach((item: any) => {
          rows.push([
            p.id,
            p.estimate_id,
            p.vendor_name,
            p.vendor_phone,
            p.total_amount,
            p.status === "PENDING_INBOUND" ? "발주완료" : "입고완료",
            p.created_at,
            p.completed_at || "-",
            item.item_code || "-",
            item.product_name || "-",
            item.spec || "-",
            item.quantity !== undefined ? item.quantity : "",
            item.unit_price !== undefined ? item.unit_price : "",
            item.amount !== undefined ? item.amount : "",
            item.delivery_date || "-",
            p.document_memo_search || "-"
          ]);
        });
      });
      filename = `발주대장_${selectedIds.size > 0 ? "선택출력" : "전체출력"}.csv`;
    } else if (type === "outbound_est") {
      const targetIds =
        selectedIds.size > 0
          ? selectedIds
          : new Set(estimates.filter((e) => e.type === "OUTBOUND").map((e) => e.id));
      const selected = estimates.filter(
        (e) => e.type === "OUTBOUND" && targetIds.has(e.id)
      );
      headers = [
        "견적번호", "수신바이어", "연락처", "담당자명", "총 견적액", "상태", "작성일",
        "첨부파일", "연계수주번호", "품목코드", "품목명", "규격", "수량", "단가", "금액", "품목납기일", "상세비고"
      ];
      selected.forEach((e: any) => {
        const estItems = e.items && e.items.length > 0 ? e.items : [{}];
        estItems.forEach((item: any) => {
          rows.push([
            e.id,
            e.partner_name,
            e.partner_phone,
            e.partner_manager || "-",
            e.total_amount,
            e.direction_status === "SENT" ? "견적발송" : "수주수락",
            e.created_at,
            e.file_url || "-",
            e.sales_order_number || "-",
            item.item_code || "-",
            item.product_name || "-",
            item.spec || "-",
            item.quantity !== undefined ? item.quantity : "",
            item.unit_price !== undefined ? item.unit_price : "",
            item.amount !== undefined ? item.amount : "",
            item.delivery_date || "-",
            e.document_memo_search || "-"
          ]);
        });
      });
      filename = `보낸견적대장_${selectedIds.size > 0 ? "선택출력" : "전체출력"}.csv`;
    } else if (type === "outbound_so") {
      const targetIds =
        selectedIds.size > 0 ? selectedIds : new Set(salesOrders.map((s) => s.id));
      const selected = salesOrders.filter((s) => targetIds.has(s.id));
      headers = [
        "수주번호", "견적번호", "고객발주번호", "바이어명", "연락처", "바이어담당자", "총 수주액", "상태", "수주일시",
        "마스터납기일", "품목코드", "품목명", "규격", "수량", "단가", "금액", "품목납기일", "상세비고"
      ];
      selected.forEach((s: any) => {
        const soItems = s.items && s.items.length > 0 ? s.items : [{}];
        soItems.forEach((item: any) => {
          rows.push([
            s.id,
            s.estimate_id,
            s.client_order_no || "-",
            s.customer_name,
            s.customer_phone,
            s.customer_manager || "-",
            s.total_amount,
            s.status === "REGISTERED" ? "수주등록" : "확인완료",
            s.order_date || s.created_at,
            s.delivery_date || "-",
            item.item_code || "-",
            item.product_name || "-",
            item.spec || "-",
            item.quantity !== undefined ? item.quantity : "",
            item.unit_price !== undefined ? item.unit_price : "",
            item.amount !== undefined ? item.amount : "",
            item.delivery_date || "-",
            s.document_memo_search || "-"
          ]);
        });
      });
      filename = `수주대장_${selectedIds.size > 0 ? "선택출력" : "전체출력"}.csv`;
    }

    if (rows.length === 0) {
      alert("출력할 내역이 없습니다.");
      return;
    }

    const csvContent =
      "\ufeff" +
      [
        headers.join(","),
        ...rows.map((r) =>
          r.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 일괄 웹뷰로 보기 (새 탭 오픈)
  const handleBulkExportWebView = (
    type: "inbound_est" | "inbound_po" | "inbound_statement" | "outbound_est" | "outbound_so",
    selectedIds: Set<string>
  ) => {
    if (type === "inbound_statement") {
      window.open(`/estimates/web-view?type=inbound_est&is_statement=true`, "_blank");
    } else {
      window.open(`/estimates/web-view?type=${type}`, "_blank");
    }
  };

  // 실물 검수 모달 호출
  const openInspectModal = (po: PurchaseOrder) => {
    setInspectPo(po);
    setIsInspectModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-16" data-easybot-hint="견적/발주/수주 AI: B2B 기업간 수발주 계약 관리, 단가 마진 계산 및 견적서 기안 관리를 수행합니다.">
      {/* 럭셔리 네온 광원 */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      {/* 헤더 타이틀 패널 */}
      <EstimatesHeader activeTab={activeTab} setActiveTab={setActiveTab} />

      {loading ? (
        <div className="text-center py-24 text-slate-400 font-semibold">데이터를 로드하는 중입니다...</div>
      ) : (
        <>
          {/* 탭 1: Inbound Hub (받은 견적서 ➡️ 발주 ➡️ 검수입고 ➡️ 재고반영) */}
          {activeTab === "inbound" && (
            <InboundHub
              estimates={estimates}
              purchaseOrders={purchaseOrders}
              partners={partners}
              userRole={userRole}
              dbTags={dbTags}
              onOpenDetailModal={handleOpenDetailModal}
              onOpenOcrModal={() => setIsOcrModalOpen(true)}
              onOpenStatementOcrModal={() => setIsInboundStatementOcrOpen(true)}
              onOpenInspectModal={openInspectModal}
              onConvertToPo={handleConvertToPo}
              onBulkConvertToPo={handleBulkConvertToPo}
              onUpdateTags={handleUpdateEstimateTags}
              onBulkExportExcel={handleBulkExportExcel}
              onBulkExportWebView={handleBulkExportWebView}
              onDeleteEstimate={handleDeleteEstimate}
              onDeletePurchaseOrder={handleDeletePurchaseOrder}
            />
          )}

          {/* 탭 2: Outbound Hub (보낸 견적서 ➡️ 수주 등록 ➡️ 수주확인서 발송) */}
          {activeTab === "outbound" && (
            <OutboundHub
              estimates={estimates}
              salesOrders={salesOrders}
              partners={partners}
              onOpenDetailModal={handleOpenDetailModal}
              onOpenWriteModal={() => setIsWriteModalOpen(true)}
              onOpenOcrModal={() => setIsSoOcrOpen(true)}
              onConvertToSo={handleConvertToSo}
              onConfirmSalesOrder={handleConfirmSalesOrder}
              onDeleteSalesOrder={handleDeleteSalesOrder}
              onDeleteEstimate={handleDeleteEstimate}
              onBulkConfirmSalesOrder={handleBulkConfirmSalesOrder}
              onBulkExportExcel={handleBulkExportExcel}
              onBulkExportWebView={handleBulkExportWebView}
            />
          )}
        </>
      )}

      {/* 5개의 독립 모달 컴포넌트 렌더링 */}
      <EstimateDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEstimateId(null);
        }}
        estimateId={selectedEstimateId}
        userRole={userRole}
        onRefresh={fetchData}
      />

      <EstimateOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onSuccess={fetchData}
      />

      <InboundInspectModal
        isOpen={isInspectModalOpen}
        onClose={() => {
          setIsInspectModalOpen(false);
          setInspectPo(null);
        }}
        po={inspectPo}
        onSuccess={fetchData}
      />

      <EstimateWriteModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        partners={partners}
        onSuccess={fetchData}
      />

      <SalesOrderOcrModal
        isOpen={isSoOcrOpen}
        onClose={() => setIsSoOcrOpen(false)}
        onSuccess={fetchData}
      />

      <InboundStatementOcrModal
        isOpen={isInboundStatementOcrOpen}
        onClose={() => setIsInboundStatementOcrOpen(false)}
        onSuccess={fetchData}
      />

      <ProcessingOverlay
        isOpen={isProcessing}
        title="AI 거버넌스 삭제 검증 중"
        message="AI 결재 시스템에서 삭제 대상 데이터의 RAG 무결성 규정 준수 여부를 검증하고 있습니다."
      />
    </div>
  );
}
