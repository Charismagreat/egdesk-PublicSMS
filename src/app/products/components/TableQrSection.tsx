"use client";

import React, { useState, useEffect } from "react";
import { Printer, Download, ExternalLink, QrCode, RefreshCw } from "lucide-react";

export function TableQrSection() {
  const [tableCount, setTableCount] = useState<number>(12);
  const [origin, setOrigin] = useState<string>("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const getTableUrl = (tableNum: number) => {
    const base = origin || "http://localhost:4000";
    return `${base}/table-order/${tableNum}`;
  };

  const getQrImageUrl = (url: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&color=000000&bgcolor=ffffff&margin=1`;
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "테이블오더_QR코드_스탠드";
    
    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 2000);
  };

  const handleDownloadQr = async (tableNum: number) => {
    const url = getTableUrl(tableNum);
    const qrImageSrc = getQrImageUrl(url);
    try {
      const response = await fetch(qrImageSrc);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `table-${tableNum}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(qrImageSrc, "_blank");
    }
  };

  const handleCopyUrl = (tableNum: number) => {
    const url = getTableUrl(tableNum);
    navigator.clipboard.writeText(url);
    setCopiedId(tableNum);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tableList = Array.from({ length: Math.max(1, Math.min(tableCount, 100)) }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* 인쇄 전용 전역 스타일 가드 (@media print) */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #qr-print-area, #qr-print-area * {
            visibility: visible;
          }
          #qr-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px 14px !important;
          }
          .print-card {
            border: 2px solid #000 !important;
            box-shadow: none !important;
            padding: 12px 16px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            height: 255px !important;
          }
          .print-qr-img {
            width: 110px !important;
            height: 110px !important;
          }
        }
      `}</style>

      {/* 1. 상단 안내 및 설정 제어 바 */}
      <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/60 p-6 rounded-3xl border border-indigo-100/80 shadow-sm no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <QrCode className="w-6 h-6 text-indigo-600" />
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                테이블오더 QR 코드 관리 및 스탠드 인쇄
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              매장에 비치할 테이블별 QR 코드를 자동으로 생성합니다. 손님이 스마트폰 카메라로 스캔하면 100% 별도 앱 설치 없이 해당 테이블의 메뉴판으로 바로 연결됩니다. (A4 1장에 6개 카드 일괄 인쇄)
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center shrink-0">
            {/* 테이블 수 입력 폼 */}
            <div className="flex items-center bg-white border border-indigo-200 rounded-2xl px-3 py-1.5 shadow-sm">
              <span className="text-xs font-bold text-slate-600 mr-2 whitespace-nowrap">테이블 수:</span>
              <input
                type="number"
                min={1}
                max={100}
                value={tableCount}
                onChange={(e) => setTableCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 text-sm font-black text-indigo-700 outline-none border-b border-indigo-300 text-center"
              />
              <span className="text-xs font-bold text-slate-500 ml-1">개</span>
            </div>

            {/* A4 일괄 인쇄 버튼 */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 border-none cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              🖨️ A4 일괄 인쇄 (페이지당 6개)
            </button>
          </div>
        </div>
      </div>

      {/* 2. 테이블 QR 코드 스탠드 미리보기 그리드 영역 */}
      <div id="qr-print-area" className="w-full">
        <div className="print-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {tableList.map((tableNum) => {
            const targetUrl = getTableUrl(tableNum);
            const qrSrc = getQrImageUrl(targetUrl);

            return (
              <div
                key={tableNum}
                className="print-card bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden transition-all hover:border-indigo-300 hover:shadow-md"
              >
                {/* 상단 매장 & 테이블 헤더 */}
                <div className="w-full border-b border-slate-100 pb-2 mb-1">
                  <span className="text-[9px] font-black tracking-widest text-indigo-600 uppercase block mb-0.5">
                    TABLE ORDER
                  </span>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                    테이블 {tableNum}번
                  </h3>
                </div>

                {/* 중앙 QR 코드 영역 */}
                <div className="p-2 bg-white border-2 border-slate-900 rounded-2xl shadow-inner my-1 flex items-center justify-center">
                  <img
                    src={qrSrc}
                    alt={`Table ${tableNum} QR`}
                    className="print-qr-img w-32 h-32 object-contain"
                  />
                </div>

                {/* 안내 문구 */}
                <div className="mt-1 space-y-0.5">
                  <p className="text-[11px] font-black text-slate-800 leading-tight">
                    📷 스마트폰 카메라로 스캔하세요
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium leading-tight">
                    스캔 시 메뉴판으로 이동하여 바로 주문할 수 있습니다
                  </p>
                </div>

                {/* 하단 관리자 도구 버튼 (인쇄 시 숨김) */}
                <div className="no-print w-full pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleDownloadQr(tableNum)}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-1 border-none cursor-pointer"
                    title="QR 이미지 PNG 다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                    저장
                  </button>

                  <button
                    onClick={() => handleCopyUrl(tableNum)}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-1 border-none cursor-pointer"
                    title="접속 주소 복사"
                  >
                    {copiedId === tableNum ? "복사됨!" : "주소복사"}
                  </button>

                  <a
                    href={`/table-order/${tableNum}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center shrink-0 border-none cursor-pointer"
                    title="새 탭에서 1번 테이블 오더 미리보기"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
