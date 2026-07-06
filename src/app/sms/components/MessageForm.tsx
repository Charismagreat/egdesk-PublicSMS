import { apiFetch } from '@/lib/api';
import React from "react";
import { FileText, X, AlertTriangle, Send } from "lucide-react";
import { Product, AdTemplate, MessageTemplate, SendProgress, SpamRisk } from "../types";

interface MessageFormProps {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  messageBytes: number;
  messageType: string;
  isConnected: boolean;
  products: Product[];
  selectedProductId: string;
  setSelectedProductId: React.Dispatch<React.SetStateAction<string>>;
  deleteProduct: () => Promise<void>;
  saveProduct: () => Promise<void>;
  insertVariable: (variable: string) => void;
  isAd: boolean;
  setIsAd: React.Dispatch<React.SetStateAction<boolean>>;
  adHeader: string;
  setAdHeader: React.Dispatch<React.SetStateAction<string>>;
  adFooter: string;
  setAdFooter: React.Dispatch<React.SetStateAction<string>>;
  optOutPhone: string;
  setOptOutPhone: React.Dispatch<React.SetStateAction<string>>;
  selectedTemplateId: string;
  adTemplates: AdTemplate[];
  loadAdTemplate: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  deleteAdTemplate: () => Promise<void>;
  saveAdTemplate: () => Promise<void>;
  generateFinalMessage: (
    baseMessage: string, 
    customer: any, 
    isAd: boolean, 
    optOut: string, 
    header: string, 
    footer: string, 
    product?: Product, 
    assignedCouponCode?: string
  ) => string;
  spamRisk: SpamRisk;
  messageTemplates: MessageTemplate[];
  setMessageTemplates: React.Dispatch<React.SetStateAction<MessageTemplate[]>>;
  isSending: boolean;
  sendProgress: SendProgress;
  selectedDeviceId: string;
  setTestDeviceId: React.Dispatch<React.SetStateAction<string>>;
  setShowTestModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleSend: () => Promise<void>;
}

