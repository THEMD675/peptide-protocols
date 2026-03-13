import { lazy, Suspense, useEffect, useState, useSyncExternalStore, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigationType, useParams } from 'react-router-dom';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
const Analytics = lazy(() => import('@vercel/analytics/react').then(m => ({ default: m.Analytics })));
const SpeedInsights = lazy(() => import('@vercel/speed-insights/react').then(m => ({ default: m.SpeedInsights })));
import { SITE_URL, STORAGE_KEYS } from '@/lib/constants';
import { events } from '@/lib/analytics';
// Lazy-load Sentry to keep it out of the critical JS bundle
const lazySentryCapture = (error: Error, ctx?: Record<string, unknown>) => {
  import('@sentry/react').then(S => S.captureException(error, ctx)).catch(() => {});
};
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import TrialBanner from '@/components/TrialBanner';
import BackToTop from '@/components/BackToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageTransition from '@/components/PageTransition';

import {
  LibrarySkeleton, DashboardSkeleton, TrackerSkeleton, CoachSkeleton,
  PeptideDetailSkeleton, PricingSkeleton, CalculatorSkeleton, GenericPageSkeleton,
} from '@/components/Skeletons';
const AgeGate = lazy(() => import('@/components/AgeGate'));
const PaymentProcessing = lazy(() => import('@/components/PaymentProcessing'));
const InstallPrompt = lazy(() => import('@/components/InstallPrompt'));
const StickyScrollCTA = lazy(() => import('@/components/StickyScrollCTA'));
const ExitIntentPopup = lazy(() => import('@/components/ExitIntentPopup'));
const CookieConsent = lazy(() => import('@/components/CookieConsent'));

const Login = lazy(() => import('@/pages/Login'));
const Library = lazy(() => import('@/pages/Library'));
const Pricing = lazy(() => import('@/pages/Pricing'));

const Landing = lazy(() => import('@/pages/Landing'));
const DoseCalculator = lazy(() => import('@/pages/DoseCalculator'));

