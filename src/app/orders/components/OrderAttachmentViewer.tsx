import React from "react";
import { X, Image as ImageIcon } from "lucide-react";

interface OrderAttachmentViewerProps {
  viewerUrl: string | null;
  onClose: () => void;
}

export function OrderAttachmentViewer({ viewerUrl, onClose }: OrderAttachmentViewerProps) {
  if (!viewerUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>
      <div className="bg-white rounded-2xl shadow-2xl relative z-10 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center">
            <ImageIcon className="w-5 h-5 mr-2 text-blue-500"/> 첨부된 캡처/증빙 이미지
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-slate-200 text-slate-500 border-0 cursor-pointer bg-transparent"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto bg-slate-900 flex justify-center items-center min-h-[300px]">
          <img src={viewerUrl} alt="첨부 이미지" className="max-w-full h-auto object-contain rounded" />
        </div>
      </div>
    </div>
  );
}
