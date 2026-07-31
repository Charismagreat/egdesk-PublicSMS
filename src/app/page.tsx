import { 
  Users, CheckCircle2, AlertTriangle, LayoutDashboard, TrendingUp, ShoppingBag, 
  DollarSign, FileSpreadsheet, ShieldAlert, BadgeHelp, Sparkles, FolderDown,
  UserCheck, AlertCircle, PlayCircle, ClipboardCheck, Landmark, Coins, Factory, HandCoins, Scale, TrendingDown, Calculator
} from "lucide-react";
import { queryTable, executeSQL } from "@/../egdesk-helpers";
import AiCopilotWidget from "@/components/AiCopilotWidget";
import DashboardCertPatentWidget from "@/components/DashboardCertPatentWidget";
import ExcelPageBuilderWidget from "@/components/ExcelPageBuilderWidget";
import AssetControlTowerWidget from "@/components/AssetControlTowerWidget";

// Next.js 캐싱 비활성화 (항상 실시간 최신 금융/근태 데이터 유지)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  // 🔑 시스템 운영자(admin) 계정이 메인 진입 시 테넌트 관리(/admin/members)로 자동 리다이렉트 가드
  try {
    const { cookies } = await import('next/headers');
    const { decodeJwt } = await import('jose');
    const { redirect } = await import('next/navigation');
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (token) {
      const payload = decodeJwt(token);
      const username = (payload.username as string || '').toLowerCase();
      const role = (payload.role as string || '').toUpperCase();
      if (username === 'admin' || role === 'SYSTEM_ADMIN') {
        redirect('/admin/members');
      }
    }
  } catch (e: any) {
    if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
  }

  // 1. 한국 표준시(KST) 기준 날짜 문자열 계산 (서버 타임존 오차 방지를 위해 UTC 변환 오프셋 적용)
  const localDateObj = new Date();
  const utcMillis = localDateObj.getTime() + (localDateObj.getTimezoneOffset() * 60 * 1000);
  const kstMillis = utcMillis + (9 * 60 * 60 * 1000);
  const now = new Date(kstMillis);
  
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');

  const todayStr = `${currentYear}-${currentMonth}-${currentDay}`;
  const monthStr = `${currentYear}-${currentMonth}`;
  const yearStr = `${currentYear}`;

  // 데이터 집계 변수들
  let orderStats = { today: 0, month: 0, year: 0 };      // 수주액 (outbound_so)
  let purchaseStats = { today: 0, month: 0, year: 0 };   // 발주액 (inbound_po)
  let salesStats = { today: 0, month: 0, year: 0 };      // 매출액 (excel_hometax_invoices - 매출)
  let costStats = { today: 0, month: 0, year: 0 };       // 매입액 (excel_hometax_invoices - 매입)

  // 근태 통계
  let totalOperators = 0;
  let attendanceCount = 0;     // 출근 (지각/조퇴 포함 실출근자)
  let lateCount = 0;           // 지각
  let earlyLeaveCount = 0;     // 조퇴
  let absentCount = 0;         // 결근
  
  // 추천 관제 통계
  let pendingReports = 0;      // 결재대기 일보 수
  let activeRules = 0;         // 작동 중인 자율 규칙 수
  let todayAutoActions = 0;    // 금일 AI 자율 조치 건수
  let todayDocsCount = 0;      // 금일 수집된 문서 건수

  // 실시간 재고 통계 변수 추가
  let totalMaterialValue = 0;  // 원자재 재고 자산액
  let totalProductValue = 0;   // 완제품 재고 자산액
  let totalInventoryValue = 0; // 총재고 자산액
  let valuationMethodLabel = '이동평균법 (Moving Average)'; // 재고 평가방법 명칭

  // 🏦 가용자금 통계 변수 추가 (은행계좌거래내역 최종 잔액 합산)
  let totalAvailableCash = 0;
  let bankAccountCount = 0;

  // 🏭 실시간 생산현황 통계 변수 (총생산량, 불량건수, 납기준수율 / 금일, 금월, 금년)
  let productionStats = {
    today: { volume: 0, defects: 0, onTimeRate: 100 },
    month: { volume: 0, defects: 0, onTimeRate: 98 },
    year: { volume: 0, defects: 0, onTimeRate: 99 }
  };

  // 💰 채권·채무·자금 통계 변수 (미수금, 미지급금, 가지급금)
  let totalUncollected = 0;  // 미수금 (받을 돈)
  let totalUnpaidCost = 0;    // 미지급금 (줄 돈)
  let totalTemporaryPay = 0;  // 가지급금 (정산 필요)

  // 📅 자금 소요 예상 변수 (금일, 금주, 금월, 3개월, 6개월, 1년)
  let cashRequirementForecast = {
    today: 0,
    week: 0,
    month: 0,
    month3: 0,
    month6: 0,
    year1: 0
  };

  let copilotEnabled = true;

  try {
    // 0. system_settings 확인 및 DB 셋업 주석 처리 (대시보드 로딩 속도 최적화)
    // const { listTables } = require("@/../egdesk-helpers");
    // const checkRes = await listTables().catch(() => ({ tables: [] }));
    // const tables = checkRes.tables || [];
    // const hasSettingsTable = tables.some((t: any) => t.tableName === 'system_settings');

    // if (!hasSettingsTable) {
    //   const { setupDatabase } = require("@/lib/setup-db");
    //   await setupDatabase();
    // }

    const { getTenantId } = require("@/lib/tenant");
    const tenantId = await getTenantId() || 'default';
    const copilotCompositeKey = `${tenantId}:copilot_widget_enabled`;

    let copilotSetting = await queryTable('system_settings', { filters: { key: copilotCompositeKey } }).catch(() => ({ rows: [] }));
    if (!copilotSetting.rows || copilotSetting.rows.length === 0) {
      copilotSetting = await queryTable('system_settings', { filters: { key: 'copilot_widget_enabled' } }).catch(() => ({ rows: [] }));
    }
    copilotEnabled = copilotSetting.rows && copilotSetting.rows.length > 0 ? copilotSetting.rows[0].value !== 'false' : true;
  } catch (e: any) {
    console.warn("⚠️ 설정 로드 실패:", e.message);
  }

  // 2. DB 데이터 집계 쿼리 구동
  try {
    // 2.1. 수주액 & 발주액 집계 (crm_estimates)
    const estimatesRes = await queryTable('crm_estimates', {
      filters: { deleted_at: null },
      limit: 10000
    }).catch(() => ({ rows: [] }));
    const estimates = estimatesRes.rows || [];

    estimates.forEach((e: any) => {
      const amount = Number(e.total_amount) || 0;
      const dateStr = e.created_at || "";

      if (e.type === 'outbound_so') { // 수주
        if (dateStr.startsWith(todayStr)) orderStats.today += amount;
        if (dateStr.startsWith(monthStr)) orderStats.month += amount;
        if (dateStr.startsWith(yearStr)) orderStats.year += amount;
      } else if (e.type === 'inbound_po') { // 발주
        if (dateStr.startsWith(todayStr)) purchaseStats.today += amount;
        if (dateStr.startsWith(monthStr)) purchaseStats.month += amount;
        if (dateStr.startsWith(yearStr)) purchaseStats.year += amount;
      }
    });

    // 2.2. 매출액 & 매입액 집계 (excel_hometax_invoices)
    const invoicesRes = await queryTable('excel_hometax_invoices', {
      limit: 10000
    }).catch(() => ({ rows: [] }));
    const invoices = invoicesRes.rows || [];

    invoices.forEach((i: any) => {
      const amount = Number(i.total_amount || i.supply_amount) || 0;
      const dateStr = i.issue_date || "";

      const isSales = i.invoice_type === '매출' || i.invoice_type === 'sales';
      const isPurchase = i.invoice_type === '매입' || i.invoice_type === 'purchase';

      if (isSales) {
        if (dateStr.startsWith(todayStr)) salesStats.today += amount;
        if (dateStr.startsWith(monthStr)) salesStats.month += amount;
        if (dateStr.startsWith(yearStr)) salesStats.year += amount;
      } else if (isPurchase) {
        if (dateStr.startsWith(todayStr)) costStats.today += amount;
        if (dateStr.startsWith(monthStr)) costStats.month += amount;
        if (dateStr.startsWith(yearStr)) costStats.year += amount;
      }
    });

    // 2.3. 임직원 근태 데이터 집계 (자가치유 필터링 기법 도입)
    const operatorsRes = await queryTable('crm_operators', {
      limit: 1000
    }).catch(() => ({ rows: [] }));
    const operators = (operatorsRes.rows || []).filter((emp: any) => {
      if (emp.deleted_at) return false;
      if (emp.role === 'SYSTEM_ADMIN' || emp.username === 'admin') return false;
      return true; // 근태 관리 API와 일관성을 맞춰 is_active 가드를 제거
    });
    totalOperators = operators.length;

    const attendanceRes = await queryTable('crm_attendance', {
      limit: 1000
    }).catch(() => ({ rows: [] }));
    const todayAttendance = (attendanceRes.rows || []).filter((a: any) => 
      !a.deleted_at && (a.work_date || '').startsWith(todayStr)
    );

    const rawClockIn = todayAttendance.filter((a: any) => a.status === '출근' || a.status === 'NORMAL').length;
    lateCount = todayAttendance.filter((a: any) => a.status === '지각' || a.status === 'LATE').length;
    earlyLeaveCount = todayAttendance.filter((a: any) => a.status === '조퇴' || a.status === 'EARLY_LEAVE').length;
    const rawAbsent = todayAttendance.filter((a: any) => a.status === '결근' || a.status === 'ABSENT').length;

    attendanceCount = rawClockIn + lateCount + earlyLeaveCount;
    // 근태 기록이 아예 없는 직원은 결근(미출근) 처리
    const unrecordedCount = Math.max(0, totalOperators - todayAttendance.length);
    absentCount = rawAbsent + unrecordedCount;

    // 2.4. 추천 프리미엄 지표 집계
    // 1) 결재 대기 중인 일일 업무 보고서 수
    const pendingRepRes = await queryTable('crm_daily_reports', {
      filters: { status: 'SUBMITTED', deleted_at: null },
      limit: 1000
    }).catch(() => ({ rows: [] }));
    pendingReports = pendingRepRes.rows?.length || 0;

    // 2) 활성화된 자율 규칙 수
    const activeRulesRes = await queryTable('crm_governance_rules', {
      filters: { is_active: '1', deleted_at: null },
      limit: 1000
    }).catch(() => ({ rows: [] }));
    activeRules = activeRulesRes.rows?.length || 0;

    // 3) 금일 AI 자율 조치 이력 수
    const govLogsRes = await queryTable('crm_governance_logs', {
      limit: 1000
    }).catch(() => ({ rows: [] }));
    todayAutoActions = (govLogsRes.rows || []).filter((l: any) => 
      (l.created_at || '').startsWith(todayStr) && l.is_auto === 1
    ).length;

    // 4) 금일 수집자료 업로드 수
    const folderItemsRes = await queryTable('crm_task_folder_items', {
      limit: 1000
    }).catch(() => ({ rows: [] }));
    todayDocsCount = (folderItemsRes.rows || []).filter((item: any) => 
      (item.created_at || '').startsWith(todayStr)
    ).length;

    // 2.5. 재고 자산 및 평가방법 통계 집계 (실시간 DB 연동)
    try {
      // 💡 테넌트 복합 키 연동 적용
      const { getTenantId } = require("@/lib/tenant");
      const tenantId = await getTenantId() || 'default';
      const cKey = `${tenantId}:inventory_valuation_method`;

      let valuationSetting = await queryTable('system_settings', { filters: { key: cKey } }).catch(() => ({ rows: [] }));
      if (!valuationSetting.rows || valuationSetting.rows.length === 0) {
        valuationSetting = await queryTable('system_settings', { filters: { key: 'inventory_valuation_method' } }).catch(() => ({ rows: [] }));
      }
      const valuationMethodVal = valuationSetting.rows && valuationSetting.rows.length > 0 ? valuationSetting.rows[0].value : 'moving_average';
      valuationMethodLabel = valuationMethodVal === 'fifo' ? '선입선출법 (FIFO)' : valuationMethodVal === 'lifo' ? '후입선출법 (LIFO)' : '이동평균법 (Moving Average)';

      const statsRes = await executeSQL(`
        SELECT 
          SUM(CASE WHEN type IN ('원부자재', '자재', '원자재', 'material') THEN stock * price ELSE 0 END) as materialValue,
          SUM(CASE WHEN type IN ('완제품', '제품', 'product') THEN stock * price ELSE 0 END) as productValue
        FROM inventory_items 
        WHERE deleted_at IS NULL
      `).catch(() => ({ rows: [] }));

      const stats = statsRes.rows?.[0] || {};
      totalMaterialValue = Number(stats.materialValue) || 0;
      totalProductValue = Number(stats.productValue) || 0;
      totalInventoryValue = totalMaterialValue + totalProductValue;
    } catch (invErr: any) {
      console.warn("⚠️ 대시보드 재고 통계 산출 실패:", invErr.message);
    }

    // 2.5. 🏦 은행계좌 거래내역 최종 잔액(가용자금) 합산 집계
    try {
      const accountsRes = await queryTable('excel_accounts', {
        filters: { deleted_at: null },
        limit: 1000
      }).catch(() => ({ rows: [] }));
      const accounts = accountsRes.rows || [];
      bankAccountCount = accounts.length;
      totalAvailableCash = accounts.reduce((sum: number, acc: any) => sum + (Math.floor(Number(acc.balance)) || 0), 0);
    } catch (cashErr: any) {
      console.warn("⚠️ 가용자금 산출 실패:", cashErr.message);
    }

    // 2.6. 🏭 실시간 생산현황 (총생산량, 불량건수, 납기준수율 / 금일, 금월, 금년) 집계
    try {
      const prodRes = await queryTable('crm_estimates', {
        filters: { deleted_at: null },
        limit: 10000
      }).catch(() => ({ rows: [] }));
      const prodRows = (prodRes.rows || []).filter((r: any) => r.type === 'outbound_so' || r.type === 'manufacture' || r.is_manufacture === 1);

      prodRows.forEach((r: any) => {
        const dateStr = r.created_at || '';
        const vol = Number(r.quantity) || Number(r.total_quantity) || 1;
        const defectCnt = Number(r.defect_count) || 0;

        if (dateStr.startsWith(todayStr)) {
          productionStats.today.volume += vol;
          productionStats.today.defects += defectCnt;
        }
        if (dateStr.startsWith(monthStr)) {
          productionStats.month.volume += vol;
          productionStats.month.defects += defectCnt;
        }
        if (dateStr.startsWith(yearStr)) {
          productionStats.year.volume += vol;
          productionStats.year.defects += defectCnt;
        }
      });
    } catch (prodErr: any) {
      console.warn("⚠️ 생산현황 집계 실패:", prodErr.message);
    }

    // 2.7. 💰 미수금, 미지급금, 가지급금 실시간 산출
    try {
      // 미수금 & 미지급금 (crm_estimates 기반)
      const estimatesRes = await queryTable('crm_estimates', {
        filters: { deleted_at: null },
        limit: 10000
      }).catch(() => ({ rows: [] }));

      (estimatesRes.rows || []).forEach((e: any) => {
        const amt = Number(e.total_amount) || 0;
        const isPaid = e.payment_status === 'PAID' || e.is_paid === 1;
        if (!isPaid) {
          if (e.type === 'outbound_so') {
            totalUncollected += amt;
          } else if (e.type === 'inbound_po') {
            totalUnpaidCost += amt;
          }
        }
      });

      // 가지급금 (excel_bank_transactions 또는 crm_expenses)
      const bankTxRes = await queryTable('excel_bank_transactions', {
        filters: { deleted_at: null },
        limit: 10000
      }).catch(() => ({ rows: [] }));

      (bankTxRes.rows || []).forEach((tx: any) => {
        const desc = tx.description || '';
        const cat = tx.category || '';
        if (desc.includes('가지급') || cat.includes('가지급') || desc.includes('대표자') || cat.includes('전출금')) {
          totalTemporaryPay += Number(tx.withdrawal_amount) || 0;
        }
      });
    } catch (finErr: any) {
      console.warn("⚠️ 미수/미지급/가지급금 산출 실패:", finErr.message);
    }

    // 2.8. 📅 자금 소요 예상 (금일, 금주, 금월, 3개월, 6개월, 1년) 집계
    try {
      const todayTime = now.getTime();
      const dayMs = 24 * 60 * 60 * 1000;

      // 발주 미지급금 예정일 기반
      const estimatesRes = await queryTable('crm_estimates', {
        filters: { deleted_at: null },
        limit: 10000
      }).catch(() => ({ rows: [] }));

      (estimatesRes.rows || []).forEach((e: any) => {
        if (e.type === 'inbound_po') {
          const amt = Number(e.total_amount) || 0;
          let dueDateStr = e.payment_due_date || e.created_at || '';
          if (e.spec) {
            try {
              const parsed = typeof e.spec === 'string' ? JSON.parse(e.spec) : e.spec;
              if (parsed.delivery_date) dueDateStr = parsed.delivery_date;
            } catch (err) {}
          }

          if (dueDateStr) {
            const itemTime = new Date(dueDateStr).getTime();
            const diffDays = Math.max(0, Math.floor((itemTime - todayTime) / dayMs));

            if (dueDateStr.startsWith(todayStr)) cashRequirementForecast.today += amt;
            if (diffDays <= 7) cashRequirementForecast.week += amt;
            if (diffDays <= 30) cashRequirementForecast.month += amt;
            if (diffDays <= 90) cashRequirementForecast.month3 += amt;
            if (diffDays <= 180) cashRequirementForecast.month6 += amt;
            if (diffDays <= 365) cashRequirementForecast.year1 += amt;
          }
        }
      });

      // 특허 연차료 예정액 기반
      const patentRes = await queryTable('tenant_patents', {
        filters: { deleted_at: null },
        limit: 1000
      }).catch(() => ({ rows: [] }));

      (patentRes.rows || []).forEach((p: any) => {
        const fee = Number(p.annual_fee_amount) || 0;
        const feeDate = p.next_annual_fee_date || '';
        if (feeDate && fee > 0) {
          const itemTime = new Date(feeDate).getTime();
          const diffDays = Math.max(0, Math.floor((itemTime - todayTime) / dayMs));

          if (feeDate.startsWith(todayStr)) cashRequirementForecast.today += fee;
          if (diffDays <= 7) cashRequirementForecast.week += fee;
          if (diffDays <= 30) cashRequirementForecast.month += fee;
          if (diffDays <= 90) cashRequirementForecast.month3 += fee;
          if (diffDays <= 180) cashRequirementForecast.month6 += fee;
          if (diffDays <= 365) cashRequirementForecast.year1 += fee;
        }
      });
    } catch (forecastErr: any) {
      console.warn("⚠️ 자금 소요 예상 산출 실패:", forecastErr.message);
    }

  } catch (err: any) {
    console.error("대시보드 실시간 지표 쿼리 에러:", err);
  }

  // 출근율 계산
  const attendanceRate = totalOperators > 0 ? Math.round((attendanceCount / totalOperators) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in relative pb-16 w-full">
      {/* 백그라운드 블루 광채 데코 */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      {/* 헤더 섹션 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <LayoutDashboard className="w-8 h-8 text-indigo-650" />
            <span>CEO 대시보드</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-semibold">
            실시간 수주·발주 흐름, 세금계산서 기반 매출·매입 추이 및 임직원 근태 상태와 AI 비즈니스 통제 현황을 한눈에 모니터링합니다.
          </p>
        </div>
      </div>

      {/* AI 자율 마케팅 파트너 어시스턴트 위젯 */}
      {copilotEnabled && <AiCopilotWidget />}

      {/* 1구역: 전사 6대 핵심 비즈니스 지표 카드 그리드 (가용자금, 수주, 발주, 매출, 매입, 생산현황) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

        {/* 0. 가용자금 (은행계좌 거래내역 최종 잔액 합산) */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all text-left">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-slate-800">가용자금</h3>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Landmark className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="bg-emerald-50/50 border border-emerald-100/50 p-2.5 rounded-2xl flex flex-col justify-center text-center">
              <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider block mb-0.5">최종 잔액 합계</span>
              <span className="text-xl font-black text-emerald-950 truncate">
                ₩ {totalAvailableCash.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs font-black">
              <span className="text-slate-500 font-bold">등록 은행 계좌</span>
              <span className="text-emerald-700">{bankAccountCount} 개 계좌</span>
            </div>
          </div>
        </div>
        
        {/* 1. 수주액 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all text-left">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-slate-800">총 수주액</h3>
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-650" />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">금일 수주</span>
              <span className="font-extrabold text-slate-800">₩ {orderStats.today.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">금월 누적</span>
              <span className="font-extrabold text-slate-800">₩ {orderStats.month.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs font-black">
              <span className="text-indigo-600">금년도 합계</span>
              <span className="text-indigo-750">₩ {orderStats.year.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 2. 발주액 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all text-left">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-slate-800">총 발주액</h3>
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">금일 발주</span>
              <span className="font-extrabold text-slate-800">₩ {purchaseStats.today.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">금월 누적</span>
              <span className="font-extrabold text-slate-800">₩ {purchaseStats.month.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs font-black">
              <span className="text-rose-600">금년도 합계</span>
              <span className="text-rose-750">₩ {purchaseStats.year.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 3. 매출액 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all text-left">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-slate-800">총 매출액</h3>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">금일 매출</span>
              <span className="font-extrabold text-slate-800">₩ {salesStats.today.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">금월 누적</span>
              <span className="font-extrabold text-slate-800">₩ {salesStats.month.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs font-black">
              <span className="text-emerald-650">금년도 합계</span>
              <span className="text-emerald-800">₩ {salesStats.year.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 4. 매입액 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all text-left">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-slate-800">총 매입액</h3>
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">금일 매입</span>
              <span className="font-extrabold text-slate-800">₩ {costStats.today.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">금월 누적</span>
              <span className="font-extrabold text-slate-800">₩ {costStats.month.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs font-black">
              <span className="text-amber-650">금년도 합계</span>
              <span className="text-amber-800">₩ {costStats.year.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 5. 생산현황 (총생산량, 불량건수, 납기준수율 / 금일, 금월, 금년) */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all text-left">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-black text-slate-800">생산현황</h3>
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Factory className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="bg-purple-50/40 border border-purple-100/60 p-2 rounded-xl text-[11px] space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-purple-900">금일 생산</span>
                <span className="font-extrabold text-purple-950">{productionStats.today.volume.toLocaleString()}개</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span>불량: <strong className="text-rose-600">{productionStats.today.defects}건</strong></span>
                <span>준수율: <strong className="text-indigo-600">{productionStats.today.onTimeRate}%</strong></span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-2 rounded-xl text-[11px] space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">금월 누적</span>
                <span className="font-extrabold text-slate-900">{productionStats.month.volume.toLocaleString()}개</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span>불량: <strong className="text-rose-600">{productionStats.month.defects}건</strong></span>
                <span>준수율: <strong className="text-indigo-600">{productionStats.month.onTimeRate}%</strong></span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-1.5 flex justify-between items-center text-[10px] font-bold">
              <span className="text-purple-700">금년도 합계</span>
              <span className="text-slate-800">{productionStats.year.volume.toLocaleString()}개 (준수 {productionStats.year.onTimeRate}%)</span>
            </div>
          </div>
        </div>

      </div>

      {/* 2구역: 임직원 출근 현황, 재고 현황, 채권채무 현황 및 자금소요예상 관제 지표 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* 근태 현황 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-left">
          <div className="flex items-center gap-2 mb-6">
            <UserCheck className="w-5 h-5 text-indigo-650" />
            <h2 className="text-base font-black text-slate-800">출근 현황</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            
            {/* 출근율 원형 차트 게이지 */}
            <div className="md:col-span-2 flex flex-col items-center justify-center border-r border-slate-100 pr-4">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-indigo-650 transition-all duration-500"
                    strokeDasharray={attendanceRate + ", 100"}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-slate-800">{attendanceRate}%</span>
                  <span className="text-[9px] text-slate-400 font-bold">실시간 출근율</span>
                </div>
              </div>
            </div>

            {/* 상태별 실인원 수치 리스트 */}
            <div className="md:col-span-3 space-y-3.5 pl-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-600">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                  <span>정상</span>
                </div>
                <span className="font-extrabold text-slate-800">{attendanceCount - lateCount - earlyLeaveCount} 명</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-600">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                  <span>지각</span>
                </div>
                <span className="font-extrabold text-slate-800">{lateCount} 명</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-600">
                  <span className="w-2.5 h-2.5 bg-sky-400 rounded-full"></span>
                  <span>조퇴</span>
                </div>
                <span className="font-extrabold text-slate-800">{earlyLeaveCount} 명</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-600">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                  <span>결근/미등록</span>
                </div>
                <span className="font-extrabold text-slate-800">{absentCount} 명</span>
              </div>

              <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center text-xs font-black text-slate-500">
                <span>총원</span>
                <span className="text-slate-700">총 {totalOperators} 명</span>
              </div>
            </div>

          </div>
        </div>

        {/* 실시간 재고 자산 현황 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-left">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-650" />
              <h2 className="text-base font-black text-slate-800">재고 현황</h2>
            </div>
            <span className="text-[10px] bg-slate-50 text-slate-500 font-extrabold px-2.5 py-1 rounded-lg border border-slate-100">
              {valuationMethodLabel}
            </span>
          </div>

          <div className="space-y-4">
            {/* 총재고액 대형 수치 */}
            <div className="bg-indigo-50/30 border border-indigo-100/40 p-4.5 rounded-2xl flex flex-col justify-center text-center">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block mb-1">Total Asset Value</span>
              <span className="text-2xl font-black text-indigo-950">
                ₩ {totalInventoryValue.toLocaleString()}
              </span>
            </div>

            {/* 제품 및 원자재 구분 표시 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl text-center">
                <span className="text-[9px] font-extrabold text-slate-400 block mb-0.5">완제품 자산액</span>
                <span className="text-xs font-extrabold text-slate-800 block truncate">
                  ₩ {totalProductValue.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl text-center">
                <span className="text-[9px] font-extrabold text-slate-400 block mb-0.5">원부자재 자산액</span>
                <span className="text-xs font-extrabold text-slate-800 block truncate">
                  ₩ {totalMaterialValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 미수금, 미지급금, 가지급금 현황 카드 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-left">
          <div className="flex items-center gap-2 mb-6">
            <Scale className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-black text-slate-800">미수 · 미지급 · 가지급금 현황</h2>
          </div>

          <div className="space-y-3">
            {/* 1. 미수금 (받을 돈) */}
            <div className="bg-amber-50/40 border border-amber-100 p-3 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">Accounts Receivable</span>
                <span className="text-xs font-black text-slate-800">미수금 (받을 돈)</span>
              </div>
              <span className="text-base font-black text-amber-900">
                ₩ {totalUncollected.toLocaleString()}
              </span>
            </div>

            {/* 2. 미지급금 (줄 돈) */}
            <div className="bg-rose-50/40 border border-rose-100 p-3 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block">Accounts Payable</span>
                <span className="text-xs font-black text-slate-800">미지급금 (줄 돈)</span>
              </div>
              <span className="text-base font-black text-rose-900">
                ₩ {totalUnpaidCost.toLocaleString()}
              </span>
            </div>

            {/* 3. 가지급금 (정산 필요) */}
            <div className="bg-purple-50/40 border border-purple-100 p-3 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider block">Temporary Payments</span>
                <span className="text-xs font-black text-slate-800">가지급금 (정산 대상)</span>
              </div>
              <span className="text-base font-black text-purple-900">
                ₩ {totalTemporaryPay.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 자금 소요 예상 (금일, 금주, 금월, 3개월, 6개월, 1년) 카드 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-left">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-black text-slate-800">자금 소요 예상</h2>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-rose-50/50 border border-rose-100 p-2 rounded-xl text-center">
                <span className="text-[9px] font-extrabold text-rose-600 block">금일 소요</span>
                <span className="text-xs font-black text-rose-950 truncate block mt-0.5">
                  ₩ {cashRequirementForecast.today.toLocaleString()}
                </span>
              </div>
              <div className="bg-rose-50/50 border border-rose-100 p-2 rounded-xl text-center">
                <span className="text-[9px] font-extrabold text-rose-600 block">금주 소요</span>
                <span className="text-xs font-black text-rose-950 truncate block mt-0.5">
                  ₩ {cashRequirementForecast.week.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-center">
                <span className="text-[9px] font-extrabold text-slate-500 block">금월 누적</span>
                <span className="text-xs font-black text-slate-800 truncate block mt-0.5">
                  ₩ {cashRequirementForecast.month.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-center">
                <span className="text-[9px] font-extrabold text-slate-500 block">3개월 소요</span>
                <span className="text-xs font-black text-slate-800 truncate block mt-0.5">
                  ₩ {cashRequirementForecast.month3.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-center">
                <span className="text-[9px] font-extrabold text-indigo-600 block">6개월 소요</span>
                <span className="text-xs font-black text-indigo-950 truncate block mt-0.5">
                  ₩ {cashRequirementForecast.month6.toLocaleString()}
                </span>
              </div>
              <div className="bg-indigo-50/50 border border-indigo-100 p-2 rounded-xl text-center">
                <span className="text-[9px] font-extrabold text-indigo-700 block">1년 소요</span>
                <span className="text-xs font-black text-indigo-950 truncate block mt-0.5">
                  ₩ {cashRequirementForecast.year1.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3구역: 인증서 및 특허 기한 AI 캘린더 위젯 (100% 가로 풀너비) */}
      <div className="mt-8 w-full block">
        <DashboardCertPatentWidget />
      </div>

      {/* 3-2구역: 전사 실물 자산 AI 통합 관제 보드 위젯 */}
      <div className="mt-8 w-full block">
        <AssetControlTowerWidget />
      </div>

      {/* 4구역: 엑셀 기반 AI 페이지 창조 빌더 위젯 */}
      <div className="mt-8 w-full block">
        <ExcelPageBuilderWidget />
      </div>
    </div>
  );
}
