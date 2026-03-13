import { useState, useEffect, useCallback, useMemo } from 'react';
import FocusTrap from 'focus-trap-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useCelebrations } from '@/hooks/useCelebrations';
import ProtocolWizard from '@/components/ProtocolWizard';
import {
  Syringe,
  Plus,
  Play,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { events } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { peptidesLite as allPeptides } from '@/data/peptides-lite';
import ProgressRing from '@/components/charts/ProgressRing';
import SideEffectLog from '@/components/SideEffectLog';
import Tooltip from '@/components/Tooltip';
import TrackerStats from '@/components/tracker/TrackerStats';
import TrackerHeatmap from '@/components/tracker/TrackerHeatmap';
import TrackerForm from '@/components/tracker/TrackerForm';
import TrackerHistory from '@/components/tracker/TrackerHistory';

interface InjectionLog {
  id: string;
  peptide_name: string;
  dose: number;
  dose_unit: string;
  injection_site: string;
  logged_at: string;
  notes: string | null;
  photo_url?: string | null;
}

type HeatmapView = 'weekly' | 'monthly';

const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const gregorianFormatter = new Intl.DateTimeFormat('ar-u-nu-latn', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function formatDate(iso: string, useHijri = false) {
  const d = new Date(iso);
  return useHijri ? hijriFormatter.format(d) : gregorianFormatter.format(d);
}

/** Normalize a Date to YYYY-MM-DD in local timezone */
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computeStreak(logs: InjectionLog[], includeToday = false): number {
  const daySet = new Set(logs.map(l => toLocalDateStr(new Date(l.logged_at))));
  if (includeToday) daySet.add(toLocalDateStr(new Date()));
  let streak = 0;
  const d = new Date();
  if (!daySet.has(toLocalDateStr(d))) d.setDate(d.getDate() - 1);
  while (daySet.has(toLocalDateStr(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

const CALENDAR_PREF_KEY = 'pptides_calendar_pref';

export default function Tracker() {
  const { user, subscription } = useAuth();
  const { celebrate } = useCelebrations();
  const [useHijri, setUseHijri] = useState(() => {
    try { return localStorage.getItem(CALENDAR_PREF_KEY) === 'hijri'; } catch { return false; }
  });
  const toggleCalendar = () => {
    const next = !useHijri;
    setUseHijri(next);
    try { localStorage.setItem(CALENDAR_PREF_KEY, next ? 'hijri' : 'gregorian'); } catch { /* Safari private mode */ }
  };
  const [logs, setLogs] = useState<InjectionLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(() => {
    try { return !!new URLSearchParams(window.location.search).get('peptide'); } catch { return false; }
  });
  const [autoFilled, setAutoFilled] = useState(false);

  const [showProtocolWizard, setShowProtocolWizard] = useState(false);
  const [wizardPeptideId, setWizardPeptideId] = useState('');
  const [timingTipsExpanded, setTimingTipsExpanded] = useState(false);
  const [heatmapView, setHeatmapView] = useState<HeatmapView>('monthly');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Confirm dialog for protocol end
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void; isDestructive?: boolean } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => { events.trackerView(); }, []);

  useEffect(() => {
    if (!confirmDialog) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [confirmDialog]);

  // Active protocols
  interface ActiveProtocol { id: string; peptide_id: string; dose: number; dose_unit: string; frequency: string; cycle_weeks: number; started_at: string; status: string; }
  const [activeProtocols, setActiveProtocols] = useState<ActiveProtocol[]>([]);
  const fetchActiveProtocols = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('user_protocols').select('*').eq('user_id', user.id).eq('status', 'active').order('started_at', { ascending: false }).limit(20);
    if (error) console.error('active protocols query failed:', error);
    if (!error && data) setActiveProtocols(data);
  }, [user]);
  useEffect(() => { fetchActiveProtocols().catch((e: unknown) => console.warn("silent catch:", e)); }, [fetchActiveProtocols]);

  // Suggested injection site
  const suggestedSite = useMemo(() => {
    if (logs.length === 0) return 'abdomen';
    const allSites = ['abdomen', 'thigh', 'arm', 'glute'];
    const recentSites = logs.slice(0, 5).map(l => l.injection_site);
    const siteCounts: Record<string, number> = {};
    recentSites.forEach(s => { if (s) siteCounts[s] = (siteCounts[s] || 0) + 1; });
    const leastUsed = allSites.reduce((a, b) => (siteCounts[a] || 0) <= (siteCounts[b] || 0) ? a : b);
    const lastSite = logs[0]?.injection_site;
    return lastSite === leastUsed ? allSites.find(s => s !== lastSite) || leastUsed : leastUsed;
  }, [logs]);

  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setIsLoadingLogs(true);
    setFetchError(false);
    try {
      const [{ data, error }, { count }] = await Promise.all([
        supabase.from('injection_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).range(0, PAGE_SIZE - 1),
        supabase.from('injection_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      if (error) { setFetchError(true); }
      const rows = (data as InjectionLog[]) ?? [];
      setLogs(rows);
      if (count != null) setTotalCount(count);
      setHasMore(rows.length >= PAGE_SIZE);
    } catch { setFetchError(true); }
    finally { setIsLoadingLogs(false); }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchLogs().catch((e: unknown) => console.warn("silent catch:", e));
  }, [user, fetchLogs]);

  const fetchMore = async () => {
    if (!user || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const from = logs.length;
      const { data, error } = await supabase.from('injection_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (error) { toast.error('تعذّر تحميل المزيد'); return; }
      const rows = (data as InjectionLog[]) ?? [];
      setLogs(prev => [...prev, ...rows]);
      setHasMore(rows.length >= PAGE_SIZE);
    } catch { toast.error('تعذّر تحميل المزيد. حاول مرة أخرى.'); }
    finally { setIsLoadingMore(false); }
  };

  // Quick log for protocol
  const handleQuickLog = async (proto: ActiveProtocol) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        user_id: user.id,
        peptide_name: allPeptides.find(p => p.id === proto.peptide_id)?.nameEn ?? proto.peptide_id,
        dose: proto.dose,
        dose_unit: proto.dose_unit,
        injection_site: suggestedSite,
        logged_at: new Date().toISOString(),
        protocol_id: proto.id,
      };
      const { error } = await supabase.from('injection_logs').insert(payload);
      if (error) {
        if (!navigator.onLine && navigator.serviceWorker?.controller) {
          const session = await supabase.auth.getSession();
          navigator.serviceWorker.controller.postMessage({
            type: 'QUEUE_INJECTION',
            payload: { ...payload, _supabase_url: import.meta.env.VITE_SUPABASE_URL, _anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY, _access_token: session.data.session?.access_token },
          });
          toast.success('محفوظ للمزامنة عند الاتصال بالإنترنت');
        } else if (error?.message?.includes('JWT') || (error as { code?: string })?.code === '401' || error?.message?.includes('not authenticated')) {
          toast.error('انتهت الجلسة — أعد تسجيل الدخول');
        } else {
          toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى');
        }
        return;
      }
      await fetchLogs();
      const peptide = allPeptides.find(p => p.id === proto.peptide_id);
      toast.success(`تم تسجيل ${peptide?.nameAr ?? proto.peptide_id} — ${proto.dose} ${proto.dose_unit}`, { duration: 6000, description: 'الجرعة التالية غدًا — استمر في الالتزام!' });
      const freq = proto.frequency;
      const nextIn = freq === 'bid' ? '12 ساعة' : freq === 'tid' ? '8 ساعات' : 'غدًا';
      setTimeout(() => toast(`الجرعة التالية: ${nextIn}`, { duration: 5000 }), 2000);
      const newTotal = (totalCount || logs.length) + 1;
      celebrate(newTotal, computeStreak(logs, true));
    } catch { toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى'); }
    finally { setIsSubmitting(false); }
  };

  // Quick repeat last injection
  const handleQuickRepeat = async () => {
    if (!user || isSubmitting || logs.length === 0) return;
    const last = logs[0];
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('injection_logs').insert({
        user_id: user.id,
        peptide_name: last.peptide_name,
        dose: last.dose,
        dose_unit: last.dose_unit,
        injection_site: suggestedSite,
        logged_at: new Date().toISOString(),
        notes: null,
      });
      if (error) {
        if (error?.message?.includes('JWT') || (error as { code?: string })?.code === '401' || error?.message?.includes('not authenticated')) {
          toast.error('انتهت الجلسة — أعد تسجيل الدخول');
        } else {
          toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى');
        }
        return;
      }
      await fetchLogs();
      toast.success(`تم تسجيل ${last.peptide_name} — ${last.dose} ${last.dose_unit}`);
      const newTotal = (totalCount || logs.length) + 1;
      celebrate(newTotal, computeStreak(logs, true));
    } catch { toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى'); }
    finally { setIsSubmitting(false); }
  };

  // Stats data
  const [fullStatsData, setFullStatsData] = useState<{ uniquePeptides: number; last7: number } | null>(null);
  const [allLogsForStats, setAllLogsForStats] = useState<InjectionLog[]>([]);
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    supabase.from('injection_logs').select('logged_at, injection_site, peptide_name').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(10000)
    .then((allRes) => {
      if (!mounted) return;
      if (allRes.error) { console.error('injection_logs full stats query failed:', allRes.error); return; }
      const rows = (allRes.data as InjectionLog[]) ?? [];
      const unique = new Set(rows.map(r => r.peptide_name)).size;
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const last7 = rows.filter(r => r.logged_at >= weekAgo).length;
      setFullStatsData({ uniquePeptides: unique, last7 });
      setAllLogsForStats(rows);
    }).catch((e: unknown) => console.warn("silent catch:", e));
    return () => { mounted = false; };
  }, [user, logs.length]);

  const dashboardStats = useMemo(() => {
    if (logs.length === 0) return null;
    const totalInjections = totalCount || logs.length;
    const uniquePeptides = fullStatsData?.uniquePeptides ?? new Set(logs.map(l => l.peptide_name)).size;
    const streak = computeStreak(allLogsForStats);
    const last7 = fullStatsData?.last7 ?? logs.filter(l => Date.now() - new Date(l.logged_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;
    const msSinceLast = Date.now() - new Date(logs[0].logged_at).getTime();
    const hoursSince = Math.floor(msSinceLast / (1000 * 60 * 60));
    const daysSince = Math.floor(hoursSince / 24);
    const timeSinceLabel = daysSince > 0 ? `منذ ${daysSince} يوم` : hoursSince > 0 ? `منذ ${hoursSince} ساعة` : 'الآن';
    return { totalInjections, uniquePeptides, streak, last7, timeSinceLabel };
  }, [logs, allLogsForStats, totalCount, fullStatsData?.last7, fullStatsData?.uniquePeptides]);

  const monthlySummary = useMemo(() => {
    const src = allLogsForStats.length > 0 ? allLogsForStats : logs;
    if (src.length === 0) return null;
    const now = new Date();
    const thisMonth = src.filter(l => { const d = new Date(l.logged_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    if (thisMonth.length === 0) return null;
    const totalInjections = thisMonth.length;
    const peptideCounts: Record<string, number> = {};
    thisMonth.forEach(l => { peptideCounts[l.peptide_name] = (peptideCounts[l.peptide_name] || 0) + 1; });
    const mostUsed = Object.entries(peptideCounts).sort((a, b) => b[1] - a[1])[0];
    const units = new Set(thisMonth.map(l => l.dose_unit));
    const avgDose = units.size === 1 ? Math.round((thisMonth.reduce((sum, l) => sum + l.dose, 0) / thisMonth.length) * 10) / 10 : null;
    const avgUnit = units.size === 1 ? (thisMonth[0]?.dose_unit ?? 'mcg') : null;
    const streak = computeStreak(src);
    return { totalInjections, mostUsedPeptide: mostUsed?.[0] ?? '', mostUsedCount: mostUsed?.[1] ?? 0, avgDose, avgUnit, streak };
  }, [logs, allLogsForStats]);

  const weeklyActivity = useMemo(() => {
    const src = allLogsForStats.length > 0 ? allLogsForStats : logs;
    if (src.length === 0) return null;
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const weekCounts = Array(7).fill(0) as number[];
    const now = new Date();
    src.forEach(l => { const diff = Math.floor((now.getTime() - new Date(l.logged_at).getTime()) / (1000 * 60 * 60 * 24)); if (diff < 7) weekCounts[new Date(l.logged_at).getDay()]++; });
    const max = Math.max(...weekCounts, 1);
    return { days, weekCounts, max, todayIdx: now.getDay() };
  }, [logs, allLogsForStats]);

  const peptideColorMap = useMemo(() => {
    const colors = ['border-s-emerald-500', 'border-s-blue-500', 'border-s-purple-500', 'border-s-amber-500', 'border-s-rose-500', 'border-s-cyan-500', 'border-s-orange-500', 'border-s-indigo-500'];
    const src = allLogsForStats.length > 0 ? allLogsForStats : logs;
    const uniquePeptides = [...new Set(src.map(l => l.peptide_name))];
    const map: Record<string, string> = {};
    uniquePeptides.forEach((name, i) => { map[name] = colors[i % colors.length]; });
    return map;
  }, [logs, allLogsForStats]);

  // Protocol adherence: expected vs actual injections this week
  const adherenceData = useMemo(() => {
    if (activeProtocols.length === 0) return null;
    const freqPerWeek: Record<string, number> = {
      qd: 7, daily: 7, bid: 14, tid: 21,
      eod: 4, '3x': 3, '3xweek': 3, '2x': 2, '2xweek': 2,
      weekly: 1, monthly: 0,
    };
    const src = allLogsForStats.length > 0 ? allLogsForStats : logs;
    const weekAgo = Date.now() - 7 * 86_400_000;
    return activeProtocols.map(proto => {
      const peptide = allPeptides.find(p => p.id === proto.peptide_id);
      const pepName = peptide?.nameEn ?? proto.peptide_id;
      const expected = freqPerWeek[proto.frequency] ?? 7;
      const actual = src.filter(l => l.peptide_name === pepName && new Date(l.logged_at).getTime() > weekAgo).length;
      const missed = Math.max(0, expected - actual);
      return { nameAr: peptide?.nameAr ?? proto.peptide_id, expected, actual, missed };
    }).filter(item => item.expected > 0);
  }, [activeProtocols, allLogsForStats, logs]);

  // Calendar + heatmap data
  const calendarData = useMemo(() => {
    const src = allLogsForStats.length > 0 ? allLogsForStats : logs;
    if (src.length === 0) return null;
    const now = new Date();
    const { year, month } = calendarMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = (new Date(year, month, 1).getDay() + 1) % 7;
    const dayNames = ['سبت', 'أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع'];
    const gregorianLabel = new Date(year, month).toLocaleDateString('ar-u-nu-latn', { month: 'long', year: 'numeric' });
    const hijriLabel = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { month: 'long', year: 'numeric' }).format(new Date(year, month, 15));
    const monthName = useHijri ? `${gregorianLabel} / ${hijriLabel}` : gregorianLabel;
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    const injectionDays = new Map<number, number>();
    src.forEach(l => { const d = new Date(l.logged_at); if (d.getFullYear() === year && d.getMonth() === month) { injectionDays.set(d.getDate(), (injectionDays.get(d.getDate()) ?? 0) + 1); } });
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(<div key={`empty-${i}`} />);
    for (let day = 1; day <= daysInMonth; day++) {
      const count = injectionDays.get(day) ?? 0;
      const isToday = isCurrentMonth && day === now.getDate();
      cells.push(
        <div key={day} className={cn('relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs transition-colors', isToday ? 'ring-2 ring-emerald-400 font-bold' : '', count > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-semibold' : 'text-stone-500 dark:text-stone-300')}>
          <span>{day}</span>
          {count > 0 && (<div className="flex gap-0.5 mt-0.5">{Array.from({ length: Math.min(count, 3) }).map((_, i) => (<span key={i} className="h-1 w-1 rounded-full bg-emerald-500" />))}</div>)}
        </div>
      );
    }
    return { dayNames, monthName, isCurrentMonth, injectionDays, cells };
  }, [logs, allLogsForStats, calendarMonth, useHijri]);

  const heatmapData = useMemo(() => {
    const src = allLogsForStats.length > 0 ? allLogsForStats : logs;
    if (src.length === 0) return null;
    const now = new Date();
    const dayCounts = new Map<string, number>();
    src.forEach(l => { const key = new Date(l.logged_at).toISOString().slice(0, 10); dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1); });
    const maxCount = Math.max(...dayCounts.values(), 1);
    if (heatmapView === 'weekly') {
      const weeks: { date: Date; count: number; key: string }[][] = [];
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 83);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      let currentWeek: { date: Date; count: number; key: string }[] = [];
      const d = new Date(startDate);
      while (d <= now) {
        const key = d.toISOString().slice(0, 10);
        currentWeek.push({ date: new Date(d), count: dayCounts.get(key) ?? 0, key });
        if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
        d.setDate(d.getDate() + 1);
      }
      if (currentWeek.length > 0) weeks.push(currentWeek);
      return { weeks, maxCount, view: 'weekly' as const };
    } else {
      const months: { year: number; month: number; days: { day: number; count: number }[] }[] = [];
      for (let i = 5; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
        const days: { day: number; count: number }[] = [];
        for (let day = 1; day <= daysInMonth; day++) {
          const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          days.push({ day, count: dayCounts.get(key) ?? 0 });
        }
        months.push({ year: m.getFullYear(), month: m.getMonth(), days });
      }
      return { months, maxCount, view: 'monthly' as const };
    }
  }, [logs, allLogsForStats, heatmapView]);

  const siteRotationData = useMemo(() => {
    if (logs.length === 0) return null;
    const siteLabels: Record<string, string> = { abdomen: 'البطن', thigh: 'الفخذ', arm: 'الذراع', glute: 'المؤخرة' };
    const allSites = ['abdomen', 'thigh', 'arm', 'glute'];
    const recentSites = logs.slice(0, 5).map(l => l.injection_site);
    const siteCounts: Record<string, number> = {};
    recentSites.forEach(s => { if (s) siteCounts[s] = (siteCounts[s] || 0) + 1; });
    const lastSite = logs[0]?.injection_site;
    return { siteLabels, allSites, siteCounts, lastSite, suggestedSite };
  }, [logs, suggestedSite]);

  // Initial form values from URL
  const initialPeptide = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('peptide') ?? ''; } catch { return ''; }
  }, []);
  const initialDose = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get('dose') ?? ''; } catch { return ''; }
  }, []);
  const initialUnit = useMemo(() => {
    try { const u = new URLSearchParams(window.location.search).get('unit'); return u === 'mg' ? 'mg' : 'mcg'; } catch { return 'mcg'; }
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
        <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">محتوى تعليمي — استشر طبيبك قبل استخدام أي ببتيد</div>
      <Helmet>
        <title>سجل الحقن | تتبّع جرعاتك | pptides</title>
        <meta name="description" content="تتبّع جرعاتك ومواقع الحقن — سجل ذكي لبروتوكولات الببتيدات." />
        <meta property="og:title" content="سجل الحقن | pptides" />
        <meta property="og:description" content="تتبّع جرعاتك ومواقع الحقن — سجل ذكي لبروتوكولات الببتيدات." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pptides.com/tracker" />
        <meta property="og:image" content="https://pptides.com/og-image.jpg" />
        <meta property="og:locale" content="ar_SA" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="سجل الحقن | pptides" />
        <meta name="twitter:description" content="تتبّع جرعاتك ومواقع الحقن — سجل ذكي لبروتوكولات الببتيدات." />
        <meta name="twitter:image" content="https://pptides.com/og-image.jpg" />
        <link rel="canonical" href="https://pptides.com/tracker" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <Syringe className="h-7 w-7 text-emerald-700" />
          </div>
          <button
            type="button"
            onClick={toggleCalendar}
            className="flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 transition-all hover:border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:bg-emerald-900/20 hover:text-emerald-700 dark:text-emerald-400"
            title={useHijri ? 'عرض بالتوقيت الميلادي' : 'عرض بالتوقيت الهجري'}
            aria-label={useHijri ? 'تبديل للتوقيت الميلادي' : 'تبديل للتوقيت الهجري'}
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {useHijri ? 'هجري' : 'ميلادي'}
          </button>
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-3xl font-bold text-emerald-700 md:text-4xl">سجل الحقن</h1>
          <Tooltip content="سجّل كل حقنة هنا مع الجرعة والموقع. التطبيق يتتبّع سلسلة التزامك ويقترح تدوير مواقع الحقن تلقائيًا لتجنّب تلف الأنسجة." firstTimeId="tracker-main" position="bottom" />
        </div>
        <p className="mt-2 text-lg text-stone-600 dark:text-stone-300">تتبّع جرعاتك ومواقع الحقن</p>
      </div>

      {/* Prominent Streak Counter */}
      {dashboardStats && dashboardStats.streak > 0 && (
        <div className="mb-6 rounded-2xl bg-gradient-to-l from-orange-500 to-amber-500 p-5 text-center shadow-lg">
          <p className="text-3xl font-black text-white sm:text-4xl">{dashboardStats.streak} أيام متتالية</p>
          <p className="mt-1 text-sm font-medium text-white/80">استمر في الالتزام — أنت تبني عادة!</p>
        </div>
      )}

      {/* Stats */}
      <TrackerStats
        dashboardStats={dashboardStats}
        monthlySummary={monthlySummary}
        weeklyActivity={weeklyActivity}
        logs={logs}
        allLogsForStats={allLogsForStats}
        useHijri={useHijri}
        isLoading={isLoadingLogs}
      />

      {/* Expired subscription banner */}
      {!subscription.isProOrTrial && (
        <div className="mb-6 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">اشتراكك منتهي — بياناتك محفوظة</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">اشترك للإضافة والتعديل</p>
          <Link to="/pricing" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700">اشترك الآن</Link>
        </div>
      )}

      {/* Timing Tips */}
      <div className="mb-6 rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 overflow-hidden">
        <button type="button" onClick={() => setTimingTipsExpanded((p) => !p)} className="flex w-full items-center justify-between px-4 py-3 text-start transition-colors hover:bg-stone-100 dark:hover:bg-stone-800" aria-expanded={timingTipsExpanded ? 'true' : 'false'}>
          <span className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100"><Info className="h-4 w-4 text-emerald-700" />نصائح التوقيت</span>
          {timingTipsExpanded ? <ChevronUp className="h-4 w-4 text-stone-500 dark:text-stone-300" /> : <ChevronDown className="h-4 w-4 text-stone-500 dark:text-stone-300" />}
        </button>
        <div className="overflow-hidden transition-all duration-300 ease-out" style={{ maxHeight: timingTipsExpanded ? '200px' : '0', opacity: timingTipsExpanded ? 1 : 0 }}>
          <div className="border-t border-stone-200 dark:border-stone-600 px-4 py-4 text-sm text-stone-700 dark:text-stone-200 space-y-2">
            <p>• الحقن على معدة فارغة — يُفضل قبل الفجر أو بعد العشاء</p>
            <p>• ببتيدات هرمون النمو (CJC, Ipamorelin) — أفضل توقيت قبل النوم</p>
            <p>• BPC-157 — صباحًا ومساءً، يمكن ربطه بصلاة الفجر والعشاء</p>
          </div>
        </div>
      </div>

      {/* Active Protocol Cards */}
      {activeProtocols.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-stone-900 dark:text-stone-100">بروتوكولاتك النشطة</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeProtocols.map(proto => {
              const peptide = allPeptides.find(p => p.id === proto.peptide_id);
              const daysSinceStart = Math.floor((Date.now() - new Date(proto.started_at).getTime()) / (1000 * 60 * 60 * 24));
              const totalDays = (proto.cycle_weeks || 8) * 7;
              const weekNumber = Math.floor(daysSinceStart / 7) + 1;
              const totalWeeks = proto.cycle_weeks || 8;
              const todayLogged = logs.some(l => l.peptide_name === (peptide?.nameEn ?? proto.peptide_id) && toLocalDateStr(new Date(l.logged_at)) === toLocalDateStr(new Date()));
              return (
                <div key={proto.id} className={cn('rounded-2xl border p-4 card-lift', todayLogged ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50' : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900')}>
                  <div className="flex items-center gap-3">
                    <ProgressRing current={daysSinceStart} total={totalDays} size={56} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 dark:text-stone-100 truncate">{peptide?.nameAr ?? proto.peptide_id}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-300" dir="ltr">{proto.dose} {proto.dose_unit}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-300">الأسبوع {weekNumber} من {totalWeeks}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-300">بدأ {formatDate(proto.started_at, useHijri)}</p>
                      {subscription.isProOrTrial && (
                        <button
                          onClick={() => setConfirmDialog({
                            title: 'إنهاء البروتوكول',
                            message: `هل تريد إنهاء بروتوكول ${peptide?.nameAr ?? proto.peptide_id}؟ لا يمكن التراجع.`,
                            isDestructive: true,
                            onConfirm: async () => {
                              setConfirmBusy(true);
                              const { error } = await supabase.from('user_protocols').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', proto.id).eq('user_id', user!.id);
                              if (!error) { toast.success('تم إنهاء البروتوكول'); fetchActiveProtocols(); } else { toast.error('تعذّر إنهاء البروتوكول — تحقق من اتصالك وحاول مرة أخرى'); }
                              setConfirmBusy(false);
                              setConfirmDialog(null);
                            },
                          })}
                          className="text-xs text-stone-500 dark:text-stone-300 hover:text-red-500 dark:text-red-400 transition-colors min-h-[44px]"
                        >
                          أنهِ البروتوكول
                        </button>
                      )}
                    </div>
                    {subscription.isProOrTrial ? (
                      <button onClick={() => handleQuickLog(proto)} disabled={isSubmitting || todayLogged} className={cn('shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all', todayLogged ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 cursor-default' : 'btn-press bg-emerald-600 text-white hover:bg-emerald-700')}>
                        {todayLogged ? 'تم اليوم' : 'سجّل'}
                      </button>
                    ) : (
                      <span className="shrink-0 rounded-full bg-stone-100 dark:bg-stone-800 px-4 py-2 text-xs text-stone-500 dark:text-stone-300">قراءة فقط</span>
                    )}
                  </div>
                  {daysSinceStart >= totalDays && (
                    <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-3 text-center">
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-2">أكملت الدورة بنجاح!</p>
                      <button
                        onClick={async () => {
                          const pepName = peptide?.nameAr ?? proto.peptide_id;
                          const injCount = logs.filter(l => l.peptide_name === (peptide?.nameEn ?? proto.peptide_id)).length;
                          const text = `أكملت دورة ${pepName} على pptides! — ${totalDays} يوم — ${injCount} حقنة. pptides.com`;
                          try { if (navigator.share) { await navigator.share({ text }); } else { await navigator.clipboard.writeText(text); toast.success('تم نسخ الرسالة'); } } catch { /* user cancelled */ }
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                      >
                        شارك إنجازك
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Restocking Alerts */}
          {(() => {
            const alerts = activeProtocols.map(proto => {
              const peptide = allPeptides.find(p => p.id === proto.peptide_id);
              const pepName = peptide?.nameEn ?? proto.peptide_id;
              const logsForPeptide = logs.filter(l => l.peptide_name === pepName).length;
              if (logsForPeptide === 0) return null;
              const dosesPerVial = peptide?.doseMcg ? Math.floor(5000 / peptide.doseMcg) : 20;
              const remaining = Math.max(0, dosesPerVial - (logsForPeptide % dosesPerVial));
              if (remaining >= 5) return null;
              return { id: proto.id, nameAr: peptide?.nameAr ?? proto.peptide_id, remaining };
            }).filter(Boolean) as { id: string; nameAr: string; remaining: number }[];
            if (alerts.length === 0) return null;
            return (
              <div className="mt-4 space-y-2">
                {alerts.map(a => (
                  <div key={`restock-${a.id}`} className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">~{a.remaining} جرعة متبقية في قارورة {a.nameAr}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Protocol Adherence Widget */}
      {adherenceData && adherenceData.length > 0 && (
        <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-700" />
            الالتزام بالبروتوكول — آخر 7 أيام
          </h2>
          <div className="space-y-3">
            {adherenceData.map((item, idx) => {
              const pct = item.expected > 0 ? Math.min(100, Math.round((item.actual / item.expected) * 100)) : 100;
              const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-200">{item.nameAr}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-300">
                      {item.actual}/{item.expected} حقنة
                      {item.missed > 0 && (
                        <span className="ms-2 text-red-500 font-bold">({item.missed} فائتة)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Start New Protocol */}
      {subscription.isProOrTrial && (
        <div className="mb-8">
          {!showProtocolWizard ? (
            <div className="rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 p-5">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-start">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">بدء بروتوكول جديد</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-300 mt-1">اختر ببتيد وابدأ بروتوكول منظّم بجرعات وتذكيرات</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select value={wizardPeptideId} onChange={(e) => setWizardPeptideId(e.target.value)} className="flex-1 sm:w-48 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2.5 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900" aria-label="اختر ببتيد للبروتوكول">
                    <option value="">اختر ببتيد...</option>
                    {allPeptides.filter(p => p.id !== 'melanotan-ii').map(p => (<option key={p.id} value={p.id}>{p.nameAr}</option>))}
                  </select>
                  <button onClick={() => { if (wizardPeptideId) setShowProtocolWizard(true); else toast.error('اختر ببتيدًا أولاً'); }} className="shrink-0 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-700 btn-press">
                    <Play className="h-4 w-4" />
                    ابدأ
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Heatmap + Calendar + Site Rotation */}
      <TrackerHeatmap
        calendarData={calendarData}
        calendarMonth={calendarMonth}
        setCalendarMonth={setCalendarMonth}
        heatmapData={heatmapData}
        heatmapView={heatmapView}
        setHeatmapView={setHeatmapView}
        siteRotationData={siteRotationData}
      />

      {/* Log Form */}
      {showForm && subscription.isProOrTrial && user && (
        <TrackerForm
          userId={user.id}
          suggestedSite={suggestedSite}
          onSubmitSuccess={async () => {
            setShowForm(false);
            if (initialPeptide) events.injectionLog(initialPeptide);
            await fetchLogs();
          }}
          onCancel={() => setShowForm(false)}
          initialPeptide={initialPeptide}
          initialDose={initialDose}
          initialUnit={initialUnit}
          totalCount={totalCount}
          logsLength={logs.length}
          celebrate={celebrate}
          computeStreak={() => computeStreak(allLogsForStats, true)}
          activeProtocols={activeProtocols.map(p => ({ peptide_id: p.peptide_id, frequency: p.frequency }))}
        />
      )}

      {/* Side Effect Log */}
      <div className="mb-8">
        <SideEffectLog />
      </div>

      {/* History (log list + action buttons) */}
      <TrackerHistory
        logs={logs}
        setLogs={setLogs}
        isLoadingLogs={isLoadingLogs}
        fetchError={fetchError}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        fetchLogs={fetchLogs}
        fetchMore={fetchMore}
        useHijri={useHijri}
        peptideColorMap={peptideColorMap}
        isProOrTrial={subscription.isProOrTrial}
        userId={user?.id ?? ''}
        totalCount={totalCount}
        setTotalCount={setTotalCount}
        suggestedSite={suggestedSite}
        showForm={showForm}
        setShowForm={setShowForm}
        onQuickRepeat={handleQuickRepeat}
        isSubmitting={isSubmitting}
        autoFillForm={() => {
          if (!autoFilled && logs.length > 0) {
            setAutoFilled(true);
          }
        }}
      />

      {/* Floating Action Button — always-visible log entry point */}
      {subscription.isProOrTrial && !showForm && user && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center pointer-events-none">
          <button
            onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-2xl ring-4 ring-emerald-200/60 dark:ring-emerald-800/60 transition-all hover:bg-emerald-700 active:scale-95"
            aria-label="سجّل حقنة جديدة"
          >
            <Plus className="h-5 w-5" />
            سجّل حقنة
          </button>
        </div>
      )}

      {/* Protocol confirm dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setConfirmDialog(null)}>
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
            <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-stone-600 dark:text-stone-300 mb-6">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button onClick={confirmDialog.onConfirm} disabled={confirmBusy} className={cn('flex-1 rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50', confirmDialog.isDestructive ? 'bg-red-600 transition-colors hover:bg-red-700' : 'bg-emerald-600 transition-colors hover:bg-emerald-700')}>
                  {confirmBusy ? 'جارٍ التنفيذ...' : 'تأكيد'}
                </button>
                <button onClick={() => setConfirmDialog(null)} className="flex-1 rounded-xl border border-stone-200 dark:border-stone-600 px-4 py-2.5 text-sm font-bold text-stone-700 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800">
                  إلغاء
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
      {showProtocolWizard && wizardPeptideId && (
        <ProtocolWizard
          peptideId={wizardPeptideId}
          onClose={() => setShowProtocolWizard(false)}
          onCreated={() => { setShowProtocolWizard(false); setWizardPeptideId(''); fetchActiveProtocols(); }}
        />
      )}
    </div>
  );
}