export function MessageForm({
  message,
  setMessage,
  messageBytes,
  messageType,
  isConnected,
  products,
  selectedProductId,
  setSelectedProductId,
  deleteProduct,
  saveProduct,
  insertVariable,
  isAd,
  setIsAd,
  adHeader,
  setAdHeader,
  adFooter,
  setAdFooter,
  optOutPhone,
  setOptOutPhone,
  selectedTemplateId,
  adTemplates,
  loadAdTemplate,
  deleteAdTemplate,
  saveAdTemplate,
  generateFinalMessage,
  spamRisk,
  messageTemplates,
  setMessageTemplates,
  isSending,
  sendProgress,
  selectedDeviceId,
  setTestDeviceId,
  setShowTestModal,
  handleSend
}: MessageFormProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <FileText className="w-5 h-5 mr-2 text-blue-500" />
          메시지 작성
        </div>
        
        <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
          <span className="text-xs text-slate-500 ml-1 font-extrabold">광고 상품:</span>
          <select 
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500 bg-white min-w-[120px] font-bold text-slate-700 cursor-pointer"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">선택 안함</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {selectedProductId && (
            <button 
              type="button"
              onClick={deleteProduct} 
              className="p-1 text-red-500 hover:bg-red-100 rounded cursor-pointer border-none bg-transparent" 
              title="상품 삭제"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button 
            type="button"
            onClick={saveProduct} 
            className="px-2 py-1 bg-white text-blue-600 rounded border border-blue-200 text-xs hover:bg-blue-50 font-bold cursor-pointer"
          >
            + 새 상품 등록
          </button>
        </div>
      </h2>

      {/* 치환 변수 삽입 패널 */}
      <div className="flex space-x-2 mb-3 bg-slate-100 p-2 rounded-lg items-center">
        <span className="text-xs font-bold text-slate-500 px-1">기본 변수:</span>
        <button 
          type="button"
          onClick={() => insertVariable("{이름}")} 
          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-50 shadow-xs cursor-pointer font-bold"
        >
          + {"{이름}"}
        </button>
        <button 
          type="button"
          onClick={() => insertVariable("{연락처}")} 
          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-50 shadow-xs cursor-pointer font-bold"
        >
          + {"{연락처}"}
        </button>
        <button 
          type="button"
          onClick={() => insertVariable("{최근구매내역}")} 
          className="px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-xs hover:bg-orange-100 shadow-xs cursor-pointer font-bold"
        >
          + {"{최근구매내역}"}
        </button>
        <button 
          type="button"
          onClick={() => insertVariable("{쿠폰코드}")} 
          className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs hover:bg-emerald-100 shadow-xs cursor-pointer font-bold"
        >
          + {"{쿠폰코드}"}
        </button>
        
        <div className="w-px h-6 bg-slate-300 mx-2"></div>
        
        <span className="text-xs font-bold text-blue-500 px-1">상품 변수:</span>
        <button 
          type="button"
          onClick={() => insertVariable("{상품명}")} 
          className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs hover:bg-blue-100 shadow-xs cursor-pointer font-bold"
        >
          + {"{상품명}"}
        </button>
        <button 
          type="button"
          onClick={() => insertVariable("{금액}")} 
          className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs hover:bg-blue-100 shadow-xs cursor-pointer font-bold"
        >
          + {"{금액}"}
        </button>
        <button 
          type="button"
          onClick={() => insertVariable("{URL}")} 
          className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs hover:bg-blue-100 shadow-xs cursor-pointer font-bold"
        >
          + {"{URL}"}
        </button>
      </div>

      {/* 광고성 옵션 */}
      <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={isAd} 
              onChange={(e) => setIsAd(e.target.checked)} 
              className="rounded text-blue-600 focus:ring-0 cursor-pointer" 
            />
            <span className="font-bold text-xs text-slate-700">광고성 메시지로 발송 (자동 헤더/푸터 추가)</span>
          </label>
          {isAd && (
            <div className="flex items-center space-x-2">
              <select 
                onChange={loadAdTemplate} 
                className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500 bg-white font-bold text-slate-700 cursor-pointer"
                value={selectedTemplateId}
              >
                <option value="">템플릿 선택...</option>
                {adTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {selectedTemplateId && (
                <button 
                  type="button"
                  onClick={deleteAdTemplate}
                  className="p-1.5 text-red-500 hover:bg-red-55 rounded cursor-pointer border-none bg-transparent"
                  title="템플릿 삭제"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button 
                type="button"
                onClick={saveAdTemplate}
                className="px-3 py-1 bg-blue-55 text-blue-600 rounded-lg text-xs hover:bg-blue-100 border border-blue-200 font-bold cursor-pointer"
              >
                현재 설정 저장
              </button>
            </div>
          )}
        </div>
        {isAd && (
          <div className="flex flex-col space-y-2 pl-6 mt-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 w-24">헤더 문구:</span>
              <input 
                type="text" 
                value={adHeader} 
                onChange={e => setAdHeader(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500 w-64 text-slate-808 font-semibold bg-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 w-24">푸터 문구:</span>
              <input 
                type="text" 
                value={adFooter} 
                onChange={e => setAdFooter(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500 w-32 text-slate-808 font-semibold bg-white"
              />
              <input 
                type="text" 
                value={optOutPhone} 
                onChange={e => setOptOutPhone(e.target.value)}
                placeholder="수신거부 번호"
                className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-500 w-40 text-slate-808 font-mono font-semibold bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* 본문 에디터 */}
      <textarea
        className="w-full h-40 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-slate-808 font-semibold text-xs leading-relaxed bg-white"
        placeholder="여기에 보낼 메시지를 입력하세요... (변수: {이름}, {연락처})"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {message && (
        <div className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs font-black text-slate-600 mb-2">실제 발송 미리보기:</p>
          <div className="text-xs text-slate-700 whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-150 leading-relaxed font-semibold">
            {generateFinalMessage(
              message, 
              { id: 0, name: "홍길동", phone: "010-1234-5678", tags: "" }, 
              isAd, 
              optOutPhone, 
              adHeader, 
              adFooter, 
              products.find(p => p.id === selectedProductId)
            )}
          </div>
        </div>
      )}

      {spamRisk.score > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start text-red-700 text-sm">
          <AlertTriangle className="w-5 h-5 mr-2 shrink-0 text-red-500 animate-bounce" />
          <div>
            <p className="font-black text-xs">스팸 필터 주의</p>
            <p className="text-[11px] font-semibold">스팸으로 의심받기 쉬운 키워드가 포함되어 있습니다: <strong>{spamRisk.words.join(", ")}</strong></p>
          </div>
        </div>
      )}

      {/* 발송 하단 액션바 */}
      <div className="flex justify-between items-center mt-4 border-t border-slate-50 pt-4">
        <div className="flex items-center space-x-2">
          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all border ${
            messageType === 'SMS' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}>
            {messageType === 'SMS' ? '단문 SMS' : '장문 LMS'}
          </span>
          <span className="text-xs font-extrabold text-slate-505">
            {messageBytes} / {messageType === 'SMS' ? '80' : '2000'} Byte
          </span>
        </div>
        <div className="flex space-x-2">
          <button 
            type="button"
            onClick={async () => {
              const title = prompt("현재 작성된 메시지를 템플릿으로 저장합니다. 템플릿의 제목을 입력하세요:");
              if (!title) return;
              try {
                const res = await apiFetch('/api/message-templates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title, content: message })
                });
                const json = await res.json();
                if (json.success) {
                  setMessageTemplates([...messageTemplates, json.template]);
                  alert("템플릿이 저장되었습니다.");
                } else {
                  alert("저장 실패: " + json.error);
                }
              } catch (e) {
                alert("템플릿 저장 중 오류가 발생했습니다.");
              }
            }}
            className="px-4 py-2 border border-blue-200 text-blue-650 bg-white rounded-lg hover:bg-blue-50 transition-colors text-xs font-extrabold cursor-pointer"
          >
            + 템플릿으로 저장
          </button>
          <button 
            type="button"
            onClick={() => {
              setTestDeviceId(selectedDeviceId);
              setShowTestModal(true);
            }}
            disabled={isSending}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors text-xs font-extrabold cursor-pointer"
          >
            테스트 발송
          </button>
          <button 
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className={`px-6 py-2 rounded-lg font-extrabold text-xs transition-all flex items-center text-white cursor-pointer border-none ${
              isSending ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-650 hover:bg-blue-700 shadow-md'
            }`}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {isSending ? `발송 중... (${sendProgress.current}/${sendProgress.total})` : '본 발송하기'}
          </button>
        </div>
      </div>

      {isSending && sendProgress.total > 0 && (
        <div className="mt-4">
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}></div>
          </div>
          <p className="text-center text-[10px] text-slate-500 mt-2 font-semibold">기계적 발송 정지 제재를 피하기 위해 랜덤한 대기 시간을 두고 순차 안전 발송합니다.</p>
        </div>
      )}
    </div>
  );
}
