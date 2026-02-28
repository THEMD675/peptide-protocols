import { useState, useEffect, useCallback, useMemo } from 'react';
import FocusTrap from 'focus-trap-react';
import { Helmet } from 'react-helmet-async';
import { useCelebrations } from '@/hooks/useCelebrations';
import BodyMap from '@/components/BodyMap';
import ActivityChart from '@/components/charts/ActivityChart';
import DoseTrendChart from '@/components/charts/DoseTrendChart';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { peptides as allPeptides } from '@/data/peptides';
import { DOSE_PRESETS_MAP } from '@/data/dose-presets';
import ProgressRing from '@/components/charts/ProgressRing';

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

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
}

export default function Tracker() {
  const { user } = useAuth();
  const { celebrate } = useCelebrations();
  const [logs, setLogs] = useState<InjectionLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(() => {
    try { return !!new URLSearchParams(window.location.search).get('peptide'); } catch { return false; }
  });

  const [peptideName, setPeptideName] = useState(() => {
    try { const p = new URLSearchParams(window.location.search).get('peptide'); return p ?? ''; } catch { return ''; }
  });
  const [dose, setDose] = useState('');
  const [unit, setUnit] = useState('mcg');
  const [site, setSite] = useState('abdomen');
  const [autoFilled, setAutoFilled] = useState(false);
  const [injectedAt, setInjectedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void; isDestructive?: boolean } | null>(null);
  const [sideEffect, setSideEffect] = useState('none');

  interface ActiveProtocol { id: string; peptide_id: string; dose: number; dose_unit: string; frequency: string; cycle_weeks: number; started_at: string; status: string; }
  const [activeProtocols, setActiveProtocols] = useState<ActiveProtocol[]>([]);
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    supabase.from('user_protocols').select('*').eq('user_id', user.id).eq('status', 'active').order('started_at', { ascending: false }).then(({ data }) => {
      if (mounted && data) setActiveProtocols(data);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [user]);

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
      if (error) { toast.error('حدث خطأ'); return; }
      await fetchLogs();
      const peptide = allPeptides.find(p => p.id === proto.peptide_id);
      toast.success(`تم تسجيل ${peptide?.nameAr ?? proto.peptide_id} — ${proto.dose} ${proto.dose_unit}`);
      const newTotal = (totalCount || logs.length) + 1;
      const daySet = new Set([...logs.map(l => new Date(l.logged_at).toDateString()), new Date().toDateString()]);
      let s = 0; const dd = new Date();
      if (!daySet.has(dd.toDateString())) dd.setDate(dd.getDate() - 1);
      while (daySet.has(dd.toDateString())) { s++; dd.setDate(dd.getDate() - 1); }
      celebrate(newTotal, s);
    } catch { toast.error('حدث خطأ'); }
    finally { setIsSubmitting(false); }
  };

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

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
      if (error) { toast.error('تعذّر تحميل السجلات. حاول تحديث الصفحة.'); }
      const rows = (data as InjectionLog[]) ?? [];
      setLogs(rows);
      if (count != null) setTotalCount(count);
      setHasMore(rows.length >= PAGE_SIZE);
    } catch {
      toast.error('تعذّر تحميل السجلات. حاول تحديث الصفحة.');
    } finally {
      setIsLoadingLogs(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchLogs();
  }, [user, fetchLogs]);

  const fetchMore = async () => {
    if (!user || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const from = logs.length;
      const { data } = await supabase
        .from('injection_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      const rows = (data as InjectionLog[]) ?? [];
      setLogs(prev => [...prev, ...rows]);
      setHasMore(rows.length >= PAGE_SIZE);
    } catch {
      toast.error('تعذّر تحميل المزيد. حاول مرة أخرى.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const exportCSV = () => {
    const headers = 'Peptide,Dose,Unit,Site,Date,Time,Notes';
    const rows = logs.map(l =>
      `"${l.peptide_name}",${l.dose},"${l.dose_unit}","${l.injection_site}","${formatDate(l.logged_at)}","${formatTime(l.logged_at)}","${(l.notes ?? '').replace(/"/g, '""')}"`
    );
    const csv = '\ufeff' + [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pptides-injections-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!peptideName.trim()) { toast.error('اختر الببتيد أولاً'); return; }
    if (!dose || parseFloat(dose) <= 0) { toast.error('أدخل جرعة صحيحة'); return; }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('injection_logs').insert({
        user_id: user.id,
        peptide_name: peptideName.trim(),
        dose: parseFloat(dose),
        dose_unit: unit,
        injection_site: site,
        logged_at: new Date(injectedAt).toISOString(),
        notes: notes.trim() || null,
      });
      if (error) {
        toast.error('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
        return;
      }
      setPeptideName('');
      setDose('');
      setUnit('mcg');
      setSite('abdomen');
      setNotes('');
      setShowForm(false);
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setInjectedAt(now.toISOString().slice(0, 16));
      await fetchLogs();
      toast.success(`تم تسجيل ${peptideName.trim()} — ${dose} ${unit}`);
      const newTotal = (totalCount || logs.length) + 1;
      const daySet = new Set([...logs.map(l => new Date(l.logged_at).toDateString()), new Date().toDateString()]);
      let s = 0; const dd = new Date();
      if (!daySet.has(dd.toDateString())) dd.setDate(dd.getDate() - 1);
      while (daySet.has(dd.toDateString())) { s++; dd.setDate(dd.getDate() - 1); }
      celebrate(newTotal, s);
    } catch {
      toast.error('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dashboardStats = useMemo(() => {
    if (logs.length === 0) return null;
    const totalInjections = totalCount || logs.length;
    const uniquePeptides = new Set(logs.map(l => l.peptide_name)).size;
    let streak = 0;
    const daySet = new Set(logs.map(l => new Date(l.logged_at).toDateString()));
    const d = new Date();
    if (!daySet.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    const last7 = logs.filter(l => Date.now() - new Date(l.logged_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;
    const msSinceLast = Date.now() - new Date(logs[0].logged_at).getTime();
    const hoursSince = Math.floor(msSinceLast / (1000 * 60 * 60));
    const daysSince = Math.floor(hoursSince / 24);
    const timeSinceLabel = daysSince > 0 ? `منذ ${daysSince} يوم` : hoursSince > 0 ? `منذ ${hoursSince} ساعة` : 'الآن';
    return { totalInjections, uniquePeptides, streak, last7, timeSinceLabel };
  }, [logs, totalCount]);

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
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const dayNames = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
    const monthName = new Date(year, month).toLocaleDateString('ar-u-nu-latn', { month: 'long', year: 'numeric' });
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
  }, [logs, calendarMonth]);

  const siteRotationData = useMemo(() => {
    if (logs.length === 0) return null;
    const siteLabels: Record<string, string> = { abdomen: 'البطن', thigh: 'الفخذ', arm: 'الذراع', glute: 'المؤخرة' };
    const allSites = ['abdomen', 'thigh', 'arm', 'glute'];
    const recentSites = logs.slice(0, 5).map(l => l.injection_site);
    const siteCounts: Record<string, number> = {};
    recentSites.forEach(s => { if (s) siteCounts[s] = (siteCounts[s] || 0) + 1; });
    const leastUsed = allSites.reduce((a, b) => (siteCounts[a] || 0) <= (siteCounts[b] || 0) ? a : b);
    const lastSite = logs[0]?.injection_site;
    const suggestedSite = lastSite === leastUsed ? allSites.find(s => s !== lastSite) || leastUsed : leastUsed;
    return { siteLabels, allSites, siteCounts, lastSite, suggestedSite };
  }, [logs]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
      <Helmet>
        <title>سجل الحقن | تتبّع جرعاتك | pptides</title>
        <meta name="description" content="سجّل وتتبّع حقن الببتيدات والجرعات اليومية. Track your peptide injections and daily doses." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <Syringe className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-emerald-600 md:text-4xl">سجل الحقن</h1>
        <p className="mt-2 text-lg text-stone-600">تتبّع جرعاتك ومواقع الحقن</p>
      </div>

      {/* Active Protocol Cards — One-Tap Logging */}
      {activeProtocols.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-stone-900">بروتوكولاتك النشطة</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeProtocols.map(proto => {
              const peptide = allPeptides.find(p => p.id === proto.peptide_id);
              const daysSinceStart = Math.floor((Date.now() - new Date(proto.started_at).getTime()) / (1000 * 60 * 60 * 24));
              const totalDays = proto.cycle_weeks * 7;
              const todayLogged = logs.some(l => l.peptide_name === (peptide?.nameEn ?? proto.peptide_id) && new Date(l.logged_at).toDateString() === new Date().toDateString());
              return (
                <div key={proto.id} className={cn('rounded-2xl border p-4 transition-all', todayLogged ? 'border-emerald-300 bg-emerald-50/50' : 'border-stone-200 bg-white')}>
                  <div className="flex items-center gap-3">
                    <ProgressRing current={daysSinceStart} total={totalDays} size={56} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 truncate">{peptide?.nameAr ?? proto.peptide_id}</p>
                      <p className="text-xs text-stone-500" dir="ltr">{proto.dose} {proto.dose_unit}</p>
                    </div>
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
                      {todayLogged ? '✓ تم' : 'سجّل'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Dashboard */}
      {dashboardStats && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
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
      )}

      {/* Weekly Activity Chart */}
      {weeklyActivity && (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-stone-900">نشاط الأسبوع</h3>
            <ActivityChart data={weeklyActivity.days.map((day, i) => ({ day: day.slice(0, 3), count: weeklyActivity.weekCounts[i], isToday: i === weeklyActivity.todayIdx }))} />
          </div>
      )}

      {/* Dose Trend Chart */}
      {logs.length >= 3 && (() => {
        const trendData = [...logs].reverse().slice(-14).map(l => ({
          date: new Date(l.logged_at).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' }),
          dose: l.dose,
        }));
        return (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-stone-900">تاريخ الجرعات</h3>
            <DoseTrendChart data={trendData} unit={logs[0]?.dose_unit ?? 'mcg'} />
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
                <div key={d} className="text-xs font-bold text-stone-400 pb-1">{d}</div>
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

      {/* Action Buttons */}
      {!showForm && (
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
                        toast.error('حدث خطأ في تكرار الحقنة. حاول مرة أخرى.');
                        return;
                      }
                      await fetchLogs();
                      toast.success(`تم تسجيل ${last.peptide_name} — ${last.dose} ${last.dose_unit}`);
                    } catch {
                      toast.error('حدث خطأ في تكرار الحقنة. حاول مرة أخرى.');
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
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900">تسجيل حقنة جديدة</h2>
          <div className="space-y-4">
            {/* Peptide Name */}
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700">اسم الببتيد</label>
              <select
                value={peptideName}
                onChange={(e) => setPeptideName(e.target.value)}
                required
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">اختر الببتيد...</option>
                {allPeptides.map(p => (
                  <option key={p.id} value={p.nameEn}>{p.nameAr} ({p.nameEn})</option>
                ))}
              </select>
            </div>

            {/* Dose + Unit */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-bold text-stone-700">الجرعة</label>
                <input
                  type="number"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="250"
                  required
                  min="0"
                  step="any"
                  dir="ltr"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-sm font-bold text-stone-700">الوحدة</label>
                <select
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
              if (doseMcg > preset.maxDose) {
                return <p className="text-xs font-bold text-red-600 flex items-center gap-1">⚠️ الجرعة أعلى من الحد الأقصى الموصى به ({preset.maxDose} mcg)</p>;
              }
              if (doseMcg < preset.minDose) {
                return <p className="text-xs font-bold text-amber-600 flex items-center gap-1">⚠️ الجرعة أقل من الحد الأدنى الموصى به ({preset.minDose} mcg)</p>;
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
              <label className="mb-1 block text-sm font-bold text-stone-700">التاريخ والوقت</label>
              <input
                type="datetime-local"
                value={injectedAt}
                onChange={(e) => setInjectedAt(e.target.value)}
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
                      'rounded-full px-3 py-1.5 text-xs font-bold transition-all',
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
              <label className="mb-1 block text-sm font-bold text-stone-700">ملاحظات <span className="text-xs text-emerald-600 font-normal me-1">اختياري</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={3}
                maxLength={200}
                className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <p className={cn('mt-1 text-start text-xs', notes.length >= 180 ? 'text-amber-600' : 'text-stone-400')}>{notes.length}/200</p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
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
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <Syringe className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">سجل حقنك جاهز</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
              سجّل حقنتك الأولى الآن — سنتتبّع جرعاتك، ندير تدوير مواقع الحقن، ونعرض لك إحصائيات التزامك بالبروتوكول.
            </p>
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
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          title: 'حذف السجل',
                          message: `حذف سجل ${log.peptide_name} — ${log.dose} ${log.dose_unit}؟`,
                          isDestructive: true,
                          onConfirm: async () => {
                            setConfirmDialog(null);
                            const deletedLog = logs.find(l => l.id === log.id);
                            setLogs(prev => prev.filter(l => l.id !== log.id));
                            const { error } = await supabase.from('injection_logs').delete().eq('id', log.id);
                            if (error) {
                              if (deletedLog) setLogs(prev => [deletedLog, ...prev]);
                              toast.error('فشل الحذف — حاول مرة أخرى');
                            }
                          },
                        });
                      }}
                      className="flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {SITE_LABELS[log.injection_site] ?? log.injection_site}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(log.logged_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(log.logged_at)}
                  </span>
                </div>
                {log.notes && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-stone-50 px-3 py-2">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
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
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ التحميل...
                  </>
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
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-stone-900 mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-stone-600 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={confirmDialog.onConfirm}
                className={cn('flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white', confirmDialog.isDestructive ? 'bg-red-600 transition-colors hover:bg-red-700' : 'bg-emerald-600 transition-colors hover:bg-emerald-700')}
              >
                تأكيد
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
    </div>
  );
}
