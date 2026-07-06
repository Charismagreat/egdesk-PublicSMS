"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { MessageTemplate, AutomationRule, EventItem } from "../types";

export const EVENTS: EventItem[] = [
  { id: "customer_registered", label: "신규 고객 등록 시", desc: "새로운 고객 연락처가 CRM에 등록되었을 때 발송됩니다." },
  { id: "reservation_created", label: "예약 확정 시", desc: "새로운 예약 일정이 등록되었을 때 발송됩니다." },
  { id: "payment_completed", label: "결제 완료 시", desc: "고객의 결제가 정상적으로 승인/등록되었을 때 발송됩니다." },
  { id: "order_created", label: "주문 접수 시", desc: "새로운 상품 주문이 접수되었을 때 발송됩니다." },
  { id: "delivery_started", label: "배송 시작 시", desc: "주문 상품의 배송이 시작되었을 때 발송됩니다." },
  { id: "point_earned", label: "포인트 적립 완료 시 🪙", desc: "고객의 단골 포인트가 신규 적립되었을 때 발송됩니다." },
  { id: "point_redeemed", label: "포인트 사용/차감 시 🔒", desc: "결제 시 고객의 포인트가 차감 사용되었을 때 발송됩니다." },
  { id: "b2b_partner_registered", label: "B2B 신규 거래처 온보딩 시 🤝", desc: "모바일 견적 요청 또는 명함 스냅을 통해 B2B 신규 파트너로 자동 가입되었을 때 발송됩니다." },
  { id: "estimate_received", label: "B2B 견적 요청 접수 시 🪐", desc: "바이어로부터 새로운 모바일 스마트 견적 요청이 접수되었을 때 접수 확인 문자가 발송됩니다." },
  { id: "sales_order_confirmed", label: "B2B 수주 확정 시 📦", desc: "바이어의 계약 최종 승인에 따라 수주 확정서 및 배송 안내 문자가 발송됩니다." },
  
  // 신규 스마트 팩토리 & 경영 활성화 AI 경보 이벤트 연동
  { id: "quality_spc_anomaly", label: "품질 공정(SPC) 능력 저하 감지 시 📉", desc: "Cpk 저하 및 공정 이탈 등 품질 저하 징후 발생 시 담당자에게 즉시 SMS를 발송합니다." },
  { id: "quality_ncr_registered", label: "부적합 보고서(NCR) 신규 발행 시 ⚠️", desc: "제조 라인에서 실시간 불량이 포착되어 NCR 보고서가 신규 등록되었을 때 시정조치 검토를 위해 품질 책임자에게 안내 문자가 발송됩니다." },
  { id: "facility_breakdown_warning", label: "설비 예지보전 고장 위험 경보 시 ⚙️", desc: "모터 진동/전류 센서의 다변량 이상 점수가 임계값을 초과하거나, 베어링 등 소모 부품의 잔여 수명 D-Day가 임박했을 때 정비사에게 즉시 알림 문자가 발송됩니다." },
  { id: "finance_cashflow_critical", label: "자금 고갈 위기 D-Day 임박 시 🚨", desc: "향후 90일 자금 흐름 예측 결과, 잔고 고갈 위험 D-Day가 15일 이내로 진입했을 때 대표자 및 재무 관리자에게 비상 문자가 발송됩니다." },
  { id: "finance_unpaid_overdue", label: "B2B 외상 매출금 연체 발생 시 🪙", desc: "거래처의 입금 예정일이 경과하였음에도 미수금이 정리되지 않았을 때, 해당 거래처 담당자에게 자동 독촉 문자가 발송됩니다." },
  { id: "production_delay_hazard", label: "생산 계획 지연 및 납기 위험 감지 시 📅", desc: "설비 가동율 저하 및 공정 병목으로 인해 특정 수주 건의 예정 출하일이 납기를 초과할 확률이 80%를 넘을 때 생산총괄 책임자에게 경보가 발송됩니다." },
  { id: "production_job_issued", label: "현장 근로자 신규 작업 지시서 발급 시 📋", desc: "생산 스케줄러가 금일 작업 일정을 확정하고 개별 근로자에게 새로운 모바일 지시서를 발부했을 때 작업자 스마트폰으로 안내 문자가 전송됩니다." },
  { id: "energy_peak_hazard", label: "실시간 전력 피크 한도 90% 초과 시 ⚡", desc: "공장의 순간 전력 소모량이 한전 계약 전력의 90%를 초과하여 연간 기본요금 폭등 위기가 포착되었을 때, 설비 수동 제어 담당자에게 즉시 셧다운 알림이 발송됩니다." },
  { id: "safety_accident_critical", label: "비전 AI 긴급 안전사고 포착 시 🚨", desc: "IP IP 카메라 비전 분석을 통해 작업장 내 쓰러짐 사고, 가상 울타리 침입, 헬멧 미착용자가 식별되는 즉시 안전 책임자 및 임원진 전체에 비상 경보 SMS를 전송합니다." },
  { id: "scm_delivery_delayed", label: "조달 원자재 이송 지연 확률 경보 시 🌐", desc: "글로벌 선적 상황 및 세관 적체 일수로 인해 원자재 ETA가 생산 일정에 도달하지 못할 위험이 80% 이상 예측될 때 구매 담당자에게 우회 매칭 권고 문자가 발송됩니다." },
  { id: "grant_high_match_detected", label: "적합도 90% 이상 신규 정부 지원금 매칭 시 🪙", desc: "새로 등록된 정부 부처 지원금/보조금/R&D 사업 중 자사 매칭 적합도 점수가 90%를 초과하는 사업이 실시간 감지되었을 때 경영진에게 알림 문자가 발송됩니다." }
];

export function useAutomation() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [rules, setRules] = useState<Record<string, AutomationRule>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchRules();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await apiFetch("/api/message-templates");
      const json = await res.json();
      if (json.success) {
        setTemplates(json.templates || []);
      }
    } catch (e) {
      console.error("템플릿 목록 조회 에러:", e);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await apiFetch("/api/automation");
      const json = await res.json();
      if (json.success) {
        const initialRules: Record<string, AutomationRule> = {};
        EVENTS.forEach(ev => {
          initialRules[ev.id] = json.rules[ev.id] || { enabled: false, templateId: null };
        });
        setRules(initialRules);
      }
    } catch (e) {
      console.error("규칙 목록 조회 에러:", e);
    }
  };

  const toggleRule = (eventId: string) => {
    setRules(prev => ({
      ...prev,
      [eventId]: { ...prev[eventId], enabled: !prev[eventId]?.enabled }
    }));
  };

  const changeTemplate = (eventId: string, templateId: number | null) => {
    setRules(prev => ({
      ...prev,
      [eventId]: { ...prev[eventId], templateId }
    }));
  };

  const saveRules = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules })
      });
      const json = await res.json();
      if (json.success) {
        alert("자동 발송 규칙이 성공적으로 저장되었습니다.");
      } else {
        alert("저장 실패: " + json.error);
      }
    } catch (e) {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    templates,
    rules,
    isSaving,
    toggleRule,
    changeTemplate,
    saveRules
  };
}
