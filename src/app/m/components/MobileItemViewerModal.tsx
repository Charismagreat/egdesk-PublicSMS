"use client";

import React from "react";
import { X, ExternalLink, Download, FileText, Image as ImageIcon, Music, Link as LinkIcon, Film, Compass } from "lucide-react";

interface MobileItemViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    name?: string;
    title?: string;
    file_name?: string;
    preview?: string;
    url?: string;
    file_url?: string;
    type?: string;
    category?: string;
    content_type?: string;
    isLink?: boolean;
    date?: string;
    created_at?: string;
  } | null;
}

export const MobileItemViewerModal: React.FC<MobileItemViewerModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  if (!isOpen || !item) return null;

  const itemName = item.name || item.title || item.file_name || "수집 자료";
  const itemUrl = item.preview || item.url || item.file_url || "";
  
  const isImage =
    item.type === "IMAGE" ||
    item.category === "IMAGE" ||
    item.content_type?.includes("image") ||
    itemUrl.startsWith("data:image/") ||
    /\.(jpg|jpeg|png|gif|webp|svg|heic)$/i.test(itemName) ||
    /\.(jpg|jpeg|png|gif|webp|svg|heic)$/i.test(itemUrl);

  const isVideo =
    item.type === "VIDEO" ||
    item.category === "VIDEO" ||
    item.content_type?.includes("video") ||
    itemUrl.startsWith("data:video/") ||
    /\.(mp4|mov|avi|webm|mkv|wmv)$/i.test(itemName) ||
    /\.(mp4|mov|avi|webm|mkv|wmv)$/i.test(itemUrl);

  const isAudio = 
    item.type === "AUDIO" || 
    item.category === "AUDIO" ||
    item.content_type?.includes("audio") || 
    itemUrl.startsWith("data:audio/") ||
    /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(itemName) ||
    /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(itemUrl);

  const isCad =
    item.type === "CAD" ||
    item.category === "CAD" ||
    /\.(dwg|dxf|stp|step|iges|igs|sldprt|catpart)$/i.test(itemName) ||
    /\.(dwg|dxf|stp|step|iges|igs|sldprt|catpart)$/i.test(itemUrl);

  const isLink = item.isLink || item.type === "LINK" || itemUrl.startsWith("http://") || itemUrl.startsWith("https://");

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex justify-center items-center z-[80] p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 text-left animate-scale-in max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
            {isImage ? (
              <ImageIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : isVideo ? (
              <Film className="w-5 h-5 text-purple-600 shrink-0" />
            ) : isAudio ? (
              <Music className="w-5 h-5 text-amber-600 shrink-0" />
            ) : isCad ? (
              <Compass className="w-5 h-5 text-indigo-600 shrink-0" />
            ) : isLink ? (
              <LinkIcon className="w-5 h-5 text-amber-500 shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <h3 className="font-extrabold text-sm text-slate-800 truncate">{itemName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 border-none bg-transparent cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 미리보기 영역 */}
        <div className="flex-1 overflow-y-auto min-h-[160px] flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-200/80 p-2">
          {isImage && itemUrl ? (
            <img
              src={itemUrl}
              alt={itemName}
              className="max-h-[320px] max-w-full object-contain rounded-xl shadow-xs"
            />
          ) : isVideo && itemUrl ? (
            <div className="w-full space-y-2 text-center p-2">
              <video controls src={itemUrl} className="w-full max-h-[300px] rounded-xl object-contain bg-black" />
            </div>
          ) : isAudio && itemUrl ? (
            <div className="w-full space-y-2 text-center p-3">
              <Music className="w-10 h-10 text-amber-600 mx-auto animate-bounce" />
              <audio controls src={itemUrl} className="w-full" />
            </div>
          ) : isCad ? (
            <div className="text-center p-4 space-y-3">
              <Compass className="w-12 h-12 text-indigo-600 mx-auto" />
              <div>
                <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold text-[10px] mb-1">
                  CAD 도면 파일
                </span>
                <p className="text-xs font-extrabold text-slate-800">{itemName}</p>
              </div>
              {itemUrl && (
                <a
                  href={itemUrl}
                  download={itemName}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold no-underline shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CAD 도면 다운로드</span>
                </a>
              )}
            </div>
          ) : isLink ? (
            <div className="text-center p-4 space-y-3">
              <LinkIcon className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-xs font-extrabold text-slate-700 break-all">{itemUrl}</p>
              <a
                href={itemUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold no-underline shadow-xs"
              >
                <span>웹 링크 연결하기</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="text-center p-4 space-y-3">
              <FileText className="w-12 h-12 text-blue-500 mx-auto" />
              <p className="text-xs font-extrabold text-slate-700">{itemName}</p>
              {itemUrl && (
                <a
                  href={itemUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={itemName}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold no-underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>파일 열기 / 다운로드</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* 푸터 액션 */}
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl border-none cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
