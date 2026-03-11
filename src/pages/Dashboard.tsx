import { Helmet } from 'react-helmet-async';
import { Link, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useNowMs } from '@/hooks/useNowMs';
import {
  LayoutDashboard,
  BookOpen,
  Calculator,
  Bot,
  FlaskConical,
  Table2,
  Crown,
  CheckCircle2,
  Circle,
  Syringe,
  Flame,
  TrendingUp,
  Clock,
  Sparkles,
  Star,
  Target,
  Trophy,
  ClipboardList,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, arPlural } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PEPTIDE_COUNT, STATUS_LABELS, TIER_LABELS, FREQUENCY_LABELS, STORAGE_KEYS } from '@/lib/constants';
import OnboardingModal from '@/components/OnboardingModal';
import ProgressRing from '@/components/charts/ProgressRing';
import AdherenceBar from '@/components/charts/AdherenceBar';
import DoseTitrationTimeline from '@/components/DoseTitrationTimeline';
import ShareableCard from '@/components/ShareableCard';
import WellnessCheckin from '@/components/WellnessCheckin';
const LabResultsTracker = lazy(() => import('@/components/LabResultsTracker'));
import PushNotificationPrompt from '@/components/PushNotificationPrompt';
import WeeklyProgressReport from '@/components/WeeklyProgressReport';
import { AlertTriangle, HeartPulse } from 'lucide-react';
import { peptides as allPeptides } from '@/data/peptides';
import { labTests } from '@/data/peptides';

const DAILY_TIPS = [
  'حقن BPC-157 على معدة فارغة يزيد من امتصاصه بشكل ملحوظ',
  'دوّر مواقع الحقن كل يوم لتقليل تكوّن الندب والتورم',
  'خزّن الببتيدات المحضّرة في الثلاجة (2-8°C) وتصلح لـ 28 يومًا',
  'اشرب كمية كافية من الماء — الترطيب يساعد في امتصاص الببتيدات',
  'لا تخلط أكثر من ببتيد في نفس السيرنج إلا بعد التأكد من التوافق',
  'الالتزام بالتوقيت أهم من الجرعة — حاول الحقن في نفس الوقت يوميًا',
  'تحاليل الدم قبل البدء تساعدك في قياس التحسن لاحقًا',
  'هرمون النمو يُفرز بشكل أكبر أثناء النوم — احقن GH قبل النوم',
  'BPC-157 + TB-500 من أشهر التوليفات للتعافي — جرّب المزيج الذهبي',
  'سيماغلوتايد يعمل بشكل أفضل مع نظام غذائي عالي البروتين',
  'لا توقف البروتوكول فجأة — اتبع جدول التخفيف التدريجي',
  'الحقن تحت الجلد (Sub-Q) أسهل وأقل ألمًا من العضلي',
  'راجع طبيبك إذا لاحظت أي تغيرات غير طبيعية في الجلد أو الهضم',
  'سجّل ملاحظاتك بعد كل حقنة — تساعدك في تقييم النتائج',
];

const SEASONAL_TIPS: Record<number, string> = {
  0: 'الشتاء — وقت ممتاز لبروتوكولات هرمون النمو والتعافي',
  1: 'فبراير — جهّز تحاليلك قبل بدء بروتوكول جديد في الربيع',
  2: 'الربيع — وقت مثالي لبدء بروتوكول إنقاص الوزن',
  3: 'أبريل — ابدأ بروتوكول البشرة قبل الصيف',
  4: 'مايو — راجع بروتوكولك الحالي وقيّم النتائج',
  5: 'الصيف — ركّز على الترطيب والبشرة مع ببتيدات النحاس',
  6: 'يوليو — حافظ على تخزين الببتيدات في الثلاجة في الحرارة',
  7: 'أغسطس — وقت جيد لبروتوكولات التعافي والمفاصل',
  8: 'سبتمبر — ابدأ دورة جديدة مع بداية الموسم',
  9: 'أكتوبر — استعد لبروتوكولات المناعة قبل الشتاء',
  10: 'نوفمبر — ببتيدات النوم مثل DSIP تساعد في الليالي الطويلة',
  11: 'ديسمبر — قيّم سنتك وخطّط لبروتوكول العام الجديد',
};

const QUICK_LINKS = [
  { to: '/quiz', label: 'اختبار الببتيد', description: 'اكتشف الأنسب لك', Icon: Sparkles },
  { to: '/coach', label: 'المدرب الذكي', description: 'اسأل خبير الببتيدات', Icon: Bot },
  { to: '/tracker', label: 'سجل الحقن', description: 'تتبّع جرعاتك', Icon: Syringe },
  { to: '/calculator', label: 'الحاسبة', description: 'احسب جرعتك بدقة', Icon: Calculator },
  { to: '/library', label: 'المكتبة', description: `تصفّح ${PEPTIDE_COUNT}+ ببتيد`, Icon: BookOpen },
  { to: '/lab-guide', label: 'دليل التحاليل', description: '11 تحليل أساسي', Icon: FlaskConical },
  { to: '/table', label: 'الجدول المرجعي', description: 'جميع الببتيدات في جدول', Icon: Table2 },
];

const GOAL_RECOMMENDATIONS: Record<string, { text: string; peptideId: string }> = {
  'weight-loss': { text: 'ننصح ببروتوكول Retatrutide أو Tirzepatide لإنقاص الوزن', peptideId: 'retatrutide' },
  'recovery': { text: 'ننصح ببروتوكول BPC-157 + TB-500 للتعافي', peptideId: 'bpc-157' },
  'muscle': { text: 'ننصح ببروتوكول CJC-1295 + Ipamorelin للأداء والعضلات', peptideId: 'cjc-1295' },
  'anti-aging': { text: 'ننصح ببروتوكول Epithalon لإطالة العمر', peptideId: 'epithalon' },
  'sleep': { text: 'ننصح ببروتوكول DSIP لتحسين النوم', peptideId: 'dsip' },
  'immunity': { text: 'ننصح ببروتوكول Thymosin Alpha-1 لتعزيز المناعة', peptideId: 'thymosin-alpha-1' },
  'skin': { text: 'ننصح ببروتوكول GHK-Cu لنضارة البشرة', peptideId: 'ghk-cu' },
  'general': { text: 'ننصح ببروتوكول BPC-157 + Semax للصحة العامة', peptideId: 'bpc-157' },
};

const GETTING_STARTED = [
  { id: 'quiz', label: 'اكتشف الببتيد المناسب لك', to: '/quiz' },
  { id: 'guide', label: 'اقرأ دليل الحقن العملي', to: '/guide' },
  { id: 'library', label: 'تصفّح مكتبة الببتيدات', to: '/library' },
  { id: 'calculator', label: 'جرّب حاسبة الجرعات', to: '/calculator' },
  { id: 'coach', label: 'اسأل المدرب الذكي', to: '/coach' },
];

interface BadgeData {
  totalInjections: number;
  streak: number;
  protocols: number;
  uniquePeptides: number;
}

