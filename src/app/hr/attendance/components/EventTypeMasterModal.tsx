import React, { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EventType } from "../types";

// 일정 유형 마스터 모달 Props 정의
interface EventTypeMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTypes: EventType[];
  handleCreateEventType: (typeName: string, colorTheme: string) => Promise<void>;
  handleDeleteEventType: (typeKey: string) => Promise<void>;
  submitLoading: boolean;
  typeError: string | null;
  setTypeError: (err: string | null) => void;
}

export const EventTypeMasterModal: React.FC<EventTypeMasterModalProps> = ({
  isOpen,
  onClose,
  eventTypes,
  handleCreateEventType,
  handleDeleteEventType,
  submitLoading,
  typeError,
  setTypeError,
}) => {
  // 내부 폼 상태
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("Indigo");

  // 열리거나 닫힐 때 폼 초기화
  useEffect(() => {
    if (isOpen) {
      setNewTypeName("");
      setNewTypeColor("Indigo");
      setTypeError(null);
    }
  }, [isOpen, setTypeError]);

  const onCreateSubmit = async () => {
    if (!newTypeName.trim()) {
      alert("일정 유형 이름을 기입해 주세요.");
      return;
    }
    await handleCreateEventType(newTypeName, newTypeColor);
    setNewTypeName("");
    setNewTypeColor("Indigo");
  };

  const handleModalClose = () => {
    setNewTypeName("");
    setNewTypeColor("Indigo");
    setTypeError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-3xs flex items-center justify-center z-[60] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-100 shadow-2xl relative block text-slate-800"
          >
            {/* 닫기 버튼 */}
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0 p-0"
              type="button"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                ⚙️ 일정 유형 동적 마스터 관리
              </h4>
              <p className="text-[10px] text-slate-400 font-bold">
                최고관리자가 실시간으로 일정을 분류하는 마스터 유형을 생성/삭제 제어합니다.
              </p>
            </div>

            {/* 에러 피드백 배너 */}
            {typeError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-2xs font-bold leading-relaxed flex flex-col gap-1"
              >
                <span className="flex items-center gap-1 font-black text-[10px] text-rose-700">
                  ⚠️ 무결성 락 검증 안내
                </span>
                <span>{typeError}</span>
              </motion.div>
            )}

            {/* 1. 유형 목록 */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">
                현재 등록된 일정 유형 리스트 ({eventTypes.length}개)
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                {eventTypes.map((t) => {
                  let badgeStyle = "bg-slate-50 border-slate-200 text-slate-700";
                  if (t.color_theme === 'Indigo') badgeStyle = "bg-indigo-50 border-indigo-100 text-indigo-705";
                  else if (t.color_theme === 'Rose') badgeStyle = "bg-rose-50 border-rose-100 text-rose-600";
                  else if (t.color_theme === 'Amber') badgeStyle = "bg-amber-50 border-amber-100 text-amber-700";
                  else if (t.color_theme === 'Purple') badgeStyle = "bg-purple-50 border-purple-100 text-purple-700";
                  else if (t.color_theme === 'Emerald') badgeStyle = "bg-emerald-50 border-emerald-100 text-emerald-700";
                  else if (t.color_theme === 'Cyan') badgeStyle = "bg-cyan-50 border-cyan-100 text-cyan-700";
                  else if (t.color_theme === 'Lime') badgeStyle = "bg-lime-50 border-lime-100 text-lime-700";
                  else if (t.color_theme === 'Teal') badgeStyle = "bg-teal-50 border-teal-100 text-teal-700";
                  else if (t.color_theme === 'Pink') badgeStyle = "bg-pink-50 border-pink-100 text-pink-700";
                  else if (t.color_theme === 'Slate') badgeStyle = "bg-slate-50 border-slate-200 text-slate-700";

                  return (
                    <div key={t.type_key} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${badgeStyle}`}>
                          {t.type_name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono font-bold">
                          {t.type_key.replace('CUSTOM_TYPE_', 'CUSTOM_')}
                        </span>
                      </div>

                      {/* 삭제 단추 */}
                      <button
                        type="button"
                        onClick={() => handleDeleteEventType(t.type_key)}
                        className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg cursor-pointer transition-all shrink-0 border-0 bg-transparent"
                        title="일정 유형 삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
                {eventTypes.length === 0 && (
                  <div className="text-center py-6 text-[10px] text-slate-400 font-bold">
                    등록된 일정 유형이 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 2. 생성 폼 */}
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">🎨 신규 일정 유형 신설</label>
              
              <div className="space-y-1 block">
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="유형 이름 입력 (예: 창립 기념 휴무일, 워크숍)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-800"
                />
              </div>

              {/* 파스텔 컬러 피커 */}
              <div className="space-y-1 block">
                <label className="text-[9px] text-slate-450 block font-bold">색상 테마 선택</label>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {['Indigo', 'Rose', 'Amber', 'Purple', 'Emerald', 'Cyan', 'Lime', 'Teal', 'Pink', 'Slate'].map((color) => {
                    let btnColor = "bg-slate-105 border-slate-200";
                    if (color === 'Indigo') btnColor = "bg-indigo-500 border-indigo-600";
                    else if (color === 'Rose') btnColor = "bg-rose-500 border-rose-600";
                    else if (color === 'Amber') btnColor = "bg-amber-500 border-amber-600";
                    else if (color === 'Purple') btnColor = "bg-purple-500 border-purple-600";
                    else if (color === 'Emerald') btnColor = "bg-emerald-500 border-emerald-600";
                    else if (color === 'Cyan') btnColor = "bg-cyan-500 border-cyan-600";
                    else if (color === 'Lime') btnColor = "bg-lime-500 border-lime-600";
                    else if (color === 'Teal') btnColor = "bg-teal-500 border-teal-600";
                    else if (color === 'Pink') btnColor = "bg-pink-500 border-pink-600";
                    else if (color === 'Slate') btnColor = "bg-slate-500 border-slate-600";

                    const isSelected = newTypeColor === color;

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTypeColor(color)}
                        className={`h-7 rounded-xl border relative cursor-pointer flex items-center justify-center transition-all ${
                          isSelected ? 'ring-2 ring-indigo-500 scale-105 border-white shadow-sm' : 'border-transparent opacity-85 hover:opacity-100'
                        } ${btnColor}`}
                        title={color}
                      >
                        <span className="text-[8px] text-white font-extrabold select-none truncate px-0.5">
                          {color === 'Indigo' ? '인디고' :
                           color === 'Rose' ? '로즈' :
                           color === 'Amber' ? '앰버' :
                           color === 'Purple' ? '퍼플' :
                           color === 'Emerald' ? '에메랄드' :
                           color === 'Cyan' ? '시안' :
                           color === 'Lime' ? '라임' :
                           color === 'Teal' ? '민트' :
                           color === 'Pink' ? '핑크' : '슬레이트'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={onCreateSubmit}
                disabled={submitLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 mt-2 border-0"
              >
                <Plus size={12} />
                새로운 일정 유형 마스터 등록
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
