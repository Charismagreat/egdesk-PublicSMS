"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Calendar, Menu } from 'lucide-react';
import { useState } from 'react';

export default function StoreHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/store" className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              EGDESK SHOP
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
