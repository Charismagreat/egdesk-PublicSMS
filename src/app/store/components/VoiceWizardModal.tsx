import React from "react";
import { X, Mic, ShoppingBag } from "lucide-react";
import { StoreProduct, VoiceStep } from "../types";

interface VoiceWizardModalProps {
  voiceStep: VoiceStep;
  setVoiceStep: (step: VoiceStep) => void;
  transcript: string;
  isListening: boolean;
  selectedProduct: StoreProduct | null;
  handleConfirmProduct: (confirmed: boolean) => void;
  stopListening: () => void;
}

export function VoiceWizardModal({
  voiceStep,
  setVoiceStep,
  transcript,
  isListening,
  selectedProduct,
  handleConfirmProduct,
  stopListening
}: VoiceWizardModalProps) {
  if (voiceStep === 'IDLE') return null;

  const handleClose = () => {
    setVoiceStep('IDLE');
    stopListening();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={handleClose}></div>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden flex flex-col items-center text-center p-8 border border-slate-100/50">
        <button 
          onClick={handleClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${
          isListening 
            ? 'bg-blue-100 shadow-[0_0_40px_rgba(59,130,246,0.5)] animate-pulse' 
            : 'bg-slate-100'
        }`}>
          <Mic className={`w-12 h-12 ${isListening ? 'text-blue-500' : 'text-slate-400'}`} />
        </div>

        {voiceStep === 'LISTENING_PRODUCT' && (
          <>
            <h3 className="text-xl font-bold text-slate-800 mb-2">어떤 상품을 찾으시나요?</h3>
            <p className="text-slate-505 text-sm mb-6 font-semibold">예: "프리미엄 세트 찾아줘"</p>
            <div className="min-h-[3rem] w-full bg-slate-50 rounded-xl p-3 flex items-center justify-center text-slate-700 italic text-xs font-bold border border-slate-200/50">
              {transcript || "듣고 있습니다..."}
            </div>
          </>
        )}

        {voiceStep === 'CONFIRMING_PRODUCT' && selectedProduct && (
          <>
            <h3 className="text-xl font-bold text-slate-800 mb-4">이 상품이 맞으신가요?</h3>
            <div className="w-full bg-slate-50 rounded-xl p-4 mb-6 border border-slate-150 flex flex-col items-center">
              <div className="w-20 h-20 bg-white rounded-lg shadow-sm mb-3 overflow-hidden border border-slate-100">
                 {selectedProduct.main_image_url ? (
                   <img src={selectedProduct.main_image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                 ) : (
                   <ShoppingBag className="w-full h-full p-4 text-slate-300"/>
                 )}
              </div>
              <h4 className="font-bold text-slate-800 text-sm">{selectedProduct.name}</h4>
            </div>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => handleConfirmProduct(false)} 
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border-none cursor-pointer text-xs"
              >
                아니오
              </button>
              <button 
                onClick={() => handleConfirmProduct(true)} 
                className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 border-none cursor-pointer text-xs"
              >
                네, 맞아요
              </button>
            </div>
          </>
        )}

        {voiceStep === 'LISTENING_DETAILS' && (
          <>
            <h3 className="text-xl font-bold text-slate-800 mb-2">상세 정보를 말씀해 주세요</h3>
            <p className="text-slate-505 text-xs mb-6 font-semibold">이름, 연락처, 주소, 수령 방식을 이어서 말씀해 주세요.</p>
            <div className="min-h-[4rem] w-full bg-slate-50 rounded-xl p-3 flex items-center justify-center text-slate-700 italic text-xs font-bold border border-slate-200/50">
              {transcript || "듣고 있습니다..."}
            </div>
            {!isListening && transcript && (
              <button 
                onClick={() => stopListening()} 
                className="mt-4 px-6 py-2 bg-blue-100 text-blue-600 rounded-full text-xs font-bold animate-pulse border-none cursor-pointer"
              >
                입력 완료 (자동 처리중)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
