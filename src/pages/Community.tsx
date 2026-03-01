import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, Clock, FlaskConical, User, Flag, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING, SITE_URL } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { peptides as allPeptides } from '@/data/peptides';

interface LogEntry {
  id: string;
  user_id: string;
  peptide_name: string;
  goal: string;
  protocol: string;
  duration_weeks: number;
  results: string;
  rating: number;
  created_at: string;
}

const GOALS = [
  'فقدان دهون',
  'تعافي وإصابات',
  'بناء عضل',
  'تحسين النوم',
  'تركيز ودماغ',
  'هرمونات',
  'طول عمر',
  'بشرة وأمعاء',
];

export default function Community() {
  const { user, subscription } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const [submitted, setSubmitted] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const validGoals = ['all', ...GOALS];
  const validSorts = ['newest', 'highest'] as const;
  const [filterGoal, setFilterGoal] = useState(() => {
    const g = searchParams.get('goal') ?? 'all';
    return validGoals.includes(g) ? g : 'all';
  });
  const [sortBy, setSortBy] = useState<'newest' | 'highest'>(() => {
    const s = searchParams.get('sort') as 'newest' | 'highest';
    return validSorts.includes(s) ? s : 'newest';
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterGoal !== 'all') params.set('goal', filterGoal);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    setSearchParams(params, { replace: true });
  }, [filterGoal, sortBy, setSearchParams]);

  useEffect(() => {
    const g = searchParams.get('goal') ?? 'all';
    const validG = validGoals.includes(g) ? g : 'all';
    const s = searchParams.get('sort') as 'newest' | 'highest';
    const validS = validSorts.includes(s) ? s : 'newest';
    if (validG !== filterGoal) setFilterGoal(validG);
    if (validS !== sortBy) setSortBy(validS);
  }, [searchParams]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpandedPosts(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const PAGE_SIZE = 50;

  const [peptideName, setPeptideName] = useState('');
  const [goal, setGoal] = useState('');
  const [protocol, setProtocol] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [results, setResults] = useState('');
  const [rating, setRating] = useState(4);
  const [attempted, setAttempted] = useState(false);

  const loadCommunityLogs = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const { data, error } = await supabase
        .from('community_logs')
        .select('id, peptide_name, goal, protocol, duration_weeks, results, rating, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        setLogs(data);
        setHasMore(data.length >= PAGE_SIZE);
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadCommunityLogs();
    const fallback = setTimeout(() => { if (mounted) setLoading(false); }, 8000);
    return () => { mounted = false; clearTimeout(fallback); };
  }, [loadCommunityLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!user || !peptideName.trim() || !results.trim() || submittingRef.current) {
      requestAnimationFrame(() => {
        const firstError = document.querySelector('[data-error="true"]');
        firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    submittingRef.current = true;

    setSubmitting(true);
    try {
      const dur = Math.max(1, Math.min(52, durationWeeks));
      const { error } = await supabase.from('community_logs').insert({
        user_id: user.id,
        peptide_name: peptideName.trim(),
        goal,
        protocol: protocol.trim(),
        duration_weeks: dur,
        results: results.trim(),
        rating,
      });

      if (!mountedRef.current) return;

      if (error) {
        toast.error('حدث خطأ أثناء النشر. حاول مرة أخرى.');
        return;
      }

      setSubmitted(true);
      setPeptideName('');
      setGoal('');
      setProtocol('');
      setResults('');
      setRating(4);
      setAttempted(false);
      setShowForm(false);

      const { data } = await supabase
        .from('community_logs')
        .select('id, peptide_name, goal, protocol, duration_weeks, results, rating, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (mountedRef.current && data) setLogs(data);
      setTimeout(() => { if (mountedRef.current) setSubmitted(false); }, 5000);
    } catch {
      if (mountedRef.current) toast.error('حدث خطأ أثناء النشر. تحقق من اتصالك بالإنترنت.');
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const isPaid = subscription?.isProOrTrial ?? false;

  const filteredLogs = useMemo(() =>
    logs
      .filter(log => filterGoal === 'all' || log.goal === filterGoal)
      .sort((a, b) => sortBy === 'highest' ? b.rating - a.rating : 0),
    [logs, filterGoal, sortBy]
  );

  return (
    <div className="min-h-screen bg-white animate-fade-in">
      <Helmet>
        <title>تجارب المستخدمين | pptides</title>
        <meta name="description" content="اقرأ تجارب حقيقية من مستخدمي الببتيدات. بروتوكولات مُجرَّبة، نتائج فعلية، وتقييمات صادقة." />
        <meta property="og:title" content="تجارب المستخدمين | pptides" />
        <meta property="og:description" content="بروتوكولات حقيقية ونتائج فعلية من مستخدمين مثلك" />
        <meta property="og:url" content={`${SITE_URL}/community`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content="https://pptides.com/og-image.png" />
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <MessageSquare className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-stone-900 md:text-4xl">
            تجارب <span className="text-emerald-600">المستخدمين</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-stone-600">
            بروتوكولات حقيقية. نتائج فعلية. من مستخدمين مثلك.
          </p>
        </div>

        {submitted && (
          <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center text-sm font-bold text-emerald-800">
            تم نشر تجربتك بنجاح — شكرًا لمشاركتك!
          </div>
        )}

        {user && isPaid && (
          <div className="mb-8">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-6 text-center transition-all hover:border-emerald-400 hover:bg-emerald-100"
              >
                <Send className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
                <p className="font-bold text-stone-900">شارك تجربتك مع الببتيدات</p>
                <p className="mt-1 text-sm text-stone-800">ساعد غيرك — شارك البروتوكول والنتائج</p>
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
                <h3 className="mb-6 text-lg font-bold text-stone-900">شارك تجربتك</h3>

                <div className="mb-4">
                  <label htmlFor="community-peptide" className="mb-1.5 block text-sm font-bold text-stone-900">اسم الببتيد <span className="text-red-500" aria-hidden="true">*</span></label>
                  <select
                    id="community-peptide"
                    value={peptideName}
                    onChange={(e) => setPeptideName(e.target.value)}
                    required
                    className={cn(
                      'w-full rounded-xl border bg-stone-50 px-4 py-3 text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100',
                      attempted && !peptideName.trim() ? 'border-red-400 ring-1 ring-red-200' : 'border-stone-200'
                    )}
                  >
                    <option value="">اختر الببتيد...</option>
                    {allPeptides.map(p => (
                      <option key={p.id} value={p.nameEn}>{p.nameAr} ({p.nameEn})</option>
                    ))}
                  </select>
                  {attempted && !peptideName.trim() && (
                    <p data-error="true" className="mt-1 text-xs text-red-600">يرجى إدخال اسم الببتيد</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-bold text-stone-900">الهدف</label>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGoal(g)}
                        className={cn(
                          'rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                          goal === g
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                            : 'border-stone-200 bg-white text-stone-800 transition-colors hover:border-emerald-200'
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="community-protocol" className="mb-1.5 block text-sm font-bold text-stone-900">البروتوكول (الجرعة، التوقيت، المدة)</label>
                  <textarea
                    id="community-protocol"
                    value={protocol}
                    onChange={(e) => {
                      setProtocol(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    maxLength={3000}
                    placeholder="مثال: 250mcg مرتين يوميًا، حقن تحت الجلد في البطن، لمدة 6 أسابيع..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    style={{ overflow: 'hidden' }}
                  />
                  <p className="mt-1 text-start text-xs text-stone-400">{protocol.length}/3000</p>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="community-duration" className="mb-1.5 block text-sm font-bold text-stone-900">المدة (أسابيع)</label>
                    <input
                      id="community-duration"
                      type="number"
                      min={1}
                      max={52}
                      value={durationWeeks}
                      onChange={(e) => setDurationWeeks(Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-stone-900">التقييم (1-5)</label>
                    <div className="flex gap-1 pt-2">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRating(r)}
                          className={cn(
                            'h-11 w-11 rounded-lg text-sm font-bold transition-all',
                            rating >= r
                              ? 'bg-emerald-600 text-white'
                              : 'border border-stone-200 bg-white text-stone-800'
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="community-results" className="mb-1.5 block text-sm font-bold text-stone-900">النتائج — ماذا لاحظت؟ <span className="text-red-500" aria-hidden="true">*</span></label>
                  <textarea
                    id="community-results"
                    value={results}
                    onChange={(e) => {
                      setResults(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    maxLength={3000}
                    placeholder="وصف النتائج: تحسّن، أعراض جانبية، تغييرات في التحاليل..."
                    rows={4}
                    required
                    className={cn(
                      'w-full resize-none rounded-xl border bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100',
                      attempted && !results.trim() ? 'border-red-400 ring-1 ring-red-200' : 'border-stone-200'
                    )}
                    style={{ overflow: 'hidden' }}
                  />
                  <div className="mt-1 flex justify-between">
                    {attempted && !results.trim() ? (
                      <p data-error="true" className="text-xs text-red-600">يرجى وصف النتائج</p>
                    ) : <span />}
                    <p className="text-xs text-stone-400">{results.length}/3000</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting || !peptideName.trim() || !results.trim()}
                    aria-disabled={submitting || !peptideName.trim() || !results.trim() || undefined}
                    className="flex-1 rounded-full bg-emerald-600 py-3 font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        جارٍ النشر...
                      </span>
                    ) : 'نشر التجربة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-full border border-stone-200 px-6 py-3 font-bold text-stone-800 transition-colors hover:bg-stone-50"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {!user && (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center">
            <p className="font-bold text-stone-900">سجّل الدخول لمشاركة تجربتك</p>
            <Link to="/login" className="mt-3 inline-block rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
              تسجيل الدخول
            </Link>
          </div>
        )}

        {user && !isPaid && (
          <div className="mb-8 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="font-bold text-stone-900">اشترك لمشاركة تجربتك مع المجتمع</p>
            <p className="mt-1 text-sm text-stone-800">المشتركون فقط يمكنهم نشر تجاربهم</p>
            <Link to="/pricing" className="mt-3 inline-block rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
              اشترك — {PRICING.essentials.label}/شهريًا
            </Link>
          </div>
        )}

        {/* Filter bar */}
        {!loading && logs.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <div className="-mx-4 min-w-0 flex-1 overflow-x-auto px-4 scrollbar-hide scroll-fade">
              <div className="flex flex-nowrap gap-2 pb-2">
                {['all', ...GOALS].map(g => {
                  const label = g === 'all' ? 'الكل' : g;
                  return (
                    <button
                      key={g}
                      onClick={() => setFilterGoal(g)}
                      className={cn(
                        'shrink-0 rounded-full border px-4 py-2 min-h-[44px] text-sm font-medium transition-all',
                        filterGoal === g
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                          : 'border-stone-200 bg-white text-stone-600 transition-colors hover:border-emerald-200'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'highest')}
              aria-label="ترتيب التجارب"
              className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 focus:border-emerald-300 focus:outline-none"
            >
              <option value="newest">الأحدث</option>
              <option value="highest">الأعلى تقييمًا</option>
            </select>
          </div>
        )}

        <h2 className="sr-only">المشاركات</h2>
        {loading ? (
          <div className="py-16 text-center" role="status" aria-label="جارٍ تحميل التجارب">
            <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-stone-200 border-t-emerald-600" />
          </div>
        ) : fetchError && logs.length === 0 ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 py-10 text-center">
            <p className="text-base text-red-700 mb-4">تعذّر تحميل التجارب. تحقق من اتصالك بالإنترنت.</p>
            <button
              onClick={() => loadCommunityLogs()}
              className="rounded-xl bg-red-100 px-6 py-2 text-sm font-bold text-red-700 hover:bg-red-200 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-gradient-to-b from-emerald-50 to-white py-16 px-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <FlaskConical className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">شارك تجربتك مع المجتمع</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
              لا توجد تجارب مشاركة بعد — كن أول من يشارك بروتوكوله ونتائجه مع مجتمع pptides العربي.
            </p>
            {user && isPaid && (
              <button onClick={() => setShowForm(true)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
                شارك تجربتك الأولى
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.length === 0 && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 py-12 px-6 text-center">
                <p className="text-sm font-bold text-stone-800">لا توجد تجارب لهذا الهدف بعد</p>
                <p className="mt-1 text-xs text-stone-500">جرّب تصنيف مختلف أو شارك تجربتك</p>
                <button onClick={() => setFilterGoal('all')} className="mt-3 text-sm text-emerald-600 font-bold hover:underline">عرض الكل</button>
              </div>
            )}
            {filteredLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <User className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div>
                      {(() => {
                        const peptide = allPeptides.find(p => p.nameEn.toLowerCase() === log.peptide_name.toLowerCase() || p.nameAr === log.peptide_name);
                        return peptide ? (
                          <Link to={`/peptide/${peptide.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-200 transition-colors" dir="ltr">
                            <FlaskConical className="h-3 w-3" />
                            {log.peptide_name}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800 shadow-sm" dir="ltr">
                            <FlaskConical className="h-3 w-3" />
                            {log.peptide_name}
                          </span>
                        );
                      })()}
                      {log.goal && (
                        <span className="me-2 text-sm text-stone-700">— {log.goal}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5" role="img" aria-label={`التقييم ${log.rating} من 5`} dir="ltr">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            'h-3.5 w-3.5',
                            s <= log.rating ? 'fill-emerald-500 text-emerald-500' : 'fill-transparent text-stone-300'
                          )}
                        />
                      ))}
                    </div>
                    <button
                      onClick={async () => {
                        if (!user) { toast('سجّل الدخول للإبلاغ عن محتوى'); return; }
                        const { error } = await supabase.from('reports').insert({
                          user_id: user.id,
                          target_type: 'community_log',
                          target_id: log.id,
                        });
                        if (error && error.code === '23505') {
                          toast('سبق لك الإبلاغ عن هذا المحتوى');
                        } else if (error) {
                          toast.error('تعذّر الإبلاغ. حاول مرة أخرى.');
                        } else {
                          toast.success('تم الإبلاغ — سنراجع المحتوى');
                        }
                      }}
                      className="rounded-lg p-2.5 min-h-[44px] min-w-[44px] text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label="إبلاغ"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {log.protocol && (
                  <div className="mb-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-800">
                    <span className="font-bold text-stone-900">البروتوكول: </span>
                    {(() => {
                      const isLong = (log.protocol?.length ?? 0) > 200;
                      const isExpanded = expandedPosts.has(log.id);
                      if (!isLong) return log.protocol;
                      return (
                        <span>
                          {isExpanded ? log.protocol : `${log.protocol!.slice(0, 200)}...`}
                          <button
                            type="button"
                            onClick={() => toggleExpand(log.id)}
                            className="me-2 font-bold text-emerald-600 hover:underline"
                          >
                            {isExpanded ? 'اقرأ أقل' : 'اقرأ المزيد'}
                          </button>
                        </span>
                      );
                    })()}
                  </div>
                )}

                <div className="text-base leading-relaxed text-stone-900">
                  {(() => {
                    const isLong = (log.results?.length ?? 0) > 200;
                    const isExpanded = expandedPosts.has(log.id);
                    if (!isLong) return <p>{log.results}</p>;
                    const display = isExpanded ? log.results : `${log.results!.slice(0, 200)}...`;
                    return (
                      <p className={!isExpanded ? 'line-clamp-4' : ''}>
                        {display}
                        <button
                          type="button"
                          onClick={() => toggleExpand(log.id)}
                          className="me-2 font-bold text-emerald-600 hover:underline"
                        >
                          {isExpanded ? 'اقرأ أقل' : 'اقرأ المزيد'}
                        </button>
                      </p>
                    );
                  })()}
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-stone-700">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {log.duration_weeks} أسابيع
                  </span>
                  <span>
                    {new Date(log.created_at).toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <Link
                  to={`/peptide/${allPeptides.find(p => p.nameEn === log.peptide_name)?.id ?? (log.peptide_name ?? '').toLowerCase().replace(/[/\s]+/g, '-')}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  ابدأ هذا البروتوكول ←
                </Link>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={async () => {
                  setLoadingMore(true);
                  try {
                    const { data } = await supabase
                      .from('community_logs')
                      .select('id, peptide_name, goal, protocol, duration_weeks, results, rating, created_at')
                      .order('created_at', { ascending: false })
                      .range(logs.length, logs.length + PAGE_SIZE - 1);
                    if (data) {
                      setLogs(prev => [...prev, ...data]);
                      setHasMore(data.length >= PAGE_SIZE);
                    }
                  } catch {
                    toast.error('تعذّر تحميل المزيد. حاول مرة أخرى.');
                  } finally {
                    setLoadingMore(false);
                  }
                }}
                disabled={loadingMore}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 text-sm font-bold text-stone-600 transition-all hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
              >
                {loadingMore ? 'جارٍ التحميل...' : 'تحميل المزيد'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
