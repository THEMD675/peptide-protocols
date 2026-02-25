import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Syringe,
  Plus,
  Lock,
  Loader2,
  Calendar,
  MapPin,
  FileText,
  Clock,
  TrendingUp,
  BarChart3,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface InjectionLog {
  id: string;
  peptide_name: string;
  dose: number;
  unit: string;
  injection_site: string;
  injected_at: string;
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
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

export default function Tracker() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<InjectionLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [peptideName, setPeptideName] = useState('');
  const [dose, setDose] = useState('');
  const [unit, setUnit] = useState('mcg');
  const [site, setSite] = useState('abdomen');
  const [injectedAt, setInjectedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    const { data } = await supabase
      .from('injection_logs')
      .select('*')
      .eq('user_id', user!.id)
      .order('injected_at', { ascending: false })
      .limit(50);
    setLogs((data as InjectionLog[]) ?? []);
    setIsLoadingLogs(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peptideName.trim() || !dose) return;
    setIsSubmitting(true);
    try {
      await supabase.from('injection_logs').insert({
        user_id: user!.id,
        peptide_name: peptideName.trim(),
        dose: parseFloat(dose),
        unit,
        injection_site: site,
        injected_at: new Date(injectedAt).toISOString(),
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
      import('sonner').then(m => m.toast.error('حدث خطأ أثناء الحفظ. حاول مرة أخرى.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Helmet>
          <title>سجل الحقن — تتبّع جرعاتك | Injection Tracker</title>
          <meta name="description" content="سجّل وتتبّع حقن الببتيدات والجرعات اليومية. Track your peptide injections and daily doses." />
        </Helmet>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
            <Lock className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-stone-900">سجّل الدخول لتتبّع حقنك</p>
          <p className="mt-2 text-sm text-stone-600">سجّل جرعاتك وتابع تاريخك الطبي</p>
          <Link
            to="/login"
            className="mt-4 rounded-full bg-emerald-600 px-10 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-24 md:px-6 md:pt-28">
      <Helmet>
        <title>سجل الحقن — تتبّع جرعاتك | Injection Tracker</title>
        <meta name="description" content="سجّل وتتبّع حقن الببتيدات والجرعات اليومية. Track your peptide injections and daily doses." />
      </Helmet>

      {/* Header */}
      <div className="mb-10 text-center">
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
        const today = new Date().toDateString();
        const todayCount = logs.filter(l => new Date(l.injected_at).toDateString() === today).length;

        let streak = 0;
        const daySet = new Set(logs.map(l => new Date(l.injected_at).toDateString()));
        const d = new Date();
        while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }

        const last7 = logs.filter(l => {
          const diff = Date.now() - new Date(l.injected_at).getTime();
          return diff < 7 * 24 * 60 * 60 * 1000;
        }).length;

        return (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          </div>
        );
      })()}

      {/* Weekly Activity Bar */}
      {logs.length > 0 && (() => {
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const weekCounts = Array(7).fill(0);
        const now = new Date();
        logs.forEach(l => {
          const diff = Math.floor((now.getTime() - new Date(l.injected_at).getTime()) / (1000 * 60 * 60 * 24));
          if (diff < 7) {
            const dayIdx = new Date(l.injected_at).getDay();
            weekCounts[dayIdx]++;
          }
        });
        const max = Math.max(...weekCounts, 1);
        const todayIdx = now.getDay();

        return (
          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
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
          <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
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

      {/* Add Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-6 py-4 text-sm font-bold text-emerald-700 transition-all hover:border-emerald-400 hover:bg-emerald-100"
        >
          <Plus className="h-5 w-5" />
          تسجيل حقنة جديدة
        </button>
      )}

      {/* Log Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-stone-300 bg-stone-50 p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900">تسجيل حقنة جديدة</h2>
          <div className="space-y-4">
            {/* Peptide Name */}
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700">اسم الببتيد</label>
              <input
                type="text"
                value={peptideName}
                onChange={(e) => setPeptideName(e.target.value)}
                placeholder="مثال: BPC-157"
                required
                dir="ltr"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
              />
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
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
                />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-sm font-bold text-stone-700">الوحدة</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  aria-label="وحدة الجرعة"
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
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
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
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
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700">ملاحظات</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية (اختياري)"
                rows={3}
                className="w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200"
              />
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
                className="rounded-xl border border-stone-300 px-6 py-3 text-sm font-bold text-stone-700 transition-all hover:bg-stone-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Timeline */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-stone-900">السجل</h2>
        {isLoadingLogs ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 py-16 text-center">
            <Syringe className="mx-auto mb-3 h-8 w-8 text-stone-300" />
            <p className="text-sm text-stone-500">لا توجد سجلات بعد</p>
            <p className="mt-1 text-xs text-stone-400">سجّل أول حقنة لك لتبدأ التتبّع</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-stone-900" dir="ltr">{log.peptide_name}</h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {log.dose} {log.unit}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {SITE_LABELS[log.injection_site] ?? log.injection_site}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(log.injected_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(log.injected_at)}
                  </span>
                </div>
                {log.notes && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-stone-50 px-3 py-2">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                    <p className="text-xs text-stone-600">{log.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
