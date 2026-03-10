import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MessageSquare, Send, Clock, FlaskConical, User, Flag, Star, MessageCircle,
  ChevronDown, ChevronUp, Trash2, BadgeCheck, ThumbsUp, Search, X, Trophy,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING, SITE_URL, SUPPORT_EMAIL } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { peptides as allPeptides } from '@/data/peptides';

/* ──────────────────── Types ──────────────────── */

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

interface LeaderEntry {
  user_id: string;
  post_count: number;
  display_initial: string;
}

/* ──────────────────── Constants ──────────────────── */

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

const AVATAR_COLORS = [
  'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-orange-600',
  'bg-teal-600', 'bg-pink-600',
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

/* ──────────────────── Helpers ──────────────────── */

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(userId: string): string {
  // For real users we show first char of their ID (we don't expose emails)
  // Seeds get a flask icon handled in JSX
  if (!userId) return '?';
  return userId.charAt(0).toUpperCase();
}

function relativeTimeAr(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHrs < 24) return `منذ ${diffHrs === 1 ? 'ساعة' : diffHrs === 2 ? 'ساعتين' : `${diffHrs} ساعات`}`;
  if (diffDays === 1) return 'منذ يوم';
  if (diffDays === 2) return 'منذ يومين';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  if (diffWeeks === 1) return 'منذ أسبوع';
  if (diffWeeks === 2) return 'منذ أسبوعين';
  if (diffWeeks < 5) return `منذ ${diffWeeks} أسابيع`;
  if (diffMonths === 1) return 'منذ شهر';
  if (diffMonths === 2) return 'منذ شهرين';
  if (diffMonths < 12) return `منذ ${diffMonths} أشهر`;
  return new Date(dateStr).toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ──────────────────── Multi-Select Peptide Chip Component ──────────────────── */

function PeptideMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = allPeptides.filter(
    (p) =>
      p.nameAr.includes(search) ||
      p.nameEn.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((s) => s !== name)
        : [...selected, name]
    );
  };

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={cn(
          'min-h-[48px] w-full cursor-pointer rounded-xl border bg-stone-50 dark:bg-stone-900 px-4 py-3 text-stone-900 dark:text-stone-100',
          'focus-within:border-emerald-300 dark:focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-100 dark:focus-within:ring-emerald-900',
          'border-stone-200 dark:border-stone-700'
        )}
      >
        {selected.length === 0 ? (
          <span className="text-stone-500 dark:text-stone-400">اختر الببتيدات المستخدمة...</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300"
              >
                {name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(name);
                  }}
                  className="rounded-full p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                  aria-label={`إزالة ${name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-lg">
          <div className="sticky top-0 bg-white dark:bg-stone-900 p-2 border-b border-stone-100 dark:border-stone-800">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن ببتيد..."
              className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(p.nameEn);
              }}
              className={cn(
                'flex w-full items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm text-start transition-colors hover:bg-stone-50 dark:hover:bg-stone-800',
                selected.includes(p.nameEn) && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
              )}
            >
              <span className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs',
                selected.includes(p.nameEn)
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-stone-300 dark:border-stone-600'
              )}>
                {selected.includes(p.nameEn) && '✓'}
              </span>
              <span>{p.nameAr}</span>
              <span className="text-stone-400 text-xs" dir="ltr">({p.nameEn})</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-sm text-stone-400">لا توجد نتائج</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────── Star Rating Input ──────────────────── */

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1 pt-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          onMouseEnter={() => setHover(r)}
          onMouseLeave={() => setHover(0)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-all"
          aria-label={`${r} نجوم`}
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              r <= (hover || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-stone-300 dark:text-stone-600'
            )}
          />
        </button>
      ))}
    </div>
  );
}

/* ──────────────────── Star Rating Display ──────────────────── */

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`التقييم ${rating} من 5`} dir="ltr">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            'h-3.5 w-3.5',
            s <= rating ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-stone-300 dark:text-stone-600'
          )}
        />
      ))}
    </div>
  );
}

