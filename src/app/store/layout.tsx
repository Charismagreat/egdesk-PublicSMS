import StoreHeader from "@/components/StoreHeader";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <StoreHeader />
      <main className="flex-grow w-full">
        {children}
      </main>
      
      {/* Simple Footer */}
      <footer className="bg-white border-t border-slate-200 mt-20">
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} EGDESK SHOP. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