const BADGES: { id: string; label: string; Icon: typeof Syringe; condition: (d: BadgeData) => boolean }[] = [
  { id: 'first_injection', label: 'الحقنة الأولى', Icon: Syringe, condition: (d) => d.totalInjections >= 1 },
  { id: 'streak_7', label: '٧ أيام متتالية', Icon: Flame, condition: (d) => d.streak >= 7 },
  { id: 'streak_30', label: '٣٠ يوم متتالي', Icon: Star, condition: (d) => d.streak >= 30 },
  { id: 'protocol_started', label: 'بروتوكول نشط', Icon: ClipboardList, condition: (d) => d.protocols >= 1 },
  { id: 'injections_10', label: '١٠ حقن', Icon: Target, condition: (d) => d.totalInjections >= 10 },
  { id: 'injections_50', label: '٥٠ حقنة', Icon: Trophy, condition: (d) => d.totalInjections >= 50 },
  { id: 'peptides_3', label: '٣ ببتيدات', Icon: FlaskConical, condition: (d) => d.uniquePeptides >= 3 },
];

const GOAL_TO_CATEGORY: Record<string, string> = {
  'weight-loss': 'metabolic',
  'muscle': 'recovery',
  'anti-aging': 'longevity',
  'recovery': 'recovery',
  'sleep': 'longevity',
  'immunity': 'longevity',
  'skin': 'skin-gut',
  'general': 'recovery',
};


function useVisitedPages() {
  const [visited, setVisited] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('pptides_visited');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    try { localStorage.setItem('pptides_visited', JSON.stringify([...visited])); } catch { /* expected */ }
  }, [visited]);

  const markVisited = (id: string) => setVisited(prev => new Set(prev).add(id));
  return { visited, markVisited };
}

interface RecentLog {
  id: string;
  peptide_name: string;
  dose: number;
  dose_unit: string;
  logged_at: string;
}

interface TodayItem { peptide: string; dose: number; dose_unit: string; done: boolean }

const PAGE_SIZE = 100;

function useRecentActivity(userId: string | undefined) {
  const [logs, setLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [uniquePeptidesCount, setUniquePeptidesCount] = useState(0);

  const cutoff = useMemo(() => new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), []);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMore) return;
    setLoadingMore(true);
    const lastLog = logs[logs.length - 1];
    const { data, error } = await supabase
      .from('injection_logs')
      .select('id, peptide_name, dose, dose_unit, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .gte('logged_at', cutoff)
      .lt('logged_at', lastLog.logged_at)
      .limit(PAGE_SIZE);
    if (data && !error) {
      setLogs(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [userId, logs, loadingMore, cutoff]);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    supabase
      .from('injection_logs')
      .select('id, peptide_name, dose, dose_unit, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .gte('logged_at', cutoff)
      .limit(PAGE_SIZE)
      .then(({ data, error }) => {
        if (!mounted) return;
        if (data && !error) {
          setLogs(data);
          setHasMore(data.length === PAGE_SIZE);
        }
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    supabase
      .from('injection_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => {
        if (mounted && count != null) setTotalCount(count);
      }).catch(() => { /* totalCount non-critical — ignore */ });
    supabase
      .from('injection_logs')
      .select('peptide_name')
      .eq('user_id', userId)
      .limit(500)
      .then(({ data }) => {
        if (!mounted || !data) return;
        const unique = new Set(data.map((r: { peptide_name: string }) => r.peptide_name));
        setUniquePeptidesCount(unique.size);
      })
      .catch(() => { /* uniquePeptidesCount non-critical — ignore */ });
    return () => { mounted = false; };
  }, [userId, cutoff]);

  const activePeptides = [...new Set(logs.map(l => l.peptide_name))];
  const totalInjections = totalCount || logs.length;
  const displayUniquePeptides = uniquePeptidesCount > 0 ? uniquePeptidesCount : activePeptides.length;

  let streak = 0;
  if (logs.length > 0) {
    const daySet = new Set(logs.map(l => new Date(l.logged_at).toDateString()));
    const d = new Date();
    if (!daySet.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
  }

  const todayPlan: TodayItem[] = [];
  if (logs.length >= 3) {
    const today = new Date().toDateString();
    const peptideFreq: Record<string, { dose: number; unit: string; daysUsed: Set<string>; total: number }> = {};
    logs.forEach(l => {
      if (!peptideFreq[l.peptide_name]) peptideFreq[l.peptide_name] = { dose: l.dose, unit: l.dose_unit, daysUsed: new Set(), total: 0 };
      peptideFreq[l.peptide_name].daysUsed.add(new Date(l.logged_at).toDateString());
      peptideFreq[l.peptide_name].total++;
    });
    const todayDone = new Set(logs.filter(l => new Date(l.logged_at).toDateString() === today).map(l => l.peptide_name));
    for (const [name, info] of Object.entries(peptideFreq)) {
      if (info.total >= 2) {
        todayPlan.push({ peptide: name, dose: info.dose, dose_unit: info.dose_unit, done: todayDone.has(name) });
      }
    }
  }

  const todayLogged = logs.some(l => new Date(l.logged_at).toDateString() === new Date().toDateString());

  const lastLogByPeptide: Record<string, string> = {};
  logs.forEach(l => {
    if (!(l.peptide_name in lastLogByPeptide)) lastLogByPeptide[l.peptide_name] = l.logged_at;
  });

  return { logs: logs.slice(0, 5), allLogs: logs, loading, loadingMore, hasMore, loadMore, activePeptides, totalInjections, uniquePeptidesCount: displayUniquePeptides, streak, todayPlan, todayLogged, lastLogByPeptide };
}

interface ActiveProtocol {
  id: string;
  peptide_id: string;
  dose: number;
  dose_unit: string;
  frequency: string;
  cycle_weeks: number;
  started_at: string;
  status: string;
}

function getNextInjectionLabel(
  peptideName: string,
  frequency: string,
  todayPlan: { peptide: string; done: boolean }[],
  lastLogByPeptide: Record<string, string>
): string {
  const todayDone = todayPlan.find(p => p.peptide === peptideName)?.done ?? false;
  const lastAt = lastLogByPeptide[peptideName];
  const now = Date.now();

  if (frequency === 'bid') {
    if (todayDone) return 'غدًا صباحًا ومساءً';
    if (lastAt) {
      const sinceMs = now - new Date(lastAt).getTime();
      const sinceHrs = sinceMs / (1000 * 60 * 60);
      if (sinceHrs < 12) return `خلال ${Math.round(12 - sinceHrs)} ساعة`;
    }
    return 'اليوم — مرتان';
  }
  if (frequency === 'tid') {
    if (todayDone) return 'غدًا — 3 مرات';
    if (lastAt) {
      const sinceMs = now - new Date(lastAt).getTime();
      const sinceHrs = sinceMs / (1000 * 60 * 60);
      if (sinceHrs < 8) return `خلال ${Math.round(8 - sinceHrs)} ساعة`;
    }
    return 'اليوم — 3 مرات';
  }
  if (frequency === 'weekly' || frequency === 'biweekly') {
    return todayDone ? 'الأسبوع القادم' : 'هذا الأسبوع';
  }
  if (frequency === 'prn') return 'عند الحاجة';
  if (todayDone) return 'غدًا';
  return 'اليوم';
}

function useActiveProtocols(userId: string | undefined) {
  const [protocols, setProtocols] = useState<ActiveProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchProtocols = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('user_protocols')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false });
    if (!error && data) setProtocols(data);
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch with mounted guard
    fetchProtocols().then(() => { if (!mounted) return; }).catch(() => { if (mounted) queueMicrotask(() => setLoading(false)); });
    return () => { mounted = false; };
  }, [userId, fetchProtocols]);
  return { protocols, loading, refetch: fetchProtocols };
}

