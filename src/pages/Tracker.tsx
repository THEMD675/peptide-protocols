import { useState, useEffect, useCallback, useMemo } from 'react';
import FocusTrap from 'focus-trap-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useCelebrations } from '@/hooks/useCelebrations';
import BodyMap from '@/components/BodyMap';
import ActivityChart from '@/components/charts/ActivityChart';
import DoseTrendChart from '@/components/charts/DoseTrendChart';
import ProtocolWizard from '@/components/ProtocolWizard';
import {
  Syringe,
  Plus,
  Loader2,
  Calendar,
  MapPin,
  FileText,
  Clock,
  TrendingUp,
  BarChart3,
  Flame,
  Repeat,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { events } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { peptides as allPeptides } from '@/data/peptides';
import { DOSE_PRESETS_MAP } from '@/data/dose-presets';
import ProgressRing from '@/components/charts/ProgressRing';
import SideEffectLog from '@/components/SideEffectLog';

interface InjectionLog {
  id: string;
  peptide_name: string;
  dose: number;
  dose_unit: string;
  injection_site: string;
  logged_at: string;
  notes: string | null;
}

const INJECTION_SITES = [
  { value: 'abdomen', label: 'البطن' },
  { value: 'thigh', label: 'الفخذ' },
  { value: 'arm', label: 'الذراع' },
  { value: 'glute', label: 'المؤخرة' },
];

const SITE_LABELS: Record<string, string> = Object.fromEntries(
  INJECTION_SITES.map((s) => [s.value, s.label]),
);

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

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
}

function sanitizeCSVCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(escaped)) {
    return `"\t${escaped}"`;
  }
  return `"${escaped}"`;
}

