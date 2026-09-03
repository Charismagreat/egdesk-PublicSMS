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
import DashboardCardSections from "@/components/DashboardCardSections";

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
    const rawTenantId = await getTenantId();
    const tenantId = rawTenantId || 'default';
    const copilotCompositeKey = `${tenantId}:copilot_widget_enabled`;

    let copilotSetting = await queryTable('system_settings', { filters: { key: copilotCompositeKey } }).catch(() => ({ rows: [] }));
    if (!copilotSetting.rows || copilotSetting.rows.length === 0) {
      copilotSetting = await queryTable('system_settings', { filters: { key: 'copilot_widget_enabled' } }).catch(() => ({ rows: [] }));
    }
    // 기본값: 비활성화(false) — 사용자가 설정에서 명시적으로 'true'로 저장했을 때만 활성화
    copilotEnabled = copilotSetting.rows && copilotSetting.rows.length > 0 ? copilotSetting.rows[0].value === 'true' : false;
  } catch (e: any) {
    console.warn("⚠️ 설정 로드 실패:", e.message);
  }

  // 2. DB 데이터 집계 쿼리 구동 (테넌트 격리)
  try {
    const { getTenantId } = require("@/lib/tenant");
    const rawTenantId = await getTenantId();
    const tenantId = rawTenantId || 'tenant-default-id';
    const tenantFilterObj = (tenantId && tenantId !== 'all') ? { tenant_id: tenantId } : {};

    // 2.1. 수주액 & 발주액 집계 (crm_estimates)
    const estimatesRes = await queryTable('crm_estimates', {
      filters: { ...tenantFilterObj, deleted_at: null },
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

    // 2.2. 매출액 & 매입액 집계 (해당 테넌트 업로드 tax_invoices & tax_exempt_invoices)
    const rawId = tenantId.replace(/^tenant-/, '');
    const tenantCond = (!tenantId || tenantId === 'tenant-default-id' || tenantId === 'default')
      ? `(tenant_id = 'default' OR tenant_id = 'wontrading' OR tenant_id IS NULL OR tenant_id = '')`
      : `(tenant_id = '${rawId}' OR tenant_id = 'tenant-${rawId}')`;

    const [taxInvRes, taxExemptRes] = await Promise.all([
      executeSQL(`SELECT * FROM tax_invoices WHERE ${tenantCond}`).catch(() => ({ rows: [] })),
      executeSQL(`SELECT * FROM tax_exempt_invoices WHERE ${tenantCond}`).catch(() => ({ rows: [] }))
    ]);

    const invoices = [
      ...(taxInvRes.rows || []),
      ...(taxExemptRes.rows || [])
    ].filter((i: any) => !i.deleted_at);

    invoices.forEach((i: any) => {
      const amount = Number(i.공급가액 || i.supply_amount || i.합계금액 || i.total_amount) || 0;
      const dateStr = (i.작성일자 || i.issue_date || "").replace(/\./g, "-");

      const invType = String(i.invoice_type || i.type || "").toLowerCase();
      const isSales = invType === '매출' || invType === 'sales';
      const isPurchase = invType === '매입' || invType === 'purchase';

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
      filters: tenantFilterObj,
      limit: 1000
    }).catch(() => ({ rows: [] }));
    const operators = (operatorsRes.rows || []).filter((emp: any) => {
      if (emp.deleted_at) return false;
      if (emp.role === 'SYSTEM_ADMIN' || emp.username === 'admin') return false;
      return true; // 근태 관리 API와 일관성을 맞춰 is_active 가드를 제거
    });
    totalOperators = operators.length;

    const attendanceRes = await queryTable('crm_attendance', {
      filters: tenantFilterObj,
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
      filters: { ...tenantFilterObj, status: 'SUBMITTED', deleted_at: null },
      limit: 1000
    }).catch(() => ({ rows: [] }));
    pendingReports = pendingRepRes.rows?.length || 0;

    // 2) 활성화된 자율 규칙 수
    const activeRulesRes = await queryTable('crm_governance_rules', {
      filters: { ...tenantFilterObj, is_active: '1', deleted_at: null },
      limit: 1000
    }).catch(() => ({ rows: [] }));
    activeRules = activeRulesRes.rows?.length || 0;

    // 3) 금일 AI 자율 조치 이력 수
    const govLogsRes = await queryTable('crm_governance_logs', {
      filters: tenantFilterObj,
      limit: 1000
    }).catch(() => ({ rows: [] }));
    todayAutoActions = (govLogsRes.rows || []).filter((l: any) => 
      (l.created_at || '').startsWith(todayStr) && l.is_auto === 1
    ).length;

    // 4) 금일 수집자료 업로드 수
    const folderItemsRes = await queryTable('crm_task_folder_items', {
      filters: tenantFilterObj,
      limit: 1000
    }).catch(() => ({ rows: [] }));
    todayDocsCount = (folderItemsRes.rows || []).filter((item: any) => 
      (item.created_at || '').startsWith(todayStr)
    ).length;

    // 2.5. 재고 자산 및 평가방법 통계 집계 (실시간 DB 연동)
    try {
      // 💡 테넌트 복합 키 연동 적용
      const cKey = `${tenantId}:inventory_valuation_method`;

      let valuationSetting = await queryTable('system_settings', { filters: { key: cKey } }).catch(() => ({ rows: [] }));
      if (!valuationSetting.rows || valuationSetting.rows.length === 0) {
        valuationSetting = await queryTable('system_settings', { filters: { key: 'inventory_valuation_method' } }).catch(() => ({ rows: [] }));
      }
      const valuationMethodVal = valuationSetting.rows && valuationSetting.rows.length > 0 ? valuationSetting.rows[0].value : 'moving_average';
      valuationMethodLabel = valuationMethodVal === 'fifo' ? '선입선출법 (FIFO)' : valuationMethodVal === 'lifo' ? '후입선출법 (LIFO)' : '이동평균법 (Moving Average)';

      const tenantInvCond = (tenantId && tenantId !== 'all') ? `AND tenant_id = '${tenantId}'` : '';
      const statsRes = await executeSQL(`
        SELECT 
          SUM(CASE WHEN type IN ('원부자재', '자재', '원자재', 'material') THEN stock * price ELSE 0 END) as materialValue,
          SUM(CASE WHEN type IN ('완제품', '제품', 'product') THEN stock * price ELSE 0 END) as productValue
        FROM inventory_items 
        WHERE deleted_at IS NULL ${tenantInvCond}
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
      const accountsRes = await executeSQL(`SELECT * FROM accounts WHERE tenant_id = '${tenantId}'`).catch(() => ({ rows: [] }));
      let accounts = (accountsRes.rows || []).filter((r: any) => !r.deleted_at);
      if (accounts.length === 0) {
        const excelAccRes = await queryTable('excel_accounts', {
          filters: { ...tenantFilterObj, deleted_at: null },
          limit: 1000
        }).catch(() => ({ rows: [] }));
        accounts = excelAccRes.rows || [];
      }
      bankAccountCount = accounts.length;
      totalAvailableCash = accounts.reduce((sum: number, acc: any) => sum + (Math.floor(Number(acc.balance)) || 0), 0);
    } catch (cashErr: any) {
      console.warn("⚠️ 가용자금 산출 실패:", cashErr.message);
    }

    // 2.6. 🏭 실시간 생산현황 (총생산량, 불량건수, 납기준수율 / 금일, 금월, 금년) 집계
    try {
      const prodRes = await queryTable('crm_estimates', {
        filters: { ...tenantFilterObj, deleted_at: null },
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
        filters: { ...tenantFilterObj, deleted_at: null },
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
        filters: { ...tenantFilterObj, deleted_at: null },
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
        filters: { ...tenantFilterObj, deleted_at: null },
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

      {/* 🔴 [상/하단 2단 가로 스크롤 영역 & AI 맞춤 카드 스튜디오] */}
      <DashboardCardSections
        availableFunds={totalAvailableCash}
        totalAccountCount={bankAccountCount}
        orderStats={orderStats}
        purchaseStats={purchaseStats}
        salesStats={salesStats}
        costStats={costStats}
        productionStats={{
          today: productionStats.today.volume,
          month: productionStats.month.volume,
          year: productionStats.year.volume,
          complianceRate: productionStats.year.onTimeRate
        }}
        attendanceStats={{
          total: totalOperators,
          present: attendanceCount - lateCount - earlyLeaveCount,
          late: lateCount,
          early: earlyLeaveCount,
          absent: absentCount,
          rate: attendanceRate
        }}
        inventoryStats={{
          totalValue: totalInventoryValue,
          materialValue: totalMaterialValue,
          subMaterialValue: totalProductValue
        }}
        financeStats={{
          ar: totalUncollected,
          ap: totalUnpaidCost,
          suspense: totalTemporaryPay
        }}
        cashflowStats={{
          today: cashRequirementForecast.today,
          week: cashRequirementForecast.week,
          month: cashRequirementForecast.month,
          q3: cashRequirementForecast.month3,
          q6: cashRequirementForecast.month6,
          year: cashRequirementForecast.year1
        }}
      />


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
