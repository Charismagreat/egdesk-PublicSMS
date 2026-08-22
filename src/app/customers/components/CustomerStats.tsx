import React from "react";
import { Users, UserPlus, Coins, Tag } from "lucide-react";
import { Customer } from "../types";

interface CustomerStatsProps {
  customers: Customer[];
}

export function CustomerStats({ customers }: CustomerStatsProps) {
  const totalCustomers = customers.length;

  // 이번 달 신규 고객 계산
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const newThisMonth = customers.filter(c => c.created_at && c.created_at.startsWith(currentYearMonth)).length;

  // 총 누적 적립금 계산
  const totalPoints = customers.reduce((sum, c) => sum + (Number(c.points) || 0), 0);

  // 고유 그룹/태그 수 계산
  const allTags = new Set<string>();
  customers.forEach(c => {
    if (c.tags) {
      c.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => allTags.add(t));
    }
  });

  const statItems = [
    {
      title: "전체 등록 고객",
      value: `${totalCustomers.toLocaleString()}명`,
      icon: Users,
      lightBg: "bg-blue-50/80 text-blue-600 border-blue-100",
      subtext: "CRM 통합 관리 고객"
    },
    {
      title: "이번 달 신규 고객",
      value: `${newThisMonth.toLocaleString()}명`,
      icon: UserPlus,
      lightBg: "bg-emerald-50/80 text-emerald-600 border-emerald-100",
      subtext: `${now.getMonth() + 1}월 신규 유입`
    },
    {
      title: "총 누적 적립금",
      value: `${totalPoints.toLocaleString()}P`,
      icon: Coins,
      lightBg: "bg-amber-50/80 text-amber-600 border-amber-100",
      subtext: "고객 보유 포인트 총합"
    },
    {
      title: "분류 그룹/태그",
      value: `${allTags.size.toLocaleString()}개`,
      icon: Tag,
      lightBg: "bg-purple-50/80 text-purple-600 border-purple-100",
      subtext: "타겟 마케팅 태그"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item, idx) => {
        const IconComponent = item.icon;
        return (
          <div
            key={idx}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{item.title}</span>
              <div className={`p-2 rounded-xl border ${item.lightBg}`}>
                <IconComponent className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-800 tracking-tight font-mono">
                {item.value}
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{item.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
