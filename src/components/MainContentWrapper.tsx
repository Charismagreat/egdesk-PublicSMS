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
    pathname.startsWith('/estimates/manufacture-webview') ||
    pathname.startsWith('/import-customs') ||
    pathname.startsWith('/import-customs/web-view')
  ) {
    return <>{children}</>;
  }

  return <div className="p-8 min-h-full w-full overflow-x-hidden">{children}</div>;
}
