import { useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { Link } from 'react-router-dom';
import {
  Syringe,
  Plus,
  Loader2,
  Calendar,
  MapPin,
  FileText,
  Clock,
  TrendingUp,
  Trash2,
  Pencil,
  Download,
  FileDown,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

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

interface TrackerHistoryProps {
  logs: InjectionLog[];
  setLogs: React.Dispatch<React.SetStateAction<InjectionLog[]>>;
  isLoadingLogs: boolean;
  fetchError: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  fetchLogs: () => Promise<void>;
  fetchMore: () => Promise<void>;
  useHijri: boolean;
  peptideColorMap: Record<string, string>;
  isProOrTrial: boolean;
  userId: string;
  totalCount: number;
  setTotalCount: React.Dispatch<React.SetStateAction<number>>;
  suggestedSite: string;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  onQuickRepeat: () => Promise<void>;
  isSubmitting: boolean;
  autoFillForm: () => void;
}

export default function TrackerHistory({
  logs,
  setLogs,
  isLoadingLogs,
  fetchError,
  hasMore,
  isLoadingMore,
  fetchLogs,
  fetchMore,
  useHijri,
  peptideColorMap,
  isProOrTrial,
  userId,
  totalCount,
  setTotalCount,
  suggestedSite,
  showForm,
  setShowForm,
  onQuickRepeat,
  isSubmitting,
  autoFillForm,
}: TrackerHistoryProps) {
  // Edit state
  const [editingLog, setEditingLog] = useState<string | null>(null);
  const [editDose, setEditDose] = useState('');
  const [editUnit, setEditUnit] = useState('mcg');
  const [editSite, setEditSite] = useState('abdomen');
  const [editDate, setEditDate] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void; isDestructive?: boolean } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const startEditing = (log: InjectionLog) => {
    setEditingLog(log.id);
    setEditDose(String(log.dose));
    setEditUnit(log.dose_unit);
    setEditSite(log.injection_site);
    const d = new Date(log.logged_at);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setEditDate(d.toISOString().slice(0, 16));
  };

  const saveEdit = async (logId: string) => {
    if (editSaving) return;
    const doseNum = parseFloat(editDose);
    if (isNaN(doseNum) || doseNum <= 0) { toast.error('أدخل جرعة صحيحة'); return; }
    if (new Date(editDate).getTime() > Date.now() + 60000) { toast.error('لا يمكن تسجيل حقنة في المستقبل'); return; }
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from('injection_logs')
        .update({
          dose: doseNum,
          dose_unit: editUnit,
          injection_site: editSite,
          logged_at: new Date(editDate).toISOString(),
        })
        .eq('id', logId)
        .eq('user_id', userId);
      if (error) {
        toast.error('تعذّر تعديل السجل — حاول مرة أخرى');
      } else {
        toast.success('تم تعديل السجل');
        setEditingLog(null);
        await fetchLogs();
      }
    } catch {
      toast.error('تعذّر تعديل السجل');
    } finally {
      setEditSaving(false);
    }
  };

  const exportCSV = async () => {
    toast('جارٍ تجهيز التصدير...');
    try {
      const { data: allLogs, error } = await supabase
        .from('injection_logs')
        .select('*')
        .eq('user_id', userId)
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
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('تم تصدير البيانات');
    } catch {
      toast.error('تعذّر تصدير البيانات');
    }
  };

  const exportPDF = async () => {
    toast('جارٍ تجهيز الصورة...');
    try {
      const { data: allLogs, error } = await supabase
        .from('injection_logs')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(10000);
      if (error) { toast.error('تعذّر تحميل البيانات'); return; }
      const rows = (allLogs ?? []) as InjectionLog[];
      const html2canvas = (await import('html2canvas')).default;
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:-9999px;right:0;width:800px;padding:40px;background:#fff;direction:rtl;font-family:Cairo,sans-serif;';
      container.innerHTML = `
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="font-size:24px;color:#059669;margin:0;">سجل الحقن — pptides</h1>
          <p style="color:#78716c;font-size:14px;margin-top:8px;">${new Date().toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p style="color:#78716c;font-size:12px;">إجمالي: ${rows.length} حقنة</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f5f5f4;border-bottom:2px solid #d6d3d1;">
              <th style="padding:8px;text-align:right;">الببتيد</th>
              <th style="padding:8px;text-align:center;">الجرعة</th>
              <th style="padding:8px;text-align:center;">الموقع</th>
              <th style="padding:8px;text-align:center;">التاريخ</th>
              <th style="padding:8px;text-align:center;">الوقت</th>
            </tr>
          </thead>
          <tbody>
            ${rows.slice(0, 200).map((l, i) => `
              <tr style="border-bottom:1px solid #e7e5e4;${i % 2 === 0 ? 'background:#fafaf9;' : ''}">
                <td style="padding:6px 8px;" dir="ltr">${l.peptide_name}</td>
                <td style="padding:6px 8px;text-align:center;">${l.dose} ${l.dose_unit}</td>
                <td style="padding:6px 8px;text-align:center;">${SITE_LABELS[l.injection_site] ?? l.injection_site}</td>
                <td style="padding:6px 8px;text-align:center;">${formatDate(l.logged_at, useHijri)}</td>
                <td style="padding:6px 8px;text-align:center;">${formatTime(l.logged_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${rows.length > 200 ? '<p style="text-align:center;color:#78716c;font-size:11px;margin-top:12px;">يتم عرض أول 200 سجل فقط</p>' : ''}
        <p style="text-align:center;color:#a8a29e;font-size:10px;margin-top:24px;">pptides.com — تم التصدير تلقائيًا</p>
      `;
      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' });
      document.body.removeChild(container);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) { toast.error('تعذّر إنشاء الصورة'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pptides-injections-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('تم تصدير السجل كصورة');
    } catch {
      toast.error('تعذّر التصدير');
    }
  };

  return (
    <>
      {/* Action Buttons */}
      {!showForm && logs.length > 0 && isProOrTrial && (
        <div className="mb-8 space-y-3">
          <button
            onClick={onQuickRepeat}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 min-h-[56px] shadow-md"
          >
            <span>سجّل سريع — {logs[0]?.peptide_name} {logs[0]?.dose} {logs[0]?.dose_unit}</span>
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowForm(true);
                autoFillForm();
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-4 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:border-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 min-h-[44px]"
            >
              <Plus className="h-5 w-5" />
              حقنة جديدة
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">السجل</h2>
          {logs.length > 0 && (
            <div className="flex gap-2">
              <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-1.5 min-h-[44px] text-xs font-bold text-stone-600 dark:text-stone-300 transition-all hover:border-emerald-300 hover:text-emerald-700">
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
              <button onClick={exportPDF} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 min-h-[44px] text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-100">
                <FileDown className="h-3.5 w-3.5" />
                صورة
              </button>
            </div>
          )}
        </div>

        {isLoadingLogs ? (
          <div className="space-y-3 py-4" role="status" aria-label="جارٍ تحميل السجلات">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-stone-200 dark:border-stone-600 p-5 space-y-2">
                <div className="flex justify-between"><div className="h-5 w-28 rounded bg-stone-200 dark:bg-stone-700" /><div className="h-6 w-20 rounded-full bg-stone-100 dark:bg-stone-800" /></div>
                <div className="h-4 w-40 rounded bg-stone-100 dark:bg-stone-800" />
                <div className="h-4 w-32 rounded bg-stone-100 dark:bg-stone-800" />
              </div>
            ))}
          </div>
        ) : fetchError && logs.length === 0 ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 py-10 text-center">
            <p className="text-base text-red-700 dark:text-red-400 mb-4">تعذّر تحميل السجلات. تحقق من اتصالك بالإنترنت.</p>
            <button onClick={() => fetchLogs()} className="rounded-xl bg-red-100 px-6 py-2 text-sm font-bold text-red-700 dark:text-red-400 hover:bg-red-200 transition-colors">إعادة المحاولة</button>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 p-10 text-center">
            <div className="mx-auto mb-6 flex items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 -rotate-6">
                <Calendar className="h-7 w-7 text-emerald-500" />
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-200 dark:bg-emerald-800/40 shadow-lg">
                <Syringe className="h-10 w-10 text-emerald-700" />
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 rotate-6">
                <TrendingUp className="h-7 w-7 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-stone-900 dark:text-stone-100">سجّل أول حقنة لك 💉</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {isProOrTrial
                ? 'ابدأ بتسجيل حقنتك الأولى — سنتتبّع جرعاتك، ندير تدوير مواقع الحقن، ونعرض لك خريطة حرارية وإحصائيات التزامك بالبروتوكول.'
                : 'اشترك لبدء تسجيل حقنك وتتبّع جرعاتك.'}
            </p>
            {isProOrTrial ? (
              <button
                onClick={() => { setShowForm(true); }}
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
              <Link to="/coach" className="text-sm font-semibold text-emerald-700 hover:underline transition-colors">صمّم بروتوكول مع المدرب الذكي</Link>
              <span className="hidden sm:inline text-stone-300">|</span>
              <Link to="/guide" className="text-sm font-semibold text-emerald-700 hover:underline transition-colors">تعلّم كيف تحقن</Link>
              <span className="hidden sm:inline text-stone-300">|</span>
              <Link to="/calculator" className="text-sm font-semibold text-emerald-700 hover:underline transition-colors">احسب جرعتك</Link>
              <span className="hidden sm:inline text-stone-300">|</span>
              <Link to="/interactions" className="text-sm font-semibold text-emerald-700 hover:underline transition-colors">فحص التعارضات</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const isToday = new Date(log.logged_at).toDateString() === new Date().toDateString();
              const colorClass = peptideColorMap[log.peptide_name] ?? 'border-s-emerald-500';
              const isEditing = editingLog === log.id;
              return (
                <div
                  key={log.id}
                  className={cn('rounded-2xl border border-s-4 p-5 shadow-sm dark:shadow-stone-900/30 transition-all hover:shadow-md', colorClass, isToday ? 'border-t-emerald-300 border-e-emerald-300 border-b-emerald-300 dark:border-t-emerald-700 dark:border-e-emerald-700 dark:border-b-emerald-700 bg-emerald-50/30' : 'border-t-stone-200 border-e-stone-200 border-b-stone-200 dark:border-t-stone-700 dark:border-e-stone-700 dark:border-b-stone-700 bg-white dark:bg-stone-950')}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-stone-900 dark:text-stone-100" dir="ltr">{log.peptide_name}</p>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-stone-500 dark:text-stone-300 mb-1 block">الجرعة</label>
                          <input type="number" inputMode="decimal" value={editDose} onChange={e => setEditDose(e.target.value)} dir="ltr" min="0" step="any" className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900" />
                        </div>
                        <div className="w-20">
                          <label className="text-xs text-stone-500 dark:text-stone-300 mb-1 block">الوحدة</label>
                          <select value={editUnit} onChange={e => setEditUnit(e.target.value)} className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 px-2 py-2 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none">
                            <option value="mcg">mcg</option>
                            <option value="mg">mg</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 dark:text-stone-300 mb-1 block">الموقع</label>
                        <select value={editSite} onChange={e => setEditSite(e.target.value)} className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none">
                          {INJECTION_SITES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 dark:text-stone-300 mb-1 block">التاريخ والوقت</label>
                        <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} dir="ltr" className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-base text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(log.id)} disabled={editSaving} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 min-h-[44px] text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
                          <Check className="h-4 w-4" />
                          {editSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                        </button>
                        <button onClick={() => setEditingLog(null)} className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-600 px-4 py-2.5 min-h-[44px] text-sm font-bold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800">
                          <X className="h-4 w-4" />
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-stone-900 dark:text-stone-100" dir="ltr">{log.peptide_name}</h3>
                        <div className="flex items-center gap-1">
                          <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {log.dose} {log.dose_unit}
                          </span>
                          {isProOrTrial && (
                            <button onClick={() => startEditing(log)} className="flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] text-stone-300 dark:text-stone-300 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 dark:hover:text-blue-400" aria-label="تعديل">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isProOrTrial && (
                            <button
                              onClick={() => {
                                setConfirmDialog({
                                  title: 'حذف السجل',
                                  message: `حذف سجل ${log.peptide_name} — ${log.dose} ${log.dose_unit}؟`,
                                  isDestructive: true,
                                  onConfirm: async () => {
                                    setConfirmBusy(true);
                                    const deletedLog = logs.find(l => l.id === log.id);
                                    setLogs(prev => prev.filter(l => l.id !== log.id));
                                    const { error } = await supabase.from('injection_logs').delete().eq('id', log.id).eq('user_id', userId);
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
                              className="flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] text-stone-300 dark:text-stone-300 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                              aria-label="حذف"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-stone-500 dark:text-stone-300">
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
                      {log.photo_url && (
                        <div className="mt-3">
                          <img src={log.photo_url} alt="صورة الحقنة" width={80} height={80} className="h-20 w-20 rounded-xl object-cover border border-stone-200 dark:border-stone-600" loading="lazy" />
                        </div>
                      )}
                      {log.notes && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-stone-50 dark:bg-stone-900 px-3 py-2">
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500 dark:text-stone-300" />
                          <p className="text-xs text-stone-600 dark:text-stone-300">{log.notes}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            {hasMore && (
              <button
                onClick={fetchMore}
                disabled={isLoadingMore}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 py-4 text-sm font-bold text-stone-600 dark:text-stone-300 transition-all hover:border-emerald-300 dark:border-emerald-700 hover:text-emerald-700 dark:text-emerald-400 disabled:opacity-50"
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

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setConfirmDialog(null)}>
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
            <div role="dialog" aria-modal="true" aria-label="تأكيد الحذف" className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-950 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-stone-600 dark:text-stone-300 mb-6">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => confirmDialog.onConfirm()}
                  disabled={confirmBusy}
                  className={cn(
                    'flex-1 rounded-xl px-4 py-3 min-h-[44px] text-sm font-bold text-white transition-all disabled:opacity-50',
                    confirmDialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  )}
                >
                  {confirmBusy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'تأكيد'}
                </button>
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 rounded-xl border border-stone-200 dark:border-stone-600 px-4 py-3 min-h-[44px] text-sm font-bold text-stone-700 dark:text-stone-200 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
    </>
  );
}
