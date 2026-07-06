"use client";

import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Sun, Moon, Eye, RefreshCw, X, Download, ArrowUp, ArrowDown } from "lucide-react";
import { createPortal } from "react-dom";

// 품목 구분 한글화 헬퍼 함수
const formatItemType = (type: string) => {
  if (!type) return "-";
  const clean = type.trim().toLowerCase();
  if (clean === 'material' || clean === '자재' || clean === '원자재' || clean === '원부자재') {
    return '원부자재';
  }
  if (clean === 'product' || clean === '제품' || clean === '완제품') {
    return '완제품';
  }
  return type;
};

// 규격 포맷팅 헬퍼 함수 (JSON 파싱 및 가공비 처리 지원)
const formatSpec = (specStr: string): string => {
  if (!specStr) return "-";
  const trimmed = String(specStr).trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.spec && String(parsed.spec).trim()) return parsed.spec;
      if (parsed.remark && String(parsed.remark).trim()) return parsed.remark;
      if (parsed.type) {
        const typeLabels: Record<string, string> = {
          "DIRECT_PROCESS": "직접가공비",
          "OUTSOURCE_PROCESS": "외주가공비",
          "EXTRA_COST": "기타부대비용",
          "MATERIAL": "원자재/상품"
        };
        return typeLabels[parsed.type] || parsed.type;
      }
      return "-";
    } catch {
      return specStr;
    }
  }
  return specStr;
};

// B2B 대장 정보 타입 설정 및 디폴트 노출 컬럼 정의
const typeConfig = {
  inbound_est: {
    title: "받은 견적서 상세 내역",
    headers: [
      "등록일시", "견적번호", "공급/요청처", "담당자명", "연락처", "총 견적액", "상태", "작성일", 
      "첨부파일", "사업자등록증", "연계발주번호", "품목코드", "유효품목코드", "품목명", "규격", "수량", "단가", "금액", "품목납기일", "상세비고", "AI스캔여부"
    ],
    defaultVisible: [
      "등록일시", "견적번호", "공급/요청처", "담당자명", "총 견적액", "상태", "작성일", 
      "첨부파일", "유효품목코드", "품목명", "규격", "수량", "단가", "금액", "품목납기일", "상세비고"
    ]
  },
  inbound_po: {
    title: "보낸 발주서 상세 내역",
    headers: [
      "발주등록번호/발주번호", "견적번호", "공급처명", "연락처", "총 발주액", "상태", "발주일시", "등록일시",
      "입고완료일시", "원본 파일", "품목코드", "품목명", "규격", "수량", "단가", "금액", "품목납기일", "상세비고"
    ],
    defaultVisible: [
      "발주등록번호/발주번호", "견적번호", "공급처명", "연락처", "총 발주액", "상태", "발주일시", "등록일시", "원본 파일", "품목명", "수량", "단가", "금액", "상세비고"
    ]
  },
  outbound_est: {
    title: "(일반)보낸 견적서 상세 내역",
    headers: [
      "견적번호", "수신바이어", "연락처", "담당자명", "총 견적액", "상태", "작성일", "등록일시",
      "첨부파일", "연계수주번호", "품목코드", "품목명", "규격", "수량", "단가", "금액", "품목납기일", "상세비고"
    ],
    defaultVisible: [
      "견적번호", "수신바이어", "연락처", "총 견적액", "상태", "작성일", "등록일시", "품목명", "수량", "단가", "금액", "상세비고"
    ]
  },
  outbound_so: {
    title: "받은 발주서 상세 내역",
    headers: [
      "등록일시", "고객발주번호", "바이어명", "바이어담당자", "총 수주액", "상태", "수주일시", "마스터납기일",
      "원본 파일", "품목코드", "유효품목코드", "품목명", "규격", "수량", "단가", "금액", "품목납기일", "상세비고"
    ],
    defaultVisible: [
      "등록일시", "고객발주번호", "바이어명", "바이어담당자", "총 수주액", "상태", "수주일시", "마스터납기일",
      "원본 파일", "품목코드", "유효품목코드", "품목명", "규격", "수량", "단가", "금액", "품목납기일", "상세비고"
    ]
  },
  inventory_inout: {
    title: "재고 입출고 및 변동 대장 내역",
    headers: [
      "등록일시", "변동종류", "품목구분", "카테고리", "품목명", "품목코드", "바코드", "규격", "단위", "박스입수량", "수량", "단가", "공급처", "입고일자", "보관위치", "상세비고", "담당자", "증빙조회"
    ],
    defaultVisible: [
      "등록일시", "변동종류", "품목구분", "카테고리", "품목명", "품목코드", "바코드", "규격", "단위", "박스입수량", "수량", "단가", "공급처", "입고일자", "보관위치", "상세비고", "담당자", "증빙조회"
    ]
  }
};

function WebViewContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") || "inbound_est";
  const isStatementParam = searchParams.get("is_statement") === "true";
  const type: "inbound_est" | "inbound_po" | "outbound_est" | "outbound_so" | "inventory_inout" = 
    ["inbound_est", "inbound_po", "outbound_est", "outbound_so", "inventory_inout"].includes(typeParam) 
      ? (typeParam as any) 
      : "inbound_est";

  const activeTypeConfig = useMemo(() => {
    const base = typeConfig[type];
    if ((type === "outbound_est" || type === "inbound_est") && isStatementParam) {
      return {
        title: type === "outbound_est" ? "보낸 거래명세서 상세 내역" : "받은 거래명세서 상세 내역",
        headers: base.headers.map(h => {
          if (h === "견적번호") return "명세서번호";
          if (h === "총 견적액") return "총 명세 금액";
          return h;
        }),
        defaultVisible: base.defaultVisible.map(h => {
          if (h === "견적번호") return "명세서번호";
          if (h === "총 견적액") return "총 명세 금액";
          return h;
        })
      };
    }
    return base;
  }, [type, isStatementParam]);

  const [data, setData] = useState<{
    title: string;
    headers: string[];
    rows: any[][];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isColSelectorOpen, setIsColSelectorOpen] = useState(false);
  const [activeMemo, setActiveMemo] = useState<string | null>(null);
  const [activeFileUrl, setActiveFileUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const openFileInNewTab = (fileUrl: string) => {
    if (!fileUrl) return;
    try {
      const realUrl = getFileUrl(fileUrl);
      if (!realUrl.startsWith('data:')) {
        window.open(realUrl, '_blank');
        return;
      }
      const parts = realUrl.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.error(e);
      window.open(fileUrl, '_blank');
    }
  };

  const getFileUrl = (url: string | null) => {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    
    // 포트 8080 백엔드 주소가 붙어있는 경우, 정적 파일 및 API 로드를 위해 프론트엔드 포트 4000으로 치환합니다.
    let cleanUrl = url.replace("http://localhost:8080", "http://localhost:4000");
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
      return cleanUrl;
    }
    
    // 그 외의 모든 상대 주소 및 단순 파일명은 프론트엔드(http://localhost:4000)의 정적 uploads 구역으로 연결합니다.
    const feHost = "http://localhost:4000";
    if (!cleanUrl.startsWith("/") && (cleanUrl.endsWith(".pdf") || /\.(png|jpg|jpeg|gif)$/i.test(cleanUrl))) {
      return `${feHost}/uploads/financials/${cleanUrl}`;
    }
    
    const normalizedUrl = cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;
    return `${feHost}${normalizedUrl}`;
  };

  // 🖨️ 인쇄 기능 구현 (이미지/PDF 대응)
  const handlePrint = () => {
    if (!activeFileUrl) return;
    const realUrl = getFileUrl(activeFileUrl);
    const isPdf = activeFileUrl.startsWith("data:application/pdf") || activeFileUrl.toLowerCase().endsWith(".pdf");
    
    if (isPdf) {
      const iframe = document.getElementById("print-iframe") as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          return;
        } catch (e) {
          console.error("iframe direct print failed, falling back to new window print", e);
        }
      }
    }

    // 이미지이거나 iframe 인쇄 실패 시 새 창을 통해 인쇄 처리
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>인쇄하기 - EGDesk</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              iframe { width: 100vw; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            ${isPdf 
              ? `<iframe src="${realUrl}"></iframe>` 
              : `<img src="${realUrl}" onload="window.print();window.close();" />`
            }
            ${isPdf ? `<script>window.onload = function() { window.print(); window.close(); }</script>` : ""}
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // 🔗 새 탭에서 열기 (Base64 data url 브라우저 차단 우회)
  const handleOpenNewTab = () => {
    if (!activeFileUrl) return;
    if (activeFileUrl.startsWith("data:")) {
      try {
        const parts = activeFileUrl.split(",");
        const mime = parts[0].match(/:(.*?);/)?.[1] || "";
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } catch (e) {
        console.error("Blob url creation failed, falling back to default open", e);
        window.open(getFileUrl(activeFileUrl), "_blank");
      }
    } else {
      window.open(getFileUrl(activeFileUrl), "_blank");
    }
  };


  useEffect(() => {
    setMounted(true);
  }, []);

  // 컬럼 선택 드롭다운용 React Portal 팝업 좌표 상태
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right - 256 + window.scrollX
      });
    }
  };

  useEffect(() => {
    if (isColSelectorOpen) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [isColSelectorOpen]);

  // 1. 실시간 API 연동 및 데이터 패치
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = activeTypeConfig.headers;
      const rows: any[] = [];
      const title = activeTypeConfig.title;

      if (type === "inbound_est" || type === "outbound_est") {
        const res = await apiFetch(`/api/estimates?action=list&_t=${Date.now()}`);
        const json = await res.json();
        if (json.success && json.estimates) {
          const estimatesList = json.estimates;
          const isStatementEstimate = (tagsStr: string) => {
            if (!tagsStr) return false;
            try {
              const parsed = JSON.parse(tagsStr);
              return parsed && parsed.is_statement === true;
            } catch {
              return false;
            }
          };

          const filtered = estimatesList.filter((e: any) => {
            if (type === "inbound_est") {
              if (e.type !== "INBOUND") return false;
              const isStmt = isStatementEstimate(e.tags || "");
              return isStatementParam ? isStmt : !isStmt;
            } else {
              // type === "outbound_est"
              if (e.type !== "OUTBOUND") return false;
              const isStmt = isStatementEstimate(e.tags || "");
              return isStatementParam ? isStmt : !isStmt;
            }
          });

          filtered.forEach((e: any) => {
            const estItems = e.items && e.items.length > 0 ? e.items : [{}];
            estItems.forEach((item: any) => {
              if (type === "inbound_est") {
                rows.push([
                  e.created_at,                          // 등록일시
                  e.id,                                  // 견적번호 / 명세서번호
                  e.partner_name,                        // 공급/요청처
                  e.partner_manager || "-",               // 담당자명
                  e.partner_phone,                       // 연락처
                  e.total_amount,                        // 총 견적액 / 총 명세 금액
                  isStatementParam ? "명세접수" : (e.direction_status === "REQUESTED" ? "견적접수" : "발주완료"), // 상태
                  e.created_at,                          // 작성일
                  e.file_url || "-",                     // 첨부파일
                  e.business_license_url || "-",         // 사업자등록증
                  e.purchase_order_number || "-",        // 연계발주번호
                  item.item_code || "-",                  // 품목코드
                  item.valid_item_code || item.validItemCode || "-", // 유효품목코드
                  item.product_name || "-",              // 품목명
                  formatSpec(item.spec),                      // 규격
                  item.quantity !== undefined ? item.quantity : "", // 수량
                  item.unit_price !== undefined ? item.unit_price : "", // 단가
                  item.amount !== undefined ? item.amount : "", // 금액
                  item.delivery_date || "-",             // 품목납기일
                  e.document_memo_search || "-",          // 상세비고
                  e.ai_parsed ? "AI OCR" : "수동"          // AI스캔여부
                ]);
              } else {
                rows.push([
                  e.id,
                  e.partner_name,
                  e.partner_phone,
                  e.partner_manager || "-",
                  e.total_amount,
                  e.direction_status === "SENT" ? "견적발송" : "수주수락",
                  e.created_at,
                  e.created_at, // 등록일시
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
              }
            });
          });
        }
      } else if (type === "inbound_po") {
        const res = await apiFetch(`/api/estimates/process?action=po_list&_t=${Date.now()}`);
        const json = await res.json();
        if (json.success && json.purchaseOrders) {
          const purchaseOrders = json.purchaseOrders;
          purchaseOrders.forEach((p: any) => {
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
                p.created_at, // 등록일시
                p.completed_at || "-",
                p.file_url || "-",
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
        }
      } else if (type === "outbound_so") {
        const res = await apiFetch(`/api/estimates/process?action=so_list&_t=${Date.now()}`);
        const json = await res.json();
        if (json.success && json.salesOrders) {
          const salesOrders = json.salesOrders;
          salesOrders.forEach((s: any) => {
            const soItems = s.items && s.items.length > 0 ? s.items : [{}];
            soItems.forEach((item: any) => {
              rows.push([
                s.created_at,          // 등록일시
                s.client_order_no || "-", // 고객발주번호
                s.customer_name,       // 바이어명
                s.customer_manager || "-", // 바이어담당자
                s.total_amount,        // 총 수주액
                s.status === "REGISTERED" ? "수주등록" : "확인완료", // 상태
                s.order_date || s.created_at, // 수주일시
                s.delivery_date || "-", // 마스터납기일
                s.file_url || "-",     // 원본 파일
                item.item_code || "-", // 품목코드
                item.valid_item_code || "-", // 유효품목코드
                item.product_name || "-", // 품목명
                formatSpec(item.spec),      // 규격
                item.quantity !== undefined ? item.quantity : "", // 수량
                item.unit_price !== undefined ? item.unit_price : "", // 단가
                item.amount !== undefined ? item.amount : "", // 금액
                item.delivery_date || "-", // 품목납기일
                s.document_memo_search || "-", // 상세비고
                s.id,                  // 수주번호
                s.estimate_id,          // 견적번호
                s.customer_phone       // 연락처
              ]);
            });
          });
        }
      } else if (type === "inventory_inout") {
        const res = await apiFetch(`/api/inventory/logs?_t=${Date.now()}`);
        const json = await res.json();
        if (json.success && json.data) {
          const logsList = Array.isArray(json.data) ? json.data : [];
          
          // 1. 요약 입고 건들의 inbound_id 수집
          const inboundIds: string[] = [];
          logsList.forEach((log: any) => {
            if (log.itemId === -1 && log.note) {
              const inboundMatch = log.note.match(/inboundId:\s*(INB-\w+)/);
              if (inboundMatch) {
                inboundIds.push(inboundMatch[1]);
              }
            }
          });

          // 2. 수집된 inbound_id들의 상세 내역을 병렬 fetch하여 맵핑
          const inboundDetailsMap = new Map<string, any[]>();
          if (inboundIds.length > 0) {
            const uniqueIds = Array.from(new Set(inboundIds));
            await Promise.all(
              uniqueIds.map(async (id) => {
                try {
                  const detailRes = await apiFetch(`/api/inventory/inbounds?inbound_id=${id}&_t=${Date.now()}`);
                  const detailJson = await detailRes.json();
                  if (detailJson.success && detailJson.data) {
                    inboundDetailsMap.set(id, detailJson.data);
                  }
                } catch (e) {
                  console.error(`Failed to fetch inbound details for ${id}:`, e);
                }
              })
            );
          }

          // 3. 로그 리스트를 순회하며 개별 품목 단위로 rows 생성
          logsList.forEach((log: any) => {
            const dateStr = log.createdAt || log.created_at || "-";
            const typeStr = log.changeType === 'in' ? '입고' : log.changeType === 'out' ? '출고' : '실사조정';
            
            let cleanNote = log.note || "-";
            cleanNote = cleanNote.replace(/^\[자율 입고 요약\]\s*/, '').trim();

            const inboundMatch = log.note ? log.note.match(/inboundId:\s*(INB-\w+)/) : null;
            const inboundId = inboundMatch ? inboundMatch[1] : null;

            // 만약 요약 입고 건이고 상세 맵에 정보가 있다면 낱낱이 풀어서 푸시
            if (log.itemId === -1 && inboundId && inboundDetailsMap.has(inboundId)) {
              const details = inboundDetailsMap.get(inboundId) || [];
              details.forEach((det: any, idx: number) => {
                const detQtyStr = `+${Number(det.quantity).toLocaleString()} 개`;
                const detPriceStr = det.price !== undefined ? `₩ ${Number(det.price).toLocaleString()}` : "₩ 0";
                
                rows.push([
                  dateStr,                                           // 등록일시
                  typeStr,                                           // 변동종류
                  formatItemType(log.itemType || det.type),          // 품목구분
                  det.category || "기타",                            // 카테고리
                  det.item_name || "-",                              // 품목명
                  det.item_code || det.id || "-",                   // 품목코드
                  det.barcode || "-",                                // 바코드
                  formatSpec(det.spec),                                   // 규격
                  det.unit || "개",                                  // 단위
                  det.box_qty !== undefined ? `${det.box_qty} 개` : "1 개", // 박스입수량
                  detQtyStr,                                         // 수량
                  detPriceStr,                                       // 단가
                  det.partner_name || "미지정 공급처",                 // 공급처
                  det.inbound_date || dateStr,                       // 입고일자
                  det.location || "-",                               // 보관위치
                  det.note || cleanNote || "-",                      // 상세비고
                  log.operator || "-",                               // 담당자
                  det.pdf_file_path || log.note || ""                 // 증빙조회
                ]);
              });
            } else {
              // 일반 단일 건은 그대로 푸시
              const qtyStr = `${log.changeType === 'in' ? '+' : log.changeType === 'out' ? '-' : ''}${Math.abs(log.quantity).toLocaleString()} 개`;
              const proofMatch = cleanNote.match(/\(증빙:\s*([^\)]+)\)/);
              const proofPath = proofMatch ? proofMatch[1] : "-";
              
              if (proofMatch) {
                cleanNote = cleanNote.replace(proofMatch[0], '').trim();
              }
              if (inboundMatch) {
                cleanNote = cleanNote.replace(inboundMatch[0], '').replace(/\(\s*\)/, '').trim();
                cleanNote = cleanNote.replace(/\s*\|\s*$/, '').trim();
              }

              rows.push([
                dateStr,                                           // 등록일시
                typeStr,                                           // 변동종류
                formatItemType(log.itemType),                      // 품목구분
                "일반재고",                                         // 카테고리
                log.itemName || "-",                               // 품목명
                log.itemBarcode || (log.itemId !== -1 ? `INV-${log.itemId}` : "-"), // 품목코드
                log.itemBarcode || "-",                            // 바코드
                "-",                                               // 규격
                "개",                                              // 단위
                "1 개",                                            // 박스입수량
                qtyStr,                                            // 수량
                log.price !== undefined ? `₩ ${log.price.toLocaleString()}` : "₩ 0", // 단가
                "-",                                               // 공급처
                dateStr,                                           // 입고일자
                "-",                                               // 보관위치
                cleanNote || "-",                                  // 상세비고
                log.operator || "-",                               // 담당자
                proofPath                                          // 증빙조회
              ]);
            }
          });
        }
      }

      setData({ title, headers, rows });
      
      // 로컬스토리지에서 컬럼 순서 및 숨김 설정 확인
      if (typeof window !== "undefined") {
        const savedColumns = localStorage.getItem(`egdesk_est_webview_cols_v3_${type}`);
        const savedVisible = localStorage.getItem(`egdesk_est_webview_visible_v3_${type}`);
        
        if (savedColumns && savedVisible) {
          try {
            const parsedCols = JSON.parse(savedColumns) as string[];
            const parsedVisible = JSON.parse(savedVisible) as string[];
            
            // 데이터의 실제 헤더와 동기화 (새로운 컬럼 대응)
            const filteredCols = parsedCols.filter(c => headers.includes(c));
            const missingCols = headers.filter(c => !filteredCols.includes(c));
            setColumns([...filteredCols, ...missingCols]);
            
            const filteredVisible = parsedVisible.filter(c => headers.includes(c));
            if (headers.includes("유효품목코드") && !filteredVisible.includes("유효품목코드")) {
              filteredVisible.push("유효품목코드");
            }
            setVisibleColumns(filteredVisible);
          } catch (e) {
            setColumns(headers);
            setVisibleColumns(activeTypeConfig.defaultVisible);
          }
        } else {
          setColumns(headers);
          setVisibleColumns(activeTypeConfig.defaultVisible);
        }
      } else {
        setColumns(headers);
        setVisibleColumns(activeTypeConfig.defaultVisible);
      }
    } catch (e) {
      console.error("데이터 실시간 fetch 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const headers = activeTypeConfig.headers;
    const regDateIdx = headers.indexOf("등록일시");
    if (regDateIdx !== -1) {
      setSortKey(regDateIdx);
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir("desc");
    }
    fetchData();
  }, [type, isStatementParam]);

  // 2. 검색 및 필터링
  const filteredRows = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.rows;
    
    const term = search.toLowerCase();
    return data.rows.filter((row) =>
      row.some((val) => String(val).toLowerCase().includes(term))
    );
  }, [data, search]);

  // 3. 정렬 파이프라인
  const sortedRows = useMemo(() => {
    if (sortKey === null) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      // 숫자 변환 가능 시 숫자로 정렬
      const numA = Number(String(valA).replace(/[,원개]/g, ""));
      const numB = Number(String(valB).replace(/[,원개]/g, ""));
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === "asc" ? numA - numB : numB - numA;
      }

      // 문자열 정렬
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      return sortDir === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }, [filteredRows, sortKey, sortDir]);

  // 4. 페이지네이션 파이프라인
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;

  // 정렬 트리거
  const handleSort = (index: number) => {
    if (sortKey === index) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(index);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  // CSV 다운로드 (현재 표시된 컬럼과 데이터만 똑똑하게 추출하여 다운로드)
  const handleExportCsv = () => {
    if (!data) return;

    // 사용자가 정렬한 columns 순서 중 visibleColumns에 포함된 것만 추출
    const activeHeaders = columns.filter((h) => visibleColumns.includes(h));
    const headerIndices = activeHeaders.map((h) => data.headers.indexOf(h));

    const activeRows = data.rows.map((row) =>
      headerIndices.map((idx) => (idx !== -1 ? row[idx] : ""))
    );

    const csvContent =
      "\ufeff" +
      [
        activeHeaders.join(","),
        ...activeRows.map((r) =>
          r.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${data.title}_웹뷰내보내기.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 컬럼 순서/노출 세팅 저장 헬퍼
  const saveColumnSettings = (newCols: string[], newVisible: string[]) => {
    setColumns(newCols);
    setVisibleColumns(newVisible);
    if (typeof window !== "undefined") {
      localStorage.setItem(`egdesk_est_webview_cols_v3_${type}`, JSON.stringify(newCols));
      localStorage.setItem(`egdesk_est_webview_visible_v3_${type}`, JSON.stringify(newVisible));
    }
  };

  // 컬럼 노출 개별 토글
  const toggleColumn = (colName: string) => {
    const nextVisible = visibleColumns.includes(colName)
      ? visibleColumns.filter((c) => c !== colName)
      : [...visibleColumns, colName];
    saveColumnSettings(columns, nextVisible);
  };

  // 컬럼 전체 선택 / 해제
  const toggleAllColumns = () => {
    if (!data) return;
    const nextVisible = visibleColumns.length === data.headers.length
      ? [data.headers[0]]
      : [...data.headers];
    saveColumnSettings(columns, nextVisible);
  };

  // 컬럼 위/아래 이동
  const moveColumn = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === columns.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newColumns = [...columns];
    const temp = newColumns[index];
    newColumns[index] = newColumns[targetIndex];
    newColumns[targetIndex] = temp;
    saveColumnSettings(newColumns, visibleColumns);
  };

  // 컬럼 설정을 기본값으로 복원
  const resetToDefaultColumns = () => {
    if (!data) return;
    const defaultHeaders = activeTypeConfig.headers;
    const defaultVisible = activeTypeConfig.defaultVisible;
    saveColumnSettings(defaultHeaders, defaultVisible);
    
    // 정렬 상태도 기본값으로 복구
    const regDateIdx = defaultHeaders.indexOf("등록일시");
    if (regDateIdx !== -1) {
      setSortKey(regDateIdx);
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir("desc");
    }
  };

  // 이미지/문서 원본 뷰어 뱃지 감지 헬퍼
  const detectFile = (str: string) => {
    const isUrl = str.startsWith("http://") || str.startsWith("https://") || str.includes("/uploads/");
    const isBase64 = str.startsWith("data:") && str.includes(";base64,");
    return isUrl || isBase64;
  };

  if (loading || !data) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-350' : 'bg-slate-50 text-slate-600'} flex flex-col items-center justify-center font-sans p-6 transition-colors duration-300`}>
        <div className="w-16 h-16 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-black tracking-wide text-indigo-500 animate-pulse">실시간 데이터베이스를 조회 중입니다...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      isDarkMode 
        ? "bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 text-slate-100" 
        : "bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/30 text-slate-800"
    } font-sans p-3 md:p-5 transition-colors duration-300 relative overflow-x-hidden w-full`}>
      {/* 럭셔리 네온 광원 */}
      <div className={`absolute top-10 left-10 w-80 h-80 ${isDarkMode ? 'bg-indigo-600/10' : 'bg-indigo-400/5'} rounded-full blur-3xl -z-10 animate-pulse`}></div>
      <div className={`absolute bottom-10 right-10 w-96 h-96 ${isDarkMode ? 'bg-purple-600/5' : 'bg-purple-400/5'} rounded-full blur-3xl -z-10`}></div>

      {/* 가로 공간 최대화를 위해 max-w-full 처리 */}
      <div className="w-full space-y-4">
        
        {/* 상단 헤더 패널 */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDarkMode 
            ? "bg-slate-900/90 border-white/10 shadow-2xl shadow-slate-950/50" 
            : "bg-white border-slate-200 shadow-xl shadow-slate-100/50"
        } border p-5 rounded-3xl transition-all duration-300`}>
          <div>
            <span className={`${
              isDarkMode 
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" 
                : "bg-indigo-50/80 text-indigo-650 border-indigo-200"
            } border text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase`}>
              B2B Realtime WebView
            </span>
            <h1 className={`text-xl font-black ${
              isDarkMode 
                ? "text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-300" 
                : "text-slate-800"
            } mt-1.5`}>
              {data.title}
            </h1>
            <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-0.5 font-medium`}>
              실시간 DB 연계 조회 중 ➔ 총 <span className="text-indigo-600 font-bold">{sortedRows.length}</span>개의 상세 내역이 적재되어 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* 실시간 패치 새로고침 단추 */}
            <button
              onClick={fetchData}
              className={`p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                isDarkMode 
                  ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white" 
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
              }`}
              title="데이터 새로고침"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>

            {/* 다크/라이트모드 토글 단추 */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isDarkMode 
                  ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white" 
                  : "bg-white border-slate-200 text-slate-705 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
              }`}
              title={isDarkMode ? "라이트모드로 전환" : "다크모드로 전환"}
            >
              {isDarkMode ? (
                <>
                  <Sun size={14} className="text-amber-400 animate-pulse" />
                  <span>라이트모드</span>
                </>
              ) : (
                <>
                  <Moon size={14} className="text-indigo-600" />
                  <span>다크모드</span>
                </>
              )}
            </button>

            {/* CSV 내보내기 */}
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} />
              <span>CSV 내보내기</span>
            </button>
          </div>
        </div>

        {/* 필터, 검색 및 컬럼 표시설정 제어 영역 */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isDarkMode 
            ? "bg-slate-900/90 border-white/10 shadow-2xl shadow-slate-950/50" 
            : "bg-white border-slate-200 shadow-xl shadow-slate-100/50"
        } border p-4 rounded-3xl transition-all duration-300 relative z-30`}>
          <div className="flex flex-1 items-center max-w-md w-full">
            <input
              type="text"
              placeholder="검색어를 입력해 주세요 (전체 대장 실시간 검색)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-3.5 py-2.5 border rounded-2xl text-[11px] font-bold shadow-inner outline-none transition-all ${
                isDarkMode 
                  ? "bg-slate-900/50 border-white/10 text-white placeholder-slate-500 focus:border-indigo-500/80" 
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500/70"
              }`}
            />
          </div>
          <div className="flex items-center gap-3 justify-end relative">
            
