"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Calendar, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function StoreHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [storeName, setStoreName] = useState("EGDESK SHOP");

  // 🏢 테넌트 설정으로부터 회사명(상점 이름) 실시간 자동 파싱
  useEffect(() => {
    async function loadStoreName() {
      try {
        const res = await apiFetch('/api/settings?key=my_company_profile');
        const data = await res.json();
        if (data.success && data.value) {
          const parsed = JSON.parse(data.value);
          if (parsed.companyName) {
            // "회사명 SHOP" 또는 "회사명" 형태로 노출
            setStoreName(parsed.companyName.endsWith("SHOP") ? parsed.companyName : `${parsed.companyName} SHOP`);
          }
        }
      } catch (err) {
        console.warn('상점 타이틀 로드 실패 (기본 폴백 적용):', err);
      }
    }
    loadStoreName();
  }, []);

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/store" className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {storeName}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/store" 
              className={`flex items-center space-x-2 font-medium transition-colors ${pathname === '/store' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-500'}`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span>상품 스토어</span>
            </Link>
            <Link 
              href="/store/reserve" 
              className={`flex items-center space-x-2 font-medium transition-colors ${pathname === '/store/reserve' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-500'}`}
            >
              <Calendar className="w-5 h-5" />
              <span>예약 서비스</span>
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-slate-900 focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 shadow-lg">
            <Link 
              href="/store" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/store' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              상품 스토어
            </Link>
            <Link 
              href="/store/reserve" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${pathname === '/store/reserve' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              예약 서비스
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
