import React, { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 반려 사유 입력 모달 Props 정의
interface LeaveRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeaveId: string | null;
  handleLeaveDecision: (id: string, action: 'APPROVE' | 'REJECT', rejectReason: string) => Promise<void>;
  submitLoading: boolean;
}

export const LeaveRejectModal: React.FC<LeaveRejectModalProps> = ({
  isOpen,
  onClose,
  selectedLeaveId,
  handleLeaveDecision,
  submitLoading,
}) => {
  // 내부 반려 사유 입력 상태
  const [rejectReason, setRejectReason] = useState("");

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setRejectReason("");
    }
  }, [isOpen]);

  const onRejectSubmit = async () => {
    if (!selectedLeaveId || !rejectReason.trim()) return;
    await handleLeaveDecision(selectedLeaveId, 'REJECT', rejectReason);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-3xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-100 shadow-2xl relative block text-slate-800"
          >
            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0 p-0"
              type="button"
            >
              <X size={18} />
            </button>

            <h4 className="text-sm font-black text-rose-600 flex items-center gap-2 pb-2 border-b border-slate-100">
              <AlertTriangle size={15} />
              연차 신청 결재 반려
            </h4>

            <div className="space-y-3.5 text-xs font-bold text-slate-650">
              <div className="space-y-1 block">
                <label className="text-[10px] text-slate-455 uppercase tracking-widest block font-extrabold">반려 처리 사유 기입</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="직원이 납득할 수 있도록 명확한 반려 사유를 입력하세요."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold resize-none leading-relaxed text-xs text-slate-700"
                />
              </div>

              <button
                onClick={onRejectSubmit}
                disabled={submitLoading || !rejectReason.trim()}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 border-0"
              >
                <X size={12} />
                이 연차 신청을 공식 반려합니다
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