{/* 컬럼 숨기기/보이기 제어기 */}
            <div className="relative z-40">
              <button
                ref={buttonRef}
                onClick={() => setIsColSelectorOpen(!isColSelectorOpen)}
                className={`px-3 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isColSelectorOpen
                    ? "bg-indigo-600 border-indigo-650 text-white shadow-md"
                    : isDarkMode
                    ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                }`}
              >
                <Eye size={13} />
                <span>⚙️ 컬럼 표시 설정</span>
              </button>
              
              {/* 컬럼 선택 팝업 드롭다운 (React Portal 이식으로 쌓임 맥락 및 가려짐 완벽 차단) */}
              {mounted && isColSelectorOpen && typeof document !== 'undefined' && createPortal(
                <div 
                  className={`fixed rounded-2xl border shadow-2xl p-4 w-64 transition-all ${
                    isDarkMode
                      ? "border-slate-800 text-slate-100 shadow-black/90"
                      : "border-slate-200 text-slate-800 shadow-slate-200/60"
                  }`}
                  style={{
                    top: `${coords.top}px`,
                    left: `${coords.left}px`,
                    zIndex: 99999,
                    backgroundColor: isDarkMode ? "#090d16" : "#ffffff",
                    transform: "translate3d(0, 0, 9999px)",
                    isolation: "isolate",
                  }}
                >
                  <div className="flex items-center justify-between border-b border-solid border-slate-700/20 pb-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider">표시 컬럼 선택</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleAllColumns}
                        className="text-[9px] font-black text-indigo-500 hover:underline border-none bg-transparent cursor-pointer"
                      >
                        {visibleColumns.length === data.headers.length ? "전체해제" : "전체선택"}
                      </button>
                      <span className="text-[9px] text-slate-650">|</span>
                      <button
                        onClick={resetToDefaultColumns}
                        className="text-[9px] font-black text-indigo-500 hover:underline border-none bg-transparent cursor-pointer"
                        title="순서 및 숨김 상태를 기본 설정값으로 복원합니다."
                      >
                        기본값 복원
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[480px] overflow-y-auto space-y-1 custom-scrollbar text-left">
                    {columns.map((h, idx) => {
                      const isChecked = visibleColumns.includes(h);
                      return (
                        <div
                          key={h}
                          className="flex items-center justify-between px-1.5 py-1 hover:bg-white/5 rounded-lg transition-colors group"
                        >
                          <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleColumn(h)}
                              className="rounded border-slate-400 text-indigo-650 focus:ring-indigo-555 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className={isChecked ? "opacity-100" : "opacity-50"}>{h}</span>
                          </label>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveColumn(idx, "up")}
                              className="p-0.5 hover:bg-white/10 disabled:opacity-20 rounded text-slate-400 hover:text-white cursor-pointer disabled:cursor-not-allowed border-none bg-transparent"
                              title="위로 이동"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === columns.length - 1}
                              onClick={() => moveColumn(idx, "down")}
                              className="p-0.5 hover:bg-white/10 disabled:opacity-20 rounded text-slate-400 hover:text-white cursor-pointer disabled:cursor-not-allowed border-none bg-transparent"
                              title="아래로 이동"
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-solid border-slate-700/20 pt-2 mt-2 flex justify-end">
                    <button
                      onClick={() => setIsColSelectorOpen(false)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-755 text-white rounded-lg text-[10px] font-black cursor-pointer border-none"
                    >
                      확인
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>

            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-bold`}>보기:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={`px-3 py-2 border rounded-2xl text-xs font-bold shadow-sm outline-none transition-all ${
                isDarkMode 
                  ? "bg-slate-900/50 border-white/10 text-slate-300" 
                  : "bg-slate-50 border-slate-200 text-slate-705"
              }`}
            >
              <option value={10}>10개씩</option>
              <option value={15}>15개씩</option>
              <option value={30}>30개씩</option>
              <option value={50}>50개씩</option>
            </select>
          </div>
        </div>

        {/* 데이터 테이블 카드 (좌우 최대 폭 확장 및 가로 스크롤 방지 래핑 패턴) */}
        <div className={`relative z-10 ${
          isDarkMode 
            ? "bg-slate-900/95 border-white/10 shadow-2xl shadow-slate-950/50" 
            : "bg-white border-slate-200 shadow-xl shadow-slate-100/50"
        } border rounded-3xl overflow-hidden transition-all duration-300 w-full`}>
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-[11px] font-semibold border-collapse table-auto">
              <thead>
                <tr className={`border-b ${
                  isDarkMode 
                    ? "border-white/10 bg-slate-900/30 text-slate-400" 
                    : "border-slate-200 bg-slate-50 text-slate-600"
                } transition-colors duration-300`}>
                  {columns.map((header) => {
                    if (!visibleColumns.includes(header)) return null;
                    const origIdx = data.headers.indexOf(header);
                    if (origIdx === -1) return null;
                    const isHeaderNumeric = ["수량", "단가", "금액", "총 수주액", "총 발주액", "총 견적액"].includes(header.replace(/\s+/g, ""));
                    return (
                      <th
                        key={header}
                        onClick={() => handleSort(origIdx)}
                        className={`py-3.5 px-3.5 cursor-pointer ${
                          isDarkMode ? "hover:text-white" : "hover:text-slate-900"
                        } select-none transition-colors group whitespace-nowrap ${
                          isHeaderNumeric ? "text-right" : ""
                        }`}
                      >
                        <div className={`flex items-center gap-1 ${isHeaderNumeric ? "justify-end" : ""}`}>
                          {header}
                          <span className="text-indigo-500 font-bold group-hover:scale-110 transition-transform">
                            {sortKey === origIdx ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕"}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length}
                      className={`text-center py-20 ${isDarkMode ? 'text-slate-400' : 'text-slate-505'} font-semibold`}
                    >
                      검색 조건에 맞는 내역이 존재하지 않습니다.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={`border-b ${
                        isDarkMode 
                          ? "border-white/5 hover:bg-white/5" 
                          : "border-slate-100 hover:bg-slate-50/60"
                      } transition-colors duration-300`}
                    >
                      {columns.map((headerName) => {
                        if (!visibleColumns.includes(headerName)) return null;
                        const cIdx = data.headers.indexOf(headerName);
                        if (cIdx === -1) return null;

                        const val = row[cIdx];
                        let strVal = String(val);
                        const isAttachedFile = detectFile(strVal);

                        if (!isAttachedFile && strVal !== "-") {
                          const isMoney = ["단가", "금액", "총 수주액", "총 발주액", "총 견적액"].includes(headerName);
                          const isQty = ["수량"].includes(headerName);
                          if (isMoney || isQty) {
                            const cleanNum = Number(strVal.replace(/[^0-9.-]/g, ""));
                            if (!isNaN(cleanNum)) {
                              strVal = isMoney ? `${cleanNum.toLocaleString()}원` : `${cleanNum.toLocaleString()}`;
                            }
                          }
                        }
                        
                        if (headerName === "품목구분") {
                          const isMaterial = strVal === "원부자재" || strVal === "자재" || strVal === "원자재";
                          return (
                            <td key={headerName} className="py-3 px-3.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isMaterial
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}>
                                {isMaterial ? "원부자재" : "완제품"}
                              </span>
                            </td>
                          );
                        }

                        const isNumericCol = ["수량", "단가", "금액", "총 수주액", "총 발주액", "총 견적액"].includes(headerName.replace(/\s+/g, ""));
                        return (
                          <td key={headerName} className={`py-3 px-3.5 ${
                            isDarkMode ? "text-slate-355" : "text-slate-700"
                          } font-medium ${
                            isNumericCol 
                              ? "whitespace-nowrap font-mono text-right" 
                              : "whitespace-normal break-all max-w-[240px]"
                          }`}>
                            {headerName === "증빙조회" ? (
                              (() => {
                                const proofPath = strVal;
                                if (!proofPath || proofPath === "-" || proofPath === "undefined") {
                                  return <span className={isDarkMode ? "text-slate-700" : "text-slate-400"}>-</span>;
                                }
                                const isDocOrImg = 
                                  proofPath.startsWith('data:') || 
                                  proofPath.startsWith('http') || 
                                  proofPath.includes('/uploads/') || 
                                  /\.(pdf|png|jpg|jpeg|gif)$/i.test(proofPath);

                                return isDocOrImg ? (
                                  <button
                                    onClick={() => openFileInNewTab(proofPath)}
                                    className="px-2.5 py-1 bg-indigo-500/10 text-indigo-650 hover:bg-indigo-500/20 rounded-lg text-[10px] font-black border border-indigo-500/20 transition-all inline-flex items-center gap-1 cursor-pointer"
                                    title="새 탭에서 원본 증빙 파일 보기"
                                  >
                                    📄 증빙 조회
                                  </button>
                                ) : (proofPath.endsWith('.xlsx') || proofPath.endsWith('.xls') || proofPath.includes('excel')) ? (
                                  <span 
                                    className="inline-flex items-center px-2 py-0.5 bg-emerald-500/10 text-emerald-650 rounded-lg text-[9px] font-extrabold border border-emerald-500/20"
                                    title={`엑셀 파일 업로드 건: ${proofPath}`}
                                  >
                                    EXCEL
                                  </span>
                                ) : (
                                  <span 
                                    className="inline-flex items-center px-2 py-0.5 bg-slate-500/10 text-slate-500 rounded-lg text-[9px] font-extrabold border border-slate-500/15"
                                    title={`수동/일반 기록: ${proofPath}`}
                                  >
                                    일반
                                  </span>
                                );
                              })()
                            ) : isAttachedFile ? (
                              (() => {
                                const isExcel = 
                                  strVal.toLowerCase().includes(".xlsx") || 
                                  strVal.toLowerCase().includes(".xls") || 
                                  strVal.toLowerCase().includes("spreadsheetml") || 
                                  strVal.toLowerCase().includes("excel");
                                return isExcel ? (
                                  <button
                                    onClick={() => openFileInNewTab(strVal)}
                                    className="px-2.5 py-1 bg-emerald-500/10 text-emerald-650 hover:bg-emerald-500/20 rounded-lg text-[10px] font-black border border-emerald-500/20 transition-all inline-flex items-center gap-1 cursor-pointer"
                                    title="새 탭에서 엑셀 파일 열기"
                                  >
                                    🟢 EXCEL
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openFileInNewTab(strVal)}
                                    className="px-2.5 py-1 bg-indigo-500/10 text-indigo-650 hover:bg-indigo-500/20 rounded-lg text-[10px] font-black border border-indigo-500/20 transition-all inline-flex items-center gap-1 cursor-pointer"
                                    title="새 탭에서 원본 파일 열기"
                                  >
                                    🔗 원본보기
                                  </button>
                                );
                              })()
                            ) : strVal === "-" ? (
                              <span className={isDarkMode ? "text-slate-700" : "text-slate-400"}>-</span>
                            ) : headerName === "상세비고" ? (
                              <div className="flex flex-col gap-1 max-w-[220px]">
                                <div className="truncate text-left text-[10px] text-slate-400 font-semibold" title={strVal}>
                                  {strVal.split("\n")[0] || "-"}
                                </div>
                                {strVal.length > 15 || strVal.includes("\n") ? (
                                  <button
                                    onClick={() => setActiveMemo(strVal)}
                                    className="px-2 py-0.5 self-start bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-650 rounded text-[9px] font-bold transition-all border border-indigo-500/15 cursor-pointer mt-0.5 whitespace-nowrap inline-flex items-center gap-0.5"
                                  >
                                    🔎 비고전문 보기
                                  </button>
                                ) : null}
                              </div>
                            ) : headerName.endsWith("일시") || headerName === "등록일시" ? (
                              (() => {
                                const parts = strVal.split(" ");
                                if (parts.length >= 2) {
                                  return (
                                    <div className="flex flex-col text-left">
                                      <span>{parts[0]}</span>
                                      <span className="text-[10px] text-slate-400 mt-0.5">{parts.slice(1).join(" ")}</span>
                                    </div>
                                  );
                                }
                                return strVal;
                              })()
                            ) : (
                              strVal
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 하단 페이지네이션 패널 */}
        {totalPages > 1 && (
          <div className={`flex items-center justify-between ${
            isDarkMode 
              ? "bg-white/5 border-white/10" 
              : "bg-white/80 border-slate-200 shadow-xl shadow-slate-100/50"
          } backdrop-blur-xl border px-5 py-3 rounded-3xl transition-all duration-300`}>
            <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-bold`}>
              페이지 <span className="text-indigo-600 font-black">{currentPage}</span> / {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 ${
                  isDarkMode 
                    ? "bg-slate-900/50 hover:bg-slate-900 border-white/5 text-slate-350" 
                    : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600"
                } border rounded-xl text-[11px] font-bold disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer`}
              >
                이전
              </button>
              
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                if (Math.abs(currentPage - pageNum) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={idx} className="text-slate-500 px-1 text-xs">...</span>;
                  }
                  return null;
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7.5 h-7.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : isDarkMode
                        ? "bg-slate-900/30 hover:bg-white/5 text-slate-450 border border-white/5"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 ${
                  isDarkMode 
                    ? "bg-slate-900/50 hover:bg-slate-900 border-white/5 text-slate-350" 
                    : "bg-slate-100 hover:bg-slate-250 border-slate-200 text-slate-600"
                } border rounded-xl text-[11px] font-bold disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer`}
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>



      {/* 📝 상세비고 팝업 모달 */}
      {activeMemo && (
        <div 
          onClick={() => setActiveMemo(null)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`relative max-w-xl w-full ${
              isDarkMode 
                ? "bg-slate-900 border-white/10 text-slate-100" 
                : "bg-white border-slate-200 text-slate-800"
            } border p-6 rounded-3xl shadow-2xl flex flex-col cursor-default max-h-[80vh] overflow-hidden`}
          >
            {/* 상단 닫기 단추 */}
            <button
              onClick={() => setActiveMemo(null)}
              className={`absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center ${
                isDarkMode 
                  ? "bg-slate-800 border-white/5 hover:bg-slate-750 text-slate-350" 
                  : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600"
              } border rounded-full cursor-pointer transition-all hover:scale-105`}
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-extrabold mb-4 pb-2 border-b border-slate-100/10 flex items-center gap-2">
              📝 상세비고 전문 보기
            </h3>
            
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 rounded-2xl ${
              isDarkMode ? "bg-black/30 text-slate-300" : "bg-slate-50 text-slate-700"
            } text-[11px] leading-relaxed font-semibold whitespace-pre-wrap`}>
              {activeMemo}
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setActiveMemo(null)}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  isDarkMode 
                    ? "bg-indigo-650 hover:bg-indigo-600 text-white" 
                    : "bg-indigo-500 hover:bg-indigo-600 text-white"
                }`}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📄 원본 증빙문서 전체화면 오버레이 모달 */}
      {activeFileUrl && (() => {
        const isPdf = activeFileUrl.startsWith("data:application/pdf") || activeFileUrl.toLowerCase().endsWith(".pdf");
        return (
          <div className="fixed inset-0 bg-slate-950/95 z-[100] flex flex-col backdrop-blur-sm animate-fade-in">
            {/* 상단 럭셔리 컨트롤 바 */}
            <div className="bg-slate-900/95 border-b border-white/10 px-6 py-4 flex items-center justify-between text-white shadow-2xl">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase">
                  Document Viewer
                </span>
                <h3 className="text-xs font-black tracking-wide">📄 수발주 원본 증빙문서 뷰어</h3>
              </div>
              <div className="flex items-center gap-2">
                {/* 🖨️ 인쇄하기 버튼 */}
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center gap-1 shadow-md border-none"
                  title="문서 인쇄하기"
                >
                  <span>🖨️ 인쇄하기</span>
                </button>

                {/* 🌐 새 탭에서 열기 버튼 */}
                <button
                  onClick={handleOpenNewTab}
                  className="px-3.5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center gap-1 shadow-md"
                  title="브라우저 새 탭에서 열기 (차단 우회 적용)"
                >
                  <span>🌐 새 탭에서 열기</span>
                </button>

                {/* ❌ 닫기 버튼 */}
                <button
                  onClick={() => setActiveFileUrl(null)}
                  className="w-9 h-9 flex items-center justify-center bg-slate-800 border border-white/5 hover:bg-slate-700 text-slate-300 rounded-full cursor-pointer transition-all hover:scale-105"
                  title="뷰어 닫기"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* 원본 파일 렌더링 구역 (잘림 방지 및 최대화 레이아웃) */}
            <div className="flex-1 flex justify-center items-center p-6 overflow-auto bg-slate-950">
              {isPdf ? (
                <iframe
                  id="print-iframe"
                  src={getFileUrl(activeFileUrl)}
                  className="w-full h-full max-w-5xl max-h-[82vh] rounded-2xl border border-white/10 bg-white shadow-2xl"
                  title="PDF 원본 뷰어"
                />
              ) : (
                <img
                  src={getFileUrl(activeFileUrl)}
                  alt="원본 증빙 이미지"
                  className="max-h-[82vh] max-w-full object-contain rounded-2xl border border-white/10 shadow-2xl bg-slate-900/50"
                />
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
}

export default function WebViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 font-sans p-6">
        <div className="w-16 h-16 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-black tracking-wide text-indigo-400">페이지를 불러오는 중입니다...</p>
      </div>
    }>
      <WebViewContent />
    </Suspense>
  );
}
