import React from "react";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { Partner } from "../types";

interface PartnerTableProps {
  loading: boolean;
  activeTab: 'VENDOR' | 'BUYER' | 'AFFILIATE';
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filteredPartners: Partner[];
  openDetailPopup: (pt: Partner) => void;
  handleEditClick: (pt: Partner, e: React.MouseEvent) => void;
  handleCreateClick: () => void;
  handleDeletePartner: (pt: Partner, e: React.MouseEvent) => void;
  // 🔍 AI 위해 모니터링 Props 추가
  openAnalysisPopup: (pt: Partner, e: React.MouseEvent) => void;
}

export function PartnerTable({
  loading,
  activeTab,
  searchQuery,
  setSearchQuery,
  filteredPartners,
  openDetailPopup,
  handleEditClick,
  handleCreateClick,
  handleDeletePartner,
  // 🔍 AI 위해 모니터링 Props 추가
  openAnalysisPopup
}: PartnerTableProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
      
      {/* 검색 및 추가 버튼 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="거래처명, 대표명, 담당자명, 번호로 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 focus:border-emerald-500 rounded-xl outline-none text-xs font-semibold text-slate-800"
          />
        </div>

        <button
          onClick={handleCreateClick}
          className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-slate-900/10 border-none cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          신규 {activeTab === 'VENDOR' ? '공급사' : '바이어'} 등록
        </button>
      </div>

      {/* 메인 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-semibold border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400">
              <th className="py-3 px-3">코드</th>
              <th className="py-3 px-3">상호명 / 대표자</th>
              <th className="py-3 px-3">B2B 담당자</th>
              <th className="py-3 px-3">계산서 이메일</th>
              <th className="py-3 px-3">우대 등급</th>
              <th className="py-3 px-3">누적 거래액</th>
              <th className="py-3 px-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">거래처 목록 분석 중...</td>
              </tr>
            ) : filteredPartners.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  등록된 {activeTab === 'VENDOR' ? '공급처가' : activeTab === 'BUYER' ? '바이어가' : '관계사가'} 없습니다.
                </td>
              </tr>
            ) : (
              filteredPartners.map(pt => (
                <tr 
                  key={pt.id} 
                  onClick={() => openDetailPopup(pt)}
                  className="border-b border-slate-55 hover:bg-slate-50/50 cursor-pointer transition-colors"
                >
                  <td className="py-4 px-3 font-mono text-slate-500">{pt.id}</td>
                  <td className="py-4 px-3">
                    <span className="font-extrabold text-slate-800 block">{pt.company_name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      대표: {pt.representative || '미기입'} | {pt.business_number || '사업자 없음'}
                    </span>
                  </td>
                  <td className="py-4 px-3">
                    <span className="font-bold text-slate-700 block">{pt.manager_name || '미지정'}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{pt.manager_phone || pt.phone}</span>
                  </td>
                  <td className="py-4 px-3 text-slate-500 font-mono">{pt.email || '계산서 미발행'}</td>
                  <td className="py-4 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      pt.type === 'AFFILIATE'
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        : pt.vip_level === 'VIP'
                        ? 'bg-amber-100 text-amber-600 border border-amber-200' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {pt.type === 'AFFILIATE' ? '🤝 관계사' : pt.vip_level}
                    </span>
                  </td>
                  <td className="py-4 px-3">
                    <span className="font-extrabold text-indigo-600">{(pt.total_performance || 0).toLocaleString()}원</span>
                    {pt.pending_count! > 0 && (
                      <span className="text-[9px] bg-rose-50 text-rose-500 border border-rose-100 px-1.5 py-0.2 rounded ml-1.5 font-bold">
                        외상 {pt.pending_count}건
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-3 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={(e) => openAnalysisPopup(pt, e)}
                        className="flex items-center gap-1.5 py-1.5 px-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border-none cursor-pointer text-[10px] font-black shrink-0"
                        title="AI 위해 분석"
                      >
                        🔍 AI 분석
                      </button>
                      <button 
                        onClick={(e) => handleEditClick(pt, e)}
                        className="p-1.5 bg-slate-100 text-slate-650 hover:bg-slate-200 rounded-lg transition-colors border-none cursor-pointer"
                        title="수정"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleDeletePartner(pt, e)}
                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors border-none cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
