import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, Clock, FlaskConical, User, Flag, Star, MessageCircle, ChevronDown, ChevronUp, Trash2, BadgeCheck, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING, SITE_URL, SUPPORT_EMAIL } from '@/lib/constants';
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
  is_subscriber?: boolean;
  upvotes?: number;
  created_at: string;
}

interface Reply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_subscriber: boolean;
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

const SEED_EXPERIENCES: LogEntry[] = [
  {
    id: 'seed-bpc157',
    user_id: '',
    peptide_name: 'BPC-157',
    goal: 'تعافي وإصابات',
    protocol: '250mcg مرتين يوميًا لمدة 6 أسابيع',
    duration_weeks: 6,
    results: 'تحسّن ملحوظ في الأسبوع الثالث. الألم انخفض من 7/10 إلى 2/10',
    rating: 5,
    created_at: '2024-06-15T10:00:00Z',
  },
  {
    id: 'seed-semaglutide',
    user_id: '',
    peptide_name: 'Semaglutide',
    goal: 'فقدان دهون',
    protocol: 'بدأت بـ 0.25mg أسبوعيًا، رفعت تدريجيًا إلى 1mg',
    duration_weeks: 12,
    results: 'خسرت 8 كغ في 3 أشهر. الشهية انخفضت بشكل كبير',
    rating: 4,
    created_at: '2024-05-20T10:00:00Z',
  },
  {
    id: 'seed-epithalon',
    user_id: '',
    peptide_name: 'Epithalon',
    goal: 'طول عمر',
    protocol: '10mg على 10 أيام، مرتين في السنة',
    duration_weeks: 2,
    results: 'نوم أعمق وطاقة أفضل بعد الدورة الأولى',
    rating: 4,
    created_at: '2024-04-10T10:00:00Z',
  },
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
  const [upvotedPosts, setUpvotedPosts] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('pptides_upvoted_posts');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
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
    const p = searchParams.get('peptide') ?? '';
    if (validG !== filterGoal) setFilterGoal(validG);
    if (validS !== sortBy) setSortBy(validS);
    if (p !== peptideName) setPeptideName(p);
    if (p.trim() && user && subscription?.isProOrTrial) setShowForm(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL→state sync, filterGoal/sortBy are targets
  }, [searchParams]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpandedPosts(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [repliesByPost, setRepliesByPost] = useState<Record<string, Reply[]>>({});
  const [replyCountByPost, setReplyCountByPost] = useState<Record<string, number>>({});
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 50;

  const DRAFT_KEY = 'pptides_community_draft';
  const [peptideName, setPeptideName] = useState(() => {
    try { return searchParams.get('peptide') ?? ''; } catch { return ''; }
  });
  const [goal, setGoal] = useState('');
  const [protocol, setProtocol] = useState(() => {
    try { return sessionStorage.getItem(`${DRAFT_KEY}_protocol`) ?? ''; } catch { return ''; }
  });
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [results, setResults] = useState(() => {
    try { return sessionStorage.getItem(`${DRAFT_KEY}_results`) ?? ''; } catch { return ''; }
  });
  const [rating, setRating] = useState(4);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    try { sessionStorage.setItem(`${DRAFT_KEY}_protocol`, protocol); } catch { /* expected */ }
  }, [protocol]);
  useEffect(() => {
    try { sessionStorage.setItem(`${DRAFT_KEY}_results`, results); } catch { /* expected */ }
  }, [results]);

  const loadReplyCounts = useCallback(async (postIds: string[]) => {
    if (postIds.length === 0) return;
    const { data } = await supabase
      .from('community_replies')
      .select('post_id')
      .in('post_id', postIds);
    if (data) {
      const counts: Record<string, number> = {};
      for (const r of data) counts[r.post_id] = (counts[r.post_id] ?? 0) + 1;
      setReplyCountByPost(prev => ({ ...prev, ...counts }));
    }
  }, []);

  const loadCommunityLogs = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const { data, error } = await supabase
        .from('community_logs')
        .select('id, user_id, peptide_name, goal, protocol, duration_weeks, results, rating, is_subscriber, upvotes, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        setLogs(data);
        setHasMore(data.length >= PAGE_SIZE);
        loadReplyCounts(data.map(d => d.id));
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    }
    setLoading(false);
  }, [loadReplyCounts]);

  const loadReplies = useCallback(async (postId: string) => {
    setLoadingReplies(prev => new Set(prev).add(postId));
    const { data } = await supabase
      .from('community_replies')
      .select('id, post_id, user_id, content, is_subscriber, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (data) setRepliesByPost(prev => ({ ...prev, [postId]: data }));
    setLoadingReplies(prev => { const n = new Set(prev); n.delete(postId); return n; });
  }, []);

  const toggleReplies = useCallback(async (postId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(postId)) { next.delete(postId); return next; }
      next.add(postId);
      return next;
    });
    if (!repliesByPost[postId]) await loadReplies(postId);
  }, [repliesByPost, loadReplies]);

  const submitReply = useCallback(async (postId: string) => {
    const content = (replyText[postId] ?? '').trim();
    if (!user || !content) return;
    setSubmittingReply(prev => new Set(prev).add(postId));
    const isSub = subscription?.isProOrTrial ?? false;
    const optimistic: Reply = {
      id: crypto.randomUUID(),
      post_id: postId,
      user_id: user.id,
      content,
      is_subscriber: isSub,
      created_at: new Date().toISOString(),
    };
    setRepliesByPost(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), optimistic] }));
    setReplyCountByPost(prev => ({ ...prev, [postId]: (prev[postId] ?? 0) + 1 }));
    setReplyText(prev => ({ ...prev, [postId]: '' }));

    const { error } = await supabase.from('community_replies').insert({
      user_id: user.id,
      post_id: postId,
      content,
      is_subscriber: isSub,
    });
    if (error) {
      toast.error('تعذّر إرسال الرد');
      setRepliesByPost(prev => ({ ...prev, [postId]: (prev[postId] ?? []).filter(r => r.id !== optimistic.id) }));
      setReplyCountByPost(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] ?? 1) - 1) }));
      setReplyText(prev => ({ ...prev, [postId]: content }));
    }
    setSubmittingReply(prev => { const n = new Set(prev); n.delete(postId); return n; });
  }, [replyText, user, subscription]);

  const deleteReply = useCallback(async (reply: Reply) => {
    setRepliesByPost(prev => ({ ...prev, [reply.post_id]: (prev[reply.post_id] ?? []).filter(r => r.id !== reply.id) }));
    setReplyCountByPost(prev => ({ ...prev, [reply.post_id]: Math.max(0, (prev[reply.post_id] ?? 1) - 1) }));
    const { error } = await supabase.from('community_replies').delete().eq('id', reply.id);
    if (error) {
      toast.error('تعذّر حذف الرد');
      await loadReplies(reply.post_id);
    }
  }, [loadReplies]);

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
        is_subscriber: isPaid,
      });

      if (!mountedRef.current) return;

      if (error) {
        toast.error('تعذّر نشر تجربتك — تحقق من البيانات وحاول مرة أخرى');
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
      try { sessionStorage.removeItem(`${DRAFT_KEY}_protocol`); sessionStorage.removeItem(`${DRAFT_KEY}_results`); } catch { /* expected */ }

      const { data } = await supabase
        .from('community_logs')
        .select('id, user_id, peptide_name, goal, protocol, duration_weeks, results, rating, is_subscriber, upvotes, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (mountedRef.current && data) {
        setLogs(data);
        loadReplyCounts(data.map(d => d.id));
      }
      setTimeout(() => { if (mountedRef.current) setSubmitted(false); }, 5000);
    } catch {
      if (mountedRef.current) toast.error('فشل الاتصال بالخادم — تحقق من اتصالك بالإنترنت وحاول مرة أخرى');
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const isPaid = subscription?.isProOrTrial ?? false;

  const filteredLogs = useMemo(() =>
    logs
      .filter(log => filterGoal === 'all' || log.goal === filterGoal)
      .sort((a, b) =>
        sortBy === 'highest'
          ? b.rating - a.rating
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [logs, filterGoal, sortBy]
  );

  const displayedLogs = useMemo(() => {
    if (logs.length > 0) return filteredLogs;
    return SEED_EXPERIENCES
      .filter(s => filterGoal === 'all' || s.goal === filterGoal)
      .sort((a, b) =>
        sortBy === 'highest' ? b.rating - a.rating : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [logs.length, filteredLogs, filterGoal, sortBy]);

  const isShowingSeeds = logs.length === 0;

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 animate-fade-in">
      <Helmet>
        <title>تجارب المستخدمين | pptides</title>
        <meta name="description" content="اقرأ تجارب حقيقية من مستخدمي الببتيدات. بروتوكولات مُجرَّبة، نتائج فعلية، وتقييمات صادقة." />
        <meta property="og:title" content="تجارب المستخدمين | pptides" />
        <meta property="og:description" content="بروتوكولات حقيقية ونتائج فعلية من مستخدمين مثلك" />
        <meta property="og:url" content={`${SITE_URL}/community`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <link rel="canonical" href={`${SITE_URL}/community`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="تجارب المستخدمين | pptides" />
        <meta name="twitter:description" content="اقرأ تجارب حقيقية من مستخدمي الببتيدات. بروتوكولات مُجرَّبة، نتائج فعلية، وتقييمات صادقة." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'DiscussionForumPosting',
          headline: 'تجارب المستخدمين — pptides',
          url: `${SITE_URL}/community`,
          description: 'بروتوكولات حقيقية ونتائج فعلية من مستخدمي الببتيدات.',
          inLanguage: 'ar',
        })}</script>
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <MessageSquare className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
            تجارب <span className="text-emerald-600">المستخدمين</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-stone-600 dark:text-stone-400">
            بروتوكولات حقيقية. نتائج فعلية. من مستخدمين مثلك.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=أريد الانضمام لمجموعة المجتمع`}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30"
          >
            <MessageCircle className="h-4 w-4" />
            تواصل معنا للانضمام للمجتمع
          </a>
        </div>

        {submitted && (
          <div className="mb-6 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center text-sm font-bold text-emerald-800 dark:text-emerald-300">
            تم نشر تجربتك بنجاح — شكرًا لمشاركتك!
          </div>
        )}

        {user && isPaid && (
          <div className="mb-8">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center transition-all hover:border-emerald-400 hover:bg-emerald-100 dark:bg-emerald-900/30"
              >
                <Send className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
                <p className="font-bold text-stone-900 dark:text-stone-100">شارك تجربتك مع الببتيدات</p>
                <p className="mt-1 text-sm text-stone-800 dark:text-stone-200">ساعد غيرك — شارك البروتوكول والنتائج</p>
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-6 shadow-sm dark:shadow-stone-900/30 md:p-8">
                <h3 className="mb-6 text-lg font-bold text-stone-900 dark:text-stone-100">شارك تجربتك</h3>

                <div className="mb-4">
                  <label htmlFor="community-peptide" className="mb-1.5 block text-sm font-bold text-stone-900 dark:text-stone-100">اسم الببتيد <span className="text-red-500 dark:text-red-400" aria-hidden="true">*</span></label>
                  <select
                    id="community-peptide"
                    value={peptideName}
                    onChange={(e) => setPeptideName(e.target.value)}
                    required
                    className={cn(
                      'w-full rounded-xl border bg-stone-50 dark:bg-stone-900 px-4 py-3 text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900',
                      attempted && !peptideName.trim() ? 'border-red-400 ring-1 ring-red-200' : 'border-stone-200 dark:border-stone-700'
                    )}
                  >
                    <option value="">اختر الببتيد...</option>
                    {allPeptides.map(p => (
                      <option key={p.id} value={p.nameEn}>{p.nameAr} ({p.nameEn})</option>
                    ))}
                  </select>
                  {attempted && !peptideName.trim() && (
                    <p data-error="true" className="mt-1 text-xs text-red-600 dark:text-red-400">يرجى إدخال اسم الببتيد</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-bold text-stone-900 dark:text-stone-100">الهدف</label>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGoal(g)}
                        className={cn(
                          'rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                          goal === g
                            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                            : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200 transition-colors hover:border-emerald-200 dark:border-emerald-800'
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="community-protocol" className="mb-1.5 block text-sm font-bold text-stone-900 dark:text-stone-100">البروتوكول (الجرعة، التوقيت، المدة)</label>
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
                    className="w-full resize-none rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                    style={{ overflow: 'hidden' }}
                  />
                  <p className="mt-1 text-start text-xs text-stone-500 dark:text-stone-400">{protocol.length}/3000</p>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="community-duration" className="mb-1.5 block text-sm font-bold text-stone-900 dark:text-stone-100">المدة (أسابيع)</label>
                    <input
                      id="community-duration"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={52}
                      value={durationWeeks}
                      onChange={(e) => setDurationWeeks(Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-stone-900 dark:text-stone-100">التقييم (1-5)</label>
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
                              : 'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-200'
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="community-results" className="mb-1.5 block text-sm font-bold text-stone-900 dark:text-stone-100">النتائج — ماذا لاحظت؟ <span className="text-red-500 dark:text-red-400" aria-hidden="true">*</span></label>
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
                      'w-full resize-none rounded-xl border bg-stone-50 dark:bg-stone-900 px-4 py-3 text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-400 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900',
                      attempted && !results.trim() ? 'border-red-400 ring-1 ring-red-200' : 'border-stone-200 dark:border-stone-700'
                    )}
                    style={{ overflow: 'hidden' }}
                  />
                  <div className="mt-1 flex justify-between">
                    {attempted && !results.trim() ? (
                      <p data-error="true" className="text-xs text-red-600 dark:text-red-400">يرجى وصف النتائج</p>
                    ) : <span />}
                    <p className="text-xs text-stone-500 dark:text-stone-400">{results.length}/3000</p>
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
                    className="rounded-full border border-stone-200 dark:border-stone-700 px-6 py-3 font-bold text-stone-800 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {!user && (
          <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-6 text-center">
            <p className="font-bold text-stone-900 dark:text-stone-100">سجّل الدخول لمشاركة تجربتك</p>
            <Link to="/login" className="mt-3 inline-block rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
              تسجيل الدخول
            </Link>
          </div>
        )}

        {user && !isPaid && (
          <div className="mb-8 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center">
            <p className="font-bold text-stone-900 dark:text-stone-100">اشترك لمشاركة تجربتك مع المجتمع</p>
            <p className="mt-1 text-sm text-stone-800 dark:text-stone-200">المشتركون فقط يمكنهم نشر تجاربهم</p>
            <Link to="/pricing" className="mt-3 inline-block rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
              اشترك — {PRICING.essentials.label}/شهريًا
            </Link>
          </div>
        )}

        {/* Filter bar */}
        {!loading && (logs.length > 0 || isShowingSeeds) && (
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
                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-400 transition-colors hover:border-emerald-200 dark:border-emerald-800'
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
              className="shrink-0 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-1.5 text-sm text-stone-700 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none"
            >
              <option value="newest">الأحدث</option>
              <option value="highest">الأعلى تقييمًا</option>
            </select>
          </div>
        )}

        <h2 className="sr-only">المشاركات</h2>
        {loading ? (
          <div className="space-y-4 py-4" role="status" aria-label="جارٍ تحميل التجارب">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-stone-200 dark:border-stone-700 p-5 space-y-3">
                <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-stone-200 dark:bg-stone-700" /><div className="space-y-1 flex-1"><div className="h-4 w-24 rounded bg-stone-200 dark:bg-stone-700" /><div className="h-3 w-16 rounded bg-stone-100 dark:bg-stone-800" /></div></div>
                <div className="h-4 w-full rounded bg-stone-100 dark:bg-stone-800" />
                <div className="h-4 w-3/4 rounded bg-stone-100 dark:bg-stone-800" />
              </div>
            ))}
          </div>
        ) : fetchError && logs.length === 0 ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 py-10 text-center">
            <p className="text-base text-red-700 dark:text-red-400 mb-4">تعذّر تحميل التجارب. تحقق من اتصالك بالإنترنت.</p>
            <button
              onClick={() => loadCommunityLogs()}
              className="rounded-xl bg-red-100 px-6 py-2 text-sm font-bold text-red-700 dark:text-red-400 hover:bg-red-200 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedLogs.length === 0 && (
              <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 py-12 px-6 text-center">
                <p className="text-sm font-bold text-stone-800 dark:text-stone-200">لا توجد تجارب لهذا الهدف بعد</p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">جرّب تصنيف مختلف أو شارك تجربتك</p>
                <button onClick={() => setFilterGoal('all')} className="mt-3 text-sm text-emerald-600 font-bold hover:underline">عرض الكل</button>
              </div>
            )}
            {isShowingSeeds && displayedLogs.length > 0 && (
              <div className="rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 px-6 py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                  <MessageSquare className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">شارك تجربتك مع المجتمع</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  التجارب أدناه أمثلة توضيحية فقط — أضف تجربتك الحقيقية لتكون أول مشاركة
                </p>
                {user && isPaid && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
                  >
                    <Send className="h-4 w-4" />
                    شارك تجربتك الآن
                  </button>
                )}
              </div>
            )}
            {displayedLogs.map((log) => {
              const isSeed = log.id.startsWith('seed-');
              return (
              <div key={log.id} className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-6 shadow-sm dark:shadow-stone-900/30 transition-all hover:border-emerald-200 dark:border-emerald-800 hover:shadow-md">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <User className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                      {log.is_subscriber && (
                        <span className="absolute -top-1 -start-1 flex h-5 items-center gap-0.5 rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white shadow" title="مشترك">
                          <BadgeCheck className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div>
                      {log.is_subscriber && (
                        <span className="me-1 inline-block rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">مشترك</span>
                      )}
                      {isSeed && (
                        <span className="inline-block mb-1 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                          تجربة توضيحية
                        </span>
                      )}
                      {(() => {
                        const peptide = allPeptides.find(p => p.nameEn.toLowerCase() === log.peptide_name.toLowerCase() || p.nameAr === log.peptide_name);
                        return peptide ? (
                          <Link to={`/peptide/${peptide.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-sm font-bold text-emerald-800 dark:text-emerald-300 shadow-sm dark:shadow-stone-900/30 hover:bg-emerald-200 transition-colors" dir="ltr">
                            <FlaskConical className="h-3 w-3" />
                            {log.peptide_name}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-sm font-bold text-emerald-800 dark:text-emerald-300 shadow-sm dark:shadow-stone-900/30" dir="ltr">
                            <FlaskConical className="h-3 w-3" />
                            {log.peptide_name}
                          </span>
                        );
                      })()}
                      {log.goal && (
                        <span className="me-2 text-sm text-stone-700 dark:text-stone-300">— {log.goal}</span>
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
                    {!isSeed && (
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
                      className="rounded-lg p-2.5 min-h-[44px] min-w-[44px] text-stone-300 hover:text-red-500 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20 transition-colors"
                      aria-label="إبلاغ"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                    )}
                  </div>
                </div>

                {log.protocol && (
                  <div className="mb-3 rounded-lg bg-stone-50 dark:bg-stone-900 p-3 text-sm text-stone-800 dark:text-stone-200">
                    <span className="font-bold text-stone-900 dark:text-stone-100">البروتوكول: </span>
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

                <div className="text-base leading-relaxed text-stone-900 dark:text-stone-100">
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

                <div className="mt-3 flex items-center gap-4 text-xs text-stone-700 dark:text-stone-300">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {log.duration_weeks} أسابيع
                  </span>
                  <span>
                    {new Date(log.created_at).toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  {!isSeed && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!user) { toast.error('سجّل الدخول للتفاعل مع التجارب'); return; }
                        if (upvotedPosts.has(log.id)) return;
                        const next = new Set(upvotedPosts).add(log.id);
                        setUpvotedPosts(next);
                        try { localStorage.setItem('pptides_upvoted_posts', JSON.stringify([...next])); } catch { /* expected */ }
                        setLogs(prev => prev.map(l => l.id === log.id ? { ...l, upvotes: (l.upvotes ?? 0) + 1 } : l));
                        const { data: rpcData, error } = await supabase
                          .rpc('increment_upvote', { p_post_id: log.id, p_user_id: user.id });
                        if (error) {
                          setLogs(prev => prev.map(l => l.id === log.id ? { ...l, upvotes: (l.upvotes ?? 0) - 1 } : l));
                          const reverted = new Set(upvotedPosts);
                          reverted.delete(log.id);
                          setUpvotedPosts(reverted);
                          try { localStorage.setItem('pptides_upvoted_posts', JSON.stringify([...reverted])); } catch { /* expected */ }
                        }
                      }}
                      className={cn(
                        'flex items-center gap-1 transition-colors',
                        upvotedPosts.has(log.id) ? 'text-emerald-600' : 'text-stone-400 hover:text-emerald-500'
                      )}
                      disabled={upvotedPosts.has(log.id)}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      <span>{log.upvotes ?? 0}</span>
                    </button>
                  )}
                </div>
                <Link
                  to={`/peptide/${allPeptides.find(p => p.nameEn === log.peptide_name)?.id ?? (log.peptide_name ?? '').toLowerCase().replace(/[/\s]+/g, '-')}`}
                  className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  ابدأ هذا البروتوكول ←
                </Link>

                {!isSeed && (
                  <div className="mt-4 border-t border-stone-100 dark:border-stone-800 pt-3">
                    <button
                      type="button"
                      onClick={() => toggleReplies(log.id)}
                      className="flex items-center gap-1.5 text-sm font-medium text-stone-500 dark:text-stone-400 hover:text-emerald-600 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>{replyCountByPost[log.id] ?? 0} ردود</span>
                      {expandedReplies.has(log.id) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {expandedReplies.has(log.id) && (
                      <div className="mt-3 space-y-3">
                        {loadingReplies.has(log.id) ? (
                          <div className="flex items-center gap-2 text-sm text-stone-400">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 dark:border-stone-700 border-t-emerald-500" />
                            جارٍ تحميل الردود...
                          </div>
                        ) : (
                          <>
                            {(repliesByPost[log.id] ?? []).length === 0 && (
                              <p className="text-sm text-stone-400">لا توجد ردود بعد</p>
                            )}
                            {(repliesByPost[log.id] ?? []).map(reply => (
                              <div key={reply.id} className="flex gap-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 p-3">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 dark:bg-stone-700">
                                  <User className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    {reply.is_subscriber && (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                        <BadgeCheck className="h-3 w-3" />
                                        مشترك
                                      </span>
                                    )}
                                    <span className="text-xs text-stone-400">
                                      {new Date(reply.created_at).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })}
                                    </span>
                                    {user && user.id === reply.user_id && (
                                      <button
                                        type="button"
                                        onClick={() => deleteReply(reply)}
                                        className="me-auto rounded p-1 text-stone-300 hover:bg-red-50 dark:bg-red-900/20 hover:text-red-500 dark:text-red-400 transition-colors"
                                        aria-label="حذف الرد"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                  <p className="mt-1 text-sm text-stone-800 dark:text-stone-200 whitespace-pre-line">{reply.content}</p>
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {user && (
                          <div className="flex gap-2">
                            <textarea
                              value={replyText[log.id] ?? ''}
                              onChange={e => setReplyText(prev => ({ ...prev, [log.id]: e.target.value }))}
                              placeholder="اكتب ردًا..."
                              maxLength={1000}
                              rows={1}
                              className="flex-1 resize-none rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                              onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  submitReply(log.id);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => submitReply(log.id)}
                              disabled={!(replyText[log.id] ?? '').trim() || submittingReply.has(log.id)}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                              aria-label="إرسال الرد"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
            {!isShowingSeeds && hasMore && (
              <button
                onClick={async () => {
                  setLoadingMore(true);
                  try {
                    const { data } = await supabase
                      .from('community_logs')
                      .select('id, user_id, peptide_name, goal, protocol, duration_weeks, results, rating, is_subscriber, upvotes, created_at')
                      .order('created_at', { ascending: false })
                      .range(logs.length, logs.length + PAGE_SIZE - 1);
                    if (data) {
                      setLogs(prev => [...prev, ...data]);
                      setHasMore(data.length >= PAGE_SIZE);
                      loadReplyCounts(data.map(d => d.id));
                    }
                  } catch {
                    toast.error('تعذّر تحميل المزيد. حاول مرة أخرى.');
                  } finally {
                    setLoadingMore(false);
                  }
                }}
                disabled={loadingMore}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 py-4 text-sm font-bold text-stone-600 dark:text-stone-400 transition-all hover:border-emerald-300 dark:border-emerald-700 hover:text-emerald-700 dark:text-emerald-400 disabled:opacity-50"
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