const PeptideDetail = lazy(() => import('@/pages/PeptideDetail'));
const Stacks = lazy(() => import('@/pages/Stacks'));
const LabGuide = lazy(() => import('@/pages/LabGuide'));
const Guide = lazy(() => import('@/pages/Guide'));
const Coach = lazy(() => import('@/pages/Coach'));
const PeptideTable = lazy(() => import('@/pages/PeptideTable'));
const Sources = lazy(() => import('@/pages/Sources'));
const Community = lazy(() => import('@/pages/Community'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Terms = lazy(() => import('@/pages/Terms'));
const Account = lazy(() => import('@/pages/Account'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Tracker = lazy(() => import('@/pages/Tracker'));
const Glossary = lazy(() => import('@/pages/Glossary'));
const InteractionChecker = lazy(() => import('@/pages/InteractionChecker'));
const Compare = lazy(() => import('@/pages/Compare'));
const Admin = lazy(() => import('@/pages/Admin'));
const Quiz = lazy(() => import('@/pages/Quiz'));
const Contact = lazy(() => import('@/pages/Contact'));
const Blog = lazy(() => import('@/pages/Blog'));
const BlogPost = lazy(() => import('@/pages/BlogPost'));
const About = lazy(() => import('@/pages/About'));
const Transparency = lazy(() => import('@/pages/Transparency'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function PageLoader() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 animate-fade-in" role="status" aria-label="جارٍ التحميل">
      <div className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100" dir="ltr" role="img" aria-label="pptides">
        <span aria-hidden="true">pp</span><span className="text-emerald-700 dark:text-emerald-400" aria-hidden="true">tides</span>
      </div>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 dark:border-emerald-800 border-t-emerald-600" />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; isChunkError: boolean; reloading: boolean }> {
  state = { hasError: false, isChunkError: false, reloading: false };
  static getDerivedStateFromError(error: Error) {
    const isChunk = error.message?.includes('Loading chunk') || error.message?.includes('Failed to fetch dynamically imported');
    return { hasError: true, isChunkError: isChunk };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.state.isChunkError) {
      try {
        const reloaded = sessionStorage.getItem('pptides_chunk_reload');
        if (!reloaded) {
          sessionStorage.setItem('pptides_chunk_reload', '1');
          window.location.reload();
          return;
        }
        sessionStorage.removeItem('pptides_chunk_reload');
      } catch { /* Safari private mode */ }
    }
    // Report to Sentry
    lazySentryCapture(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" aria-live="assertive" dir="rtl" className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
          <h2 className="mb-3 text-2xl font-bold text-stone-900 dark:text-stone-100">حدث خطأ غير متوقع</h2>
          <p className="mb-6 text-stone-600 dark:text-stone-300">
            {this.state.isChunkError ? 'تم تحديث الموقع — يرجى تحديث الصفحة.' : 'نعتذر عن هذا الخطأ. يرجى تحديث الصفحة أو العودة للرئيسية.'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={() => { this.setState({ reloading: true }); window.location.reload(); }} className="rounded-full bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 transition-colors">
              {this.state.reloading ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />جارٍ التحديث...</span> : 'حاول مرة أخرى'}
            </button>
            <a href="/" className="rounded-full border-2 border-stone-300 dark:border-stone-600 px-8 py-3 font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              العودة للرئيسية
            </a>
            <a href="/contact" className="rounded-full border-2 border-stone-300 dark:border-stone-600 px-6 py-3 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              الإبلاغ عن المشكلة
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

class LazyFallback extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? null : this.props.children; }
}

class RouteErrorBoundary extends Component<
  { children: ReactNode; fallbackTitle?: string },
  { hasError: boolean; error: Error | null; retryCount: number }
> {
  state = { hasError: false, error: null as Error | null, retryCount: 0 };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    lazySentryCapture(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }
  reset = () => this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < 2;
      return (
        <div dir="rtl" className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
          <h2 className="mb-3 text-2xl font-bold text-stone-900 dark:text-stone-100">
            {this.props.fallbackTitle ?? 'حدث خطأ في هذه الصفحة'}
          </h2>
          <p className="mb-6 text-stone-600 dark:text-stone-300">
            {canRetry ? 'نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى.' : 'يبدو أن هناك مشكلة مستمرة. حاول تحديث الصفحة أو العودة للرئيسية.'}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {canRetry ? (
              <button
                onClick={this.reset}
                className="rounded-full bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 transition-colors"
              >
                حاول مرة أخرى
              </button>
            ) : (
              <button
                onClick={() => window.location.reload()}
                className="rounded-full bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 transition-colors"
              >
                تحديث الصفحة
              </button>
            )}
            <Link to="/" className="rounded-full border-2 border-stone-300 dark:border-stone-600 px-8 py-3 font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              العودة للرئيسية
            </Link>
            <Link to="/contact" className="rounded-full border-2 border-stone-300 dark:border-stone-600 px-6 py-3 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              الإبلاغ عن المشكلة
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, navType]);
  return null;
}

function TrackPageView() {
  const { pathname } = useLocation();
  useEffect(() => {
    events.pageView(pathname);
  }, [pathname]);
  return null;
}

function CanonicalUrl() {
  const { pathname } = useLocation();
  const url = `${SITE_URL}${pathname === '/' ? '' : pathname}`;
  return (
    <Helmet>
      <link rel="canonical" href={url} />
    </Helmet>
  );
}

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      navigator.serviceWorker?.controller?.postMessage({ type: 'ONLINE' });
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);
  if (!offline) return null;
  return <div className="sticky top-0 inset-x-0 z-[9990] bg-red-600 text-white text-center py-2 text-sm font-bold">أنت غير متصل بالإنترنت</div>;
}

function HomeRedirect() {
  const { user, subscription, isLoading } = useAuth();
  if (!isLoading && user && subscription?.isProOrTrial) return <Navigate to="/dashboard" replace />;
  return <Suspense fallback={<PageLoader />}><Landing /></Suspense>;
}

function LogoutRedirect() {
  const { logout } = useAuth();
  useEffect(() => { logout(); }, [logout]);
  return null;
}

/** Redirect /library/:id → /peptide/:id (preserves all query params) */
function LibraryIdRedirect() {
  const { id } = useParams<{ id: string }>();
  const { search } = useLocation();
  if (!id) return <Navigate to="/library" replace />;
  return <Navigate to={`/peptide/${id}${search}`} replace />;
}

const overlayListeners = new Set<() => void>();
let origSetItem: Storage['setItem'] = () => {};
try {
  origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (...args: Parameters<Storage['setItem']>) => {
    try {
      origSetItem(...args);
    } catch { /* Safari private mode */ }
    overlayListeners.forEach(fn => fn());
  };
  window.addEventListener('storage', () => overlayListeners.forEach(fn => fn()));
} catch { /* Safari private mode - skip monkey-patch */ }

let storageVersion = 0;
function subscribeToStorage(cb: () => void) {
  const listener = () => { storageVersion++; cb(); };
  overlayListeners.add(listener);
  return () => { overlayListeners.delete(listener); };
}
function getStorageSnapshot() { return storageVersion; }

function useOverlayGate() {
  useSyncExternalStore(subscribeToStorage, getStorageSnapshot);
  const ageVerified = localStorage.getItem(STORAGE_KEYS.AGE_VERIFIED) === 'true';
  return { ageVerified, showSecondary: ageVerified && (localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT) !== null) };
}

function OverlayGate() {
  const { ageVerified, showSecondary } = useOverlayGate();
  const [showPromos, setShowPromos] = useState(false);

  useEffect(() => {
    if (!showSecondary) return;
    const t = setTimeout(() => setShowPromos(true), 30_000);
    return () => clearTimeout(t);
  }, [showSecondary]);

  return (
    <>
      <LazyFallback><Suspense fallback={null}><AgeGate /></Suspense></LazyFallback>
      {ageVerified && <LazyFallback><Suspense fallback={null}><CookieConsent /></Suspense></LazyFallback>}
      {showSecondary && showPromos && <LazyFallback><Suspense fallback={null}><StickyScrollCTA /></Suspense></LazyFallback>}
      {showSecondary && showPromos && <LazyFallback><Suspense fallback={null}><ExitIntentPopup /></Suspense></LazyFallback>}
      {/* DISABLED: Fake social proof — Ameer: "no fake shit" */}
    </>
  );
}

export default function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-x-hidden">
          <a href="#main-content" className="skip-link">تخطي إلى المحتوى الرئيسي</a>
          <OfflineBanner />
          <LazyFallback><Suspense fallback={null}><PaymentProcessing /></Suspense></LazyFallback>
          <Header />
          <TrialBanner />
          <ScrollToTop />
          <TrackPageView />
          <CanonicalUrl />
          <Toaster position="top-center" richColors dir="rtl" visibleToasts={3} toastOptions={{ duration: 6000 }} />
          <main id="main-content" className="flex-1 pb-20 md:pb-0">
            <PageTransition>
            <Routes>
              <Route path="/" element={<RouteErrorBoundary><HomeRedirect /></RouteErrorBoundary>} />
              <Route path="/login" element={<Suspense fallback={<PageLoader />}><RouteErrorBoundary fallbackTitle="خطأ في صفحة الدخول"><Login /></RouteErrorBoundary></Suspense>} />
              <Route path="/signup" element={<Suspense fallback={<PageLoader />}><RouteErrorBoundary fallbackTitle="خطأ في صفحة الدخول"><Login /></RouteErrorBoundary></Suspense>} />
              <Route path="/library" element={<Suspense fallback={<LibrarySkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المكتبة"><Library /></RouteErrorBoundary></Suspense>} />
              <Route path="/peptide/:id" element={<Suspense fallback={<PeptideDetailSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في صفحة الببتيد"><PeptideDetail /></RouteErrorBoundary></Suspense>} />
              <Route path="/calculator" element={<ProtectedRoute><Suspense fallback={<CalculatorSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في الحاسبة"><DoseCalculator /></RouteErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="/quiz" element={<Suspense fallback={<PageLoader />}><RouteErrorBoundary fallbackTitle="خطأ في الاختبار"><Quiz /></RouteErrorBoundary></Suspense>} />
              <Route path="/stacks" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في التجميعات"><Stacks /></RouteErrorBoundary></Suspense>} />
              <Route path="/lab-guide" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في دليل التحاليل"><LabGuide /></RouteErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="/guide" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في الدليل"><Guide /></RouteErrorBoundary></Suspense>} />
              <Route path="/pricing" element={<Suspense fallback={<PricingSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في صفحة الأسعار"><Pricing /></RouteErrorBoundary></Suspense>} />
              <Route path="/coach" element={<ProtectedRoute><Suspense fallback={<CoachSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المدرب الذكي"><Coach /></RouteErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="/reviews" element={<Navigate to="/community" replace />} />
              {/* Legacy / alternative path redirects — never 404 */}
              <Route path="/dose-calculator" element={<Navigate to="/calculator" replace />} />
              <Route path="/library/:id" element={<LibraryIdRedirect />} />
              <Route path="/table" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في جدول الببتيدات"><PeptideTable /></RouteErrorBoundary></Suspense>} />
              <Route path="/sources" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المصادر"><Sources /></RouteErrorBoundary></Suspense>} />
              <Route path="/community" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المجتمع"><Community /></RouteErrorBoundary></Suspense>} />
              <Route path="/about" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في صفحة عن"><About /></RouteErrorBoundary></Suspense>} />
              <Route path="/contact" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في صفحة التواصل"><Contact /></RouteErrorBoundary></Suspense>} />
              <Route path="/transparency" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary><Transparency /></RouteErrorBoundary></Suspense>} />
              <Route path="/faq" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في الأسئلة الشائعة"><FAQ /></RouteErrorBoundary></Suspense>} />
              <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><RouteErrorBoundary><Privacy /></RouteErrorBoundary></Suspense>} />
              <Route path="/terms" element={<Suspense fallback={<PageLoader />}><RouteErrorBoundary><Terms /></RouteErrorBoundary></Suspense>} />
              <Route path="/account" element={<ProtectedRoute requiresSubscription={false}><Suspense fallback={<PageLoader />}><RouteErrorBoundary fallbackTitle="خطأ في الحساب"><Account /></RouteErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Suspense fallback={<DashboardSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في لوحة التحكم"><Dashboard /></RouteErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="/tracker" element={<ProtectedRoute><Suspense fallback={<TrackerSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في سجل الحقن"><Tracker /></RouteErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="/glossary" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المصطلحات"><Glossary /></RouteErrorBoundary></Suspense>} />
              <Route path="/interactions" element={<ProtectedRoute><Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في التفاعلات"><InteractionChecker /></RouteErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="/compare" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المقارنة"><Compare /></RouteErrorBoundary></Suspense>} />
              <Route path="/blog" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المدونة"><Blog /></RouteErrorBoundary></Suspense>} />
              <Route path="/blog/:slug" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المقالة"><BlogPost /></RouteErrorBoundary></Suspense>} />
              <Route path="/admin" element={<ProtectedRoute requiresAdmin><Suspense fallback={<PageLoader />}><RouteErrorBoundary fallbackTitle="خطأ في لوحة الإدارة"><Admin /></RouteErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="/logout" element={<LogoutRedirect />} />
              <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
            </Routes>
            </PageTransition>
          </main>
          <BottomNav />
          <Footer />
          <BackToTop />
          <OverlayGate />
          <LazyFallback><Suspense fallback={null}><InstallPrompt /></Suspense></LazyFallback>
          <Suspense fallback={null}><Analytics /></Suspense>
          <Suspense fallback={null}><SpeedInsights /></Suspense>
        </div>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
}
