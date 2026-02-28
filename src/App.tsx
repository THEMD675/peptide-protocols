import { lazy, Suspense, useEffect, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { SITE_URL } from '@/lib/constants';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TrialBanner from '@/components/TrialBanner';
import BackToTop from '@/components/BackToTop';
import ProtectedRoute from '@/components/ProtectedRoute';

import AgeGate from '@/components/AgeGate';
import PaymentProcessing from '@/components/PaymentProcessing';
import InstallPrompt from '@/components/InstallPrompt';
import {
  LibrarySkeleton, DashboardSkeleton, TrackerSkeleton, CoachSkeleton,
  PeptideDetailSkeleton, PricingSkeleton, CalculatorSkeleton, GenericPageSkeleton,
} from '@/components/Skeletons';
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
const Reviews = lazy(() => import('@/pages/Reviews'));
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

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 animate-fade-in" role="status" aria-label="جارٍ التحميل">
      <div className="text-xl font-bold tracking-tight text-stone-900">
        <span>pp</span><span className="text-emerald-600">tides</span>
      </div>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
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
      const reloaded = sessionStorage.getItem('pptides_chunk_reload');
      if (!reloaded) {
        sessionStorage.setItem('pptides_chunk_reload', '1');
        window.location.reload();
        return;
      }
      sessionStorage.removeItem('pptides_chunk_reload');
    }
    if (localStorage.getItem('pptides_cookie_consent') === 'accepted') {
      import('@sentry/react').then(Sentry => {
        Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
      }).catch(() => {});
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
          <h2 className="mb-3 text-2xl font-bold text-stone-900">حدث خطأ غير متوقع</h2>
          <p className="mb-6 text-stone-600">
            {this.state.isChunkError ? 'تم تحديث الموقع — يرجى تحديث الصفحة.' : 'نعتذر عن هذا الخطأ. يرجى تحديث الصفحة.'}
          </p>
          <button onClick={() => { this.setState({ reloading: true }); window.location.reload(); }} className="rounded-full bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700 transition-colors">
            {this.state.reloading ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />جارٍ التحديث...</span> : 'تحديث الصفحة'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
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
    if (localStorage.getItem('pptides_cookie_consent') === 'accepted') {
      import('@sentry/react').then(Sentry => {
        Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
      }).catch(() => {});
    }
  }
  reset = () => this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }));
  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < 2;
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
          <h2 className="mb-3 text-2xl font-bold text-stone-900">
            {this.props.fallbackTitle ?? 'حدث خطأ في هذه الصفحة'}
          </h2>
          <p className="mb-6 text-stone-600">
            {canRetry ? 'نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى.' : 'يبدو أن هناك مشكلة مستمرة. حاول تحديث الصفحة أو العودة للرئيسية.'}
          </p>
          <div className="flex gap-3">
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
            <Link to="/" className="rounded-full border-2 border-stone-300 px-8 py-3 font-bold text-stone-800 hover:bg-stone-50 transition-colors">
              الرئيسية
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
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function TrackPageView() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: pathname });
    }
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

function HomeRedirect() {
  const { user, subscription, isLoading } = useAuth();
  if (!isLoading && user && subscription?.isProOrTrial) return <Navigate to="/dashboard" replace />;
  return <Suspense fallback={<PageLoader />}><Landing /></Suspense>;
}

function NotFound() {
  return (
    <>
    <Helmet><title>الصفحة غير موجودة — 404 | pptides</title><meta name="robots" content="noindex" /></Helmet>
    <div className="flex flex-1 flex-col items-center justify-center py-24 text-center px-6">
      <Link to="/" className="mb-6 text-2xl font-bold tracking-tight text-stone-900">
        <span>pp</span>
        <span className="text-emerald-600">tides</span>
      </Link>
      <h1 className="mb-4 text-5xl font-bold text-stone-900">404</h1>
      <p className="mb-4 text-lg text-stone-800">الصفحة غير موجودة</p>
      <p className="mb-6 text-sm text-stone-500">الصفحة التي تبحث عنها غير متاحة أو تم نقلها.</p>
      <p className="mb-8 text-sm text-stone-600">
        جرّب البحث في{' '}
        <Link to="/library" className="font-semibold text-emerald-600 underline underline-offset-2 transition-colors hover:text-emerald-700">
          المكتبة
        </Link>
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/" className="rounded-full bg-emerald-600 px-8 py-3 font-bold text-white transition-transform hover:scale-105 active:scale-[0.98]">
          الرئيسية
        </Link>
        <Link to="/library" className="rounded-full border-2 border-stone-300 px-8 py-3 font-bold text-stone-800 transition-transform hover:scale-105 active:scale-[0.98]">
          المكتبة
        </Link>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
        <Link to="/calculator" className="text-stone-500 hover:text-emerald-600 transition-colors">حاسبة الجرعات</Link>
        <Link to="/coach" className="text-stone-500 hover:text-emerald-600 transition-colors">المدرب الذكي</Link>
        <Link to="/pricing" className="text-stone-500 hover:text-emerald-600 transition-colors">الأسعار</Link>
      </div>
    </div>
    </>
  );
}

