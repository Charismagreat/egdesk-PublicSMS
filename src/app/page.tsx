import { 
  Users, CheckCircle2, AlertTriangle, LayoutDashboard, TrendingUp, ShoppingBag, 
  DollarSign, FileSpreadsheet, ShieldAlert, BadgeHelp, Sparkles, FolderDown,
  UserCheck, AlertCircle, PlayCircle, ClipboardCheck
} from "lucide-react";
import { queryTable, executeSQL } from "@/../egdesk-helpers";
import AiCopilotWidget from "@/components/AiCopilotWidget";

// Next.js 캐싱 비활성화 (항상 실시간 최신 금융/근태 데이터 유지)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  // 1. 한국 표준시(KST) 기준 날짜 문자열 계산
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
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

  let copilotEnabled = true;

  try {
    // 0. system_settings 확인 및 DB 셋업 확인
    const { listTables } = require("@/../egdesk-helpers");
    const checkRes = await listTables().catch(() => ({ tables: [] }));
    const tables = checkRes.tables || [];
    const hasSettingsTable = tables.some((t: any) => t.tableName === 'system_settings');

    if (!hasSettingsTable) {
      const { setupDatabase } = require("@/lib/setup-db");
      await setupDatabase();
    }

    const copilotSetting = await queryTable('system_settings', { filters: { key: 'copilot_widget_enabled' } });
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
      return emp.is_active === '1' || emp.is_active === 1;
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
      filters: { is_active: 1, deleted_at: null },
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
            <span>경영 정보 및 관제 대시보드</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-semibold">
            실시간 수주·발주 흐름, 세금계산서 기반 매출·매입 추이 및 임직원 근태 상태와 AI 비즈니스 통제 현황을 한눈에 모니터링합니다.
          </p>
        </div>
      </div>

      {/* AI 자율 마케팅 파트너 어시스턴트 위젯 */}
      {copilotEnabled && <AiCopilotWidget />}

      {/* 1구역: 금융/거래 핵심 4종 지표 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 1. 수주액 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all text-left">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sales Orders</span>
              <h3 className="text-lg font-black text-slate-800">총 수주액</h3>
            </div>
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
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Purchase Orders</span>
              <h3 className="text-lg font-black text-slate-800">총 발주액</h3>
            </div>
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
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tax Sales</span>
              <h3 className="text-lg font-black text-slate-800">총 매출액</h3>
            </div>
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
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tax Purchases</span>
              <h3 className="text-lg font-black text-slate-800">총 매입액</h3>
            </div>
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

      </div>

      {/* 2구역: 임직원 근태 현황 및 추천 프리미엄 관제 지표 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 근태 현황 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-left">
          <div className="flex items-center gap-2 mb-6">
            <UserCheck className="w-5 h-5 text-indigo-650" />
            <h2 className="text-base font-black text-slate-800">금일 사원 근태 출근 현황</h2>
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
                    strokeDasharray={`${attendanceRate}, 100`}
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
                  <span>정상 출근</span>
                </div>
                <span className="font-extrabold text-slate-800">{attendanceCount - lateCount - earlyLeaveCount} 명</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-600">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                  <span>지각 사원</span>
                </div>
                <span className="font-extrabold text-slate-800">{lateCount} 명</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-600">
                  <span className="w-2.5 h-2.5 bg-sky-400 rounded-full"></span>
                  <span>조퇴 사원</span>
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
                <span>총원 등록 대기</span>
                <span className="text-slate-700">총 {totalOperators} 명</span>
              </div>
            </div>

          </div>
        </div>

        {/* AI 자율 제어 및 추천 관제 지표 */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs text-left">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-indigo-650" />
            <h2 className="text-base font-black text-slate-800">🤖 AI 자율 통제 및 결재 대기 현황</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            
            {/* 결재 대기 일보 */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <ClipboardCheck className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Reports Pending</span>
                </div>
                <p className="text-xs font-bold text-slate-700">결재 대기 보고서</p>
              </div>
              <div className="flex items-baseline gap-1 mt-3">
                <span className={`text-2xl font-black ${pendingReports > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {pendingReports}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">건</span>
              </div>
            </div>

            {/* 가동 중인 자율 규칙 */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <PlayCircle className="w-4 h-4 text-indigo-600" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Rules</span>
                </div>
                <p className="text-xs font-bold text-slate-700">자율 통제 규칙</p>
              </div>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-2xl font-black text-indigo-750">{activeRules}</span>
                <span className="text-[10px] text-slate-400 font-bold">개 작동</span>
              </div>
            </div>

            {/* 금일 AI 자율 조치 이력 */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">AI Operations</span>
                </div>
                <p className="text-xs font-bold text-slate-700">금일 AI 자율 조치</p>
              </div>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-2xl font-black text-emerald-700">{todayAutoActions}</span>
                <span className="text-[10px] text-slate-400 font-bold">건 완료</span>
              </div>
            </div>

            {/* 금일 수집자료 문서 수 */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <FolderDown className="w-4 h-4 text-sky-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Collected Docs</span>
                </div>
                <p className="text-xs font-bold text-slate-700">금일 신규 수집 자료</p>
              </div>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-2xl font-black text-sky-600">{todayDocsCount}</span>
                <span className="text-[10px] text-slate-400 font-bold">건 등록</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
