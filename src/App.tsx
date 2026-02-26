import { lazy, Suspense, useEffect, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AgeGate from '@/components/AgeGate';
import TrialBanner from '@/components/TrialBanner';
import BackToTop from '@/components/BackToTop';
import StickyScrollCTA from '@/components/StickyScrollCTA';
import ExitIntentPopup from '@/components/ExitIntentPopup';
import CookieConsent from '@/components/CookieConsent';

import Login from '@/pages/Login';
import Library from '@/pages/Library';
import Pricing from '@/pages/Pricing';

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
const Referral = lazy(() => import('@/pages/Referral'));
const InteractionChecker = lazy(() => import('@/pages/InteractionChecker'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    import('@sentry/react').then(Sentry => {
      Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
          <h2 className="mb-3 text-2xl font-bold text-stone-900">حدث خطأ غير متوقع</h2>
          <p className="mb-6 text-stone-600">نعتذر عن هذا الخطأ. يرجى تحديث الصفحة.</p>
          <button onClick={() => window.location.reload()} className="rounded-full bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700">
            تحديث الصفحة
          </button>
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

function NotFound() {
  return (
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
        <Link to="/library" className="font-semibold text-emerald-600 underline underline-offset-2 hover:text-emerald-700">
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
  );
}

export default function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col bg-white text-stone-900">
          <AgeGate />
          <Header />
          <TrialBanner />
          <ScrollToTop />
          <Toaster position="top-center" richColors dir="rtl" />
          <main className="flex-1">
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Login />} />
              <Route path="/library" element={<Library />} />
              <Route path="/peptide/:id" element={<PeptideDetail />} />
              <Route path="/calculator" element={<DoseCalculator />} />
              <Route path="/stacks" element={<Stacks />} />
              <Route path="/lab-guide" element={<LabGuide />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/table" element={<PeptideTable />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/community" element={<Community />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/account" element={<Account />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tracker" element={<Tracker />} />
              <Route path="/glossary" element={<Glossary />} />
              <Route path="/referral" element={<Referral />} />
              <Route path="/interactions" element={<InteractionChecker />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </main>
          <Footer />
          <BackToTop />
          <StickyScrollCTA />
          <ExitIntentPopup />
          <CookieConsent />
        </div>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
}
