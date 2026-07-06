import React from "react";
import { FileText, Link2, Sparkles, RefreshCw } from "lucide-react";
import { NaverIcon } from "./ShortsHeader";
import { SAMPLE_BLOG_POSTS, VideoTone, TargetAge } from "../types";

interface ShortsInputPanelProps {
  activeInputTab: 'text' | 'blog';
  setActiveInputTab: (tab: 'text' | 'blog') => void;
  productName: string;
  setProductName: (name: string) => void;
  productDetails: string;
  setProductDetails: (details: string) => void;
  blogUrl: string;
  setBlogUrl: (url: string) => void;
  selectedBlogSample: number | null;
  handleSelectBlogSample: (index: number) => void;
  videoTone: VideoTone;
  setVideoTone: (tone: VideoTone) => void;
  targetAge: TargetAge;
  setTargetAge: (age: TargetAge) => void;
  isGenerating: boolean;
  handleGenerateShorts: () => void;
}

export default function ShortsInputPanel({
  activeInputTab,
  setActiveInputTab,
  productName,
  setProductName,
  productDetails,
  setProductDetails,
  blogUrl,
  setBlogUrl,
  selectedBlogSample,
  handleSelectBlogSample,
  videoTone,
  setVideoTone,
  targetAge,
  setTargetAge,
  isGenerating,
  handleGenerateShorts
}: ShortsInputPanelProps) {
  return (
    <div className="space-y-6 text-left">
      {/* 1. 입력 소스 채널 탭 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => setActiveInputTab('text')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer border-none ${
            activeInputTab === 'text'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 bg-transparent'
          }`}
        >
          <FileText className="w-4.5 h-4.5" />
          <span>📝 상품 정보 직접 입력</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveInputTab('blog')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer border-none ${
            activeInputTab === 'blog'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 bg-transparent'
          }`}
        >
          <NaverIcon className="w-4 h-4" />
          <span>🔗 블로그 포스트 연동 요약</span>
        </button>
      </div>

      {/* 2. 입력 폼 세션 */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
        {activeInputTab === 'text' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">상품 및 타겟 브랜드 명칭</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="예: 에어제트 초경량 청소기, 써모글로우 텀블러"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">핵심 강점 및 판매 포인트 명세</label>
              <textarea
                value={productDetails}
                onChange={(e) => setProductDetails(e.target.value)}
                rows={4}
                placeholder="쇼츠 영상에 들어갈 장점, 기능, 혜택을 3줄 이상 적어주세요. AI가 리드미컬하고 재치있게 대본을 짜드립니다."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800 font-medium"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">네이버 블로그 포스트 URL 주소</label>
                <span className="text-[11px] text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded-full">실시간 자동파싱 지원</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    value={blogUrl}
                    onChange={(e) => setBlogUrl(e.target.value)}
                    placeholder="https://blog.naver.com/아이디/글번호"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 샘플 블로그 링크 빠른 선택 */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="block text-xs font-bold text-slate-500 mb-2.5">💡 빠른 테스트를 위한 샘플 블로그 포스트 선택</span>
              <div className="flex flex-col gap-2">
                {SAMPLE_BLOG_POSTS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectBlogSample(idx)}
                    className={`text-left p-2.5 rounded-xl text-xs transition-all border cursor-pointer ${
                      selectedBlogSample === idx
                        ? 'bg-white border-red-500 text-red-600 font-semibold shadow-sm'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="font-bold text-slate-700 block mb-0.5">{sample.title}</span>
                    <span className="text-slate-400 block truncate">{sample.content}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI 파라미터 세부 튜너 */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">비디오 톤앤매너</label>
            <select
              value={videoTone}
              onChange={(e) => setVideoTone(e.target.value as VideoTone)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-medium text-sm text-slate-700 cursor-pointer"
            >
              <option value="review">🤩 실사용 리얼 퀵리뷰</option>
              <option value="humor">😂 유머 가미 병맛 후기</option>
              <option value="story">📖 흥미진진한 스토리텔링</option>
              <option value="information">💡 꿀팁 대방출 정보형</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">타겟 독자층 연령</label>
            <select
              value={targetAge}
              onChange={(e) => setTargetAge(e.target.value as TargetAge)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-medium text-sm text-slate-700 cursor-pointer"
            >
              <option value="all">🌐 전연령 남녀노소</option>
              <option value="2030">⚡ 트렌디한 2030 MZ</option>
              <option value="4050">🔥 여유 넘치는 4050 엑스</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateShorts}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-base shadow-lg shadow-red-500/10 hover:shadow-red-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>AI 쇼츠 최적화 대본 생성 중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>AI 1분 쇼츠 최적화 스크립트 생성</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
