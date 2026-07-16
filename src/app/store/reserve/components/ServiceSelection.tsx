import React from "react";
import { User, Activity, Scissors, Camera } from "lucide-react";
import { ServiceItem } from "../types";

const serviceIcons: Record<string, React.ReactNode> = {
  "기본 상담": <User className="w-6 h-6" />,
  "프리미엄 케어": <Activity className="w-6 h-6" />,
  "스타일링/디자인": <Scissors className="w-6 h-6" />,
  "스튜디오 촬영": <Camera className="w-6 h-6" />,
};

interface ServiceSelectionProps {
  services: ServiceItem[];
  selectedServiceName: string;
  onSelectService: (name: string) => void;
  loading: boolean;
}

export function ServiceSelection({
  services,
  selectedServiceName,
  onSelectService,
  loading
}: ServiceSelectionProps) {
  return (
    <div className="w-full md:w-5/12 bg-slate-50 p-5 sm:p-8 border-b md:border-b-0 md:border-r border-slate-100">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
        <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
        서비스 선택
      </h3>
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse border border-slate-200/50"></div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
          <User className="w-10 h-10 mx-auto text-slate-350 mb-3 animate-bounce" />
          <h4 className="text-sm font-bold text-slate-700 mb-1">등록된 예약 상품이 없습니다</h4>
          <p className="text-xs text-slate-500 leading-relaxed">온라인으로 접수할 수 있는 예약 상품이 존재하지 않습니다. 사장님에게 문의해주세요.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((svc) => {
            const isSelected = selectedServiceName === svc.name;
            
            const renderThumbnail = () => {
              if (svc.main_image_url) {
                return (
                  <img 
                    src={svc.main_image_url} 
                    alt={svc.name} 
                    className="w-10 h-10 rounded-xl object-cover border border-slate-150 shadow-sm shrink-0"
                  />
                );
              }
              const icon = serviceIcons[svc.name] || <User className="w-5 h-5" />;
              return (
                <div className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                  isSelected ? 'text-blue-600 bg-blue-100/50' : 'text-slate-455 bg-slate-100'
                }`}>
                  {icon}
                </div>
              );
            };

            return (
              <label 
                key={svc.id}
                className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/10' 
                    : 'border-slate-200 hover:border-blue-300 bg-white'
                }`}
              >
                <input 
                  type="radio" 
                  name="service" 
                  value={svc.name} 
                  checked={isSelected}
                  onChange={() => onSelectService(svc.name)}
                  className="sr-only"
                />
                <div className="mr-4 flex-shrink-0">
                  {renderThumbnail()}
                </div>
                <div>
                  <div className={`font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                    {svc.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{svc.desc}</div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
