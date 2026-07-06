import React, { useState } from 'react';
import { ArrowRightLeft, Printer } from 'lucide-react';
import { InventoryLog } from '../types';
import { InboundDetailModal } from './InboundDetailModal';

interface InventoryLogTableProps {
  logs: InventoryLog[];
}

export const InventoryLogTable: React.FC<InventoryLogTableProps> = ({ logs }) => {
  const [selectedInboundId, setSelectedInboundId] = useState<string | null>(null);
  const safeLogs = Array.isArray(logs) ? logs : [];

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

  const openBase64InNewTab = (fileUrl: string) => {
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

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
            <span>실시간 시계열 입출고 변동 로그</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            재고 수량 보정, 구매 입고, 주문 출고 등 모든 재고의 흐름이 영구 기록된 데이터 피드입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open("/estimates/web-view?type=inventory_inout", "_blank")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-xl shadow-md transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400" />
            웹뷰 대장 내역
          </button>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200">
            총 {safeLogs.length}개 로그 기록됨
          </span>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
        {safeLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            현재고 변동 내역이 아직 존재하지 않습니다.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 sticky top-0 z-10">
                <th className="py-3 px-4 bg-slate-50">일시</th>
                <th className="py-3 px-4 bg-slate-50">품목명</th>
                <th className="py-3 px-4 bg-slate-50">품목코드</th>
                <th className="py-3 px-4 bg-slate-50">품목 구분</th>
                <th className="py-3 px-4 text-center bg-slate-50">변동 종류</th>
                <th className="py-3 px-4 text-right bg-slate-50">수량</th>
                <th className="py-3 px-4 text-right bg-slate-50">단가</th>
                <th className="py-3 px-4 bg-slate-50">담당자</th>
                <th className="py-3 px-4 bg-slate-50">변동 메모 및 AI 분석 사유</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {safeLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {new Date(log.createdAt).toLocaleString('ko-KR', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{log.itemName}</td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{log.itemBarcode || `INV-${log.itemId}`}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      ((log.itemType as string) === '원부자재' || (log.itemType as string) === '자재' || log.itemType === 'material')
                        ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {((log.itemType as string) === '원부자재' || (log.itemType as string) === '자재' || log.itemType === 'material') ? '원부자재' : '완제품'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold ${
                      log.changeType === 'in'
                        ? 'bg-blue-100 text-blue-700'
                        : log.changeType === 'out'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {log.changeType === 'in' ? '입고' : log.changeType === 'out' ? '출고' : '실사조정'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    <span className={
                      log.changeType === 'in' 
                        ? 'text-blue-600' 
                        : log.changeType === 'out' 
                        ? 'text-rose-600' 
                        : 'text-purple-600'
                    }>
                      {log.changeType === 'in' ? '+' : log.changeType === 'out' ? '-' : ''}
                      {Math.abs(log.quantity).toLocaleString()} 개
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-600">
                    ₩ {log.price.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{log.operator}</td>
                  <td className="py-3 px-4 text-slate-550 max-w-[280px]" title={log.note || ''}>
                    {(() => {
                      const noteText = log.note || '';
                      const proofMatch = noteText.match(/\(증빙:\s*([^\)]+)\)/);
                      const proofPath = proofMatch ? proofMatch[1] : null;
                      
                      const inboundMatch = noteText.match(/inboundId:\s*(INB-\w+)/);
                      const inboundId = inboundMatch ? inboundMatch[1] : null;

                      let cleanNote = proofMatch ? noteText.replace(proofMatch[0], '').trim() : noteText;
                      if (inboundMatch) {
                        cleanNote = cleanNote.replace(inboundMatch[0], '').replace(/\(\s*\)/, '').trim();
                        cleanNote = cleanNote.replace(/\s*\|\s*$/, '').trim();
                      }
                      // 과거 데이터 소급 적용: [자율 입고 요약] 접두사 공백 치환 제거
                      cleanNote = cleanNote.replace(/^\[자율 입고 요약\]\s*/, '').trim();

                      return (
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="truncate flex-1" title={cleanNote}>{cleanNote || '-'}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {inboundId && (
                              <button
                                onClick={() => setSelectedInboundId(inboundId)}
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 rounded-md text-[9px] font-extrabold border border-emerald-150 transition-colors cursor-pointer"
                                title="일괄 입고 상세 품목 조회"
                              >
                                🔍 상세 조회
                              </button>
                            )}
                            {proofPath && (
                              (() => {
                                const isDocOrImg = 
                                  proofPath.startsWith('data:') || 
                                  proofPath.startsWith('http') || 
                                  proofPath.includes('/uploads/') || 
                                  /\.(pdf|png|jpg|jpeg|gif)$/i.test(proofPath);

                                return isDocOrImg ? (
                                  <button
                                    onClick={() => openBase64InNewTab(proofPath)}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 hover:text-indigo-800 rounded-md text-[9px] font-extrabold border border-indigo-100 transition-colors cursor-pointer"
                                    title="자율입고 증빙 파일 조회"
                                  >
                                    📄 증빙 조회
                                  </button>
                                ) : (proofPath.endsWith('.xlsx') || proofPath.endsWith('.xls') || proofPath.includes('excel')) ? (
                                  <span 
                                    className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[9px] font-extrabold border border-emerald-150"
                                    title={`엑셀 파일 업로드 건: ${proofPath}`}
                                  >
                                    EXCEL
                                  </span>
                               ) : (
                                 <span 
                                   className="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[9px] font-extrabold border border-slate-200"
                                   title={`수동/일반 기록: ${proofPath}`}
                                 >
                                   일반
                                 </span>
                               );
                             })()
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedInboundId && (
        <InboundDetailModal 
          inboundId={selectedInboundId} 
          onClose={() => setSelectedInboundId(null)} 
        />
      )}

    </div>
  );
};
