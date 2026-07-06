import React from "react";
import { Calendar as CalendarIcon, Clock, User, Phone, ChevronRight } from "lucide-react";
import { ReserveForm } from "../types";

interface ReserveFormSectionProps {
  form: ReserveForm;
  isSubmitting: boolean;
  timeSlots: string[];
  onUpdateField: (key: keyof ReserveForm, value: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function ReserveFormSection({
  form,
  isSubmitting,
  timeSlots,
  onUpdateField,
  onSubmit
}: ReserveFormSectionProps) {
  return (
    <div className="w-full md:w-7/12 p-5 sm:p-8">
      <form onSubmit={onSubmit}>
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
          일정 및 정보 입력
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
              <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" /> 
              예약 날짜 *
            </label>
            <input 
              type="date" 
              required
              min={new Date().toISOString().split('T')[0]}
              value={form.reservationDate}
              onChange={(e) => onUpdateField("reservationDate", e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-slate-400" /> 
              예약 시간 *
            </label>
            <div className="relative">
              <select 
                required
                value={form.reservationTime}
                onChange={(e) => onUpdateField("reservationTime", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-white"
              >
                {timeSlots.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 mb-10">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
              <User className="w-4 h-4 mr-2 text-slate-400" /> 
              예약자 성함 *
            </label>
            <input 
              type="text" 
              required
              placeholder="홍길동"
              value={form.customerName}
              onChange={(e) => onUpdateField("customerName", e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
              <Phone className="w-4 h-4 mr-2 text-slate-400" /> 
              연락처 *
            </label>
            <input 
              type="tel" 
              required
              placeholder="010-1234-5678"
              value={form.customerPhone}
              onChange={(e) => onUpdateField("customerPhone", e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            선택한 서비스:<br />
            <strong className="text-blue-600 text-base">{form.serviceName}</strong>
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center shadow-lg ${
              isSubmitting 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30 hover:-translate-y-0.5'
            }`}
          >
            {isSubmitting ? '예약 중...' : '예약 완료하기'} 
            <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      </form>
    </div>
  );
}
