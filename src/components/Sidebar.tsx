import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { LogOut } from 'lucide-react';
import SidebarMenu from './SidebarMenu';
import { queryTable } from '@/../egdesk-helpers';
import { redirect } from 'next/navigation';

export default async function Sidebar() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  let userName = '운영자';
  let userRole = 'SUB_OPERATOR';

  if (token) {
    try {
      const payload = decodeJwt(token);
      if (payload.name) userName = payload.name as string;
      if (payload.role) userRole = payload.role as string;
    } catch (e) {
      console.error("Invalid token in Sidebar");
    }
  }

  // 일반 직원(EMPLOYEE)은 PC 대시보드 진입을 차단하고 모바일 지원금 신청 페이지로 즉시 리다이렉트
  if (userRole === 'EMPLOYEE') {
    redirect('/m/grant-management');
  }

  // 🛡️ DB로부터 사이드바 메인/서브 타이틀 로드 (디폴트값 가드)
  let sidebarMainTitle = 'EGDESK SMS';
  let sidebarSubTitle = '평생 무료 문자 발송 시스템';

  try {
    const settingsRes = await queryTable('system_settings', { filters: { key: 'my_company_profile' } });
    const profileVal = settingsRes.rows?.[0]?.value;
    if (profileVal) {
      const parsed = JSON.parse(profileVal);
      if (parsed.sidebarMainTitle) sidebarMainTitle = parsed.sidebarMainTitle;
      if (parsed.sidebarSubTitle) sidebarSubTitle = parsed.sidebarSubTitle;
    }
  } catch (e) {
    console.error("Failed to fetch sidebar titles from DB:", e);
  }

  return (
    <div className="w-64 bg-slate-900 text-white h-full min-h-0 flex flex-col shadow-2xl print:hidden">
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}} />
      <div className="p-6 border-b border-slate-800 w-full min-w-0">
        <h1 
          className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 truncate whitespace-nowrap"
          title={sidebarMainTitle}
        >
          {sidebarMainTitle}
        </h1>
        <p 
          className="text-sm text-slate-400 mt-1 truncate whitespace-nowrap"
          title={sidebarSubTitle}
        >
          {sidebarSubTitle}
        </p>
      </div>
      
      <SidebarMenu userRole={userRole} />

      <div className="p-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
            {userName[0] || 'U'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200 leading-tight">{userName}</span>
            <span className="text-[10px] text-slate-500 leading-tight">
              {userRole === 'SUPER_ADMIN' ? '최고관리자' : userRole === 'EMPLOYEE' ? '일반직원' : '부운영자'}
            </span>
          </div>
        </div>
        <form action={async () => {
          "use server";
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          cookieStore.delete('auth_token');
          const { redirect } = await import("next/navigation");
          redirect('/login');
        }}>
          <button type="submit" className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center" title="로그아웃">
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
