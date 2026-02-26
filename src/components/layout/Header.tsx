import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { peptides } from '@/data/peptides';

const guestNavLinks = [
  { to: '/library', label: 'المكتبة' },
  { to: '/calculator', label: 'حاسبة الجرعات' },
  { to: '/table', label: 'الجدول' },
  { to: '/coach', label: 'المدرب' },
  { to: '/pricing', label: 'الأسعار' },
] as const;

const userNavLinks = [
  { to: '/dashboard', label: 'لوحة التحكم' },
  { to: '/library', label: 'المكتبة' },
  { to: '/calculator', label: 'الحاسبة' },
  { to: '/coach', label: 'المدرب' },
  { to: '/tracker', label: 'سجل الحقن' },
] as const;

const moreLinks = [
  { to: '/stacks', label: 'البروتوكولات المُجمَّعة' },
  { to: '/lab-guide', label: 'دليل التحاليل' },
  { to: '/guide', label: 'دليل الحقن' },
  { to: '/tracker', label: 'سجل الحقن' },
  { to: '/interactions', label: 'فحص التعارضات' },
  { to: '/community', label: 'تجارب المستخدمين' },
  { to: '/glossary', label: 'المصطلحات' },
  { to: '/sources', label: 'المصادر' },
  { to: '/reviews', label: 'التقييمات' },
] as const;

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocusIdx, setSearchFocusIdx] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchResults = searchQuery.trim().length >= 2
    ? peptides.filter(p =>
        p.nameAr.includes(searchQuery) ||
        p.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(v => !v);
        setSearchQuery('');
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const initial = user?.email?.charAt(0).toUpperCase() ?? '';
  const navLinks = user ? userNavLinks : guestNavLinks;
  const logoHref = user ? '/dashboard' : '/';

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          'h-16 md:h-[72px]',
          scrolled
            ? 'border-b border-stone-200/50 bg-stone-50/90 backdrop-blur-2xl shadow-sm'
            : 'bg-white/80 backdrop-blur-md',
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 md:px-6">
          <Link
            to={logoHref}
            className="shrink-0 text-xl font-bold tracking-tight text-stone-900 md:text-2xl"
          >
            <span>pp</span>
            <span className="text-emerald-600">tides</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, label }) => {
              const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'text-emerald-700'
                      : 'text-stone-800 hover:text-stone-900',
                  )}
                >
                  {label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[calc(theme(spacing.2)+1px)] h-0.5 rounded-full bg-emerald-600" />
                  )}
                </Link>
              );
            })}
            <div className="relative" ref={moreDropdownRef}>
              <button
                onClick={() => setMoreOpen(v => !v)}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                  moreLinks.some(l => pathname.startsWith(l.to))
                    ? 'text-emerald-700'
                    : 'text-stone-800 hover:text-stone-900',
                )}
              >
                المزيد
                <ChevronDown className={cn('h-3 w-3 transition-transform', moreOpen && 'rotate-180')} />
              </button>
              {moreOpen && (
                <div className="absolute left-0 top-full mt-2 min-w-[200px] overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl">
                  {moreLinks.map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'block px-4 py-2.5 text-sm hover:bg-stone-50',
                        pathname.startsWith(to)
                          ? 'text-emerald-700 font-medium'
                          : 'text-stone-700 hover:text-stone-900',
                      )}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-3">
            {/* Global Search */}
            <div ref={searchRef} className="relative hidden md:block">
              <button
                onClick={() => { setSearchOpen(v => !v); setSearchQuery(''); }}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                aria-label="بحث"
              >
                <Search className="h-4 w-4" />
              </button>
              {searchOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
                  <div className="p-2">
                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setSearchFocusIdx(-1); }}
                      onKeyDown={e => {
                        if (e.key === 'ArrowDown') { e.preventDefault(); setSearchFocusIdx(i => Math.min(i + 1, searchResults.length - 1)); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchFocusIdx(i => Math.max(i - 1, 0)); }
                        else if (e.key === 'Enter' && searchFocusIdx >= 0 && searchResults[searchFocusIdx]) {
                          navigate(`/peptide/${searchResults[searchFocusIdx].id}`); setSearchOpen(false); setSearchQuery('');
                        }
                      }}
                      placeholder="ابحث عن ببتيد..."
                      className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-emerald-300"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="border-t border-stone-100 py-1">
                      {searchResults.map((p, idx) => (
                        <button
                          key={p.id}
                          onClick={() => { navigate(`/peptide/${p.id}`); setSearchOpen(false); setSearchQuery(''); }}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2.5 text-right text-sm transition-colors',
                            idx === searchFocusIdx ? 'bg-emerald-50' : 'hover:bg-stone-50'
                          )}
                        >
                          <span className="font-bold text-stone-900">{p.nameAr}</span>
                          <span className="text-xs text-stone-500">{p.nameEn}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                    <div className="border-t border-stone-100 px-3 py-3 text-center text-xs text-stone-500">لا توجد نتائج</div>
                  )}
                </div>
              )}
            </div>

            {user ? (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-full px-2 py-1 text-sm transition-colors hover:bg-stone-100"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {initial}
                  </span>
                  <ChevronDown
                    className={cn(
                      'hidden h-4 w-4 text-stone-800 transition-transform md:block',
                      dropdownOpen && 'rotate-180',
                    )}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 min-w-[180px] overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-xl">
                    <p className="truncate border-b border-stone-200 px-4 py-2 text-xs text-stone-800">
                      {user.email}
                    </p>
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-stone-800 transition-colors hover:bg-stone-50"
                    >
                      لوحة التحكم
                    </Link>
                    <Link
                      to="/account"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-stone-800 transition-colors hover:bg-stone-50"
                    >
                      إعدادات الحساب
                    </Link>
                    <div className="my-1 h-px bg-stone-200" />
                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 transition-colors hover:bg-stone-50"
                    >
                      <LogOut className="h-4 w-4" />
                      تسجيل الخروج
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 md:px-5 md:py-2 md:text-sm"
              >
                تسجيل الدخول
              </Link>
            )}

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-stone-800 transition-colors hover:bg-stone-100 md:hidden"
              aria-label="القائمة"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 transition-opacity md:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        <nav
          className={cn(
            'absolute inset-y-0 right-0 flex w-72 flex-col border-l border-stone-200 bg-white pt-16 shadow-2xl transition-transform duration-300',
            mobileOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4">
            {(user ? userNavLinks : guestNavLinks).map(({ to, label }) => {
              const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-stone-800 hover:bg-stone-50 hover:text-stone-900',
                  )}
                >
                  {label}
                </Link>
              );
            })}
            <div className="my-2 h-px bg-stone-200" />
            <p className="px-4 py-1 text-xs font-bold text-stone-500 uppercase tracking-wider">المزيد</p>
            {moreLinks.map(({ to, label }) => {
              const active = pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900',
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-stone-200 px-4 py-4">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {initial}
                  </span>
                  <span className="truncate text-sm text-stone-800">{user.email}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-stone-50"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center justify-center rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <User className="ml-2 h-4 w-4" />
                تسجيل الدخول
              </Link>
            )}
          </div>
        </nav>
      </div>

      <div className="h-16 md:h-[72px]" />
    </>
  );
}
