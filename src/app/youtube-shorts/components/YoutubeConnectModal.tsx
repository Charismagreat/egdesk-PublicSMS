import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { YoutubeIcon } from "./ShortsHeader";

interface YoutubeConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  youtubeChannelName: string;
  setYoutubeChannelName: (name: string) => void;
  apiClientId: string;
  setApiClientId: (id: string) => void;
  apiClientSecret: string;
  setApiClientSecret: (secret: string) => void;
  handleConnectYoutube: () => void;
}

export default function YoutubeConnectModal({
  isOpen,
  onClose,
  youtubeChannelName,
  setYoutubeChannelName,
  apiClientId,
  setApiClientId,
  apiClientSecret,
  setApiClientSecret,
  handleConnectYoutube
}: YoutubeConnectModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          {/* 모달 본체 */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 z-10 space-y-6 text-left"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-red-600 font-extrabold text-lg">
                  <YoutubeIcon className="w-6 h-6" />
                  <span>EGDESK AI LAB 유튜브 연동 센터</span>
                </div>
                <p className="text-xs text-slate-500">
                  유튜브 공식 API(OAuth 2.0)를 안전하게 연동하여 백엔드 비디오 자동 업로드 채널을 등록합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-all cursor-pointer border-none bg-transparent"
              >
                <Plus className="w-6 h-6 transform rotate-45" />
              </button>
            </div>

            {/* 연동 방법 설명 */}
            <div className="bg-slate-50 rounded-2xl p-4 md:p-4.5 border border-slate-100 space-y-2 text-xs">
              <span className="block font-bold text-slate-800">💡 유튜브 공식 채널 연동 핵심 프로세스</span>
              <ul className="list-decimal list-inside space-y-1.5 text-slate-650 leading-relaxed font-semibold">
                <li>구글 클라우드 콘솔(GCP)에서 새로운 프로젝트를 생성합니다.</li>
                <li>YouTube Data API v3를 활성화한 뒤 OAuth 동의 화면을 설정합니다.</li>
                <li>사용자 인증 정보에서 <span className="font-bold text-red-500">OAuth 2.0 클라이언트 ID</span>를 생성합니다.</li>
                <li>발급된 Client ID와 Secret Key를 아래에 안전하게 세팅해 주세요.</li>
              </ul>
            </div>

            {/* 입력 인풋 영역 */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">유튜브 공식 채널 명칭</label>
                <input
                  type="text"
                  value={youtubeChannelName}
                  onChange={(e) => setYoutubeChannelName(e.target.value)}
                  placeholder="예: EGDESK AI LAB 공식 채널"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-all text-slate-800 font-medium bg-white"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">OAuth 2.0 Client ID</label>
                  <input
                    type="text"
                    value={apiClientId}
                    onChange={(e) => setApiClientId(e.target.value)}
                    placeholder="구글 클라우드 발급 ID 입력"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-xs transition-all font-mono text-slate-800 font-medium bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">OAuth 2.0 Client Secret</label>
                  <input
                    type="password"
                    value={apiClientSecret}
                    onChange={(e) => setApiClientSecret(e.target.value)}
                    placeholder="구글 클라우드 발급 Secret 입력"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-xs transition-all font-mono text-slate-800 font-medium bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 하단 제어 액션 */}
            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all cursor-pointer border-none"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConnectYoutube}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer border-none"
              >
                안전하게 공식 채널 연동
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