/* ──────────────────── Leaderboard Component ──────────────────── */

function Leaderboard({ leaders }: { leaders: LeaderEntry[] }) {
  if (leaders.length === 0) return null;
  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">أكثر المشاركين</h3>
      </div>
      <div className="space-y-3">
        {leaders.map((leader, i) => (
          <div key={leader.user_id} className="flex items-center gap-3">
            <span className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
              i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-stone-400' : i === 2 ? 'bg-amber-700' : 'bg-stone-300 dark:bg-stone-600'
            )}>
              {i + 1}
            </span>
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
              getAvatarColor(leader.user_id)
            )}>
              {leader.display_initial}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">عضو مجتمع</span>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {leader.post_count} {leader.post_count === 1 ? 'مشاركة' : leader.post_count === 2 ? 'مشاركتان' : 'مشاركات'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────── Main Component ──────────────────── */

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
  const validSorts = ['newest', 'highest', 'most_upvoted', 'most_replied'] as const;

  const [filterGoal, setFilterGoal] = useState(() => {
    const g = searchParams.get('goal') ?? 'all';
    return validGoals.includes(g) ? g : 'all';
  });
  const [filterPeptide, setFilterPeptide] = useState(() => searchParams.get('peptide_filter') ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<typeof validSorts[number]>(() => {
    const s = searchParams.get('sort') as typeof validSorts[number];
    return validSorts.includes(s) ? s : 'newest';
  });

  // Leaderboard
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterGoal !== 'all') params.set('goal', filterGoal);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (filterPeptide) params.set('peptide_filter', filterPeptide);
    setSearchParams(params, { replace: true });
  }, [filterGoal, sortBy, filterPeptide, setSearchParams]);

  useEffect(() => {
    const g = searchParams.get('goal') ?? 'all';
    const validG = validGoals.includes(g) ? g : 'all';
    const s = searchParams.get('sort') as typeof validSorts[number];
    const validS = validSorts.includes(s) ? s : 'newest';
    const pf = searchParams.get('peptide_filter') ?? '';
    const p = searchParams.get('peptide') ?? '';
    if (validG !== filterGoal) setFilterGoal(validG);
    if (validS !== sortBy) setSortBy(validS);
    if (pf !== filterPeptide) setFilterPeptide(pf);
    if (p.trim() && user && subscription?.isProOrTrial) setShowForm(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Form state
  const DRAFT_KEY = 'pptides_community_draft';
  const [selectedPeptides, setSelectedPeptides] = useState<string[]>(() => {
    const p = searchParams.get('peptide') ?? '';
    return p ? [p] : [];
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
    try { sessionStorage.setItem(`${DRAFT_KEY}_protocol`, protocol); } catch { /* */ }
  }, [protocol]);
  useEffect(() => {
    try { sessionStorage.setItem(`${DRAFT_KEY}_results`, results); } catch { /* */ }
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

  const loadLeaderboard = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('community_logs')
        .select('user_id');
      if (data && data.length > 0) {
        const counts: Record<string, number> = {};
        for (const row of data) {
          if (row.user_id) counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
        }
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([uid, count]) => ({
            user_id: uid,
            post_count: count,
            display_initial: uid.charAt(0).toUpperCase(),
          }));
        setLeaders(sorted);
      }
    } catch { /* non-critical */ }
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
    loadCommunityLogs();
    loadLeaderboard();
    const fallback = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(fallback);
  }, [loadCommunityLogs, loadLeaderboard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!user || selectedPeptides.length === 0 || !results.trim() || submittingRef.current) {
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
      const peptideStr = selectedPeptides.join(', ');
      const { error } = await supabase.from('community_logs').insert({
        user_id: user.id,
        peptide_name: peptideStr,
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
      setSelectedPeptides([]);
      setGoal('');
      setProtocol('');
      setResults('');
      setRating(4);
      setAttempted(false);
      setShowForm(false);
      try { sessionStorage.removeItem(`${DRAFT_KEY}_protocol`); sessionStorage.removeItem(`${DRAFT_KEY}_results`); } catch { /* */ }

      const { data } = await supabase
        .from('community_logs')
        .select('id, user_id, peptide_name, goal, protocol, duration_weeks, results, rating, is_subscriber, upvotes, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (mountedRef.current && data) {
        setLogs(data);
        loadReplyCounts(data.map(d => d.id));
      }
      loadLeaderboard();
      setTimeout(() => { if (mountedRef.current) setSubmitted(false); }, 5000);
    } catch {
      if (mountedRef.current) toast.error('فشل الاتصال بالخادم — تحقق من اتصالك بالإنترنت وحاول مرة أخرى');
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const isPaid = subscription?.isProOrTrial ?? false;

  // Get unique peptides from logs for filter dropdown
  const uniquePeptides = useMemo(() => {
    const names = new Set<string>();
    for (const log of logs) {
      // peptide_name can be comma-separated for multi-peptide posts
      for (const p of log.peptide_name.split(',').map(s => s.trim()).filter(Boolean)) {
        names.add(p);
      }
    }
    return Array.from(names).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let result = logs;

    // Filter by goal
    if (filterGoal !== 'all') {
      result = result.filter(log => log.goal === filterGoal);
    }

    // Filter by peptide
    if (filterPeptide) {
      result = result.filter(log =>
        log.peptide_name.split(',').map(s => s.trim()).includes(filterPeptide)
      );
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(log =>
        log.peptide_name.toLowerCase().includes(q) ||
        log.results.toLowerCase().includes(q) ||
        log.protocol?.toLowerCase().includes(q) ||
        log.goal?.toLowerCase().includes(q)
      );
    }

    // Sort
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'highest':
          return b.rating - a.rating;
        case 'most_upvoted':
          return (b.upvotes ?? 0) - (a.upvotes ?? 0);
        case 'most_replied':
          return (replyCountByPost[b.id] ?? 0) - (replyCountByPost[a.id] ?? 0);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [logs, filterGoal, filterPeptide, searchQuery, sortBy, replyCountByPost]);

  const displayedLogs = useMemo(() => {
    if (logs.length > 0) return filteredLogs;
    return SEED_EXPERIENCES
      .filter(s => filterGoal === 'all' || s.goal === filterGoal)
      .sort((a, b) =>
        sortBy === 'highest' ? b.rating - a.rating : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [logs.length, filteredLogs, filterGoal, sortBy]);

  const isShowingSeeds = logs.length === 0;

  // Parse peptide names (supports comma-separated)
  const parsePeptideNames = (name: string) => name.split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 animate-fade-in" dir="rtl">
      <Helmet>
        <title>مجتمع الببتيدات | pptides</title>
        <meta name="description" content="شارك تجربتك مع الببتيدات واقرأ تجارب حقيقية من مستخدمين آخرين. بروتوكولات مُجرَّبة، نتائج فعلية، وتقييمات صادقة." />
        <meta property="og:title" content="مجتمع الببتيدات | pptides" />
        <meta property="og:description" content="بروتوكولات حقيقية ونتائج فعلية من مستخدمين مثلك" />
        <meta property="og:url" content={`${SITE_URL}/community`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <link rel="canonical" href={`${SITE_URL}/community`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="مجتمع الببتيدات | pptides" />
        <meta name="twitter:description" content="شارك تجربتك مع الببتيدات واقرأ تجارب حقيقية من مستخدمين آخرين." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'DiscussionForumPosting',
          headline: 'مجتمع الببتيدات — pptides',
          url: `${SITE_URL}/community`,
          description: 'بروتوكولات حقيقية ونتائج فعلية من مستخدمي الببتيدات.',
          inLanguage: 'ar',
        })}</script>
      </Helmet>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-6 md:pt-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <MessageSquare className="h-7 w-7 text-emerald-700" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
            مجتمع <span className="text-emerald-700">الببتيدات</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-stone-600 dark:text-stone-400">
            شارك تجربتك. اقرأ تجارب الآخرين. تعلّم من بروتوكولات حقيقية.
          </p>
        </div>

        {/* Success banner */}
        {submitted && (
          <div className="mb-6 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center text-sm font-bold text-emerald-800 dark:text-emerald-300">
            تم نشر تجربتك بنجاح — شكرًا لمشاركتك! 🎉
          </div>
        )}

        {/* Main layout: content + sidebar */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Post creation CTA / Form */}
            {user && isPaid && (
              <div className="mb-8">
                {!showForm ? (
                  <button
                    onClick={() => setShowForm(true)}
                    className="w-full rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10 p-6 text-center transition-all hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  >
                    <Send className="mx-auto mb-2 h-6 w-6 text-emerald-700" />
                    <p className="font-bold text-stone-900 dark:text-stone-100">شارك تجربتك مع الببتيدات</p>
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">ساعد غيرك — شارك البروتوكول والنتائج</p>
                  </button>
                ) : (
                  <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-6 shadow-sm dark:shadow-stone-900/30 md:p-8">
                    <div className="mb-6 flex items-center gap-3">
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
                        getAvatarColor(user.id)
                      )}>
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">شارك تجربتك</h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400">ستُنشر تجربتك بشكل مجهول</p>
                      </div>
                    </div>

                    {/* Rich text area */}
                    <div className="mb-5">
                      <label htmlFor="community-results" className="mb-1.5 block text-sm font-bold text-stone-900 dark:text-stone-100">
                        تجربتك ونتائجك <span className="text-red-500 dark:text-red-400" aria-hidden="true">*</span>
                      </label>
                      <textarea
                        id="community-results"
                        value={results}
                        onChange={(e) => {
                          setResults(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        maxLength={3000}
                        placeholder="شارك تجربتك مع الببتيدات... ماذا استخدمت؟ ما النتائج التي لاحظتها؟ هل كانت هناك أعراض جانبية؟"
                        rows={4}
                        required
                        className={cn(
                          'w-full resize-none rounded-xl border bg-stone-50 dark:bg-stone-900 px-4 py-3 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900',
                          attempted && !results.trim() ? 'border-red-400 ring-1 ring-red-200' : 'border-stone-200 dark:border-stone-700'
                        )}
                        style={{ overflow: 'hidden' }}
                      />
                      <div className="mt-1 flex justify-between">
                        {attempted && !results.trim() ? (
                          <p data-error="true" className="text-xs text-red-600 dark:text-red-400">يرجى وصف تجربتك والنتائج</p>
                        ) : <span />}
                        <p className="text-xs text-stone-400">{results.length}/3000</p>
                      </div>
                    </div>

                    {/* Multi-select peptides */}
                    <div className="mb-5">
                      <label className="mb-1.5 block text-sm font-bold text-stone-900 dark:text-stone-100">
                        الببتيدات المستخدمة <span className="text-red-500 dark:text-red-400" aria-hidden="true">*</span>
                      </label>
                      <PeptideMultiSelect
                        selected={selectedPeptides}
                        onChange={setSelectedPeptides}
                      />
                      {attempted && selectedPeptides.length === 0 && (
                        <p data-error="true" className="mt-1 text-xs text-red-600 dark:text-red-400">يرجى اختيار ببتيد واحد على الأقل</p>
                      )}
                    </div>

                    {/* Goal */}
                    <div className="mb-5">
                      <label className="mb-1.5 block text-sm font-bold text-stone-900 dark:text-stone-100">الهدف</label>
                      <div className="flex flex-wrap gap-2">
                        {GOALS.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGoal(goal === g ? '' : g)}
                            className={cn(
                              'rounded-full border px-4 py-2 min-h-[44px] text-sm font-medium transition-all',
                              goal === g
                                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                                : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-400 hover:border-emerald-200 dark:hover:border-emerald-800'
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Protocol */}
                    <div className="mb-5">
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
                        className="w-full resize-none rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                        style={{ overflow: 'hidden' }}
                      />
                      <p className="mt-1 text-start text-xs text-stone-400">{protocol.length}/3000</p>
                    </div>

                    {/* Duration + Rating row */}
                    <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="community-duration" className="mb-1.5 block text-sm font-bold text-stone-900 dark:text-stone-100">مدة البروتوكول (أسابيع)</label>
                        <input
                          id="community-duration"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={52}
                          value={durationWeeks}
                          onChange={(e) => setDurationWeeks(Number(e.target.value))}
                          className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-bold text-stone-900 dark:text-stone-100">التقييم</label>
                        <StarRatingInput value={rating} onChange={setRating} />
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={submitting || selectedPeptides.length === 0 || !results.trim()}
                        className="flex-1 rounded-full bg-emerald-600 py-3 min-h-[44px] font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="rounded-full border border-stone-200 dark:border-stone-700 px-6 py-3 min-h-[44px] font-bold text-stone-600 dark:text-stone-400 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Not logged in */}
            {!user && (
              <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 p-6 text-center">
                <p className="font-bold text-stone-900 dark:text-stone-100">سجّل الدخول لمشاركة تجربتك</p>
                <Link to="/login" className="mt-3 inline-block rounded-full bg-emerald-600 px-8 py-2.5 min-h-[44px] text-sm font-bold text-white transition-colors hover:bg-emerald-700">
                  تسجيل الدخول
                </Link>
              </div>
            )}

            {/* Not subscribed */}
            {user && !isPaid && (
              <div className="mb-8 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-6 text-center">
                <p className="font-bold text-stone-900 dark:text-stone-100">اشترك لمشاركة تجربتك مع المجتمع</p>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">المشتركون فقط يمكنهم نشر تجاربهم</p>
                <Link to="/pricing" className="mt-3 inline-block rounded-full bg-emerald-600 px-8 py-2.5 min-h-[44px] text-sm font-bold text-white transition-colors hover:bg-emerald-700">
                  اشترك — {PRICING.essentials.label}/شهريًا
                </Link>
              </div>
            )}

            {/* Search + Filter bar */}
            {!loading && (logs.length > 0 || isShowingSeeds) && (
              <div className="mb-6 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث في التجارب..."
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 py-3 pe-4 ps-10 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-600 transition-colors"
                      aria-label="مسح البحث"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filter pills + sort + peptide filter */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Goal filter chips */}
                  <div className="-mx-4 min-w-0 flex-1 overflow-x-auto px-4 scrollbar-hide scroll-fade">
                    <div className="flex flex-nowrap gap-2 pb-1">
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
                                : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-400 hover:border-emerald-200 dark:hover:border-emerald-800'
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {/* Peptide filter */}
                  {uniquePeptides.length > 0 && (
                    <select
                      value={filterPeptide}
                      onChange={(e) => setFilterPeptide(e.target.value)}
                      aria-label="فلترة حسب الببتيد"
                      className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 min-h-[44px] text-sm text-stone-700 dark:text-stone-300 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none"
                    >
                      <option value="">كل الببتيدات</option>
                      {uniquePeptides.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}

                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof validSorts[number])}
                    aria-label="ترتيب التجارب"
                    className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 min-h-[44px] text-sm text-stone-700 dark:text-stone-300 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none"
                  >
                    <option value="newest">الأحدث</option>
                    <option value="highest">الأعلى تقييمًا</option>
                    <option value="most_upvoted">الأكثر تفاعلًا</option>
                    <option value="most_replied">الأكثر ردودًا</option>
                  </select>
                </div>
              </div>
            )}

            {/* Posts */}
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
                  className="rounded-xl bg-red-100 dark:bg-red-900/30 px-6 py-2 min-h-[44px] text-sm font-bold text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Empty state */}
                {displayedLogs.length === 0 && !isShowingSeeds && (
                  <div className="rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-stone-950 px-6 py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                      <Sparkles className="h-8 w-8 text-emerald-700" />
                    </div>
                    <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">كن أول من يشارك تجربته!</h3>
                    <p className="mx-auto max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-400 mb-4">
                      شارك المجتمع تجربتك مع الببتيدات — أي ببتيد استخدمت، البروتوكول الذي اتبعته، والنتائج التي حصلت عليها.
                    </p>
                    <div className="mx-auto max-w-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-4 text-start text-sm text-stone-600 dark:text-stone-400">
                      <p className="font-bold text-stone-900 dark:text-stone-100 mb-2">مثال على مشاركة:</p>
                      <p className="mb-1">🧪 <strong>الببتيد:</strong> BPC-157</p>
                      <p className="mb-1">🎯 <strong>الهدف:</strong> تعافي من إصابة</p>
                      <p className="mb-1">📋 <strong>البروتوكول:</strong> 250mcg مرتين يوميًا لمدة 6 أسابيع</p>
                      <p>⭐ <strong>النتيجة:</strong> تحسّن واضح بعد الأسبوع الثالث</p>
                    </div>
                    {user && isPaid && (
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 min-h-[44px] text-sm font-bold text-white transition-all hover:bg-emerald-700"
                      >
                        <Send className="h-4 w-4" />
                        شارك تجربتك الآن
                      </button>
                    )}
                  </div>
                )}

                {/* Seed banner */}
                {isShowingSeeds && displayedLogs.length > 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-stone-950 px-6 py-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                      <Sparkles className="h-8 w-8 text-emerald-700" />
                    </div>
                    <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">كن أول من يشارك تجربته!</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                      التجارب أدناه أمثلة توضيحية فقط — أضف تجربتك الحقيقية لتكون أول مشاركة حقيقية
                    </p>
                    {user && isPaid && (
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 min-h-[44px] text-sm font-bold text-white transition-all hover:bg-emerald-700"
                      >
                        <Send className="h-4 w-4" />
                        شارك تجربتك الآن
                      </button>
                    )}
                  </div>
                )}

                {/* No results for current filter */}
                {displayedLogs.length === 0 && isShowingSeeds && (
                  <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 py-12 px-6 text-center">
                    <p className="text-sm font-bold text-stone-700 dark:text-stone-300">لا توجد تجارب لهذا الهدف بعد</p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">جرّب تصنيف مختلف أو شارك تجربتك</p>
                    <button onClick={() => { setFilterGoal('all'); setFilterPeptide(''); setSearchQuery(''); }} className="mt-3 text-sm text-emerald-700 font-bold hover:underline min-h-[44px]">عرض الكل</button>
                  </div>
                )}

                {/* Post cards */}
                {displayedLogs.map((log) => {
                  const isSeed = log.id.startsWith('seed-');
                  const peptideNames = parsePeptideNames(log.peptide_name);
                  const replyCount = replyCountByPost[log.id] ?? 0;

                  return (
                    <article key={log.id} className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-6 shadow-sm dark:shadow-stone-900/30 transition-all hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-md">
                      {/* Post header */}
                      <div className="mb-4 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="relative">
                            <div className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
                              isSeed ? 'bg-stone-400 dark:bg-stone-600' : getAvatarColor(log.user_id)
                            )}>
                              {isSeed ? (
                                <FlaskConical className="h-5 w-5" />
                              ) : (
                                getInitial(log.user_id)
                              )}
                            </div>
                            {log.is_subscriber && !isSeed && (
                              <span className="absolute -top-1 -start-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 shadow" title="مشترك">
                                <BadgeCheck className="h-3 w-3 text-white" />
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {log.is_subscriber && !isSeed && (
                                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">مشترك</span>
                              )}
                              {isSeed && (
                                <span className="rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                                  تجربة توضيحية
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-stone-500 dark:text-stone-400">{relativeTimeAr(log.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRating rating={log.rating} />
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
                              className="rounded-lg p-2.5 min-h-[44px] min-w-[44px] text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              aria-label="إبلاغ"
                            >
                              <Flag className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Peptide tags */}
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {peptideNames.map(pName => {
                          const peptide = allPeptides.find(p => p.nameEn.toLowerCase() === pName.toLowerCase() || p.nameAr === pName);
                          return peptide ? (
                            <Link
                              key={pName}
                              to={`/peptide/${peptide.id}`}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 min-h-[36px] text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                              dir="ltr"
                            >
                              <FlaskConical className="h-3 w-3" />
                              {pName}
                            </Link>
                          ) : (
                            <span
                              key={pName}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 min-h-[36px] text-xs font-bold text-emerald-800 dark:text-emerald-300"
                              dir="ltr"
                            >
                              <FlaskConical className="h-3 w-3" />
                              {pName}
                            </span>
                          );
                        })}
                        {log.goal && (
                          <span className="rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-1.5 min-h-[36px] text-xs font-medium text-stone-600 dark:text-stone-400">
                            {log.goal}
                          </span>
                        )}
                      </div>

                      {/* Protocol */}
                      {log.protocol && (
                        <div className="mb-3 rounded-xl bg-stone-50 dark:bg-stone-900 p-3 text-sm text-stone-700 dark:text-stone-300">
                          <span className="font-bold text-stone-900 dark:text-stone-100">البروتوكول: </span>
                          {(() => {
                            const isLong = (log.protocol?.length ?? 0) > 200;
                            const isExpanded = expandedPosts.has(`${log.id}_proto`);
                            if (!isLong) return log.protocol;
                            return (
                              <span>
                                {isExpanded ? log.protocol : `${log.protocol!.slice(0, 200)}...`}
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(`${log.id}_proto`)}
                                  className="me-2 font-bold text-emerald-700 hover:underline"
                                >
                                  {isExpanded ? 'اقرأ أقل' : 'اقرأ المزيد'}
                                </button>
                              </span>
                            );
                          })()}
                        </div>
                      )}

                      {/* Results */}
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
                                className="me-2 font-bold text-emerald-700 hover:underline"
                              >
                                {isExpanded ? 'اقرأ أقل' : 'اقرأ المزيد'}
                              </button>
                            </p>
                          );
                        })()}
                      </div>

                      {/* Footer: meta + actions */}
                      <div className="mt-4 flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-3">
                        <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {log.duration_weeks} أسابيع
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Upvote */}
                          {!isSeed && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!user) { toast.error('سجّل الدخول للتفاعل مع التجارب'); return; }
                                if (upvotedPosts.has(log.id)) return;
                                const next = new Set(upvotedPosts).add(log.id);
                                setUpvotedPosts(next);
                                try { localStorage.setItem('pptides_upvoted_posts', JSON.stringify([...next])); } catch { /* */ }
                                setLogs(prev => prev.map(l => l.id === log.id ? { ...l, upvotes: (l.upvotes ?? 0) + 1 } : l));
                                const { error } = await supabase
                                  .rpc('increment_upvote', { p_post_id: log.id, p_user_id: user.id });
                                if (error) {
                                  setLogs(prev => prev.map(l => l.id === log.id ? { ...l, upvotes: (l.upvotes ?? 0) - 1 } : l));
                                  const reverted = new Set(upvotedPosts);
                                  reverted.delete(log.id);
                                  setUpvotedPosts(reverted);
                                  try { localStorage.setItem('pptides_upvoted_posts', JSON.stringify([...reverted])); } catch { /* */ }
                                }
                              }}
                              className={cn(
                                'flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-[36px] text-sm font-medium transition-all',
                                upvotedPosts.has(log.id)
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                  : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-emerald-700'
                              )}
                              disabled={upvotedPosts.has(log.id)}
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span>{log.upvotes ?? 0}</span>
                            </button>
                          )}

                          {/* Reply toggle */}
                          {!isSeed && (
                            <button
                              type="button"
                              onClick={() => toggleReplies(log.id)}
                              className={cn(
                                'flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-[36px] text-sm font-medium transition-all',
                                expandedReplies.has(log.id)
                                  ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                                  : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                              )}
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span>رد</span>
                              {replyCount > 0 && (
                                <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                                  {replyCount}
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Replies thread */}
                      {!isSeed && expandedReplies.has(log.id) && (
                        <div className="mt-3 space-y-3 border-t border-stone-100 dark:border-stone-800 pt-3">
                          {loadingReplies.has(log.id) ? (
                            <div className="flex items-center gap-2 text-sm text-stone-400">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 dark:border-stone-700 border-t-emerald-500" />
                              جارٍ تحميل الردود...
                            </div>
                          ) : (
                            <>
                              {(repliesByPost[log.id] ?? []).length === 0 && (
                                <p className="text-sm text-stone-400 dark:text-stone-400">لا توجد ردود بعد — كن أول من يرد!</p>
                              )}
                              {(repliesByPost[log.id] ?? []).map(reply => (
                                <div key={reply.id} className="flex gap-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 p-3">
                                  <div className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                                    getAvatarColor(reply.user_id)
                                  )}>
                                    {getInitial(reply.user_id)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {reply.is_subscriber && (
                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                          <BadgeCheck className="h-3 w-3" />
                                          مشترك
                                        </span>
                                      )}
                                      <span className="text-xs text-stone-400">{relativeTimeAr(reply.created_at)}</span>
                                      {user && user.id === reply.user_id && (
                                        <button
                                          type="button"
                                          onClick={() => deleteReply(reply)}
                                          className="me-auto rounded p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                          aria-label="حذف الرد"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                    <p className="mt-1 text-sm text-stone-800 dark:text-stone-200 whitespace-pre-line">{reply.content}</p>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Reply input */}
                          {user ? (
                            <div className="flex gap-2">
                              <div className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white mt-1',
                                getAvatarColor(user.id)
                              )}>
                                {user.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 flex gap-2">
                                <textarea
                                  value={replyText[log.id] ?? ''}
                                  onChange={e => setReplyText(prev => ({ ...prev, [log.id]: e.target.value }))}
                                  placeholder="اكتب ردًا..."
                                  maxLength={1000}
                                  rows={1}
                                  className="flex-1 resize-none rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-100 dark:focus:ring-emerald-900"
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
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
                                  aria-label="إرسال الرد"
                                >
                                  <Send className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-2">
                              <Link to="/login" className="text-sm font-medium text-emerald-700 hover:underline">
                                سجّل الدخول للرد
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}

                {/* Load more */}
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
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 py-4 min-h-[44px] text-sm font-bold text-stone-600 dark:text-stone-400 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-400 disabled:opacity-50"
                  >
                    {loadingMore ? 'جارٍ التحميل...' : 'تحميل المزيد'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-72 lg:shrink-0 space-y-6">
            {/* Leaderboard */}
            <Leaderboard leaders={leaders} />

            {/* Community stats */}
            {logs.length > 0 && (
              <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 p-5 shadow-sm dark:shadow-stone-900/30">
                <h3 className="mb-3 text-base font-bold text-stone-900 dark:text-stone-100">إحصائيات المجتمع</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">عدد التجارب</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{logs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">ببتيدات مختلفة</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{uniquePeptides.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">متوسط التقييم</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {(logs.reduce((sum, l) => sum + l.rating, 0) / logs.length).toFixed(1)} ⭐
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CTA for sidebar */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-5">
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-2">انضم للمجتمع</p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mb-3">شارك تجربتك وتعلّم من تجارب الآخرين</p>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=أريد الانضمام لمجموعة المجتمع`}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 min-h-[44px] text-sm font-bold text-white transition-colors hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                تواصل معنا
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