function useUserReviewCount(userId: string | undefined) {
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => { if (mounted && count != null) setReviewCount(count); })
      .catch(() => { if (mounted) setReviewCount(0); });
    return () => { mounted = false; };
  }, [userId]);
  return reviewCount;
}

function useWellnessTrend(userId: string | undefined) {
  const [trend, setTrend] = useState<{ avg: number; prevAvg: number; sideEffects7d: number } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const week = new Date(Date.now() - 7 * 86400000).toISOString();
    const prevWeek = new Date(Date.now() - 14 * 86400000).toISOString();
    Promise.all([
      supabase.from('wellness_logs').select('energy, sleep, mood').eq('user_id', userId).gte('logged_at', week),
      supabase.from('wellness_logs').select('energy, sleep, mood').eq('user_id', userId).gte('logged_at', prevWeek).lt('logged_at', week),
      supabase.from('side_effect_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', week),
    ]).then(([thisWeek, lastWeek, sides]) => {
      if (!mounted) return;
      if (thisWeek.error) console.error('wellness_logs thisWeek query failed:', thisWeek.error);
      if (lastWeek.error) console.error('wellness_logs lastWeek query failed:', lastWeek.error);
      if (sides.error) console.error('side_effect_logs count query failed:', sides.error);
      const avg = (arr: Array<{ energy: number; sleep: number; mood: number }>) =>
        arr.length > 0 ? arr.reduce((s, w) => s + (w.energy + w.sleep + w.mood) / 3, 0) / arr.length : 0;
      setTrend({
        avg: Math.round(avg(thisWeek.data ?? []) * 10) / 10,
        prevAvg: Math.round(avg(lastWeek.data ?? []) * 10) / 10,
        sideEffects7d: sides.count ?? 0,
      });
    }).catch(() => {});
    return () => { mounted = false; };
  }, [userId]);
  return trend;
}