function computeStreak(logs: InjectionLog[], includeToday = false): number {
  const daySet = new Set(logs.map(l => new Date(l.logged_at).toDateString()));
  if (includeToday) daySet.add(new Date().toDateString());
  let streak = 0;
  const d = new Date();
  if (!daySet.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

const CALENDAR_PREF_KEY = 'pptides_calendar_pref';

export default function Tracker() {
  const { user, subscription } = useAuth();
  const { celebrate } = useCelebrations();
  const [useHijri, setUseHijri] = useState(() => {
    try {
      return localStorage.getItem(CALENDAR_PREF_KEY) === 'hijri';
    } catch {
      return false;
    }
  });
  const toggleCalendar = () => {
    const next = !useHijri;
    setUseHijri(next);
    try {
      localStorage.setItem(CALENDAR_PREF_KEY, next ? 'hijri' : 'gregorian');
    } catch { /* Safari private mode */ }
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

  const [peptideName, setPeptideName] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('peptide') ?? ''; } catch { return ''; }
  });
  const [dose, setDose] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('dose') ?? ''; } catch { return ''; }
  });
  const [unit, setUnit] = useState(() => {
    try { const u = new URLSearchParams(window.location.search).get('unit'); return u === 'mg' ? 'mg' : 'mcg'; } catch { return 'mcg'; }
  });
  const [site, setSite] = useState('abdomen');
  const [autoFilled, setAutoFilled] = useState(false);
  const [injectedAt, setInjectedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');
  const [doseOutOfRangeConfirmed, setDoseOutOfRangeConfirmed] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void; isDestructive?: boolean } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    if (!confirmDialog) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [confirmDialog]);
  const [sideEffect, setSideEffect] = useState('none');
  const [showProtocolWizard, setShowProtocolWizard] = useState(false);
  const [wizardPeptideId, setWizardPeptideId] = useState('');

  interface ActiveProtocol { id: string; peptide_id: string; dose: number; dose_unit: string; frequency: string; cycle_weeks: number; started_at: string; status: string; }
  const [activeProtocols, setActiveProtocols] = useState<ActiveProtocol[]>([]);
  const fetchActiveProtocols = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('user_protocols').select('*').eq('user_id', user.id).eq('status', 'active').order('started_at', { ascending: false }).limit(20);
    if (!error && data) setActiveProtocols(data);
  }, [user]);
  useEffect(() => {
    fetchActiveProtocols().catch(() => {});
  }, [fetchActiveProtocols]);

  const handleQuickLog = async (proto: ActiveProtocol) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('injection_logs').insert({
        user_id: user.id,
        peptide_name: allPeptides.find(p => p.id === proto.peptide_id)?.nameEn ?? proto.peptide_id,
        dose: proto.dose,
        dose_unit: proto.dose_unit,
        injection_site: suggestedSite,
        logged_at: new Date().toISOString(),
        protocol_id: proto.id,
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
      const peptide = allPeptides.find(p => p.id === proto.peptide_id);
      toast.success(
        `تم تسجيل ${peptide?.nameAr ?? proto.peptide_id} — ${proto.dose} ${proto.dose_unit}`,
        { duration: 6000, description: 'الجرعة التالية غدًا — استمر في الالتزام!' },
      );
      const freq = proto.frequency;
      const nextIn = freq === 'bid' ? '12 ساعة' : freq === 'tid' ? '8 ساعات' : 'غدًا';
      setTimeout(() => toast(`الجرعة التالية: ${nextIn}`, { duration: 5000 }), 2000);
      const newTotal = (totalCount || logs.length) + 1;
      celebrate(newTotal, computeStreak(logs, true));
    } catch { toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى'); }
    finally { setIsSubmitting(false); }
  };

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [timingTipsExpanded, setTimingTipsExpanded] = useState(false);

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
        supabase
          .from('injection_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .range(0, PAGE_SIZE - 1),
        supabase
          .from('injection_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);
      if (error) { setFetchError(true); }
      const rows = (data as InjectionLog[]) ?? [];
      setLogs(rows);
      if (count != null) setTotalCount(count);
      setHasMore(rows.length >= PAGE_SIZE);
    } catch {
      setFetchError(true);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchLogs().catch(() => { /* handled inside fetchLogs */ });
  }, [user, fetchLogs]);

  useEffect(() => {
    let draft: string | null = null;
    try { draft = sessionStorage.getItem('pptides_tracker_form_draft'); } catch { /* Safari private */ }
    if (draft && !peptideName) {
      try {
        const d = JSON.parse(draft);
        setPeptideName(d.peptide ?? '');
        setDose(d.dose ?? '');
        setUnit(d.unit ?? 'mcg');
        setSite(d.site ?? 'abdomen');
        setNotes(d.notes ?? '');
      } catch {
        // ignore invalid draft
      }
    }
  }, [peptideName]);

  useEffect(() => {
    setDoseOutOfRangeConfirmed(false);
  }, [peptideName, dose, unit]);

  useEffect(() => {
    if (peptideName || dose) {
      try {
        sessionStorage.setItem('pptides_tracker_form_draft', JSON.stringify({
          peptide: peptideName, dose, unit, site, notes,
        }));
      } catch { /* Safari private / quota */ }
    }
  }, [peptideName, dose, unit, site, notes]);

  const fetchMore = async () => {
    if (!user || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const from = logs.length;
      const { data, error } = await supabase
        .from('injection_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) { toast.error('تعذّر تحميل المزيد'); setIsLoadingMore(false); return; }
      const rows = (data as InjectionLog[]) ?? [];
      setLogs(prev => [...prev, ...rows]);
      setHasMore(rows.length >= PAGE_SIZE);
    } catch {
      toast.error('تعذّر تحميل المزيد. حاول مرة أخرى.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const exportCSV = async () => {
    if (!user) return;
    toast('جارٍ تجهيز التصدير...');
    try {
      const { data: allLogs, error } = await supabase
        .from('injection_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(10000);
      if (error) { toast.error('تعذّر تحميل البيانات'); return; }
      const rows = (allLogs ?? []).map((l: InjectionLog) =>
        [
          sanitizeCSVCell(l.peptide_name),
          l.dose,
          sanitizeCSVCell(l.dose_unit),
          sanitizeCSVCell(l.injection_site),
          sanitizeCSVCell(formatDate(l.logged_at, useHijri)),
          sanitizeCSVCell(formatTime(l.logged_at)),
          sanitizeCSVCell(l.notes ?? ''),
        ].join(',')
      );
      const headers = 'الببتيد,الجرعة,الوحدة,الموقع,التاريخ,الوقت,الملاحظات';
      const csv = '\ufeff' + [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pptides-injections-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تصدير البيانات');
    } catch {
      toast.error('تعذّر تصدير البيانات');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!peptideName.trim()) { toast.error('اختر الببتيد أولاً'); return; }
    const doseNum = parseFloat(dose);
    if (!dose || isNaN(doseNum) || doseNum <= 0) { toast.error('أدخل جرعة صحيحة'); return; }
    if (!injectedAt.trim()) { toast.error('أدخل التاريخ والوقت'); return; }
    const injectedDate = new Date(injectedAt);
    if (Number.isNaN(injectedDate.getTime())) { toast.error('التاريخ والوقت غير صالح'); return; }
    if (injectedDate.getTime() > Date.now() + 60000) { toast.error('لا يمكن تسجيل حقنة في المستقبل'); return; }
    (document.activeElement as HTMLElement)?.blur();
    setIsSubmitting(true);
    try {
      const sideEffectLabel = sideEffect !== 'none' ? `أعراض جانبية: ${sideEffect}` : '';
      const combinedNotes = [notes.trim(), sideEffectLabel].filter(Boolean).join('\n') || null;
      const { error } = await supabase.from('injection_logs').insert({
        user_id: user.id,
        peptide_name: peptideName.trim(),
        dose: parseFloat(dose),
        dose_unit: unit,
        injection_site: site,
        logged_at: injectedDate.toISOString(),
        notes: combinedNotes,
      });
      if (error) {
        if (error?.message?.includes('JWT') || (error as { code?: string })?.code === '401' || error?.message?.includes('not authenticated')) {
          toast.error('انتهت الجلسة — أعد تسجيل الدخول');
        } else {
          toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى');
        }
        return;
      }
      setPeptideName('');
      setDose('');
      setUnit('mcg');
      setSite('abdomen');
      setNotes('');
      setDoseOutOfRangeConfirmed(false);
      setShowForm(false);
      sessionStorage.removeItem('pptides_tracker_form_draft');
      events.injectionLog(peptideName);
      window.history.replaceState({}, '', window.location.pathname);
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setInjectedAt(now.toISOString().slice(0, 16));
      await fetchLogs();
      toast.success(
        `تم تسجيل ${peptideName.trim()} — ${dose} ${unit}`,
        { duration: 6000, description: 'الجرعة التالية غدًا — استمر في الالتزام!' },
      );
      const matchedPeptide = allPeptides.find(p => p.nameEn === peptideName.trim());
      if (matchedPeptide) {
        const protocol = activeProtocols.find(p => p.peptide_id === matchedPeptide.id && p.status === 'active');
        if (protocol) {
          const freq = protocol.frequency;
          const nextIn = freq === 'bid' ? '12 ساعة' : freq === 'tid' ? '8 ساعات' : 'غدًا';
          setTimeout(() => toast(`الجرعة التالية: ${nextIn}`, { duration: 5000 }), 2000);
        }
      }
      const newTotal = (totalCount || logs.length) + 1;
      celebrate(newTotal, computeStreak(logs, true));
    } catch {
      toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [fullStatsData, setFullStatsData] = useState<{ uniquePeptides: number; last7: number } | null>(null);
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    Promise.all([
      supabase.from('injection_logs').select('peptide_name').eq('user_id', user.id).limit(10000),
      supabase.from('injection_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('logged_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    ]).then(([pepRes, weekRes]) => {
      if (!mounted) return;
      const unique = new Set((pepRes.data ?? []).map((r: { peptide_name: string }) => r.peptide_name)).size;
      setFullStatsData({ uniquePeptides: unique, last7: weekRes.count ?? 0 });
    }).catch(() => {});
    return () => { mounted = false; };
  }, [user, logs.length]);

  const dashboardStats = useMemo(() => {
    if (logs.length === 0) return null;
    const totalInjections = totalCount || logs.length;
    const uniquePeptides = fullStatsData?.uniquePeptides ?? new Set(logs.map(l => l.peptide_name)).size;
    const streak = computeStreak(logs);
    const last7 = fullStatsData?.last7 ?? logs.filter(l => Date.now() - new Date(l.logged_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;
    if (logs.length === 0) return null;
    const msSinceLast = Date.now() - new Date(logs[0].logged_at).getTime();
    const hoursSince = Math.floor(msSinceLast / (1000 * 60 * 60));
    const daysSince = Math.floor(hoursSince / 24);
    const timeSinceLabel = daysSince > 0 ? `منذ ${daysSince} يوم` : hoursSince > 0 ? `منذ ${hoursSince} ساعة` : 'الآن';
    return { totalInjections, uniquePeptides, streak, last7, timeSinceLabel };
  }, [logs, totalCount, fullStatsData?.last7, fullStatsData?.uniquePeptides]);

  const weeklyActivity = useMemo(() => {
    if (logs.length === 0) return null;
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const weekCounts = Array(7).fill(0) as number[];
    const now = new Date();
    logs.forEach(l => {
      const diff = Math.floor((now.getTime() - new Date(l.logged_at).getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 7) weekCounts[new Date(l.logged_at).getDay()]++;
    });
    const max = Math.max(...weekCounts, 1);
    return { days, weekCounts, max, todayIdx: now.getDay() };
  }, [logs]);

  const calendarData = useMemo(() => {
    if (logs.length === 0) return null;
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
    logs.forEach(l => {
      const d = new Date(l.logged_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        injectionDays.set(d.getDate(), (injectionDays.get(d.getDate()) ?? 0) + 1);
      }
    });
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(<div key={`empty-${i}`} />);
    for (let day = 1; day <= daysInMonth; day++) {
      const count = injectionDays.get(day) ?? 0;
      const isToday = isCurrentMonth && day === now.getDate();
      cells.push(
        <div key={day} className={cn(
          'relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs transition-colors',
          isToday ? 'ring-2 ring-emerald-400 font-bold' : '',
          count > 0 ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-stone-500',
        )}>
          <span>{day}</span>
          {count > 0 && (
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                <span key={i} className="h-1 w-1 rounded-full bg-emerald-500" />
              ))}
            </div>
          )}
        </div>
      );
    }
    return { dayNames, monthName, isCurrentMonth, injectionDays, cells };
  }, [logs, calendarMonth, useHijri]);

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

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
      <Helmet>
        <title>سجل الحقن | تتبّع جرعاتك | pptides</title>
        <meta name="description" content="تتبّع جرعاتك ومواقع الحقن" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <Syringe className="h-7 w-7 text-emerald-600" />
          </div>
          <button
            type="button"
            onClick={toggleCalendar}
            className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            title={useHijri ? 'عرض بالتوقيت الميلادي' : 'عرض بالتوقيت الهجري'}
            aria-label={useHijri ? 'تبديل للتوقيت الميلادي' : 'تبديل للتوقيت الهجري'}
          >
            <span aria-hidden>📅</span>
            {useHijri ? 'هجري' : 'ميلادي'}
          </button>
        </div>
        <h1 className="text-3xl font-bold text-emerald-600 md:text-4xl">سجل الحقن</h1>
        <p className="mt-2 text-lg text-stone-600">تتبّع جرعاتك ومواقع الحقن</p>
      </div>

      {/* Expired subscription banner — read-only mode */}
      {!subscription.isProOrTrial && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center">
          <p className="text-sm font-bold text-amber-800 mb-1">اشتراكك منتهي — بياناتك محفوظة</p>
          <p className="text-xs text-amber-700 mb-3">اشترك للإضافة والتعديل</p>
          <Link to="/pricing" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700">
            اشترك الآن
          </Link>
        </div>
      )}

      {/* Prayer Time / Timing Tips — collapsible */}
      <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden">
        <button
          type="button"
          onClick={() => setTimingTipsExpanded((p) => !p)}
          className="flex w-full items-center justify-between px-4 py-3 text-start transition-colors hover:bg-stone-100"
          aria-expanded={timingTipsExpanded ? 'true' : 'false'}
        >
          <span className="flex items-center gap-2 font-bold text-stone-900">
            <Info className="h-4 w-4 text-emerald-600" />
            نصائح التوقيت
          </span>
          {timingTipsExpanded ? <ChevronUp className="h-4 w-4 text-stone-500" /> : <ChevronDown className="h-4 w-4 text-stone-500" />}
        </button>
        {timingTipsExpanded && (
          <div className="border-t border-stone-200 px-4 py-4 text-sm text-stone-700 space-y-2">
            <p>• الحقن على معدة فارغة — يُفضل قبل الفجر أو بعد العشاء</p>
            <p>• ببتيدات هرمون النمو (CJC, Ipamorelin) — أفضل توقيت قبل النوم</p>
            <p>• BPC-157 — صباحًا ومساءً، يمكن ربطه بصلاة الفجر والعشاء</p>
          </div>
        )}
      </div>

      {/* Active Protocol Cards — One-Tap Logging */}
      {activeProtocols.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-stone-900">بروتوكولاتك النشطة</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeProtocols.map(proto => {
              const peptide = allPeptides.find(p => p.id === proto.peptide_id);
              const daysSinceStart = Math.floor((Date.now() - new Date(proto.started_at).getTime()) / (1000 * 60 * 60 * 24));
              const totalDays = (proto.cycle_weeks || 8) * 7;
              const weekNumber = Math.floor(daysSinceStart / 7) + 1;
              const totalWeeks = proto.cycle_weeks || 8;
              const todayLogged = logs.some(l => l.peptide_name === (peptide?.nameEn ?? proto.peptide_id) && new Date(l.logged_at).toDateString() === new Date().toDateString());
              return (
                <div key={proto.id} className={cn('rounded-2xl border p-4 transition-all', todayLogged ? 'border-emerald-300 bg-emerald-50/50' : 'border-stone-200 bg-white')}>
                  <div className="flex items-center gap-3">
                    <ProgressRing current={daysSinceStart} total={totalDays} size={56} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 truncate">{peptide?.nameAr ?? proto.peptide_id}</p>
                      <p className="text-xs text-stone-500" dir="ltr">{proto.dose} {proto.dose_unit}</p>
                      <p className="text-xs text-stone-500">الأسبوع {weekNumber} من {totalWeeks}</p>
                      <p className="text-xs text-stone-500">بدأ {formatDate(proto.started_at, useHijri)}</p>
                      {subscription.isProOrTrial && (
                        <button
                          onClick={() => setConfirmDialog({
                            title: 'إنهاء البروتوكول',
                            message: `هل تريد إنهاء بروتوكول ${peptide?.nameAr ?? proto.peptide_id}؟ لا يمكن التراجع.`,
                            isDestructive: true,
                            onConfirm: async () => {
                              setConfirmBusy(true);
                              const { error } = await supabase
                                .from('user_protocols')
                                .update({ status: 'completed', updated_at: new Date().toISOString() })
                                .eq('id', proto.id)
                                .eq('user_id', user.id);
                              if (!error) {
                                toast.success('تم إنهاء البروتوكول');
                                fetchActiveProtocols();
                              } else {
                                toast.error('تعذّر إنهاء البروتوكول — تحقق من اتصالك وحاول مرة أخرى');
                              }
                              setConfirmBusy(false);
                              setConfirmDialog(null);
                            },
                          })}
                          className="text-xs text-stone-500 hover:text-red-500 transition-colors"
                        >
                          أنهِ البروتوكول
                        </button>
                      )}
                    </div>
                    {subscription.isProOrTrial ? (
                      <button
                        onClick={() => handleQuickLog(proto)}
                        disabled={isSubmitting || todayLogged}
                        className={cn(
                          'shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all',
                          todayLogged
                            ? 'bg-emerald-100 text-emerald-600 cursor-default'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                        )}
                      >
                        {todayLogged ? 'تم اليوم' : 'سجّل'}
                      </button>
                    ) : (
                      <span className="shrink-0 rounded-full bg-stone-100 px-4 py-2 text-xs text-stone-500">قراءة فقط</span>
                    )}
                  </div>
                  {daysSinceStart >= totalDays && (
                    <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-3 text-center">
                      <p className="text-sm font-bold text-emerald-700 mb-2">أكملت الدورة بنجاح!</p>
                      <button
                        onClick={async () => {
                          const pepName = peptide?.nameAr ?? proto.peptide_id;
                          const injCount = logs.filter(l => l.peptide_name === (peptide?.nameEn ?? proto.peptide_id)).length;
                          const text = `أكملت دورة ${pepName} على pptides! 💪 ${totalDays} يوم — ${injCount} حقنة. pptides.com`;
                          try {
                            if (navigator.share) {
                              await navigator.share({ text });
                            } else {
                              await navigator.clipboard.writeText(text);
                              toast.success('تم نسخ الرسالة');
                            }
                          } catch { /* user cancelled share */ }
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
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
                  <div key={`restock-${a.id}`} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs font-bold text-amber-800">
                      ~{a.remaining} جرعة متبقية في قارورة {a.nameAr}
                    </p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Start New Protocol */}
      {subscription.isProOrTrial && (
        <div className="mb-8">
          {!showProtocolWizard ? (
            <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-5">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-right">
                  <h3 className="text-sm font-bold text-stone-900">بدء بروتوكول جديد</h3>
                  <p className="text-xs text-stone-500 mt-1">اختر ببتيد وابدأ بروتوكول منظّم بجرعات وتذكيرات</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={wizardPeptideId}
                    onChange={(e) => setWizardPeptideId(e.target.value)}
                    className="flex-1 sm:w-48 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    aria-label="اختر ببتيد للبروتوكول"
                  >
                    <option value="">اختر ببتيد...</option>
                    {allPeptides.filter(p => p.id !== 'melanotan-ii').map(p => (
                      <option key={p.id} value={p.id}>{p.nameAr}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => { if (wizardPeptideId) setShowProtocolWizard(true); else toast.error('اختر ببتيدًا أولاً'); }}
                    className="shrink-0 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95"
                  >
                    <Play className="h-4 w-4" />
                    ابدأ
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Stats Dashboard */}
      {dashboardStats && (
          <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm">
              <BarChart3 className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
              <p className="text-2xl font-black text-stone-900">{dashboardStats.totalInjections}</p>
              <p className="text-xs text-stone-500">إجمالي الحقن</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm">
              <Flame className="mx-auto mb-1 h-5 w-5 text-orange-500" />
              <p className="text-2xl font-black text-stone-900">{dashboardStats.streak}</p>
              <p className="text-xs text-stone-500">أيام متتالية</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm">
              <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-500" />
              <p className="text-2xl font-black text-stone-900">{dashboardStats.last7}</p>
              <p className="text-xs text-stone-500">آخر 7 أيام</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm">
              <Syringe className="mx-auto mb-1 h-5 w-5 text-purple-500" />
              <p className="text-2xl font-black text-stone-900">{dashboardStats.uniquePeptides}</p>
              <p className="text-xs text-stone-500">ببتيدات مختلفة</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center shadow-sm col-span-2 sm:col-span-1">
              <Clock className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
              <p className="text-2xl font-black text-emerald-700">{dashboardStats.timeSinceLabel}</p>
              <p className="text-xs text-stone-500">آخر حقنة</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
              <p className="text-2xl font-black text-stone-900">{new Set(logs.map(l => new Date(l.logged_at).toDateString())).size}</p>
              <p className="text-xs text-stone-500">يوم نشط</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
              <p className="text-2xl font-black text-stone-900">{new Set(logs.map(l => l.peptide_name)).size}</p>
              <p className="text-xs text-stone-500">ببتيد مختلف</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
              <p className="text-2xl font-black text-stone-900">{logs.length}</p>
              <p className="text-xs text-stone-500">حقنة مسجّلة</p>
            </div>
          </div>
          </>
      )}

      {/* Weekly Activity Chart */}
      {weeklyActivity && (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-stone-900">نشاط الأسبوع</h3>
            <ActivityChart data={weeklyActivity.days.map((day, i) => ({ day: day.slice(0, 3), count: weeklyActivity.weekCounts[i], isToday: i === weeklyActivity.todayIdx }))} />
          </div>
      )}

      {/* Dose Trend Chart — one peptide at a time for consistent units */}
      {logs.length >= 3 && (() => {
        const trendPeptide = logs[0]?.peptide_name;
        const trendLogs = logs.filter(l => l.peptide_name === trendPeptide);
        const trendData = [...trendLogs].reverse().slice(-14).map(l => ({
          date: useHijri ? hijriFormatter.format(new Date(l.logged_at)) : new Date(l.logged_at).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' }),
          dose: l.dose,
        }));
        return (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-stone-900">تاريخ جرعات {trendPeptide}</h3>
            <DoseTrendChart data={trendData} unit={trendLogs[0]?.dose_unit ?? 'mcg'} />
          </div>
        );
      })()}

      {/* Monthly Calendar */}
      {calendarData && (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalendarMonth(prev => { const m = prev.month - 1; return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m }; })} aria-label="الشهر السابق" className="flex items-center justify-center rounded-lg border border-stone-200 p-1.5 min-h-[44px] min-w-[44px] text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700">
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="text-center">
                <h3 className="text-sm font-bold text-stone-900">{calendarData.monthName}</h3>
                <span className="text-xs text-stone-500">{calendarData.injectionDays.size} يوم نشط</span>
              </div>
              <button onClick={() => { if (calendarData.isCurrentMonth) return; setCalendarMonth(prev => { const m = prev.month + 1; return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m }; }); }} disabled={calendarData.isCurrentMonth} aria-label="الشهر التالي" className={cn('flex items-center justify-center rounded-lg border border-stone-200 p-1.5 min-h-[44px] min-w-[44px] transition-colors', calendarData.isCurrentMonth ? 'text-stone-300 cursor-not-allowed' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700')}>
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarData.dayNames.map(d => (
                <div key={d} className="text-xs font-bold text-stone-500 pb-1">{d}</div>
              ))}
              {calendarData.cells}
            </div>
          </div>
      )}

      {/* Site Rotation Indicator */}
      {siteRotationData && (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-stone-900">تدوير مواقع الحقن</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-4">
              {siteRotationData.allSites.map(s => {
                const count = siteRotationData.siteCounts[s] || 0;
                const isLast = s === siteRotationData.lastSite;
                const isSuggested = s === siteRotationData.suggestedSite;
                return (
                  <div key={s} className={cn(
                    'rounded-xl border p-3 text-center transition-all',
                    isSuggested ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100' :
                    isLast ? 'border-amber-300 bg-amber-50' :
                    'border-stone-200 bg-stone-50'
                  )}>
                    <p className="text-xs font-bold text-stone-800">{siteRotationData.siteLabels[s]}</p>
                    <p className="text-lg font-black text-stone-900">{count}</p>
                    <p className="text-xs text-stone-500">
                      {isSuggested ? 'الموقع التالي' : isLast ? 'آخر حقنة' : `آخر 5`}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-stone-600 text-center">
              الحقنة القادمة في <span className="font-bold text-emerald-700">{siteRotationData.siteLabels[siteRotationData.suggestedSite]}</span> لتجنّب تلف الأنسجة
            </p>
          </div>
      )}

      {/* Action Buttons — hide when empty or when subscription is expired */}
      {!showForm && logs.length > 0 && subscription.isProOrTrial && (
        <div className="mb-8 flex gap-3">
          <button
            onClick={() => {
              setShowForm(true);
              setSite(suggestedSite);
              if (!autoFilled && logs.length > 0 && !peptideName) {
                const last = logs[0];
                setPeptideName(last.peptide_name);
                setDose(String(last.dose));
                setUnit(last.dose_unit);
                setAutoFilled(true);
              }
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-6 py-4 text-sm font-bold text-emerald-700 transition-all hover:border-emerald-400 hover:bg-emerald-100"
          >
            <Plus className="h-5 w-5" />
            حقنة جديدة
          </button>
          {logs.length > 0 && (
            <button
              onClick={() => {
                const last = logs[0];
                setConfirmDialog({
                  title: 'تكرار الحقنة الأخيرة',
                  message: `تكرار حقنة ${last.peptide_name} — ${last.dose} ${last.dose_unit}؟`,
                  onConfirm: async () => {
                    if (!user) return;
                    setConfirmDialog(null);
                    setIsSubmitting(true);
                    try {
                      const now = new Date();
                      const { error } = await supabase.from('injection_logs').insert({
                        user_id: user.id,
                        peptide_name: last.peptide_name,
                        dose: last.dose,
                        dose_unit: last.dose_unit,
                        injection_site: suggestedSite,
                        logged_at: now.toISOString(),
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
                    } catch {
                      toast.error('تعذّر حفظ الحقنة — تحقق من اتصالك وحاول مرة أخرى');
                    } finally {
                      setIsSubmitting(false);
                    }
                  },
                });
              }}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm font-bold text-stone-700 transition-all hover:border-emerald-300 hover:bg-stone-50 disabled:opacity-50"
            >
              <Repeat className="h-4 w-4" />
              كرّر الأخيرة
            </button>
          )}
        </div>
      )}

      {/* Log Form */}
      {showForm && subscription.isProOrTrial && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900">تسجيل حقنة جديدة</h2>
          <div className="space-y-4">
            {/* Peptide Name */}
            <div>
              <label htmlFor="tracker-peptide" className="mb-1 block text-sm font-bold text-stone-700">اسم الببتيد</label>
              <select
                id="tracker-peptide"
                value={peptideName}
                onChange={(e) => setPeptideName(e.target.value)}
                required
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">اختر الببتيد...</option>
                {allPeptides.filter(p => p.id !== 'melanotan-ii').map(p => (
                  <option key={p.id} value={p.nameEn}>{p.nameAr} ({p.nameEn})</option>
                ))}
              </select>
            </div>

            {/* Dose + Unit */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="tracker-dose" className="mb-1 block text-sm font-bold text-stone-700">الجرعة</label>
                <input
                  id="tracker-dose"
                  type="number"
                  inputMode="decimal"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="250"
                  required
                  min="0"
                  step="any"
                  dir="ltr"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="w-28">
                <label htmlFor="tracker-unit" className="mb-1 block text-sm font-bold text-stone-700">الوحدة</label>
                <select
                  id="tracker-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  aria-label="وحدة الجرعة"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="mcg">mcg</option>
                  <option value="mg">mg</option>
                </select>
              </div>
            </div>
            {(() => {
              if (!peptideName.trim() || !dose) return null;
              const preset = DOSE_PRESETS_MAP[peptideName.trim()];
              if (!preset) return null;
              const doseNum = parseFloat(dose);
              const doseMcg = unit === 'mg' ? doseNum * 1000 : doseNum;
              const isOverMax = doseMcg > preset.maxDose;
              const isUnderMin = doseMcg < preset.minDose;
              if (isOverMax) {
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-red-600 flex items-center gap-1">الجرعة أعلى من الحد الأقصى الموصى به ({preset.maxDose} mcg)</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={doseOutOfRangeConfirmed}
                        onChange={(e) => setDoseOutOfRangeConfirmed(e.target.checked)}
                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-stone-700">أؤكد أن هذه الجرعة صحيحة</span>
                    </label>
                  </div>
                );
              }
              if (isUnderMin) {
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-amber-600 flex items-center gap-1">الجرعة أقل من الحد الأدنى الموصى به ({preset.minDose} mcg)</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={doseOutOfRangeConfirmed}
                        onChange={(e) => setDoseOutOfRangeConfirmed(e.target.checked)}
                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-stone-700">أؤكد أن هذه الجرعة صحيحة</span>
                    </label>
                  </div>
                );
              }
              return null;
            })()}

            {/* Injection Site — Body Map */}
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700">موقع الحقن</label>
              <BodyMap selected={site} suggested={suggestedSite} onSelect={(s) => setSite(s)} />
            </div>

            {/* Date/Time */}
            <div>
              <label htmlFor="tracker-datetime" className="mb-1 block text-sm font-bold text-stone-700">التاريخ والوقت</label>
              <input
                id="tracker-datetime"
                type="datetime-local"
                value={injectedAt}
                onChange={(e) => setInjectedAt(e.target.value)}
                required
                aria-label="التاريخ والوقت"
                dir="ltr"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Notes */}
            {/* Side Effect Quick-Log */}
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700">أعراض جانبية <span className="text-xs text-emerald-600 font-normal me-1">اختياري</span></label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'none', label: 'لا يوجد', color: 'emerald' },
                  { value: 'headache', label: 'صداع', color: 'amber' },
                  { value: 'nausea', label: 'غثيان', color: 'amber' },
                  { value: 'redness', label: 'احمرار', color: 'amber' },
                  { value: 'fatigue', label: 'إرهاق', color: 'amber' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSideEffect(opt.value)}
                    className={cn(
                      'rounded-full px-3 py-2.5 min-h-[44px] text-xs font-bold transition-all',
                      sideEffect === opt.value
                        ? opt.color === 'emerald' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                        : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="tracker-notes" className="mb-1 block text-sm font-bold text-stone-700">ملاحظات <span className="text-xs text-emerald-600 font-normal me-1">اختياري</span></label>
              <textarea
                id="tracker-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={3}
                maxLength={200}
                className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <p className={cn('mt-1 text-start text-xs', notes.length >= 180 ? 'text-amber-600' : 'text-stone-500')}>{notes.length}/200</p>
            </div>

            <div className="flex gap-3">
              {(() => {
                const preset = peptideName.trim() ? DOSE_PRESETS_MAP[peptideName.trim()] : null;
                const doseNum = parseFloat(dose);
                const doseMcg = dose && !isNaN(doseNum) ? (unit === 'mg' ? doseNum * 1000 : doseNum) : 0;
                const isOutOfRange = preset && (doseMcg > preset.maxDose || doseMcg < preset.minDose);
                const submitDisabled = isSubmitting || (isOutOfRange && !doseOutOfRangeConfirmed);
                return (
              <button
                type="submit"
                disabled={submitDisabled}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الحفظ...
                  </>
                ) : (
                  'حفظ'
                )}
              </button>
                );
              })()}
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-stone-200 px-6 py-3 text-sm font-bold text-stone-700 transition-all hover:bg-stone-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Side Effect Log */}
      <div className="mb-8">
        <SideEffectLog />
      </div>

      {/* Timeline */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">السجل</h2>
          {logs.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 transition-all hover:border-emerald-300 hover:text-emerald-700"
            >
              <Download className="h-3.5 w-3.5" />
              تحميل CSV
            </button>
          )}
        </div>
        {isLoadingLogs ? (
          <div className="space-y-3 py-4" role="status" aria-label="جارٍ تحميل السجلات">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-stone-200 p-5 space-y-2">
                <div className="flex justify-between"><div className="h-5 w-28 rounded bg-stone-200" /><div className="h-6 w-20 rounded-full bg-stone-100" /></div>
                <div className="h-4 w-40 rounded bg-stone-100" />
                <div className="h-4 w-32 rounded bg-stone-100" />
              </div>
            ))}
          </div>
        ) : fetchError && logs.length === 0 ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 py-10 text-center">
            <p className="text-base text-red-700 mb-4">تعذّر تحميل السجلات. تحقق من اتصالك بالإنترنت.</p>
            <button
              onClick={() => fetchLogs()}
              className="rounded-xl bg-red-100 px-6 py-2 text-sm font-bold text-red-700 hover:bg-red-200 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <Syringe className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">سجل حقنك جاهز</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
              {subscription.isProOrTrial
                ? 'سجّل حقنتك الأولى الآن — سنتتبّع جرعاتك، ندير تدوير مواقع الحقن، ونعرض لك إحصائيات التزامك بالبروتوكول.'
                : 'اشترك لبدء تسجيل حقنك وتتبّع جرعاتك.'}
            </p>
            {subscription.isProOrTrial ? (
              <button
                onClick={() => {
                  setShowForm(true);
                  setSite(suggestedSite);
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                ابدأ بتسجيل أول حقنة
              </button>
            ) : (
              <Link to="/pricing" className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700">
                اشترك الآن
              </Link>
            )}
            <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <Link to="/coach" className="text-sm font-semibold text-emerald-600 hover:underline transition-colors">صمّم بروتوكول مع المدرب الذكي</Link>
              <span className="hidden sm:inline text-stone-300">|</span>
              <Link to="/guide" className="text-sm font-semibold text-emerald-600 hover:underline transition-colors">تعلّم كيف تحقن</Link>
              <span className="hidden sm:inline text-stone-300">|</span>
              <Link to="/calculator" className="text-sm font-semibold text-emerald-600 hover:underline transition-colors">احسب جرعتك</Link>
              <span className="hidden sm:inline text-stone-300">|</span>
              <Link to="/interactions" className="text-sm font-semibold text-emerald-600 hover:underline transition-colors">فحص التعارضات</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const isToday = new Date(log.logged_at).toDateString() === new Date().toDateString();
              return (
              <div
                key={log.id}
                className={cn('rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md', isToday ? 'border-emerald-300 border-s-4 bg-emerald-50/30' : 'border-stone-200 bg-white')}
              >
                  <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-stone-900" dir="ltr">{log.peptide_name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {log.dose} {log.dose_unit}
                    </span>
                    {subscription.isProOrTrial && <button
                      onClick={() => {
                        setConfirmDialog({
                          title: 'حذف السجل',
                          message: `حذف سجل ${log.peptide_name} — ${log.dose} ${log.dose_unit}؟`,
                          isDestructive: true,
                          onConfirm: async () => {
                            setConfirmBusy(true);
                            const deletedLog = logs.find(l => l.id === log.id);
                            // Known limitation: concurrent deletes from multiple tabs may cause stale-state rollback position
                            setLogs(prev => prev.filter(l => l.id !== log.id));
                            const { error } = await supabase.from('injection_logs').delete().eq('id', log.id).eq('user_id', user.id);
                            if (error) {
                              if (deletedLog) setLogs(prev => {
                                const originalIndex = prev.findIndex(l => new Date(l.logged_at) < new Date(deletedLog.logged_at));
                                const restored = [...prev];
                                restored.splice(originalIndex === -1 ? prev.length : originalIndex, 0, deletedLog);
                                return restored;
                              });
                              toast.error('تعذّر حذف السجل — حاول مرة أخرى');
                            } else {
                              setTotalCount(prev => Math.max(0, prev - 1));
                            }
                            setConfirmBusy(false);
                            setConfirmDialog(null);
                          },
                        });
                      }}
                      className="flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {SITE_LABELS[log.injection_site] ?? log.injection_site}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(log.logged_at, useHijri)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(log.logged_at)}
                  </span>
                </div>
                {log.notes && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-stone-50 px-3 py-2">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500" />
                    <p className="text-xs text-stone-600">{log.notes}</p>
                  </div>
                )}
              </div>
              );
            })}
            {hasMore && (
              <button
                onClick={fetchMore}
                disabled={isLoadingMore}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 text-sm font-bold text-stone-600 transition-all hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <span className="flex items-center justify-center gap-2" role="status" aria-label="جارٍ تحميل السجلات">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ التحميل...
                  </span>
                ) : (
                  'تحميل المزيد'
                )}
              </button>
            )}
          </div>
        )}
      </div>
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setConfirmDialog(null)}>
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-stone-900 mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-stone-600 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={confirmDialog.onConfirm}
                disabled={confirmBusy}
                className={cn('flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50', confirmDialog.isDestructive ? 'bg-red-600 transition-colors hover:bg-red-700' : 'bg-emerald-600 transition-colors hover:bg-emerald-700')}
              >
                {confirmBusy ? 'جارٍ التنفيذ...' : 'تأكيد'}
              </button>
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50"
              >
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
