import React from "react";
import { X, Building2, Sparkles, RefreshCw, Plus, ShieldAlert, Check, Info } from "lucide-react";
import { PartnerForm, OcrResult } from "../types";

interface PartnerFormModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  modalMode: 'create' | 'edit';
  form: PartnerForm;
  setForm: React.Dispatch<React.SetStateAction<PartnerForm>>;
  isOcrAnalyzing: boolean;
  ocrResult: OcrResult | null;
  fileDragOver: boolean;
  setFileDragOver: (val: boolean) => void;
  handleFileUpload: (file: File) => Promise<void>;
  handleSavePartner: (e: React.FormEvent) => Promise<void>;
  // 📇 명함 관리 AI Props
  contacts: any[];
  isCardAnalyzing: boolean;
  handleCardUpload: (file: File) => Promise<void>;
}

export function PartnerFormModal({
  isModalOpen,
  setIsModalOpen,
  modalMode,
  form,
  setForm,
  isOcrAnalyzing,
  ocrResult,
  fileDragOver,
  setFileDragOver,
  handleFileUpload,
  handleSavePartner,
  // 📇 명함 관리 AI Props
  contacts,
  isCardAnalyzing,
  handleCardUpload
}: PartnerFormModalProps) {
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-955/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form 
        onSubmit={handleSavePartner}
        className="bg-white rounded-[32px] max-w-xl w-full p-6 md:p-8 shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-scale-up"
      >
        <button 
          type="button" 
          onClick={() => setIsModalOpen(false)} 
          className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors border-none bg-transparent cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-emerald-500" />
          <span>B2B 거래처 회원 {modalMode === 'create' ? '신규 등록' : '정보 수정'}</span>
        </h3>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          
          {/* 🛠️ AI 사업자등록증 자동 완성 업로더 (이미지 및 PDF 동시 대응) */}
          {modalMode === 'create' && (
            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl space-y-3 shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                B2B 바이어 사업자등록증 자동 완성 (AI OCR)
              </span>

              {isOcrAnalyzing ? (
                // 🌀 AI 지능형 판독 중 로딩 스켈레톤 및 스캔 이펙트
                <div className="border border-indigo-200 bg-indigo-50/20 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 animate-pulse relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-cyan-400 animate-shimmer"></div>
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                  <div>
                    <span className="text-xs font-black text-slate-700 block">AI 엔진이 사업자등록증 문서를 정밀 스캔 중입니다...</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">사진(JPG, PNG) 및 PDF 전자문서의 텍스트와 레이아웃을 고밀도 판독하고 있습니다.</span>
                  </div>
                </div>
              ) : (
                // 📂 드래그 앤 드롭 파일 업로드 드롭존
                <div
                  onDragOver={(e) => { e.preventDefault(); setFileDragOver(true); }}
                  onDragLeave={() => setFileDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setFileDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => document.getElementById('business-license-uploader')?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    fileDragOver
                      ? 'border-emerald-500 bg-emerald-50/30'
                      : 'border-slate-200 hover:border-slate-350 hover:bg-slate-55'
                  }`}
                >
                  <Plus className="w-6 h-6 text-slate-400 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black text-slate-700 block">이곳에 사업자등록증 파일(이미지/PDF) 드롭 또는 클릭 업로드</span>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1.5">
                    지원 포맷: JPG, PNG, PDF 전자문서 (최대 10MB)
                  </span>
                  <input
                    type="file"
                    id="business-license-uploader"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </div>
              )}

              {/* 🟢/🟡 AI 분석 및 중복/변경 판정 스마트 피드백 배너 */}
              {ocrResult && (
                <div className="space-y-3">
                  
                  {/* 🛡️ 국세청 & 로컬 체크섬 2중 검증 결과 피드백 패널 */}
                  <div className={`p-3.5 rounded-xl border text-xs font-semibold space-y-2 shrink-0 ${
                    !ocrResult.checksum.isValid
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : ocrResult.nts.status === 'CLOSED'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : ocrResult.nts.status === 'SUSPENDED'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : ocrResult.nts.status === 'ACTIVE'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100/50 font-black">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className={`w-4 h-4 ${!ocrResult.checksum.isValid || ocrResult.nts.status === 'CLOSED' ? 'text-rose-500' : 'text-slate-500'}`} />
                        국세청 실시간 가동 및 진위 확인
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        !ocrResult.checksum.isValid
                          ? 'bg-rose-500 text-white border border-rose-500'
                          : ocrResult.nts.status === 'CLOSED'
                          ? 'bg-rose-500 text-white border border-rose-500'
                          : ocrResult.nts.status === 'SUSPENDED'
                          ? 'bg-amber-500 text-white border border-amber-500'
                          : ocrResult.nts.status === 'ACTIVE'
                          ? 'bg-emerald-500 text-white border border-emerald-500'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {!ocrResult.checksum.isValid
                          ? '체크섬 오류'
                          : ocrResult.nts.status === 'CLOSED'
                          ? '폐업 사업자'
                          : ocrResult.nts.status === 'SUSPENDED'
                          ? '휴업 사업자'
                          : ocrResult.nts.status === 'ACTIVE'
                          ? '정상 가동중'
                          : '미확인'}
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 leading-relaxed text-[10px] font-bold">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>1차 로컬 무오류 검증 (Checksum)</span>
                        <span className={ocrResult.checksum.isValid ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold'}>
                          {ocrResult.checksum.message}
                        </span>
                      </div>

                      <div className="flex justify-between items-start text-slate-400 gap-4">
                        <span>2차 국세청 실시간 계속사업 여부</span>
                        <span className={`text-right ${
                          ocrResult.nts.status === 'ACTIVE'
                            ? 'text-emerald-600 font-extrabold'
                            : ocrResult.nts.status === 'CLOSED' || ocrResult.nts.status === 'NOT_FOUND'
                            ? 'text-rose-600 font-extrabold'
                            : 'text-slate-650'
                        }`}>
                          {ocrResult.nts.statusText}
                        </span>
                      </div>

                      {ocrResult.nts.taxType && (
                        <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-100/50">
                          <span>과세 사업 유형</span>
                          <span className="text-slate-655 font-black">{ocrResult.nts.taxType}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {ocrResult.status === 'NEW_PARTNER' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-800 font-semibold leading-relaxed">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block">신규 사업자 스캔 완료</span>
                        <span className="text-[10px] text-emerald-600 block mt-0.5">등록된 이력이 없는 안전한 신규 바이어입니다. 주입된 상세 폼을 검토하신 후 등록해 주세요.</span>
                      </div>
                    </div>
                  )}

                  {ocrResult.status === 'ALREADY_REGISTERED' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-800 font-semibold leading-relaxed">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block">기등록 거래처 정보와 일치</span>
                        <span className="text-[10px] text-blue-600 block mt-0.5">이미 등록된 거래처로서 중복 등록이 차단됩니다.</span>
                      </div>
                    </div>
                  )}

                  {ocrResult.status === 'UPDATE_PARTNER' && ocrResult.diff && (
                    <div className="space-y-2 shrink-0">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800 font-semibold leading-relaxed">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold block">기등록 사업자 정보 변동 감지</span>
                          <span className="text-[10px] text-amber-600 block mt-0.5">
                            이미 등록된 사업자번호이지만, 대표명/본점주소/상호명 변동이 감지되었습니다. <b>기존 누적 실적 이력을 그대로 승계·유지하며 정보를 최신화</b>합니다.
                          </span>
                        </div>
                      </div>

                      {/* 📊 신/구 대조 표 (Diff Viewer) */}
                      <div className="border border-slate-100 bg-white rounded-xl overflow-hidden shadow-3xs text-[10px] font-bold">
                        <div className="grid grid-cols-3 bg-slate-50 text-slate-400 p-2 border-b border-slate-100 uppercase tracking-wider text-center">
                          <div>구분 항목</div>
                          <div>기존 정보 (기록값)</div>
                          <div>신규 정보 (등록증 스캔)</div>
                        </div>
                        <div className="divide-y divide-slate-50">
                          <div className="grid grid-cols-3 p-2 text-center items-center">
                            <div className="text-slate-500">상호 / 회사명</div>
                            <div className="text-slate-400 truncate">{ocrResult.diff.companyName.old}</div>
                            <div className={ocrResult.diff.companyName.changed ? "text-amber-600 font-extrabold underline decoration-amber-400" : "text-slate-650"}>
                              {ocrResult.diff.companyName.new}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 p-2 text-center items-center">
                            <div className="text-slate-500">대표자 성함</div>
                            <div className="text-slate-400 truncate">{ocrResult.diff.representative.old}</div>
                            <div className={ocrResult.diff.representative.changed ? "text-amber-600 font-extrabold underline decoration-amber-400" : "text-slate-650"}>
                              {ocrResult.diff.representative.new}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 p-2 text-center items-center">
                            <div className="text-slate-500">본점 소재 주소</div>
                            <div className="text-slate-400 truncate text-left pl-1">{ocrResult.diff.address.old}</div>
                            <div className={ocrResult.diff.address.changed ? "text-amber-600 font-extrabold text-left pl-1 underline decoration-amber-400" : "text-slate-650 text-left pl-1"}>
                              {ocrResult.diff.address.new}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 구분 필드 */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">거래처 구분 (중복 선택 가능)</label>
            <div className="flex gap-2">
              {(['VENDOR', 'BUYER', 'AFFILIATE'] as const).map((m) => {
                const isSelected = form.type ? form.type.split(',').includes(m) : false;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const currentTypes = form.type ? form.type.split(',').filter(Boolean) : [];
                      let nextTypes: string[];
                      if (currentTypes.includes(m)) {
                        if (currentTypes.length === 1) {
                          alert("최소 하나의 거래처 구분은 지정해 주셔야 합니다.");
                          return;
                        }
                        nextTypes = currentTypes.filter(t => t !== m);
                      } else {
                        nextTypes = [...currentTypes, m];
                      }
                      setForm(p => ({ ...p, type: nextTypes.join(',') }));
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border border-slate-200 cursor-pointer ${
                      isSelected ? 'bg-slate-950 border-slate-950 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {m === 'VENDOR' ? '공급처 (Vendor)' : m === 'BUYER' ? '바이어 (Buyer)' : '🤝 관계사'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">상호명 (회사명) *</label>
              <input 
                type="text" 
                value={form.company_name}
                onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                placeholder="상호명 입력"
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold bg-white text-slate-800"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">사업자등록번호</label>
              <input 
                type="text" 
                value={form.business_number}
                onChange={e => setForm(p => ({ ...p, business_number: e.target.value }))}
                placeholder="123-45-67890"
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">대표자 성함</label>
              <input 
                type="text" 
                value={form.representative}
                onChange={e => setForm(p => ({ ...p, representative: e.target.value }))}
                placeholder="대표자 이름"
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">대표 연락처</label>
              <input 
                type="text" 
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="02-123-4567"
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">팩스 번호</label>
              <input 
                type="text" 
                value={form.fax}
                onChange={e => setForm(p => ({ ...p, fax: e.target.value }))}
                placeholder="02-123-4568"
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">계산서 수령 이메일</label>
              <input 
                type="email" 
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="tax@partner.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold bg-white text-slate-800"
              />
            </div>
          </div>

          {/* B2B 담당자 정보 */}
          <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100/50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">대표 담당자 명세</span>
              
              {/* 📷 명함 사진 업로드 AI 스캔 */}
              {modalMode === 'create' && (
                <div className="relative">
                  <button
                    type="button"
                    disabled={isCardAnalyzing}
                    onClick={() => document.getElementById('card-uploader')?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black border-none cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Sparkles className={`w-3 h-3 ${isCardAnalyzing ? 'animate-spin' : ''}`} />
                    <span>{isCardAnalyzing ? '스캔 중...' : '📷 명함 자동 입력'}</span>
                  </button>
                  <input
                    type="file"
                    id="card-uploader"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0] && handleCardUpload) {
                        handleCardUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              <div className="relative">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">담당자 성함</label>
                <input 
                  type="text" 
                  value={form.manager_name}
                  onChange={e => setForm(p => ({ ...p, manager_name: e.target.value }))}
                  placeholder="실무자 이름"
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">담당자 연락처</label>
                <input 
                  type="text" 
                  value={form.manager_phone}
                  onChange={e => setForm(p => ({ ...p, manager_phone: e.target.value }))}
                  placeholder="010-0000-0000"
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">담당자 직급</label>
                <input 
                  type="text" 
                  value={form.manager_position}
                  onChange={e => setForm(p => ({ ...p, manager_position: e.target.value }))}
                  placeholder="과장/부장"
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">담당자 이메일</label>
                <input 
                  type="email" 
                  value={form.manager_email}
                  onChange={e => setForm(p => ({ ...p, manager_email: e.target.value }))}
                  placeholder="manager@partner.com"
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* 여신 및 우대 등급 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">거래 우대 등급</label>
              <select
                value={form.vip_level}
                onChange={e => setForm(p => ({ ...p, vip_level: e.target.value as 'NORMAL' | 'VIP' }))}
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 bg-white"
              >
                <option value="NORMAL">NORMAL (일반 거래처)</option>
                <option value="VIP">VIP (단골 우대 등급 - 견적 추가 5% 할인 자동반영)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">B2B 여신(외상) 한도액</label>
              <input 
                type="number" 
                value={form.credit_limit}
                onChange={e => setForm(p => ({ ...p, credit_limit: parseInt(e.target.value) || 0 }))}
                placeholder="외상 한도 금액"
                className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">회사 주소</label>
            <input 
              type="text" 
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              placeholder="사업장 소재지 주소"
              className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold bg-white text-slate-800"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold block mb-1">거래 특이 사항 / 메모</label>
            <textarea 
              value={form.memo}
              onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
              placeholder="예: 월말 일괄 정산 조건, 전속 계약 공급사 등 기입"
              className="w-full h-16 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none resize-none bg-white text-slate-800"
            />
          </div>

        </div>

        <div className="mt-6 border-t border-slate-100 pt-4 flex gap-3">
          <button 
            type="button" 
            onClick={() => setIsModalOpen(false)} 
            className="flex-1 py-3 bg-slate-150 hover:bg-slate-200 rounded-xl font-bold text-xs border-none cursor-pointer"
          >
            닫기
          </button>
          <button 
            type="submit"
            disabled={
              ocrResult?.status === 'ALREADY_REGISTERED' || 
              ocrResult?.checksum?.isValid === false || 
              ocrResult?.nts?.status === 'CLOSED' ||
              ocrResult?.nts?.status === 'NOT_FOUND'
            }
            className={`flex-1 py-3 text-white font-bold text-xs rounded-xl transition-all border-none cursor-pointer ${
              ocrResult?.status === 'ALREADY_REGISTERED' || ocrResult?.checksum?.isValid === false || ocrResult?.nts?.status === 'CLOSED' || ocrResult?.nts?.status === 'NOT_FOUND'
                ? 'bg-slate-200 text-slate-400 border-none cursor-not-allowed'
                : ocrResult?.status === 'UPDATE_PARTNER'
                ? 'bg-amber-650 hover:bg-amber-600 shadow-md shadow-amber-650/10'
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {ocrResult?.checksum?.isValid === false
              ? '체크섬 오류 (등록 불가)'
              : ocrResult?.nts?.status === 'CLOSED'
              ? '폐업한 사업자 (등록 불가) 🔴'
              : ocrResult?.nts?.status === 'NOT_FOUND'
              ? '국세청 미등록 (등록 불가) ❌'
              : ocrResult?.status === 'UPDATE_PARTNER'
              ? '기존 거래처 변동 갱신 승인 ⚡'
              : ocrResult?.status === 'ALREADY_REGISTERED'
              ? '이미 기등록된 거래처 🟢'
              : modalMode === 'create'
              ? '거래처 등록 승인'
              : '정보 수정 완수'}
          </button>
        </div>
      </form>
    </div>
  );
}
