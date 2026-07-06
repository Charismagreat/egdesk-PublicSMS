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
}

export function ServiceSelection({
  services,
  selectedServiceName,
  onSelectService
}: ServiceSelectionProps) {
  return (
    <div className="w-full md:w-5/12 bg-slate-50 p-5 sm:p-8 border-b md:border-b-0 md:border-r border-slate-100">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
        <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
        서비스 선택
      </h3>
      
      <div className="space-y-4">
        {services.map((svc) => {
          const isSelected = selectedServiceName === svc.name;
          const icon = serviceIcons[svc.name] || <User className="w-6 h-6" />;
          
          return (
            <label 
              key={svc.id}
              className={`flex items-start p-4 border rounded-2xl cursor-pointer transition-all ${
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
              <div className={`mt-1 mr-4 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                {icon}
              </div>
              <div>
                <div className={`font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                  {svc.name}
                </div>
                <div className="text-sm text-slate-500 mt-1">{svc.desc}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
