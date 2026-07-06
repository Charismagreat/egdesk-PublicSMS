import { Users, MessageSquare, CheckCircle, Clock, AlertTriangle, Home as HomeIcon } from "lucide-react";
import { queryTable } from "@/../egdesk-helpers";
import AiCopilotWidget from "@/components/AiCopilotWidget";


// Next.js 캐싱 비활성화 (항상 최신 데이터 유지)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  // DB에서 실제 데이터 조회
  let totalCustomers = 0;
  let recentCustomers: any[] = [];
  let totalLogs = 0;
  let recentLogs: any[] = [];
  let copilotEnabled = true;

  try {
    const copilotSetting = await queryTable('system_settings', { filters: { key: 'copilot_widget_enabled' } });
    copilotEnabled = copilotSetting.rows && copilotSetting.rows.length > 0 ? copilotSetting.rows[0].value !== 'false' : true;
  } catch (e) {
    console.error("자율 마케팅 설정 조회 실패", e);
  }

  try {
    const customersRes = await queryTable('crm_customers', { limit: 5, orderBy: 'created_at', orderDirection: 'DESC' });
    totalCustomers = customersRes.totalCount || customersRes.rows?.length || 0;
    recentCustomers = customersRes.rows || [];
  } catch (e) {
    console.error("고객 조회 실패", e);
  }

  try {
    const logsRes = await queryTable('message_logs', { limit: 5, orderBy: 'created_at', orderDirection: 'DESC' });
    totalLogs = logsRes.totalCount || logsRes.rows?.length || 0;
    recentLogs = logsRes.rows || [];
  } catch (e) {
    console.error("발송 로그 조회 실패", e);
  }

  // 성공률 계산 로직 (간단히 최근 로그 100개 기준 또는 전체 중 성공 건수)
  const successCount = recentLogs.filter(l => l.status === '성공' || l.status === 'success').length;
  const successRate = recentLogs.length > 0 ? ((successCount / recentLogs.length) * 100).toFixed(1) : "0.0";

  // 최근 발송 시간 포맷팅
  const latestLogTime = recentLogs.length > 0 ? new Date(recentLogs[0].created_at).toLocaleString() : "내역 없음";

  return (
    <div className="space-y-8 animate-fade-in relative pb-16">
      
      {/* 백그라운드 블루 광채 */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <HomeIcon className="w-8 h-8 text-blue-500" />
            <span>대시보드</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-semibold">
            Gemini AI 비서와 연동하여 실시간 마케팅, 고객 관리 및 비즈니스 자동화 현황을 모니터링합니다.
          </p>
        </div>
      </div>

      {/* AI 자율 마케팅 파트너 어시스턴트 위젯 */}
      {copilotEnabled && <AiCopilotWidget />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">총 등록 고객</p>
              <h3 className="text-3xl font-bold text-slate-800">{totalCustomers.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">총 발송 내역</p>
              <h3 className="text-3xl font-bold text-slate-800">{totalLogs.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">최근 발송 성공률</p>
              <h3 className="text-3xl font-bold text-slate-800">{successRate}%</h3>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">최근 발송</p>
              <h3 className="text-sm font-bold text-slate-800 break-words">{latestLogTime}</h3>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">최근 고객 등록</h2>
          <div className="space-y-4">
            {recentCustomers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">등록된 고객이 없습니다.</p>
            ) : (
              recentCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{customer.name}</p>
                    <p className="text-sm text-slate-500">{customer.phone}</p>
                  </div>
                  {customer.tags && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{customer.tags}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">최근 문자 발송 내역</h2>
          <div className="space-y-4">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">최근 발송 내역이 없습니다.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-center space-x-4 border-b border-slate-50 pb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${(log.status === '성공' || log.status === 'success') ? 'bg-green-100' : 'bg-red-100'}`}>
                    {(log.status === '성공' || log.status === 'success') ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm text-slate-800 truncate">{log.message}</p>
                    <p className="text-xs text-slate-500">{log.phone_number} • {new Date(log.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
