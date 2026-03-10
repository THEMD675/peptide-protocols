import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import FocusTrap from 'focus-trap-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useCelebrations } from '@/hooks/useCelebrations';
import BodyMap from '@/components/BodyMap';
const ActivityChart = lazy(() => import('@/components/charts/ActivityChart'));
const DoseTrendChart = lazy(() => import('@/components/charts/DoseTrendChart'));
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
  Pencil,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Info,
  AlertTriangle,
  Camera,
  FileDown,
  CalendarDays,
  CalendarRange,
  Check,
  X,
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
import Tooltip from '@/components/Tooltip';

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
  const [heatmapView, setHeatmapView] = useState<HeatmapView>('monthly');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !user) return null;
    try {
      const ext = photoFile.name.split('.').pop() || 'jpg';
      const path = `injection-photos/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('user-uploads').upload(path, photoFile, { cacheControl: '31536000', upsert: false });
      if (error) { console.warn('Photo upload failed:', error.message); return null; }
      const { data: urlData } = supabase.storage.from('user-uploads').getPublicUrl(path);
      return urlData?.publicUrl ?? null;
    } catch { return null; }
  };

  const exportPDF = async () => {
    if (!user) return;
    toast('جارٍ تجهيز ملف PDF...');
    try {
      const { data: allLogs, error } = await supabase
        .from('injection_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(10000);
      if (error) { toast.error('تعذّر تحميل البيانات'); return; }
      const rows = (allLogs ?? []) as InjectionLog[];
      const html2canvas = (await import('html2canvas')).default;
      // Build a temporary HTML table for PDF
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
      if (!blob) { toast.error('تعذّر إنشاء PDF'); return; }
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
      if (error) { toast.error('تعذّر تحميل المزيد'); return; }
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
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
      const photoUrl = await uploadPhoto();
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        peptide_name: peptideName.trim(),
        dose: parseFloat(dose),
        dose_unit: unit,
        injection_site: site,
        logged_at: injectedDate.toISOString(),
        notes: combinedNotes,
      };
      if (photoUrl) insertData.photo_url = photoUrl;
      const { error } = await supabase.from('injection_logs').insert(insertData);
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
      setSideEffect('none');
      setDoseOutOfRangeConfirmed(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
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

  // Edit state
  const [editingLog, setEditingLog] = useState<string | null>(null);
  const [editDose, setEditDose] = useState('');
  const [editUnit, setEditUnit] = useState('mcg');
  const [editSite, setEditSite] = useState('abdomen');
  const [editDate, setEditDate] = useState('');
  const [editSaving, setEditSaving] = useState(false);

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
    if (!user || editSaving) return;
    const doseNum = parseFloat(editDose);
    if (isNaN(doseNum) || doseNum <= 0) { toast.error('أدخل جرعة صحيحة'); return; }
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
        .eq('user_id', user.id);
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

  const [fullStatsData, setFullStatsData] = useState<{ uniquePeptides: number; last7: number } | null>(null);
  const [allLogsForStats, setAllLogsForStats] = useState<InjectionLog[]>([]);
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    Promise.all([
      supabase.from('injection_logs').select('peptide_name').eq('user_id', user.id).limit(10000),
      supabase.from('injection_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('logged_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('injection_logs').select('logged_at, injection_site, peptide_name').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(10000),
    ]).then(([pepRes, weekRes, allRes]) => {
      if (!mounted) return;
      const unique = new Set((pepRes.data ?? []).map((r: { peptide_name: string }) => r.peptide_name)).size;
      setFullStatsData({ uniquePeptides: unique, last7: weekRes.count ?? 0 });
      setAllLogsForStats((allRes.data as InjectionLog[]) ?? []);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [user, logs.length]);

  const dashboardStats = useMemo(() => {
    if (logs.length === 0) return null;
    const totalInjections = totalCount || logs.length;
    const uniquePeptides = fullStatsData?.uniquePeptides ?? new Set(logs.map(l => l.peptide_name)).size;
    const streak = computeStreak(allLogsForStats.length > 0 ? allLogsForStats : logs);
    const last7 = fullStatsData?.last7 ?? logs.filter(l => Date.now() - new Date(l.logged_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;
    const msSinceLast = Date.now() - new Date(logs[0].logged_at).getTime();
    const hoursSince = Math.floor(msSinceLast / (1000 * 60 * 60));
    const daysSince = Math.floor(hoursSince / 24);
    const timeSinceLabel = daysSince > 0 ? `منذ ${daysSince} يوم` : hoursSince > 0 ? `منذ ${hoursSince} ساعة` : 'الآن';
    return { totalInjections, uniquePeptides, streak, last7, timeSinceLabel };
  }, [logs, allLogsForStats, totalCount, fullStatsData?.last7, fullStatsData?.uniquePeptides]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const src = allLogsForStats.length > 0 ? allLogsForStats : logs;
    if (src.length === 0) return null;
    const now = new Date();
    const thisMonth = src.filter(l => {
      const d = new Date(l.logged_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    if (thisMonth.length === 0) return null;
    const totalInjections = thisMonth.length;
    // Most used peptide
    const peptideCounts: Record<string, number> = {};
    thisMonth.forEach(l => { peptideCounts[l.peptide_name] = (peptideCounts[l.peptide_name] || 0) + 1; });
    const mostUsed = Object.entries(peptideCounts).sort((a, b) => b[1] - a[1])[0];
    // Average dose
    const avgDose = thisMonth.reduce((sum, l) => sum + l.dose, 0) / thisMonth.length;
    // Streak
    const streak = computeStreak(src);
    return {
      totalInjections,
      mostUsedPeptide: mostUsed?.[0] ?? '',
      mostUsedCount: mostUsed?.[1] ?? 0,
      avgDose: Math.round(avgDose * 10) / 10,
      avgUnit: thisMonth[0]?.dose_unit ?? 'mcg',
      streak,
    };
  }, [logs, allLogsForStats]);

  // Peptide color map for log entries
  const peptideColorMap = useMemo(() => {
    const colors = [
      'border-s-emerald-500', 'border-s-blue-500', 'border-s-purple-500',
      'border-s-amber-500', 'border-s-rose-500', 'border-s-cyan-500',
      'border-s-orange-500', 'border-s-indigo-500',
    ];
    const src = allLogsForStats.length > 0 ? allLogsForStats : logs;
    const uniquePeptides = [...new Set(src.map(l => l.peptide_name))];
    const map: Record<string, string> = {};
    uniquePeptides.forEach((name, i) => { map[name] = colors[i % colors.length]; });
    return map;
  }, [logs, allLogsForStats]);

  const weeklyActivity = useMemo(() => {
    const src = allLogsForStats.length > 0 ? allLogsForStats : logs;
    if (src.length === 0) return null;
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const weekCounts = Array(7).fill(0) as number[];
    const now = new Date();
    src.forEach(l => {
      const diff = Math.floor((now.getTime() - new Date(l.logged_at).getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 7) weekCounts[new Date(l.logged_at).getDay()]++;
    });
    const max = Math.max(...weekCounts, 1);
    return { days, weekCounts, max, todayIdx: now.getDay() };
  }, [logs, allLogsForStats]);

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
    src.forEach(l => {
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
          count > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-semibold' : 'text-stone-500 dark:text-stone-400',
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
  }, [logs, allLogsForStats, calendarMonth, useHijri]);

  // GitHub-style contribution heatmap data
  const heatmapData = useMemo(() => {
    const src = allLogsForStats.length > 0 ? allLogsForStats : logs;
    if (src.length === 0) return null;
    const now = new Date();
    const dayCounts = new Map<string, number>();
    src.forEach(l => {
      const key = new Date(l.logged_at).toISOString().slice(0, 10);
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    });
    const maxCount = Math.max(...dayCounts.values(), 1);

    if (heatmapView === 'weekly') {
      // Last 12 weeks
      const weeks: { date: Date; count: number; key: string }[][] = [];
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 83); // ~12 weeks back
      startDate.setDate(startDate.getDate() - startDate.getDay()); // start of week
      let currentWeek: { date: Date; count: number; key: string }[] = [];
      const d = new Date(startDate);
      while (d <= now) {
        const key = d.toISOString().slice(0, 10);
        currentWeek.push({ date: new Date(d), count: dayCounts.get(key) ?? 0, key });
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
        d.setDate(d.getDate() + 1);
      }
      if (currentWeek.length > 0) weeks.push(currentWeek);
      return { weeks, maxCount, view: 'weekly' as const };
    } else {
      // Last 6 months calendar view
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

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 md:px-6 md:pt-12 animate-fade-in">
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
            <Syringe className="h-7 w-7 text-emerald-600" />
          </div>
          <button
            type="button"
            onClick={toggleCalendar}
            className="flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 transition-all hover:border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:bg-emerald-900/20 hover:text-emerald-700 dark:text-emerald-400"
            title={useHijri ? 'عرض بالتوقيت الميلادي' : 'عرض بالتوقيت الهجري'}
            aria-label={useHijri ? 'تبديل للتوقيت الميلادي' : 'تبديل للتوقيت الهجري'}
          >
            <span aria-hidden>📅</span>
            {useHijri ? 'هجري' : 'ميلادي'}
          </button>
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-3xl font-bold text-emerald-600 md:text-4xl">سجل الحقن</h1>
          <Tooltip
            content="سجّل كل حقنة هنا مع الجرعة والموقع. التطبيق يتتبّع سلسلة التزامك ويقترح تدوير مواقع الحقن تلقائيًا لتجنّب تلف الأنسجة."
            firstTimeId="tracker-main"
            position="bottom"
          />
        </div>
        <p className="mt-2 text-lg text-stone-600 dark:text-stone-400">تتبّع جرعاتك ومواقع الحقن</p>
      </div>

      {/* Prominent Streak Counter */}
      {dashboardStats && dashboardStats.streak > 0 && (
        <div className="mb-6 rounded-2xl bg-gradient-to-l from-orange-500 to-amber-500 p-5 text-center shadow-lg">
          <p className="text-4xl font-black text-white">🔥 {dashboardStats.streak} أيام متتالية</p>
          <p className="mt-1 text-sm font-medium text-white/80">استمر في الالتزام — أنت تبني عادة!</p>
        </div>
      )}

      {/* Monthly Summary */}
      {monthlySummary && (
        <div className="mb-6 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">📊 ملخص الشهر</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-600">{monthlySummary.totalInjections}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">حقنة هذا الشهر</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-stone-900 dark:text-stone-100 truncate" dir="ltr">{monthlySummary.mostUsedPeptide}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">الأكثر استخدامًا ({monthlySummary.mostUsedCount}×)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-blue-600">{monthlySummary.avgDose}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">متوسط الجرعة ({monthlySummary.avgUnit})</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-orange-500">🔥 {monthlySummary.streak}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">أيام متتالية</p>
            </div>
          </div>
        </div>
      )}

      {/* Expired subscription banner — read-only mode */}
      {!subscription.isProOrTrial && (
        <div className="mb-6 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">اشتراكك منتهي — بياناتك محفوظة</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">اشترك للإضافة والتعديل</p>
          <Link to="/pricing" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700">
            اشترك الآن
          </Link>
        </div>
      )}

      {/* Prayer Time / Timing Tips — collapsible */}
      <div className="mb-6 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 overflow-hidden">
        <button
          type="button"
          onClick={() => setTimingTipsExpanded((p) => !p)}
          className="flex w-full items-center justify-between px-4 py-3 text-start transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
          aria-expanded={timingTipsExpanded ? 'true' : 'false'}
        >
          <span className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100">
            <Info className="h-4 w-4 text-emerald-600" />
            نصائح التوقيت
          </span>
          {timingTipsExpanded ? <ChevronUp className="h-4 w-4 text-stone-500 dark:text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-500 dark:text-stone-400" />}
        </button>
        <div
          className="overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{ maxHeight: timingTipsExpanded ? '200px' : '0', opacity: timingTipsExpanded ? 1 : 0 }}
        >
          <div className="border-t border-stone-200 dark:border-stone-700 px-4 py-4 text-sm text-stone-700 dark:text-stone-300 space-y-2">
            <p>• الحقن على معدة فارغة — يُفضل قبل الفجر أو بعد العشاء</p>
            <p>• ببتيدات هرمون النمو (CJC, Ipamorelin) — أفضل توقيت قبل النوم</p>
            <p>• BPC-157 — صباحًا ومساءً، يمكن ربطه بصلاة الفجر والعشاء</p>
          </div>
        </div>
      </div>

      {/* Active Protocol Cards — One-Tap Logging */}
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
              const todayLogged = logs.some(l => l.peptide_name === (peptide?.nameEn ?? proto.peptide_id) && new Date(l.logged_at).toDateString() === new Date().toDateString());
              return (
                <div key={proto.id} className={cn('rounded-2xl border p-4 card-lift', todayLogged ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50' : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950')}>
                  <div className="flex items-center gap-3">
                    <ProgressRing current={daysSinceStart} total={totalDays} size={56} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 dark:text-stone-100 truncate">{peptide?.nameAr ?? proto.peptide_id}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400" dir="ltr">{proto.dose} {proto.dose_unit}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">الأسبوع {weekNumber} من {totalWeeks}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">بدأ {formatDate(proto.started_at, useHijri)}</p>
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
                          className="text-xs text-stone-500 dark:text-stone-400 hover:text-red-500 dark:text-red-400 transition-colors"
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
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 cursor-default'
                            : 'btn-press bg-emerald-600 text-white hover:bg-emerald-700'
                        )}
                      >
                        {todayLogged ? 'تم اليوم' : 'سجّل'}
                      </button>
                    ) : (
                      <span className="shrink-0 rounded-full bg-stone-100 dark:bg-stone-800 px-4 py-2 text-xs text-stone-500 dark:text-stone-400">قراءة فقط</span>
                    )}
                  </div>
                  {daysSinceStart >= totalDays && (
                    <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-3 text-center">
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-2">أكملت الدورة بنجاح!</p>
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
                  <div key={`restock-${a.id}`} className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
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
            <div className="rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 p-5">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-start">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">بدء بروتوكول جديد</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">اختر ببتيد وابدأ بروتوكول منظّم بجرعات وتذكيرات</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={wizardPeptideId}
                    onChange={(e) => setWizardPeptideId(e.target.value)}
                    className="flex-1 sm:w-48 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                    aria-label="اختر ببتيد للبروتوكول"
                  >
                    <option value="">اختر ببتيد...</option>
                    {allPeptides.filter(p => p.id !== 'melanotan-ii').map(p => (
                      <option key={p.id} value={p.id}>{p.nameAr}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => { if (wizardPeptideId) setShowProtocolWizard(true); else toast.error('اختر ببتيدًا أولاً'); }}
                    className="shrink-0 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 btn-press"
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
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center shadow-sm dark:shadow-stone-900/30">
              <BarChart3 className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{dashboardStats.totalInjections}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">إجمالي الحقن</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center shadow-sm dark:shadow-stone-900/30">
              <Flame className="mx-auto mb-1 h-5 w-5 text-orange-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{dashboardStats.streak}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">أيام متتالية</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center shadow-sm dark:shadow-stone-900/30">
              <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{dashboardStats.last7}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">آخر 7 أيام</p>
            </div>
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center shadow-sm dark:shadow-stone-900/30">
              <Syringe className="mx-auto mb-1 h-5 w-5 text-purple-500" />
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{dashboardStats.uniquePeptides}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">ببتيدات مختلفة</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center shadow-sm dark:shadow-stone-900/30 col-span-2 sm:col-span-1">
              <Clock className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{dashboardStats.timeSinceLabel}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">آخر حقنة</p>
            </div>
          </div>
          {/* Active days stat — uses full log set for accuracy */}
          <div className="grid grid-cols-1 gap-3 mb-6">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-center">
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100">{new Set((allLogsForStats.length > 0 ? allLogsForStats : logs).map(l => new Date(l.logged_at).toDateString())).size}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">يوم نشط</p>
            </div>
          </div>
          </>
      )}

      {/* Weekly Activity Chart */}
      {weeklyActivity && (
          <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
            <h3 className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">نشاط الأسبوع</h3>
            <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />}><ActivityChart data={weeklyActivity.days.map((day, i) => ({ day: day.slice(0, 3), count: weeklyActivity.weekCounts[i], isToday: i === weeklyActivity.todayIdx }))} /></Suspense>
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
          <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
            <h3 className="mb-3 text-sm font-bold text-stone-900 dark:text-stone-100">تاريخ جرعات {trendPeptide}</h3>
            <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />}><DoseTrendChart data={trendData} unit={trendLogs[0]?.dose_unit ?? 'mcg'} /></Suspense>
          </div>
        );
      })()}

      {/* Monthly Calendar */}
      {calendarData && (
          <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCalendarMonth(prev => { const m = prev.month - 1; return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m }; })} aria-label="الشهر السابق" className="flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 p-1.5 min-h-[44px] min-w-[44px] text-stone-500 dark:text-stone-400 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:text-stone-300">
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="text-center">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{calendarData.monthName}</h3>
                <span className="text-xs text-stone-500 dark:text-stone-400">{calendarData.injectionDays.size} يوم نشط</span>
              </div>
              <button onClick={() => { if (calendarData.isCurrentMonth) return; setCalendarMonth(prev => { const m = prev.month + 1; return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m }; }); }} disabled={calendarData.isCurrentMonth} aria-label="الشهر التالي" className={cn('flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-700 p-1.5 min-h-[44px] min-w-[44px] transition-colors', calendarData.isCurrentMonth ? 'text-stone-300 cursor-not-allowed' : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:text-stone-300')}>
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarData.dayNames.map(d => (
                <div key={d} className="text-xs font-bold text-stone-500 dark:text-stone-400 pb-1">{d}</div>
              ))}
              {calendarData.cells}
            </div>
          </div>
      )}

      {/* Injection Heatmap — GitHub-style */}
      {heatmapData && (
        <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5 shadow-sm dark:shadow-stone-900/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-900">خريطة النشاط</h3>
            <div className="flex rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-0.5">
              <button
                onClick={() => setHeatmapView('weekly')}
                className={cn('flex items-center gap-1 rounded-lg px-3 py-2 min-h-[44px] text-xs font-medium transition-all', heatmapView === 'weekly' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:text-stone-900')}
              >
                <CalendarDays className="h-3 w-3" />
                أسبوعي
              </button>
              <button
                onClick={() => setHeatmapView('monthly')}
                className={cn('flex items-center gap-1 rounded-lg px-3 py-2 min-h-[44px] text-xs font-medium transition-all', heatmapView === 'monthly' ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:text-stone-900')}
              >
                <CalendarRange className="h-3 w-3" />
                شهري
              </button>
            </div>
          </div>
          {heatmapData.view === 'weekly' && 'weeks' in heatmapData && (
            <div className="overflow-x-auto">
              <div className="flex gap-1 min-w-[400px]">
                {heatmapData.weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map((day) => {
                      const intensity = day.count === 0 ? 0 : Math.min(Math.ceil((day.count / heatmapData.maxCount) * 4), 4);
                      const isToday = day.key === new Date().toISOString().slice(0, 10);
                      return (
                        <div
                          key={day.key}
                          title={`${day.key}: ${day.count} حقنة`}
                          className={cn(
                            'h-3 w-3 rounded-sm transition-colors',
                            isToday && 'ring-1 ring-emerald-400',
                            intensity === 0 && 'bg-stone-100 dark:bg-stone-800',
                            intensity === 1 && 'bg-emerald-200',
                            intensity === 2 && 'bg-emerald-400',
                            intensity === 3 && 'bg-emerald-500',
                            intensity === 4 && 'bg-emerald-700',
                          )}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-stone-500">
                <span>أقل</span>
                <div className="h-3 w-3 rounded-sm bg-stone-100 dark:bg-stone-800" />
                <div className="h-3 w-3 rounded-sm bg-emerald-200" />
                <div className="h-3 w-3 rounded-sm bg-emerald-400" />
                <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                <div className="h-3 w-3 rounded-sm bg-emerald-700" />
                <span>أكثر</span>
              </div>
            </div>
          )}
          {heatmapData.view === 'monthly' && 'months' in heatmapData && (
            <div className="space-y-4">
              {heatmapData.months.map((month) => (
                <div key={`${month.year}-${month.month}`}>
                  <p className="text-xs font-medium text-stone-500 mb-1.5">
                    {new Date(month.year, month.month).toLocaleDateString('ar-u-nu-latn', { month: 'long', year: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {month.days.map((day) => {
                      const intensity = day.count === 0 ? 0 : Math.min(Math.ceil((day.count / heatmapData.maxCount) * 4), 4);
                      return (
                        <div
                          key={day.day}
                          title={`${day.day}: ${day.count} حقنة`}
                          className={cn(
                            'h-3.5 w-3.5 rounded-sm transition-colors',
                            intensity === 0 && 'bg-stone-100 dark:bg-stone-800',
                            intensity === 1 && 'bg-emerald-200',
                            intensity === 2 && 'bg-emerald-400',
                            intensity === 3 && 'bg-emerald-500',
                            intensity === 4 && 'bg-emerald-700',
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end gap-1.5 text-[10px] text-stone-500">
                <span>أقل</span>
                <div className="h-3 w-3 rounded-sm bg-stone-100 dark:bg-stone-800" />
                <div className="h-3 w-3 rounded-sm bg-emerald-200" />
                <div className="h-3 w-3 rounded-sm bg-emerald-400" />
                <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                <div className="h-3 w-3 rounded-sm bg-emerald-700" />
                <span>أكثر</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Site Rotation Indicator */}
      {siteRotationData && (
          <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">تدوير مواقع الحقن</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-4">
              {siteRotationData.allSites.map(s => {
                const count = siteRotationData.siteCounts[s] || 0;
                const isLast = s === siteRotationData.lastSite;
                const isSuggested = s === siteRotationData.suggestedSite;
                return (
                  <div key={s} className={cn(
                    'rounded-xl border p-3 text-center transition-all',
                    isSuggested ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-100' :
                    isLast ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20' :
                    'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900'
                  )}>
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">{siteRotationData.siteLabels[s]}</p>
                    <p className="text-lg font-black text-stone-900 dark:text-stone-100">{count}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {isSuggested ? 'الموقع التالي' : isLast ? 'آخر حقنة' : `آخر 5`}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 text-center">
              الحقنة القادمة في <span className="font-bold text-emerald-700 dark:text-emerald-400">{siteRotationData.siteLabels[siteRotationData.suggestedSite]}</span> لتجنّب تلف الأنسجة
            </p>
          </div>
      )}

      {/* Action Buttons — hide when empty or when subscription is expired */}
      {!showForm && logs.length > 0 && subscription.isProOrTrial && (
        <div className="mb-8 space-y-3">
          {/* Quick Log — one-tap to repeat last injection */}
          {logs.length > 0 && (
            <button
              onClick={async () => {
                if (!user || isSubmitting) return;
                const last = logs[0];
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
              }}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 min-h-[56px] shadow-md"
            >
              <Repeat className="h-5 w-5" />
              <span>سجّل سريع — {logs[0]?.peptide_name} {logs[0]?.dose} {logs[0]?.dose_unit}</span>
            </button>
          )}
          <div className="flex gap-3">
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
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-4 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:border-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 min-h-[44px]"
            >
              <Plus className="h-5 w-5" />
              حقنة جديدة
            </button>
          </div>
        </div>
      )}

      {/* Log Form */}
      {showForm && subscription.isProOrTrial && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-6">
          <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">تسجيل حقنة جديدة</h2>
          <div className="space-y-4">
            {/* Peptide Name */}
            <div>
              <label htmlFor="tracker-peptide" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">اسم الببتيد</label>
              <select
                id="tracker-peptide"
                value={peptideName}
                onChange={(e) => setPeptideName(e.target.value)}
                required
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
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
                <label htmlFor="tracker-dose" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">الجرعة</label>
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
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                />
              </div>
              <div className="w-28">
                <label htmlFor="tracker-unit" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">الوحدة</label>
                <select
                  id="tracker-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  aria-label="وحدة الجرعة"
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
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
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">الجرعة أعلى من الحد الأقصى الموصى به ({preset.maxDose} mcg)</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={doseOutOfRangeConfirmed}
                        onChange={(e) => setDoseOutOfRangeConfirmed(e.target.checked)}
                        className="rounded border-stone-300 dark:border-stone-700 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-stone-700 dark:text-stone-300">أؤكد أن هذه الجرعة صحيحة</span>
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
                        className="rounded border-stone-300 dark:border-stone-700 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-stone-700 dark:text-stone-300">أؤكد أن هذه الجرعة صحيحة</span>
                    </label>
                  </div>
                );
              }
              return null;
            })()}

            {/* Injection Site — Body Map */}
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">موقع الحقن</label>
              <BodyMap selected={site} suggested={suggestedSite} onSelect={(s) => setSite(s)} />
            </div>

            {/* Date/Time */}
            <div>
              <label htmlFor="tracker-datetime" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">التاريخ والوقت</label>
              <input
                id="tracker-datetime"
                type="datetime-local"
                value={injectedAt}
                onChange={(e) => setInjectedAt(e.target.value)}
                required
                aria-label="التاريخ والوقت"
                dir="ltr"
                className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
              />
            </div>

            {/* Notes */}
            {/* Side Effect Quick-Log */}
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">أعراض جانبية <span className="text-xs text-emerald-600 font-normal me-1">اختياري</span></label>
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
                        : 'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:border-stone-700'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">صورة الحقنة <span className="text-xs text-emerald-600 font-normal me-1">اختياري</span></label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              {photoPreview ? (
                <div className="relative inline-block">
                  <img src={photoPreview} alt="معاينة" width={80} height={80} className="h-20 w-20 rounded-xl object-cover border border-stone-200" />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = ''; }}
                    className="absolute -top-2 -start-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-sm text-stone-500 transition-all hover:border-emerald-300 hover:text-emerald-600"
                >
                  <Camera className="h-4 w-4" />
                  التقط أو اختر صورة
                </button>
              )}
            </div>

            <div>
              <label htmlFor="tracker-notes" className="mb-1 block text-sm font-bold text-stone-700 dark:text-stone-300">ملاحظات <span className="text-xs text-emerald-600 font-normal me-1">اختياري</span></label>
              <textarea
                id="tracker-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={3}
                maxLength={200}
                className="w-full resize-none rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
              />
              <p className={cn('mt-1 text-start text-xs', notes.length >= 180 ? 'text-amber-600' : 'text-stone-500 dark:text-stone-400')}>{notes.length}/200</p>
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
                className="rounded-xl border border-stone-200 dark:border-stone-700 px-6 py-3 text-sm font-bold text-stone-700 dark:text-stone-300 transition-all hover:bg-stone-50 dark:hover:bg-stone-800"
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
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">السجل</h2>
          {logs.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-1.5 min-h-[44px] text-xs font-bold text-stone-600 dark:text-stone-400 transition-all hover:border-emerald-300 hover:text-emerald-700"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 min-h-[44px] text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-100"
              >
                <FileDown className="h-3.5 w-3.5" />
                PDF
              </button>
            </div>
          )}
        </div>
        {isLoadingLogs ? (
          <div className="space-y-3 py-4" role="status" aria-label="جارٍ تحميل السجلات">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-stone-200 dark:border-stone-700 p-5 space-y-2">
                <div className="flex justify-between"><div className="h-5 w-28 rounded bg-stone-200 dark:bg-stone-700" /><div className="h-6 w-20 rounded-full bg-stone-100 dark:bg-stone-800" /></div>
                <div className="h-4 w-40 rounded bg-stone-100 dark:bg-stone-800" />
                <div className="h-4 w-32 rounded bg-stone-100 dark:bg-stone-800" />
              </div>
            ))}
          </div>
        ) : fetchError && logs.length === 0 ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 py-10 text-center">
            <p className="text-base text-red-700 dark:text-red-400 mb-4">تعذّر تحميل السجلات. تحقق من اتصالك بالإنترنت.</p>
            <button
              onClick={() => fetchLogs()}
              className="rounded-xl bg-red-100 px-6 py-2 text-sm font-bold text-red-700 dark:text-red-400 hover:bg-red-200 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 p-10 text-center">
            {/* Illustration: syringe + calendar + chart */}
            <div className="mx-auto mb-6 flex items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 -rotate-6">
                <Calendar className="h-7 w-7 text-emerald-500" />
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-200 dark:bg-emerald-800/40 shadow-lg">
                <Syringe className="h-10 w-10 text-emerald-600" />
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 rotate-6">
                <TrendingUp className="h-7 w-7 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-stone-900 dark:text-stone-100">سجّل أول حقنة لك 💉</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              {subscription.isProOrTrial
                ? 'ابدأ بتسجيل حقنتك الأولى — سنتتبّع جرعاتك، ندير تدوير مواقع الحقن، ونعرض لك خريطة حرارية وإحصائيات التزامك بالبروتوكول.'
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
              const colorClass = peptideColorMap[log.peptide_name] ?? 'border-s-emerald-500';
              const isEditing = editingLog === log.id;
              return (
              <div
                key={log.id}
                className={cn('rounded-2xl border border-s-4 p-5 shadow-sm dark:shadow-stone-900/30 transition-all hover:shadow-md', colorClass, isToday ? 'border-t-emerald-300 border-e-emerald-300 border-b-emerald-300 dark:border-t-emerald-700 dark:border-e-emerald-700 dark:border-b-emerald-700 bg-emerald-50/30' : 'border-t-stone-200 border-e-stone-200 border-b-stone-200 dark:border-t-stone-700 dark:border-e-stone-700 dark:border-b-stone-700 bg-white dark:bg-stone-950')}
              >
                {isEditing ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100" dir="ltr">{log.peptide_name}</p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">الجرعة</label>
                        <input type="number" inputMode="decimal" value={editDose} onChange={e => setEditDose(e.target.value)} dir="ltr" min="0" step="any" className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900" />
                      </div>
                      <div className="w-20">
                        <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">الوحدة</label>
                        <select value={editUnit} onChange={e => setEditUnit(e.target.value)} className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-2 py-2 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none">
                          <option value="mcg">mcg</option>
                          <option value="mg">mg</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">الموقع</label>
                      <select value={editSite} onChange={e => setEditSite(e.target.value)} className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none">
                        {INJECTION_SITES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">التاريخ والوقت</label>
                      <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} dir="ltr" className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:border-emerald-300 focus:outline-none" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(log.id)} disabled={editSaving} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 min-h-[44px] text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
                        <Check className="h-4 w-4" />
                        {editSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                      </button>
                      <button onClick={() => setEditingLog(null)} className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-700 px-4 py-2.5 min-h-[44px] text-sm font-bold text-stone-600 dark:text-stone-400 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800">
                        <X className="h-4 w-4" />
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                  <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-stone-900 dark:text-stone-100" dir="ltr">{log.peptide_name}</h3>
                  <div className="flex items-center gap-1">
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {log.dose} {log.dose_unit}
                    </span>
                    {subscription.isProOrTrial && (
                      <button
                        onClick={() => startEditing(log)}
                        className="flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] text-stone-300 dark:text-stone-500 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 dark:hover:text-blue-400"
                        aria-label="تعديل"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {subscription.isProOrTrial && <button
                      onClick={() => {
                        setConfirmDialog({
                          title: 'حذف السجل',
                          message: `حذف سجل ${log.peptide_name} — ${log.dose} ${log.dose_unit}؟`,
                          isDestructive: true,
                          onConfirm: async () => {
                            setConfirmBusy(true);
                            const deletedLog = logs.find(l => l.id === log.id);
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
                      className="flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px] text-stone-300 dark:text-stone-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-stone-500 dark:text-stone-400">
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
                    <img src={log.photo_url} alt="صورة الحقنة" width={80} height={80} className="h-20 w-20 rounded-xl object-cover border border-stone-200 dark:border-stone-700" loading="lazy" />
                  </div>
                )}
                {log.notes && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-stone-50 dark:bg-stone-900 px-3 py-2">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500 dark:text-stone-400" />
                    <p className="text-xs text-stone-600 dark:text-stone-400">{log.notes}</p>
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
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 py-4 text-sm font-bold text-stone-600 dark:text-stone-400 transition-all hover:border-emerald-300 dark:border-emerald-700 hover:text-emerald-700 dark:text-emerald-400 disabled:opacity-50"
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
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-950 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">{confirmDialog.message}</p>
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
                className="flex-1 rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-2.5 text-sm font-bold text-stone-700 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
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
