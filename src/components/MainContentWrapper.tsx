"use client";

import { usePathname } from "next/navigation";

export default function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  if (
    pathname === '/login' || 
    pathname.startsWith('/form-management-new/print') || 
    pathname.startsWith('/shared/view') || 
    pathname.startsWith('/store') || 
    pathname.startsWith('/table-order') || 
    pathname.startsWith('/waiting') || 
    pathname.startsWith('/booking') || 
    pathname === '/m' || 
    pathname.startsWith('/m/') || 
    pathname.startsWith('/expenses/mobile-approve') ||
    pathname.startsWith('/employee') ||
    pathname.startsWith('/interpretation-ai') ||
    pathname.startsWith('/estimates/web-view') ||
    pathname.startsWith('/estimates/print-pdf') ||
    pathname.startsWith('/estimates/manufacture-write') ||
    pathname.startsWith('/estimates/general-write') ||
    pathname.startsWith('/estimates/purchase-order-write') ||
    pathname.startsWith('/estimates/statement-write') ||
    pathname.startsWith('/ai-settings') ||
    pathname.startsWith('/estimates/manufacture-webview') ||
    pathname.startsWith('/import-customs') ||
    pathname.startsWith('/scm-management') ||
    pathname.startsWith('/labor-management') ||
    pathname.startsWith('/password-ai') ||
    pathname.startsWith('/production-plan') ||
    pathname.startsWith('/facility-management') ||
    pathname.startsWith('/energy-management') ||
    pathname.startsWith('/rnd-management') ||
    pathname.startsWith('/quality-control') ||
    pathname.startsWith('/safety-detection') ||
    pathname.startsWith('/import-customs/web-view') ||
    pathname.startsWith('/admin/members') ||
    pathname.startsWith('/my-db') ||
    pathname.startsWith('/finance-management') ||
    pathname.startsWith('/employees') ||
    pathname.startsWith('/hr/attendance') ||
    pathname.startsWith('/governance') ||
    pathname.startsWith('/task-folders') ||
    pathname.startsWith('/tenant-cert-patent') ||
    pathname.startsWith('/custom') ||
    pathname.startsWith('/google-drive') ||
    pathname.startsWith('/apps-script') ||
    pathname.startsWith('/promo') ||
    pathname.startsWith('/customers')
  ) {
    return <>{children}</>;
  }

  return <div className="p-8 min-h-full w-full overflow-x-hidden">{children}</div>;
}