export default function Dashboard() {
  const { user, subscription } = useAuth();
  const nowMs = useNowMs();
  const { visited, markVisited } = useVisitedPages();
  const activity = useRecentActivity(user?.id);
  const { protocols: activeProtocols, refetch: refetchProtocols } = useActiveProtocols(user?.id);
  const userReviewCount = useUserReviewCount(user?.id);
  const wellnessTrend = useWellnessTrend(user?.id);
  const [shareProtocolId, setShareProtocolId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const welcomeConfettiFired = useRef(false);
  const showOnboardButton = useMemo(() => {
    try { return localStorage.getItem('pptides_onboarded') === 'true'; } catch { return false; }
  }, []);

  // C13: Sync onboarding goals from DB → localStorage on load
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    supabase.from('user_profiles').select('onboarding_goals').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!mounted || !data?.onboarding_goals) return;
        const dbGoals = data.onboarding_goals as { goal?: string; ts?: number };
        if (!dbGoals.goal) return;
        try {
          const existing = localStorage.getItem('pptides_quiz_results');
          if (!existing) {
            // No local data — seed from DB
            localStorage.setItem('pptides_quiz_results', JSON.stringify({
              goal: dbGoals.goal,
              answers: { goal: dbGoals.goal },
              result: null,
              ts: dbGoals.ts ?? Date.now(),
            }));
          }
        } catch { /* expected */ }
      }).catch(() => {});
    return () => { mounted = false; };
  }, [user?.id]);

  // Redirect trial users who haven't entered payment to /pricing
  // Skip redirect when returning from Stripe checkout (?payment=success)
  const params = new URLSearchParams(window.location.search);
  const isPaymentCallback = params.get('payment') === 'success';
  if (subscription.needsPaymentSetup && !isPaymentCallback) {
    return <Navigate to="/pricing?setup=1" replace />;
  }

  // Payment polling handled by AuthContext on ?payment=success — no duplicate here
  useEffect(() => {
    if (shareProtocolId) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [shareProtocolId]);

  if (!user) return null;

  const rawName = user.email?.split('@')[0] ?? 'مستخدم';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
      <Helmet>
        <title>لوحة التحكم | pptides</title>
        <meta name="description" content="لوحة التحكم — أدواتك في مكان واحد" />
        <meta property="og:description" content="لوحة التحكم — أدواتك في مكان واحد لإدارة بروتوكولات الببتيدات." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {!activity.loading && activity.logs.length === 0 && activeProtocols.length === 0 && subscription.isProOrTrial && <OnboardingModal />}
      {showOnboarding && <OnboardingModal forceOpen onClose={() => setShowOnboarding(false)} />}

      {/* Expired / never-subscribed banner — read-only mode */}
      {!subscription.isProOrTrial && (
        <div className="mb-6 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">
            {subscription.status === 'none' || subscription.status === undefined
              ? 'ابدأ اشتراكك'
              : 'اشتراكك منتهي — بياناتك محفوظة'}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
            {subscription.status === 'none' || subscription.status === undefined
              ? 'اشترك للوصول إلى كل البروتوكولات والأدوات'
              : 'اشترك للإضافة والتعديل'}
          </p>
          <Link to="/pricing" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700">
            اشترك الآن
          </Link>
        </div>
      )}

      {/* Welcome Header — hidden for brand-new users (they see the first-time hero instead) */}
      {!((!activity.loading && activity.logs.length === 0 && activeProtocols.length === 0)) && (<div className="mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
          <LayoutDashboard className="h-7 w-7 text-emerald-700" />
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
            {new Date().getHours() < 12 ? 'صباح الخير' : new Date().getHours() < 18 ? 'مرحبًا' : 'مساء الخير'}، {displayName}
          </h1>
          {subscription.tier !== 'free' && (
            <span className={cn(
              'rounded-full px-3 py-1 text-xs font-bold',
              subscription.tier === 'elite'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
            )}>
              {TIER_LABELS[subscription.tier] ?? subscription.tier}
            </span>
          )}
          {!activity.loading && (() => {
            const level = activity.totalInjections >= 50 ? 'متقدم' : activity.totalInjections >= 10 ? 'متوسط' : 'مبتدئ';
            const nextThreshold = activity.totalInjections >= 50 ? null : activity.totalInjections >= 10 ? 50 : 10;
            const prevThreshold = activity.totalInjections >= 50 ? 50 : activity.totalInjections >= 10 ? 10 : 0;
            const progress = nextThreshold ? Math.round(((activity.totalInjections - prevThreshold) / (nextThreshold - prevThreshold)) * 100) : 100;
            return (
              <div className="flex items-center gap-2">
                <span className={cn(
                  'rounded-full px-3 py-1 text-xs font-bold',
                  activity.totalInjections >= 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : activity.totalInjections >= 10 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300',
                )}>
                  {level}
                </span>
                {nextThreshold && (
                  <div className="flex items-center gap-1.5" title={`${activity.totalInjections}/${nextThreshold} للمستوى التالي`}>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] text-stone-400">{nextThreshold - activity.totalInjections} للتالي</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        <p className="mt-2 text-lg text-stone-600 dark:text-stone-300">
          {activeProtocols.length > 0
            ? `لديك ${activeProtocols.length} بروتوكول نشط — استمر في الالتزام`
            : 'ابدأ من هنا — كل أدواتك في مكان واحد'}
        </p>
      </div>)}

      {/* Subscription Status Card */}
      <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6">
        <div className="flex items-center gap-3 mb-3">
          <Crown className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">اشتراكك</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4" role="status">
          <span className={cn(
            'rounded-full px-3 py-1 text-xs font-bold',
            subscription.tier === 'elite'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : subscription.tier === 'essentials'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700'
                : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300',
          )}>
            {TIER_LABELS[subscription.tier] ?? subscription.tier}
          </span>
          <span className={cn(
            'rounded-full px-3 py-1 text-xs font-bold',
            subscription.isProOrTrial
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : subscription.status === 'past_due'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300',
          )}>
            {subscription.isProOrTrial && subscription.status === 'cancelled'
              ? 'نشط'
              : STATUS_LABELS[subscription.status] ?? subscription.status}
          </span>
          {subscription.status === 'trial' && subscription.trialDaysLeft > 0 && (
            <span className="text-sm text-amber-600 font-bold">
              {arPlural(subscription.trialDaysLeft, 'يوم واحد متبقي', 'يومان متبقيان', 'أيام متبقية')}
            </span>
          )}
        </div>
        {!subscription.isProOrTrial && (
          <Link
            to="/pricing"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700"
          >
            ابدأ تجربتك المجانية
          </Link>
        )}
      </div>

      {/* Weekly Progress Report */}
      <WeeklyProgressReport />

      {/* Re-open onboarding */}
      {showOnboardButton && (
        <div className="mb-6 flex justify-center">
          <button
            onClick={() => setShowOnboarding(true)}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-5 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-100 dark:bg-emerald-900/30"
          >
            <Sparkles className="h-4 w-4" />
            خطة البداية
          </button>
        </div>
      )}

      {/* Daily tip + seasonal */}
      {(() => {
        const tipIndex = Math.floor(nowMs / 86400000) % DAILY_TIPS.length;
        const seasonalTip = SEASONAL_TIPS[new Date(nowMs).getMonth()];
        return (
          <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">نصيحة اليوم</p>
            <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">{DAILY_TIPS[tipIndex]}</p>
            {seasonalTip && (
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-300 border-t border-emerald-100 pt-2">{seasonalTip}</p>
            )}
          </div>
        );
      })()}

      {/* Streak-at-risk banner */}
      {!activity.loading && activity.streak > 0 && !activity.todayLogged && new Date(nowMs).getHours() >= 16 && (
        <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">سلسلتك في خطر!</p>
            <p className="text-xs text-amber-600">{activity.streak} يوم متتالي — سجّل جرعتك قبل منتصف الليل</p>
          </div>
          <Link to="/tracker" className="shrink-0 rounded-full bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700">
            سجّل الآن
          </Link>
        </div>
      )}

      {/* Review encouragement — 7+ injections, 0 reviews */}
      {!activity.loading && activity.totalInjections >= 7 && userReviewCount === 0 && (
        <div className="mb-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Star className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <p className="font-bold text-stone-900 dark:text-stone-100">لقد سجّلت 7+ حقنة — شارك تجربتك وساعد الآخرين</p>
              <p className="text-sm text-stone-600 dark:text-stone-300">تقييمك يساعد المجتمع على اتخاذ قرارات واعية</p>
            </div>
          </div>
          <Link to="/community" className="shrink-0 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
            اكتب تقييمك
          </Link>
        </div>
      )}

      {/* Loading skeleton while activity data fetches */}
      {activity.loading && (
        <div className="mb-8 animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-20 rounded-xl bg-stone-200 dark:bg-stone-700" />
            ))}
          </div>
          <div className="h-10 rounded-xl bg-stone-200 dark:bg-stone-700" />
          <div className="h-24 rounded-2xl bg-stone-200 dark:bg-stone-700" />
        </div>
      )}

      {/* Journey Stats */}
      {!activity.loading && (activity.logs.length > 0 || activeProtocols.length > 0) && (() => {
        const total = activity.totalInjections ?? activity.logs.length;
        const milestoneNext = total < 10 ? 10 : total < 25 ? 25 : total < 50 ? 50 : total < 100 ? 100 : total < 250 ? 250 : 500;
        const milestonePrev = total < 10 ? 0 : total < 25 ? 10 : total < 50 ? 25 : total < 100 ? 50 : total < 250 ? 100 : 250;
        const milestoneProgress = milestonePrev === milestoneNext ? 100 : Math.round(((total - milestonePrev) / (milestoneNext - milestonePrev)) * 100);
        return (
          <div className="mb-8">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 p-3 text-center">
                <p className="text-2xl font-black text-emerald-700">{total}</p>
                <p className="text-[11px] font-medium text-stone-500 dark:text-stone-300">حقنة مسجّلة</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 p-3 text-center">
                <p className="text-2xl font-black text-emerald-700">{activity.streak}</p>
                <p className="text-[11px] font-medium text-stone-500 dark:text-stone-300">يوم متتالي</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 p-3 text-center">
                <p className="text-2xl font-black text-emerald-700">{activeProtocols.length}</p>
                <p className="text-[11px] font-medium text-stone-500 dark:text-stone-300">بروتوكول نشط</p>
              </div>
            </div>
            {total > 0 && (
              <div className="rounded-xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-bold text-stone-600 dark:text-stone-300">الإنجاز التالي: {milestoneNext} حقنة</p>
                  <p className="text-[11px] font-bold text-emerald-700">{milestoneProgress}%</p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${milestoneProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Achievement Badges */}
      {!activity.loading && (activity.logs.length > 0 || activeProtocols.length > 0) && (() => {
        const badgeData: BadgeData = {
          totalInjections: activity.totalInjections,
          streak: activity.streak,
          protocols: activeProtocols.length,
          uniquePeptides: activity.uniquePeptidesCount,
        };
        const earned = BADGES.filter(b => b.condition(badgeData));
        const unearned = BADGES.filter(b => !b.condition(badgeData));
        return (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-stone-900 dark:text-stone-100">إنجازاتك</h2>
            <div className="flex flex-wrap gap-2">
              {earned.map(badge => (
                <div key={badge.id} className="flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-900/30 px-4 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  <badge.Icon className="h-4 w-4" />
                  {badge.label}
                </div>
              ))}
              {unearned.map(badge => (
                <div key={badge.id} className="flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 px-4 py-2 text-sm font-medium text-stone-400">
                  <Lock className="h-3.5 w-3.5" />
                  {badge.label}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* My Journey Timeline */}
      {!activity.loading && (activity.logs.length > 0 || activeProtocols.length > 0) && (() => {
        const bd: BadgeData = {
          totalInjections: activity.totalInjections,
          streak: activity.streak,
          protocols: activeProtocols.length,
          uniquePeptides: activity.uniquePeptidesCount,
        };
        const earnedBadges = BADGES.filter(b => b.condition(bd));
        const journeyEvents: { date: string | null; text: string }[] = [];
        activeProtocols.forEach(proto => {
          const pep = allPeptides.find(p => p.id === proto.peptide_id);
          journeyEvents.push({ date: proto.started_at, text: `بدأت بروتوكول ${pep?.nameAr ?? proto.peptide_id}` });
        });
        const total = activity.totalInjections;
        if (total >= 100) journeyEvents.push({ date: null, text: 'أكملت ١٠٠ حقنة' });
        else if (total >= 50) journeyEvents.push({ date: null, text: 'أكملت ٥٠ حقنة' });
        else if (total >= 10) journeyEvents.push({ date: null, text: 'أكملت ١٠ حقن' });
        earnedBadges.forEach(badge => {
          journeyEvents.push({ date: null, text: `حصلت على شارة ${badge.label}` });
        });
        journeyEvents.sort((a, b) => {
          if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
          if (a.date) return -1;
          if (b.date) return 1;
          return 0;
        });
        if (journeyEvents.length === 0) return null;
        return (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-stone-900 dark:text-stone-100">رحلتي</h2>
            <div className="relative border-s-2 border-emerald-200 dark:border-emerald-800 ps-6 space-y-4">
              {journeyEvents.map((event, i) => (
                <div key={i} className="relative">
                  <div className="absolute -start-[9px] top-1 h-4 w-4 rounded-full border-2 border-emerald-400 bg-white dark:bg-stone-900" />
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-200">{event.text}</p>
                  {event.date && (
                    <p className="text-xs text-stone-500 dark:text-stone-300 mt-0.5">
                      {new Date(event.date).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Protocol ending soon — prominent warning cards */}
      {activeProtocols.length > 0 && (() => {
        const endingSoon = activeProtocols.filter(proto => {
          const startDate = new Date(proto.started_at);
          const daysSinceStart = Math.floor((nowMs - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const totalDays = proto.cycle_weeks * 7;
          const daysLeft = Math.max(totalDays - daysSinceStart, 0);
          return daysLeft <= 3 && daysLeft > 0;
        });
        if (endingSoon.length === 0) return null;
        return (
          <div className="mb-6 space-y-3">
            {endingSoon.map(proto => {
              const peptide = allPeptides.find(p => p.id === proto.peptide_id);
              const startDate = new Date(proto.started_at);
              const daysSinceStart = Math.floor((nowMs - startDate.getTime()) / (1000 * 60 * 60 * 24));
              const totalDays = proto.cycle_weeks * 7;
              const daysLeft = Math.max(totalDays - daysSinceStart, 0);
              const nameAr = peptide?.nameAr ?? proto.peptide_id;
              const daysLabel = daysLeft === 1 ? 'يوم' : daysLeft === 2 ? 'يومين' : 'أيام';
              return (
                <div key={`warning-${proto.id}`} className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-5 shadow-sm dark:shadow-stone-900/30">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-amber-800 dark:text-amber-300">
                        بروتوكول {nameAr} ينتهي خلال {daysLeft} {daysLabel} — هل تريد تجديده؟
                      </p>
                      <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">خطّط لفترة الراحة أو ابدأ دورة جديدة</p>
                    </div>
                    <Link
                      to={`/peptide/${proto.peptide_id}`}
                      className="shrink-0 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-700"
                    >
                      عرض تفاصيل {nameAr}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Active Protocols */}
      {activeProtocols.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-stone-900 dark:text-stone-100">بروتوكولاتك النشطة</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeProtocols.map(proto => {
              const peptide = allPeptides.find(p => p.id === proto.peptide_id);
              const startDate = new Date(proto.started_at);
              const daysSinceStart = Math.floor((nowMs - startDate.getTime()) / (1000 * 60 * 60 * 24));
              const totalDays = proto.cycle_weeks * 7;
              const daysLeft = Math.max(totalDays - daysSinceStart, 0);
              const relatedLabs = peptide ? labTests.filter(lt => lt.relatedCategories.includes(peptide.category)) : [];
              const showLabReminder = daysSinceStart >= 21 && relatedLabs.length > 0;

              return (
                <div key={proto.id} className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-5 transition-all hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <ProgressRing current={daysSinceStart} total={totalDays} size={64} label={`يوم ${daysSinceStart}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 dark:text-stone-100 truncate">{peptide?.nameAr ?? proto.peptide_id}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-300 mt-0.5" dir="ltr">{proto.dose} {proto.dose_unit} — {FREQUENCY_LABELS[proto.frequency] ?? proto.frequency}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-300 mt-1">{daysLeft > 0 ? `${daysLeft} يوم متبقي` : 'انتهت الدورة'}</p>
                      <p className="text-xs font-semibold text-emerald-700 mt-1">
                        الجرعة التالية: {getNextInjectionLabel(
                          peptide?.nameEn ?? proto.peptide_id,
                          proto.frequency,
                          activity.todayPlan,
                          activity.lastLogByPeptide
                        )}
                      </p>
                    </div>
                  </div>
                  {daysLeft <= 3 && daysLeft > 0 && (
                    <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                      دورتك تنتهي خلال {daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'} — خطّط لفترة الراحة
                    </div>
                  )}
                  {daysLeft === 0 && (
                    <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        أكملت الدورة! {peptide?.restPeriodWeeks ? `فترة راحة موصى بها: ${peptide.restPeriodWeeks} أسابيع` : ''}
                      </p>
                      <button
                        onClick={async () => {
                          const text = `أكملت بروتوكول ${peptide?.nameAr ?? proto.peptide_id} (${proto.cycle_weeks} أسابيع) على pptides.com\n\npptides — أشمل دليل عربي للببتيدات العلاجية`;
                          if (navigator.share) {
                            await navigator.share({ title: 'شهادة إتمام بروتوكول', text }).catch(() => {});
                          } else {
                            await navigator.clipboard.writeText(text).catch(() => {});
                            toast.success('تم نسخ الشهادة');
                          }
                        }}
                        className="mt-2 flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors"
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        شارك شهادة الإتمام
                      </button>
                    </div>
                  )}
                  {showLabReminder && (
                    <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
                      <strong>تحاليل موصى بها:</strong> {relatedLabs.slice(0, 2).map(l => l.nameAr).join('، ')}
                      <Link to="/lab-guide" className="ms-1 font-bold text-blue-600 hover:underline">عرض الدليل</Link>
                    </div>
                  )}
                  {daysSinceStart > totalDays * 0.8 && daysLeft > 0 && (() => {
                    const nextPeptide = allPeptides.find(
                      p => p.id !== proto.peptide_id
                        && p.category === peptide?.category
                        && !activeProtocols.some(ap => ap.peptide_id === p.id)
                    );
                    if (!nextPeptide) return null;
                    return (
                      <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                        دورة {peptide?.nameAr ?? proto.peptide_id} تقترب من النهاية — فكّر في{' '}
                        <Link to={`/peptide/${nextPeptide.id}`} className="font-bold text-emerald-700 hover:underline">
                          {nextPeptide.nameAr}
                        </Link>
                      </div>
                    );
                  })()}
                  {peptide?.weeklySchedule && peptide.weeklySchedule.length >= 2 && (
                    <div className="mt-3">
                      <DoseTitrationTimeline schedule={peptide.weeklySchedule} currentWeek={Math.ceil(daysSinceStart / 7)} />
                    </div>
                  )}
                  <div className="mt-3">
                    {(() => {
                      const frequencyMultiplier = proto.frequency === 'bid' ? 2 : proto.frequency === 'tid' ? 3 : 1;
                      const scheduledDoses = daysSinceStart * frequencyMultiplier;
                      return (
                        <AdherenceBar scheduled={scheduledDoses} actual={activity.allLogs.filter(l => l.peptide_name === (peptide?.nameEn ?? proto.peptide_id)).length} />
                      );
                    })()}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {subscription.isProOrTrial ? (
                      <>
                        <Link
                          to={`/tracker?peptide=${encodeURIComponent(peptide?.nameEn ?? proto.peptide_id)}`}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                        >
                          <Syringe className="h-4 w-4" />
                          سجّل جرعة اليوم
                        </Link>
                        <button
                          onClick={async () => {
                            if (!window.confirm('هل تريد إنهاء هذا البروتوكول؟ لا يمكن التراجع.')) return;
                            const { error } = await supabase
                              .from('user_protocols')
                              .update({ status: 'completed', updated_at: new Date().toISOString() })
                              .eq('id', proto.id)
                              .eq('user_id', user.id);
                            if (!error) {
                              toast.success(`تم إنهاء بروتوكول ${peptide?.nameAr ?? proto.peptide_id}`);
                              refetchProtocols();
                            } else {
                              toast.error('تعذّر إنهاء البروتوكول — تحقق من اتصالك وحاول مرة أخرى');
                            }
                          }}
                          className="text-xs text-stone-500 dark:text-stone-300 hover:text-red-500 dark:text-red-400 transition-colors"
                        >
                          أنهِ البروتوكول
                        </button>
                      </>
                    ) : (
                      <span className="flex-1 text-center text-xs text-stone-500 dark:text-stone-300">وضع القراءة فقط</span>
                    )}
                    <button
                      onClick={() => setShareProtocolId(proto.id)}
                      className="flex items-center justify-center rounded-xl border border-stone-200 dark:border-stone-600 px-3 py-2.5 text-sm text-stone-500 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-emerald-700"
                      aria-label="مشاركة"
                    >
                      <TrendingUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Challenge */}
      {!activity.loading && activeProtocols.length > 0 && (() => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        const daysLogged = new Set(
          activity.allLogs
            .filter(l => new Date(l.logged_at) >= startOfWeek)
            .map(l => new Date(l.logged_at).toDateString())
        ).size;
        return (
          <div className="mb-8 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">تحدي الأسبوع</h2>
            </div>
            <p className="text-sm text-stone-700 dark:text-stone-200 mb-3">سجّل حقنة كل يوم هذا الأسبوع</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${Math.round((daysLogged / 7) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-black text-emerald-700 shrink-0" dir="ltr">{daysLogged}/7</span>
            </div>
            {daysLogged >= 7 && (
              <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">أحسنت! أكملت التحدي هذا الأسبوع</p>
            )}
          </div>
        );
      })()}

      {/* Recommended Peptides */}
      {(() => {
        const protocolPeptideIds = new Set(activeProtocols.map(p => p.peptide_id));
        let recommended: typeof allPeptides = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.QUIZ_RESULTS);
          if (raw) {
            const parsed = JSON.parse(raw);
            const category = GOAL_TO_CATEGORY[parsed.goal];
            if (category) {
              recommended = allPeptides
                .filter(p => p.category === category && !protocolPeptideIds.has(p.id))
                .slice(0, 3);
            }
          }
        } catch { /* ignore */ }
        if (recommended.length === 0) {
          recommended = allPeptides
            .filter(p => p.isFree && !protocolPeptideIds.has(p.id))
            .slice(0, 3);
        }
        if (recommended.length === 0) return null;
        return (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-stone-900 dark:text-stone-100">ببتيدات مقترحة لك</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {recommended.map(peptide => (
                <Link
                  key={peptide.id}
                  to={`/peptide/${peptide.id}`}
                  className="group rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5 card-lift hover:border-emerald-400 hover:shadow-emerald-600/10"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-900/30">
                      <FlaskConical className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900 dark:text-stone-100 truncate">{peptide.nameAr}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-300" dir="ltr">{peptide.nameEn}</p>
                    </div>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">{peptide.summaryAr}</p>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Wellness Check-in */}
      <div className="mb-8">
        <WellnessCheckin />
      </div>

      {/* Wellness Trend + Side Effects Summary */}
      {wellnessTrend && (wellnessTrend.avg > 0 || wellnessTrend.sideEffects7d > 0) && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {wellnessTrend.avg > 0 && (
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5 shadow-sm dark:shadow-stone-900/30">
              <div className="flex items-center gap-2 mb-2">
                <HeartPulse className="h-5 w-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">معدل العافية (٧ أيام)</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-stone-900 dark:text-stone-100">{wellnessTrend.avg}</span>
                <span className="text-sm text-stone-500 dark:text-stone-300">/ 5</span>
                {wellnessTrend.prevAvg > 0 && (
                  <span className={cn('text-xs font-medium', wellnessTrend.avg >= wellnessTrend.prevAvg ? 'text-emerald-700' : 'text-amber-600')}>
                    {wellnessTrend.avg >= wellnessTrend.prevAvg ? '↑' : '↓'} {Math.abs(wellnessTrend.avg - wellnessTrend.prevAvg).toFixed(1)} عن الأسبوع الماضي
                  </span>
                )}
              </div>
            </div>
          )}
          {wellnessTrend.sideEffects7d > 0 && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 shadow-sm dark:shadow-stone-900/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">أعراض جانبية (٧ أيام)</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{wellnessTrend.sideEffects7d}</span>
                <span className="text-sm text-amber-600">{arPlural(wellnessTrend.sideEffects7d, 'عرض واحد', 'عرضان', 'أعراض')}</span>
              </div>
              <Link to="/tracker" className="mt-2 block text-xs font-medium text-amber-700 dark:text-amber-400 underline">عرض التفاصيل في المتتبع</Link>
            </div>
          )}
        </div>
      )}

      {/* Push Notification Prompt — paid subscribers only */}
      {subscription.isProOrTrial && (
        <PushNotificationPrompt />
      )}

      {/* Lab Results Tracker */}
      {subscription.isProOrTrial && (
        <div className="mb-8">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-800" />}><LabResultsTracker /></Suspense>
        </div>
      )}

      {/* Share Protocol Modal */}
      {shareProtocolId && (() => {
        const proto = activeProtocols.find(p => p.id === shareProtocolId);
        if (!proto) return null;
        const peptide = allPeptides.find(p => p.id === proto.peptide_id);
        const daysSinceStart = Math.floor((nowMs - new Date(proto.started_at).getTime()) / (1000 * 60 * 60 * 24));
        const actualDoses = activity.allLogs.filter(l => l.peptide_name === (peptide?.nameEn ?? proto.peptide_id)).length;
        const adherence = daysSinceStart > 0 ? Math.min(Math.round((actualDoses / daysSinceStart) * 100), 100) : 0;
        return (
          <div role="dialog" aria-modal="true" aria-label="مشاركة البروتوكول" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShareProtocolId(null)}>
            <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <ShareableCard
                peptideName={peptide?.nameAr ?? proto.peptide_id}
                peptideNameEn={peptide?.nameEn ?? proto.peptide_id}
                dose={proto.dose}
                unit={proto.dose_unit}
                frequency={proto.frequency}
                cycleWeeks={proto.cycle_weeks}
                daysSinceStart={daysSinceStart}
                adherencePercent={adherence}
              />
              <button onClick={() => setShareProtocolId(null)} className="mt-3 w-full rounded-xl border border-stone-200 dark:border-stone-600 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800">
                إغلاق
              </button>
            </div>
          </div>
        );
      })()}

      {/* Today's Protocol — only show heuristic plan when no formal active protocols exist */}
      {!activity.loading && activity.todayPlan.length > 0 && activeProtocols.length === 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-stone-900 dark:text-stone-100">بروتوكول اليوم</h2>
          <div className="space-y-2">
            {activity.todayPlan.map(item => (
              <div key={item.peptide} className={cn(
                'flex items-center justify-between rounded-2xl border px-5 py-4 transition-all',
                item.done ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20' : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900'
              )}>
                <div className="flex items-center gap-3">
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <Circle className="h-5 w-5 text-stone-300" />
                  )}
                  <div>
                    <p className={cn('text-sm font-bold', item.done ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-900 dark:text-stone-100')} dir="ltr">{item.peptide}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-300">{item.dose} {item.dose_unit}</p>
                  </div>
                </div>
                {!item.done && (
                  <Link
                    to={`/tracker?peptide=${encodeURIComponent(item.peptide)}`}
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                  >
                    سجّل الآن
                  </Link>
                )}
                {item.done && <span className="text-xs font-bold text-emerald-700">تم</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Section */}
      {!activity.loading && activity.logs.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold text-stone-900 dark:text-stone-100">نشاطك</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 text-center shadow-sm dark:shadow-stone-900/30">
              <Clock className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">
                {(() => {
                  const last = activity.logs[0];
                  if (!last) return '—';
                  const diff = nowMs - new Date(last.logged_at).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 60) return `${mins} دقيقة`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs} ساعة`;
                  const days = Math.floor(hrs / 24);
                  return `${days} يوم`;
                })()}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-300">آخر حقنة منذ</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 text-center shadow-sm dark:shadow-stone-900/30">
              <Flame className="mx-auto mb-1 h-5 w-5 text-orange-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{activity.streak}</p>
              <p className="text-xs text-stone-500 dark:text-stone-300">أيام متتالية</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 text-center shadow-sm dark:shadow-stone-900/30">
              <Syringe className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{activity.uniquePeptidesCount}</p>
              <p className="text-xs text-stone-500 dark:text-stone-300">ببتيدات نشطة</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 text-center shadow-sm dark:shadow-stone-900/30">
              <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{activity.totalInjections}</p>
              <p className="text-xs text-stone-500 dark:text-stone-300">حقن مسجّلة</p>
            </div>
          </div>
          <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">آخر الحقن</h3>
              <Link to="/tracker" className="text-xs font-semibold text-emerald-700 hover:underline">عرض الكل</Link>
            </div>
            <div className="space-y-2">
              {activity.logs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-stone-50 dark:bg-stone-900 px-3 py-2">
                  <div>
                    <span className="text-sm font-bold text-stone-900 dark:text-stone-100" dir="ltr">{log.peptide_name}</span>
                    <span className="me-2 text-xs text-stone-500 dark:text-stone-300">{log.dose} {log.dose_unit}</span>
                  </div>
                  <span className="text-xs text-stone-500 dark:text-stone-300">
                    {new Date(log.logged_at).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 30-Day Streak Calendar */}
      {!activity.loading && activity.logs.length > 0 && (() => {
        const today = new Date();
        const days: { date: Date; count: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const ds = d.toDateString();
          const count = activity.allLogs.filter(l => new Date(l.logged_at).toDateString() === ds).length;
          days.push({ date: d, count });
        }

        return (
          <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5 shadow-sm dark:shadow-stone-900/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">آخر 30 يوم</h3>
              <span className="text-xs text-stone-500 dark:text-stone-300">{days.filter(d => d.count > 0).length} يوم نشط</span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1">
              {days.map((d, i) => (
                <div key={i} className={cn(
                  'aspect-square rounded-sm transition-colors',
                  d.count === 0 ? 'bg-stone-100 dark:bg-stone-800' :
                  d.count === 1 ? 'bg-emerald-200' :
                  d.count === 2 ? 'bg-emerald-400' :
                  'bg-emerald-600',
                )} title={`${d.date.toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })}: ${d.count} حقن`} />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1 text-xs text-stone-500 dark:text-stone-300">
              <span>أقل</span>
              <span className="h-2.5 w-2.5 rounded-sm bg-stone-100 dark:bg-stone-800" />
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-200" />
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
              <span>أكثر</span>
            </div>
            {activity.hasMore && (
              <button
                onClick={activity.loadMore}
                disabled={activity.loadingMore}
                className="mt-3 w-full rounded-xl border border-stone-200 dark:border-stone-600 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50"
              >
                {activity.loadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
              </button>
            )}
          </div>
        );
      })()}

      {/* ═══════ FIRST-TIME WELCOME EXPERIENCE ═══════ */}
      {!activity.loading && activity.logs.length === 0 && activeProtocols.length === 0 && (() => {
        // Fire welcome confetti once
        if (!welcomeConfettiFired.current) {
          welcomeConfettiFired.current = true;
          const WELCOME_KEY = 'pptides_welcome_confetti';
          try {
            if (!localStorage.getItem(WELCOME_KEY)) {
              localStorage.setItem(WELCOME_KEY, '1');
              if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                setTimeout(() => {
                  confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 }, colors: ['#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'], zIndex: 9999 });
                }, 700);
              }
            }
          } catch { /* Safari private */ }
        }
        let userGoalLabel = '';
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.QUIZ_RESULTS);
          if (raw) {
            const parsed = JSON.parse(raw);
            const goalMap: Record<string, string> = {
              'weight-loss': 'فقدان الوزن', 'muscle': 'بناء العضل', 'anti-aging': 'مقاومة الشيخوخة',
              'recovery': 'التعافي', 'sleep': 'تحسين النوم', 'immunity': 'تعزيز المناعة', 'skin': 'صحة البشرة', 'general': 'صحة عامة',
            };
            userGoalLabel = goalMap[parsed.goal] ?? '';
          }
        } catch { /* ignore */ }

        const rec = (() => {
          try {
            const raw = localStorage.getItem(STORAGE_KEYS.QUIZ_RESULTS);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return GOAL_RECOMMENDATIONS[parsed.goal] ?? null;
          } catch { return null; }
        })();

        return (
          <>
            {/* Welcome Hero */}
            <div className="mb-8 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 via-white to-white dark:to-stone-950 p-8 text-center" style={{ animation: 'dash-welcome-in 0.6s ease-out' }}>
              <p className="mb-2 text-4xl">🎉</p>
              <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">مرحبًا بك في pptides!</h2>
              {userGoalLabel && (
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">هدفك: <span className="font-bold">{userGoalLabel}</span></p>
              )}
              <p className="text-sm text-stone-600 dark:text-stone-300 mb-4">{PEPTIDE_COUNT} ببتيد جاهزة لك — رحلتك تبدأ الآن</p>

              {/* VIP Quick-Start Cards */}
              <div className="grid gap-3 sm:grid-cols-2 mt-6 text-start">
                <Link to="/guide" className="group flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-4 transition-all hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 min-h-[44px]" style={{ animation: 'dash-card-in 0.5s ease-out 0.3s both' }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 transition-colors group-hover:bg-amber-200">
                    <ClipboardList className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">دليل الحقن</p>
                    <p className="text-xs text-stone-500 dark:text-stone-300">ابدأ هنا — خطوة بخطوة</p>
                  </div>
                </Link>
                <Link to="/library" className="group flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-4 transition-all hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 min-h-[44px]" style={{ animation: 'dash-card-in 0.5s ease-out 0.45s both' }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 transition-colors group-hover:bg-emerald-200">
                    <BookOpen className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">المكتبة</p>
                    <p className="text-xs text-stone-500 dark:text-stone-300">اكتشف {PEPTIDE_COUNT}+ ببتيد</p>
                  </div>
                </Link>
                <Link to="/coach" className="group flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-4 transition-all hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 min-h-[44px]" style={{ animation: 'dash-card-in 0.5s ease-out 0.6s both' }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 transition-colors group-hover:bg-emerald-200">
                    <Bot className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">المدرب الذكي</p>
                    <p className="text-xs text-stone-500 dark:text-stone-300">جاهز لمساعدتك ٢٤/٧</p>
                  </div>
                </Link>
                <Link to="/calculator" className="group flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 p-4 transition-all hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 min-h-[44px]" style={{ animation: 'dash-card-in 0.5s ease-out 0.75s both' }}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 transition-colors group-hover:bg-emerald-200">
                    <Calculator className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">الحاسبة</p>
                    <p className="text-xs text-stone-500 dark:text-stone-300">احسب جرعتك بدقة</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Goal-based recommendation */}
            {rec && (
              <div className="mb-8 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="h-5 w-5 text-emerald-700" />
                  <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">توصية مخصّصة لك</h2>
                </div>
                <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed mb-4">{rec.text}</p>
                <Link
                  to={`/peptide/${rec.peptideId}`}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 min-h-[44px]"
                >
                  ابدأ البروتوكول
                </Link>
              </div>
            )}

            {/* Inviting Empty States */}
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <Link to="/tracker" className="group rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50/50 to-white dark:to-stone-950 p-6 text-center transition-all hover:border-emerald-300 dark:border-emerald-700 hover:shadow-sm dark:shadow-stone-900/30 min-h-[44px]">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 transition-transform group-hover:scale-110">
                  <Syringe className="h-6 w-6 text-emerald-700" />
                </div>
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">سجل الحقن</p>
                <p className="text-xs text-stone-500 dark:text-stone-300 leading-relaxed">سجّل أول جرعة وابدأ بتتبع تقدمك</p>
              </Link>
              <Link to="/dashboard" className="group rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50/50 to-white dark:to-stone-950 p-6 text-center transition-all hover:border-emerald-300 dark:border-emerald-700 hover:shadow-sm dark:shadow-stone-900/30 min-h-[44px]">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30 transition-transform group-hover:scale-110">
                  <FlaskConical className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">التحاليل</p>
                <p className="text-xs text-stone-500 dark:text-stone-300 leading-relaxed">أضف تحاليلك وشاهد التغيّرات مع الوقت</p>
              </Link>
              <Link to="/coach" className="group rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50/50 to-white dark:to-stone-950 p-6 text-center transition-all hover:border-emerald-300 dark:border-emerald-700 hover:shadow-sm dark:shadow-stone-900/30 min-h-[44px]">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 transition-transform group-hover:scale-110">
                  <Bot className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">المدرب الذكي</p>
                <p className="text-xs text-stone-500 dark:text-stone-300 leading-relaxed">اسأل المدرب الذكي — جاهز لمساعدتك ٢٤/٧</p>
              </Link>
            </div>

            <style>{`
              @keyframes dash-welcome-in { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
              @keyframes dash-card-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
          </>
        );
      })()}

      {/* Empty tracker state for users with NO first-time welcome (e.g. has coach requests but no logs) */}
      {!activity.loading && activity.logs.length === 0 && activeProtocols.length > 0 && (
        <div className="mb-8 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <Syringe className="h-8 w-8 text-emerald-700" />
          </div>
          <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">سجّل أول جرعة</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            لديك بروتوكولات نشطة — ابدأ بتسجيل جرعاتك لتتبع التقدم.
          </p>
          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/tracker" className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 sm:w-auto min-h-[44px]">
              <Syringe className="h-4 w-4" /> سجّل جرعة
            </Link>
          </div>
        </div>
      )}

      {/* Quick Links Grid */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-stone-900 dark:text-stone-100">الأدوات</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="group flex items-center gap-4 rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5 card-lift hover:border-emerald-400 hover:shadow-emerald-600/10"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-900/30">
                <link.Icon className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <p className="font-bold text-stone-900 dark:text-stone-100">{link.label}</p>
                <p className="text-xs text-stone-500 dark:text-stone-300">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started Checklist — only show if not all done */}
      {visited.size < GETTING_STARTED.length ? (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">ابدأ هنا</h2>
          <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">أكمل هذه الخطوات للاستفادة القصوى من pptides</p>
          <div className="space-y-3">
            {GETTING_STARTED.map((step, i) => {
              const done = visited.has(step.id);
              return (
                <Link
                  key={step.id}
                  to={step.to}
                  onClick={() => markVisited(step.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:shadow-sm dark:shadow-stone-900/30",
                    done
                      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-emerald-100 bg-white dark:bg-stone-900 transition-colors hover:border-emerald-300 dark:border-emerald-700"
                  )}
                >
                  {done
                    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                    : <Circle className="h-5 w-5 shrink-0 text-stone-300" />
                  }
                  <span className={cn("text-sm font-bold", done ? "text-emerald-700 dark:text-emerald-400" : "text-stone-700 dark:text-stone-200")}>
                    {i + 1}. {step.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">خطوتك التالية</h2>
          <div className="space-y-3">
            {activity.activePeptides.length > 0 ? (
              <Link
                to="/tracker"
                className="flex items-center gap-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-900 px-4 py-3 transition-all hover:shadow-sm dark:shadow-stone-900/30 hover:border-emerald-400"
              >
                <Syringe className="h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100">سجّل حقنة اليوم</p>
                  <p className="text-xs text-stone-500 dark:text-stone-300">ببتيداتك النشطة: {activity.activePeptides.join(', ')}</p>
                </div>
              </Link>
            ) : (
              <Link
                to="/coach"
                className="flex items-center gap-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-900 px-4 py-3 transition-all hover:shadow-sm dark:shadow-stone-900/30 hover:border-emerald-400"
              >
                <Bot className="h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100">ابدأ استشارة مع المدرب الذكي</p>
                  <p className="text-xs text-stone-500 dark:text-stone-300">احصل على بروتوكول مخصّص لهدفك</p>
                </div>
              </Link>
            )}
            <Link
              to="/community"
              className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white dark:bg-stone-900 px-4 py-3 transition-all hover:shadow-sm dark:shadow-stone-900/30 hover:border-emerald-300 dark:border-emerald-700"
            >
              <TrendingUp className="h-5 w-5 shrink-0 text-blue-500" />
              <div>
                <p className="text-sm font-bold text-stone-700 dark:text-stone-200">شارك تجربتك مع المجتمع</p>
                <p className="text-xs text-stone-500 dark:text-stone-300">ساعد غيرك بنتائجك الحقيقية</p>
              </div>
            </Link>
            <Link to="/quiz" className="block text-sm text-emerald-700 hover:underline">
              أعد اختبار الببتيد المناسب لك
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
