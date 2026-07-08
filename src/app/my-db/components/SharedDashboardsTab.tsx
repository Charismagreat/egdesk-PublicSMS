"use client";

import React from "react";
import { Link, RefreshCw, ShieldAlert, Copy, ExternalLink, Trash2 } from "lucide-react";

export interface SharedDashboardsTabProps {
  sharedViewsList: any[];
  isSharedViewsLoading: boolean;
  fetchSharedViews: () => Promise<void>;
  handleDeleteSharedView: (viewId: string, friendlyName: string) => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "warn") => void;
}

export default function SharedDashboardsTab({
  sharedViewsList,
  isSharedViewsLoading,
  fetchSharedViews,
  handleDeleteSharedView,
  showToast,
}: SharedDashboardsTabProps) {
  return (
    <div className="p-5 space-y-6 animate-fade-in text-slate-700">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <h4 className="text-[11px] font-black text-slate-400 flex items-center gap-1">
          <Link className="w-3.5 h-3.5 text-teal-500" />
          공유된 보안 데이터 뷰 일괄 관리
        </h4>
        <button
          onClick={fetchSharedViews}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-650 border border-slate-200 rounded-xl text-[10px] font-black cursor-pointer shadow-3xs transition-all active:scale-95 border-none outline-none"
        >
          <RefreshCw className={`w-3 h-3 ${isSharedViewsLoading ? "animate-spin" : ""}`} />
          목록 새로고침
        </button>
      </div>

      {/* 안내 배너 */}
      <div className="bg-gradient-to-r from-teal-50/60 to-emerald-50/40 border border-teal-100 rounded-2xl p-4 flex gap-3 items-start shadow-3xs animate-fade-in">
        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-4.5 h-4.5 text-teal-600 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h5 className="text-xs font-extrabold text-teal-900">💡 안전한 데이터 공유 뷰 (Data Shared View) 가이드</h5>
          <p className="text-[11px] text-slate-650 leading-relaxed font-medium">
            데이터 공유 뷰는 원본 물리 DB 테이블의 모든 정보를 노출하지 않고, 최고관리자가 허용한 컬럼들만 한글화하여 안전하게 조회할 수 있도록 웹 서비스화한 링크입니다.
            보안 유지를 위해 <span className="font-extrabold text-rose-600">비밀번호, 소프트삭제시점, 토큰</span> 등 민감한 개인정보/민감정보는 자동 차단(마스킹) 처리되며,
            관리 목적으로 언제든지 즉각 폐쇄(Revoke)할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 로딩 스피너 및 테이블 레이아웃 */}
      {isSharedViewsLoading ? (
        <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-8 h-8 text-teal-500 animate-spin" />
          <span className="text-xs font-extrabold text-slate-400">데이터베이스 내 활성 공유 뷰를 스캔하고 있습니다...</span>
        </div>
      ) : sharedViewsList.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
            <Link className="w-6 h-6 text-slate-300" />
          </div>
          <div className="space-y-1">
            <h6 className="text-xs font-extrabold text-slate-600">개설된 데이터 공유 뷰가 없습니다.</h6>
            <p className="text-[10px] text-slate-400">레코드 데이터 탭 또는 상단의 테이블 액션에서 '데이터 공유 뷰 생성'을 클릭하여 첫 링크를 발행해 보세요!</p>
          </div>
        </div>
      ) : (
        <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-3xs bg-white">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-black">한글 명칭 (별칭)</th>
                  <th className="py-3.5 px-4 font-black">원본 물리 테이블</th>
                  <th className="py-3.5 px-4 font-black">보안 컬럼 수</th>
                  <th className="py-3.5 px-4 font-black">생성일시</th>
                  <th className="py-3.5 px-4 font-black text-center w-[130px]">액션 제어</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sharedViewsList.map((view) => {
                  let columnCount = 0;
                  try {
                    const mappings = JSON.parse(view.column_mappings || "[]");
                    columnCount = mappings.filter((c: any) => c.visible).length;
                  } catch (e) {}

                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const shareUrl = `${origin}/shared/view/${view.share_hash}`;

                  return (
                    <tr key={view.view_id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-4 font-extrabold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          {view.friendly_table_name}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-500 font-mono text-[11px]">
                        {view.source_table}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-500">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold text-[10px]">
                          {columnCount}개 노출
                        </span>
                        {view.allow_csv_download === 1 && (
                          <span className="ml-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-bold text-[10px]">
                            CSV 허용
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-400 font-mono text-[10px]">
                        {view.created_at ? new Date(view.created_at).toLocaleString("ko-KR") : "-"}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* 클립보드 복사 */}
                          <button
                            onClick={() => {
                              if (typeof navigator !== "undefined") {
                                navigator.clipboard.writeText(shareUrl);
                                showToast("📋 공유 뷰 URL이 성공적으로 클립보드에 복사되었습니다!", "success");
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl cursor-pointer shadow-3xs transition-all active:scale-95 border-solid"
                            title="주소 복사"
                          >
                            <Copy className="w-4 h-4 text-slate-400" />
                          </button>

                          {/* 바로가기 */}
                          <button
                            onClick={() => {
                              if (typeof window !== "undefined") {
                                window.open(shareUrl, "_blank");
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-indigo-700 rounded-xl cursor-pointer border-none shadow-3xs transition-all active:scale-95"
                            title="공유 뷰 페이지 보러가기"
                          >
                            <ExternalLink className="w-4 h-4 text-indigo-500" />
                          </button>

                          {/* 뷰 폐쇄 (삭제) */}
                          <button
                            onClick={() => handleDeleteSharedView(view.view_id, view.friendly_table_name)}
                            className="w-8 h-8 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 hover:border-rose-200 rounded-xl cursor-pointer shadow-3xs transition-all active:scale-95 border-solid"
                            title="공유 뷰 즉시 폐쇄"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