export default function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col bg-white text-stone-900 overflow-x-hidden">
          <PaymentProcessing />
          <AgeGate />
          <Header />
          <TrialBanner />
          <ScrollToTop />
          <TrackPageView />
          <CanonicalUrl />
          <Toaster position="top-center" richColors dir="rtl" />
          <main id="main-content" className="flex-1 pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<Suspense fallback={<PageLoader />}><RouteErrorBoundary fallbackTitle="خطأ في صفحة الدخول"><Login /></RouteErrorBoundary></Suspense>} />
              <Route path="/signup" element={<Suspense fallback={<PageLoader />}><RouteErrorBoundary fallbackTitle="خطأ في صفحة الدخول"><Login /></RouteErrorBoundary></Suspense>} />
              <Route path="/library" element={<Suspense fallback={<LibrarySkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المكتبة"><Library /></RouteErrorBoundary></Suspense>} />
              <Route path="/peptide/:id" element={<Suspense fallback={<PeptideDetailSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في صفحة الببتيد"><PeptideDetail /></RouteErrorBoundary></Suspense>} />
              <Route path="/calculator" element={<Suspense fallback={<CalculatorSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في الحاسبة"><DoseCalculator /></RouteErrorBoundary></Suspense>} />
              <Route path="/stacks" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في التجميعات"><Stacks /></RouteErrorBoundary></Suspense>} />
              <Route path="/lab-guide" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في دليل التحاليل"><LabGuide /></RouteErrorBoundary></Suspense>} />
              <Route path="/guide" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في الدليل"><Guide /></RouteErrorBoundary></Suspense>} />
              <Route path="/pricing" element={<Suspense fallback={<PricingSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في صفحة الأسعار"><Pricing /></RouteErrorBoundary></Suspense>} />
              <Route path="/coach" element={<ProtectedRoute><Suspense fallback={<CoachSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المدرب الذكي"><Coach /></RouteErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="/reviews" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في التقييمات"><Reviews /></RouteErrorBoundary></Suspense>} />
              <Route path="/table" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في جدول الببتيدات"><PeptideTable /></RouteErrorBoundary></Suspense>} />
              <Route path="/sources" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المصادر"><Sources /></RouteErrorBoundary></Suspense>} />
              <Route path="/community" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المجتمع"><Community /></RouteErrorBoundary></Suspense>} />
              <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><RouteErrorBoundary><Privacy /></RouteErrorBoundary></Suspense>} />
              <Route path="/terms" element={<Suspense fallback={<PageLoader />}><RouteErrorBoundary><Terms /></RouteErrorBoundary></Suspense>} />
              <Route path="/account" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><RouteErrorBoundary fallbackTitle="خطأ في الحساب"><Account /></RouteErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Suspense fallback={<DashboardSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في لوحة التحكم"><Dashboard /></RouteErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="/tracker" element={<ProtectedRoute><Suspense fallback={<TrackerSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في سجل الحقن"><Tracker /></RouteErrorBoundary></Suspense></ProtectedRoute>} />
              <Route path="/glossary" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في المصطلحات"><Glossary /></RouteErrorBoundary></Suspense>} />
              <Route path="/interactions" element={<Suspense fallback={<GenericPageSkeleton />}><RouteErrorBoundary fallbackTitle="خطأ في التفاعلات"><InteractionChecker /></RouteErrorBoundary></Suspense>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <BackToTop />
          <Suspense fallback={null}><StickyScrollCTA /></Suspense>
          <Suspense fallback={null}><ExitIntentPopup /></Suspense>
          <Suspense fallback={null}><CookieConsent /></Suspense>
          <InstallPrompt />
        </div>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
}
