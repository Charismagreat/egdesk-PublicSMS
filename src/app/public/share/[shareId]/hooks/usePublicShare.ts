"use client";

import { apiFetch } from '@/lib/api';
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { SharedDashboard } from "../types";

export function usePublicShare() {
  const params = useParams();
  const shareId = params?.shareId as string;

  const [dashboard, setDashboard] = useState<SharedDashboard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!shareId) return;

    const fetchDashboard = async () => {
      try {
        const res = await apiFetch(`/api/db/ai-visualize/share?shareId=${shareId}`);
        const data = await res.json();
        if (data.success && data.dashboard) {
          setDashboard(data.dashboard);
        } else {
          setError(data.error || "대시보드를 로드할 수 없습니다.");
        }
      } catch (err: any) {
        setError("서버와 통신하는 중 치명적인 네트워크 에러가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [shareId]);

  // 차트 스펙 및 브리핑 파싱
  let specObj: any = null;
  let sampleRows: any[] = [];

  if (dashboard) {
    try {
      specObj = typeof dashboard.chart_spec_json === 'string'
        ? JSON.parse(dashboard.chart_spec_json)
        : dashboard.chart_spec_json;
      
      if (specObj && specObj.sampleRows) {
        sampleRows = specObj.sampleRows;
      }
    } catch (e) {
      console.error("차트 스펙 JSON 파싱 에러:", e);
    }
  }

  return {
    shareId,
    dashboard,
    loading,
    error,
    specObj,
    sampleRows
  };
}
