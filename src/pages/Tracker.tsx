import { useState, useEffect, useCallback } from 'react';
import FocusTrap from 'focus-trap-react';
import { Helmet } from 'react-helmet-async';
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
  const [logs, setLogs] = useState<InjectionLog[]>([]);
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
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const suggestedSite = (() => {
    if (logs.length === 0) return 'abdomen';
    const allSites = ['abdomen', 'thigh', 'arm', 'glute'];
    const recentSites = logs.slice(0, 5).map(l => l.injection_site);
    const siteCounts: Record<string, number> = {};
    recentSites.forEach(s => { if (s) siteCounts[s] = (siteCounts[s] || 0) + 1; });
    const leastUsed = allSites.reduce((a, b) => (siteCounts[a] || 0) <= (siteCounts[b] || 0) ? a : b);
    const lastSite = logs[0]?.injection_site;
    return lastSite === leastUsed ? allSites.find(s => s !== lastSite) || leastUsed : leastUsed;
  })();

  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setIsLoadingLogs(true);
    const { data, error } = await supabase
      .from('injection_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .range(0, PAGE_SIZE - 1);
    if (error) { toast.error('تعذّر تحميل السجلات. حاول تحديث الصفحة.'); }
    const rows = (data as InjectionLog[]) ?? [];
    setLogs(rows);
    setHasMore(rows.length >= PAGE_SIZE);
    setIsLoadingLogs(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchLogs();
  }, [user, fetchLogs]);

  const fetchMore = async () => {
    if (!user || isLoadingMore) return;
    setIsLoadingMore(true);
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
    setIsLoadingMore(false);
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
      await supabase.from('injection_logs').insert({
        user_id: user.id,
        peptide_name: peptideName.trim(),
        dose: parseFloat(dose),
        dose_unit: unit,
        injection_site: site,
        logged_at: new Date(injectedAt).toISOString(),
        notes: notes.trim() || null,
      });
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
    } catch {
      toast.error('حدث خطأ أثناء الحفظ. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
      <Helmet>
        <title>سجل الحقن — تتبّع جرعاتك | pptides</title>
        <meta name="description" content="سجّل وتتبّع حقن الببتيدات والجرعات اليومية. Track your peptide injections and daily doses." />
      </Helmet>

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <Syringe className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-emerald-600 md:text-4xl">سجل الحقن</h1>
        <p className="mt-2 text-lg text-stone-600">تتبّع جرعاتك ومواقع الحقن</p>
      </div>

      {/* Stats Dashboard */}
      {logs.length > 0 && (() => {
        const totalInjections = logs.length;
        const uniquePeptides = new Set(logs.map(l => l.peptide_name)).size;
        let streak = 0;
        const daySet = new Set(logs.map(l => new Date(l.logged_at).toDateString()));
        const d = new Date();
        if (!daySet.has(d.toDateString())) d.setDate(d.getDate() - 1);
        while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }

        const last7 = logs.filter(l => {
          const diff = Date.now() - new Date(l.logged_at).getTime();
          return diff < 7 * 24 * 60 * 60 * 1000;
        }).length;

        const msSinceLast = Date.now() - new Date(logs[0].logged_at).getTime();
        const hoursSince = Math.floor(msSinceLast / (1000 * 60 * 60));
        const daysSince = Math.floor(hoursSince / 24);
        const timeSinceLabel = daysSince > 0 ? `منذ ${daysSince} يوم` : hoursSince > 0 ? `منذ ${hoursSince} ساعة` : 'الآن';

        return (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
              <BarChart3 className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
              <p className="text-2xl font-black text-stone-900">{totalInjections}</p>
              <p className="text-xs text-stone-500">إجمالي الحقن</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
              <Flame className="mx-auto mb-1 h-5 w-5 text-orange-500" />
              <p className="text-2xl font-black text-stone-900">{streak}</p>
              <p className="text-xs text-stone-500">أيام متتالية</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
              <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-500" />
              <p className="text-2xl font-black text-stone-900">{last7}</p>
              <p className="text-xs text-stone-500">آخر 7 أيام</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center">
              <Syringe className="mx-auto mb-1 h-5 w-5 text-purple-500" />
              <p className="text-2xl font-black text-stone-900">{uniquePeptides}</p>
              <p className="text-xs text-stone-500">ببتيدات مختلفة</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center col-span-2 sm:col-span-1">
              <Clock className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
              <p className="text-2xl font-black text-emerald-700">{timeSinceLabel}</p>
              <p className="text-xs text-stone-500">آخر حقنة</p>
            </div>
          </div>
        );
      })()}

      {/* Weekly Activity Bar */}
      {logs.length > 0 && (() => {
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const weekCounts = Array(7).fill(0);
        const now = new Date();
        logs.forEach(l => {
          const diff = Math.floor((now.getTime() - new Date(l.logged_at).getTime()) / (1000 * 60 * 60 * 24));
          if (diff < 7) {
            const dayIdx = new Date(l.logged_at).getDay();
            weekCounts[dayIdx]++;
          }
        });
        const max = Math.max(...weekCounts, 1);
        const todayIdx = now.getDay();

        return (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-bold text-stone-900">نشاط الأسبوع</h3>
            <div className="flex items-end justify-between gap-1 h-20">
              {weekCounts.map((count, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn(
                      'w-full rounded-t-md transition-all',
                      i === todayIdx ? 'bg-emerald-500' : count > 0 ? 'bg-emerald-300' : 'bg-stone-200'
                    )}
                    style={{ height: `${Math.max((count / max) * 100, 8)}%`, minHeight: '4px' }}
                  />
                  <span className={cn('text-[10px]', i === todayIdx ? 'font-bold text-emerald-700' : 'text-stone-400')}>
                    {days[i].slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Monthly Calendar */}
      {logs.length > 0 && (() => {
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

        const prevMonth = () => setCalendarMonth(prev => {
          const m = prev.month - 1;
          return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
        });
        const nextMonth = () => {
          if (isCurrentMonth) return;
          setCalendarMonth(prev => {
            const m = prev.month + 1;
            return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
          });
        };

        return (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} aria-label="الشهر السابق" className="rounded-lg border border-stone-200 p-1.5 text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700">
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="text-center">
                <h3 className="text-sm font-bold text-stone-900">{monthName}</h3>
                <span className="text-xs text-stone-500">{injectionDays.size} يوم نشط</span>
              </div>
              <button onClick={nextMonth} disabled={isCurrentMonth} aria-label="الشهر التالي" className={cn('rounded-lg border border-stone-200 p-1.5 transition-colors', isCurrentMonth ? 'text-stone-300 cursor-not-allowed' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700')}>
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {dayNames.map(d => (
                <div key={d} className="text-[10px] font-bold text-stone-400 pb-1">{d}</div>
              ))}
              {cells}
            </div>
          </div>
        );
      })()}

      {/* Site Rotation Indicator */}
      {logs.length > 0 && (() => {
        const siteLabels: Record<string, string> = { abdomen: 'البطن', thigh: 'الفخذ', arm: 'الذراع', glute: 'المؤخرة' };
        const allSites = ['abdomen', 'thigh', 'arm', 'glute'];
        const recentSites = logs.slice(0, 5).map(l => l.injection_site);
        const siteCounts: Record<string, number> = {};
        recentSites.forEach(s => { if (s) siteCounts[s] = (siteCounts[s] || 0) + 1; });
        const leastUsed = allSites.reduce((a, b) => (siteCounts[a] || 0) <= (siteCounts[b] || 0) ? a : b);
        const lastSite = logs[0]?.injection_site;
        const suggestedSite = lastSite === leastUsed ? allSites.find(s => s !== lastSite) || leastUsed : leastUsed;

        return (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-stone-900">تدوير مواقع الحقن</h3>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {allSites.map(s => {
                const count = siteCounts[s] || 0;
                const isLast = s === lastSite;
                const isSuggested = s === suggestedSite;
                return (
                  <div key={s} className={cn(
                    'rounded-xl border p-3 text-center transition-all',
                    isSuggested ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200' :
                    isLast ? 'border-amber-300 bg-amber-50' :
                    'border-stone-200 bg-stone-50'
                  )}>
                    <p className="text-xs font-bold text-stone-800">{siteLabels[s]}</p>
                    <p className="text-lg font-black text-stone-900">{count}</p>
                    <p className="text-[10px] text-stone-500">
                      {isSuggested ? 'الموقع التالي' : isLast ? 'آخر حقنة' : `آخر 5`}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-stone-600 text-center">
              الحقنة القادمة في <span className="font-bold text-emerald-700">{siteLabels[suggestedSite]}</span> لتجنّب تلف الأنسجة
            </p>
          </div>
        );
      })()}

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
                      await supabase.from('injection_logs').insert({
                        user_id: user.id,
                        peptide_name: last.peptide_name,
                        dose: last.dose,
                        dose_unit: last.dose_unit,
                        injection_site: suggestedSite,
                        logged_at: now.toISOString(),
                        notes: null,
                      });
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

            {/* Injection Site */}
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700">موقع الحقن</label>
                <select
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  aria-label="موقع الحقن"
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                {INJECTION_SITES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
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
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700">ملاحظات <span className="text-[10px] text-emerald-600 font-normal mr-1">اختياري</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={3}
                maxLength={200}
                className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <p className={cn('mt-1 text-left text-xs', notes.length >= 180 ? 'text-amber-600' : 'text-stone-400')}>{notes.length}/200</p>
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
          <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
              <Syringe className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-stone-900">لا توجد سجلات بعد</p>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
              سجل الحقن يساعدك على تتبّع جرعاتك اليومية، تدوير مواقع الحقن، ومراقبة التزامك بالبروتوكول. كل حقنة تُسجّل مع الجرعة والموقع والوقت.
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
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const isToday = new Date(log.logged_at).toDateString() === new Date().toDateString();
              return (
              <div
                key={log.id}
                className={cn('rounded-2xl border p-5 transition-all hover:shadow-sm', isToday ? 'border-emerald-300 border-r-4 bg-emerald-50/30' : 'border-stone-200 bg-white')}
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
                      className="rounded-lg p-2 text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmDialog(null)}>
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-stone-900 mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-stone-600 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={confirmDialog.onConfirm}
                className={cn('flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white', confirmDialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700')}
              >
                تأكيد
              </button>
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50"
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
