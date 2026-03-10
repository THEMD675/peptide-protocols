import { useState, useRef, useEffect, useMemo, memo, lazy, Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, ChevronDown, Search, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const FocusTrap = lazy(() => import('focus-trap-react'));
import { useAuth } from '@/contexts/AuthContext';
import { peptideSearchIndex, type PeptideSearchEntry } from '@/data/peptide-search-index';
import { ADMIN_EMAILS } from '@/lib/constants';
import NotificationBell from '@/components/NotificationBell';
import { useTheme } from '@/hooks/useTheme';

const guestNavLinks = [
  { to: '/library', label: 'المكتبة' },
  { to: '/blog', label: 'المدونة' },
  { to: '/pricing', label: 'الأسعار' },
] as const;

const userNavLinks = [
  { to: '/dashboard', label: 'لوحة التحكم' },
  { to: '/tracker', label: 'سجل الحقن' },
  { to: '/library', label: 'المكتبة' },
  { to: '/coach', label: 'المدرب' },
  { to: '/blog', label: 'المدونة' },
] as const;

const guestToolLinks = [
  { to: '/calculator', label: 'حاسبة الجرعات' },
  { to: '/interactions', label: 'فحص التعارضات' },
  { to: '/compare', label: 'مقارنة الببتيدات' },
  { to: '/table', label: 'جدول المقارنة' },
] as const;

const userToolLinks = [
  { to: '/calculator', label: 'حاسبة الجرعات' },
  { to: '/interactions', label: 'فحص التعارضات' },
  { to: '/compare', label: 'مقارنة الببتيدات' },
  { to: '/stacks', label: 'البروتوكولات المُجمَّعة' },
  { to: '/lab-guide', label: 'دليل التحاليل' },
  { to: '/guide', label: 'دليل الحقن' },
  { to: '/table', label: 'جدول المقارنة' },
] as const;

const prefetchMap: Record<string, () => Promise<unknown>> = {
  '/library': () => import('@/pages/Library'),
  '/pricing': () => import('@/pages/Pricing'),
  '/calculator': () => import('@/pages/DoseCalculator'),
  '/coach': () => import('@/pages/Coach'),
  '/login': () => import('@/pages/Login'),
};

export default memo(function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocusIdx, setSearchFocusIdx] = useState(-1);
  const peptidesList = peptideSearchIndex;
  const { theme, toggleTheme, isDark } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    const normalize = (s: string) => s.replace(/[\u064B-\u065F\u0670]/g, '').toLowerCase();
    if (searchQuery.trim().length < 2) return [];
    const q = normalize(searchQuery);
    return peptidesList.filter(p =>
      normalize(p.nameAr).includes(q) ||
      p.nameEn.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [searchQuery, peptidesList]);

  const recentPeptides = useMemo(() => {
    if (searchQuery.trim().length >= 2 || peptidesList.length === 0) return [];
    try {
      const recentIds: string[] = JSON.parse(localStorage.getItem('pptides_recent_peptides') ?? '[]').slice(0, 5);
      return recentIds.map((id: string) => peptidesList.find(p => p.id === id)).filter(Boolean) as PeptideSearchEntry[];
    } catch { return []; }
  }, [searchQuery, peptidesList]);

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
    queueMicrotask(() => {
      setMobileOpen(false);
      setMoreOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const initial = user?.email?.charAt(0).toUpperCase() ?? '';
  const navLinks = authLoading ? [] : user ? userNavLinks : guestNavLinks;
  const logoHref = user ? '/dashboard' : '/';

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          'h-[var(--header-height)]',
          scrolled
            ? 'border-b border-stone-200/50 dark:border-stone-700/50 bg-stone-50/90 dark:bg-stone-950/90 backdrop-blur-2xl shadow-sm dark:shadow-stone-900/30'
            : 'bg-white/80 dark:bg-stone-950/80 backdrop-blur-md',
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 md:px-6">
          <Link
            to={logoHref}
            className="min-h-[44px] shrink-0 leading-[44px] text-xl font-bold text-stone-900 dark:text-stone-100 md:text-2xl"
            dir="ltr"
            aria-label="pptides"
            style={{letterSpacing:'-0.03em'}}
          >pp<span className="text-emerald-600">tides</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, label }) => {
              const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  onMouseEnter={() => prefetchMap[to]?.()}
                  className={cn(
                    'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-stone-800 dark:text-stone-200 transition-colors hover:text-stone-900 dark:text-stone-100',
                  )}
                >
                  {label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-3 h-0.5 rounded-full bg-emerald-600" />
                  )}
                </Link>
              );
            })}
            <div className="relative" ref={moreDropdownRef}>
              {(() => {
                const tools = user ? userToolLinks : guestToolLinks;
                return (
                  <>
                    <button
                      onClick={() => setMoreOpen(v => !v)}
                      aria-expanded={moreOpen}
                      aria-haspopup="true"
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1',
                        tools.some(l => pathname.startsWith(l.to))
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-stone-800 dark:text-stone-200 transition-colors hover:text-stone-900 dark:text-stone-100',
                      )}
                    >
                      الأدوات
                      <ChevronDown className={cn('h-3 w-3 transition-transform', moreOpen && 'rotate-180')} />
                    </button>
                    {moreOpen && (
                      <div aria-label="الأدوات" className="absolute end-0 top-full mt-2 min-w-[200px] overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 py-1 shadow-xl dark:shadow-stone-900/40 animate-fade-in">
                        {tools.map(({ to, label }) => (
                          <Link
                            key={to}
                            to={to}
                            aria-current={pathname.startsWith(to) ? 'page' : undefined}
                            onMouseEnter={() => prefetchMap[to]?.()}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              'block px-4 py-2.5 text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-800',
                              pathname.startsWith(to)
                                ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                : 'text-stone-700 dark:text-stone-300 transition-colors hover:text-stone-900 dark:text-stone-100',
                            )}
                          >
                            {label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-lg p-2.5 min-h-[44px] min-w-[44px] text-stone-500 dark:text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200"
              aria-label={isDark ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع الداكن'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Global Search */}
            <div ref={searchRef} className="relative">
              <button
                onClick={() => { setSearchOpen(v => !v); setSearchQuery(''); }}
                className="flex items-center gap-1.5 rounded-lg p-2.5 min-h-[44px] min-w-[44px] text-stone-500 dark:text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:text-stone-300"
                aria-label="بحث"
              >
                <Search className="h-4 w-4" />
              </button>
              {searchOpen && (
                <div className="absolute end-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 shadow-xl dark:shadow-stone-900/40">
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
                      placeholder="ابحث بالاسم..."
                      aria-label="بحث عن ببتيد"
                      className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 outline-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                    />
                  </div>
                  {recentPeptides.length > 0 && searchResults.length === 0 && (
                    <div className="border-t border-stone-100 dark:border-stone-800 py-1">
                      <p className="px-3 py-1.5 text-xs font-bold text-stone-500 dark:text-stone-400">شوهدت مؤخرًا</p>
                      {recentPeptides.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { navigate(`/peptide/${p.id}`); setSearchOpen(false); setSearchQuery(''); }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                        >
                          <span className="font-bold text-stone-900 dark:text-stone-100">{p.nameAr}</span>
                          <span className="text-xs text-stone-500 dark:text-stone-400">{p.nameEn}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="border-t border-stone-100 dark:border-stone-800 py-1">
                      {searchResults.map((p, idx) => (
                        <button
                          key={p.id}
                          onClick={() => { navigate(`/peptide/${p.id}`); setSearchOpen(false); setSearchQuery(''); }}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition-colors',
                            idx === searchFocusIdx ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'transition-colors hover:bg-stone-50 dark:hover:bg-stone-800'
                          )}
                        >
                          <span className="font-bold text-stone-900 dark:text-stone-100">{p.nameAr}</span>
                          <span className="text-xs text-stone-500 dark:text-stone-400">{p.nameEn}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery.trim().length === 1 && (
                    <div className="border-t border-stone-100 dark:border-stone-800 px-3 py-3 text-center text-xs text-stone-500 dark:text-stone-400">
                      اكتب حرفين على الأقل للبحث...
                    </div>
                  )}
                  {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                    <div className="border-t border-stone-100 dark:border-stone-800 px-3 py-3 text-center text-xs text-stone-500 dark:text-stone-400">
                      لا توجد نتائج — جرّب اسمًا آخر
                      <Link to="/library" onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="block text-xs text-emerald-600 hover:underline mt-1">تصفّح المكتبة</Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {user && <NotificationBell />}

            {user ? (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  aria-label="قائمة الحساب"
                  className="flex items-center gap-1.5 rounded-full px-2 py-1 min-h-[44px] text-sm transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {initial}
                  </span>
                  <ChevronDown
                    className={cn(
                      'hidden h-4 w-4 text-stone-800 dark:text-stone-200 transition-transform md:block',
                      dropdownOpen && 'rotate-180',
                    )}
                  />
                </button>

                {dropdownOpen && (
                  <div aria-label="قائمة الحساب" className="absolute end-0 top-full mt-2 min-w-[180px] overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 py-1 shadow-xl dark:shadow-stone-900/40 animate-fade-in">
                    <p className="truncate border-b border-stone-200 dark:border-stone-700 px-4 py-2 text-sm text-stone-800 dark:text-stone-200">
                      {user.email}
                    </p>
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                    >
                      لوحة التحكم
                    </Link>
                    <Link
                      to="/account"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                    >
                      إعدادات الحساب
                    </Link>
                    {ADMIN_EMAILS.includes(user?.email ?? '') && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm text-stone-500 dark:text-stone-400 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                      title="لوحة الإدارة"
                    >
                      لوحة الإدارة
                    </Link>
                    )}
                    <div className="my-1 h-px bg-stone-200 dark:bg-stone-700" />
                    <button
                      onClick={() => {
                        if (window.confirm('هل تريد تسجيل الخروج؟')) {
                          logout();
                          setDropdownOpen(false);
                        }
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm text-red-500 dark:text-red-400 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
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
                onMouseEnter={() => prefetchMap['/login']?.()}
                className="inline-flex min-h-[44px] items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 md:px-5 md:py-2 md:text-sm"
              >
                تسجيل الدخول
              </Link>
            )}

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-lg p-2.5 min-h-[44px] min-w-[44px] text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 md:hidden"
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
          'fixed inset-0 z-40 md:hidden transition-all duration-300',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={!mobileOpen}
        {...(mobileOpen ? {} : { inert: '' as unknown as boolean })}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        <Suspense fallback={null}>
        <FocusTrap active={mobileOpen} focusTrapOptions={{ allowOutsideClick: true }}>
        <nav
          className={cn(
            'absolute inset-y-0 end-0 flex w-[min(18rem,85vw)] flex-col border-s border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 pt-16 shadow-2xl transition-all duration-300 ease-out',
            mobileOpen ? 'translate-x-0 opacity-100' : 'ltr:translate-x-full rtl:-translate-x-full opacity-0',
          )}
        >
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4">
            {/* Mobile Search */}
            <div className="relative mb-3">
              <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 dark:text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchFocusIdx(-1); }}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSearchFocusIdx(i => Math.min(i + 1, searchResults.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchFocusIdx(i => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter' && searchFocusIdx >= 0 && searchResults[searchFocusIdx]) {
                    navigate(`/peptide/${searchResults[searchFocusIdx].id}`); setMobileOpen(false); setSearchQuery('');
                  }
                }}
                placeholder="ابحث عن ببتيد..."
                aria-label="بحث عن ببتيد"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 py-2.5 min-h-[44px] ps-10 pe-4 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 outline-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
              />
              {searchQuery.trim().length === 1 && (
                <p className="mt-1 text-center text-xs text-stone-500 dark:text-stone-400 py-1">اكتب حرفين على الأقل</p>
              )}
              {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
                <div className="mt-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 overflow-hidden">
                  {searchResults.map((p, idx) => (
                    <Link
                      key={p.id}
                      to={`/peptide/${p.id}`}
                      onClick={() => { setMobileOpen(false); setSearchQuery(''); }}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                        idx === searchFocusIdx ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-stone-50 dark:hover:bg-stone-800'
                      )}
                    >
                      <span className="font-bold text-stone-900 dark:text-stone-100">{p.nameAr}</span>
                      <span className="text-xs text-stone-500 dark:text-stone-400">{p.nameEn}</span>
                    </Link>
                  ))}
                </div>
              )}
              {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="mt-1 text-center text-xs text-stone-500 dark:text-stone-400 py-2">لا توجد نتائج — جرّب اسمًا آخر</p>
              )}
            </div>
            {navLinks.map(({ to, label }) => {
              const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                      : 'text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors hover:text-stone-900 dark:text-stone-100',
                  )}
                >
                  {label}
                </Link>
              );
            })}
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-stone-500 dark:text-stone-400" />}
              {isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
            </button>
            <div className="my-2 h-px bg-stone-200 dark:bg-stone-700" />
            <p className="px-4 py-1 text-xs font-bold text-stone-500 dark:text-stone-400">الأدوات</p>
            {(user ? userToolLinks : guestToolLinks).map(({ to, label }) => {
              const active = pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'rounded-lg px-4 py-2.5 min-h-[44px] flex items-center text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                      : 'text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors hover:text-stone-900 dark:text-stone-100',
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-stone-200 dark:border-stone-700 px-4 py-4">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {initial}
                  </span>
                  <span className="truncate text-sm text-stone-800 dark:text-stone-200">{user.email}</span>
                </div>
                <Link
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 min-h-[44px] text-sm text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  <User className="h-4 w-4" />
                  إعدادات الحساب
                </Link>
                {ADMIN_EMAILS.includes(user?.email ?? '') && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 min-h-[44px] text-sm text-stone-500 dark:text-stone-400 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  لوحة الإدارة
                </Link>
                )}
                <button
                  onClick={() => {
                    if (window.confirm('هل تريد تسجيل الخروج؟')) {
                      logout();
                      setMobileOpen(false);
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 min-h-[44px] text-sm text-red-500 dark:text-red-400 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center justify-center rounded-full bg-emerald-600 py-2.5 min-h-[44px] text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <User className="ms-2 h-4 w-4" />
                تسجيل الدخول
              </Link>
            )}
          </div>
        </nav>
        </FocusTrap>
        </Suspense>
      </div>

      <div className="h-[var(--header-height)]" />
    </>
  );
});
