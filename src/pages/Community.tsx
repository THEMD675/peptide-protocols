import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare, Send, Clock, FlaskConical, Flag, Star, MessageCircle,
  Trash2, BadgeCheck, ThumbsUp, Search, X, Trophy,
  Loader2, Shield, Users, FlaskRound, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { PRICING, SITE_URL, SUPPORT_EMAIL } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { cn, sanitizeInput } from '@/lib/utils';
import { peptidesLite as allPeptides } from '@/data/peptides-lite';

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

// DEFERRED: Google Safe Browsing for community post URLs — requires server-side API key.
// Would need a Supabase edge function to validate links; client-side cannot call Safe Browsing API.

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

/* ──────────────────── Helpers ──────────────────── */

const ARABIC_BLOCKED = [
  'كس', 'طيز', 'زب', 'شرموط', 'عرص', 'متناك', 'منيوك',
  'كلب', 'حمار', 'خول', 'لعن', 'ابن الكلب', 'يلعن',
  'زنا', 'عاهر', 'قحب',
];

const SPAM_KEYWORDS = [
  'buy', 'order', 'shop', 'vendor', 'coupon', 'discount', 'for sale', 'free shipping',
  'اشترِ', 'متجر', 'خصم', 'عرض خاص', 'للبيع', 'شحن مجاني',
];

const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+/i;

function containsSpamKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return SPAM_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

function containsUrl(text: string): boolean {
  return URL_REGEX.test(text);
}

function containsArabicProfanity(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ');
  return ARABIC_BLOCKED.some(w => normalized.includes(w));
}

async function checkProfanity(text: string): Promise<boolean> {
  if (containsArabicProfanity(text)) return true;
  try {
    const res = await fetch(`https://www.purgomalum.com/service/containsprofanity?text=${encodeURIComponent(text)}`);
    if (!res.ok) return false;
    const hasProfanity = await res.text();
    return hasProfanity === 'true';
  } catch {
    return false;
  }
}

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(userId: string): string {
  // Show "م" (anonymous) for all users — UUIDs don't have meaningful initials
  if (!userId) return '?';
  return 'م';
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
          'border-stone-200 dark:border-stone-600'
        )}
      >
        {selected.length === 0 ? (
          <span className="text-stone-500 dark:text-stone-300">اختر الببتيدات المستخدمة...</span>
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
        <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 shadow-lg">
          <div className="sticky top-0 bg-white dark:bg-stone-900 p-2 border-b border-stone-100 dark:border-stone-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن ببتيد..."
              className="w-full rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 focus:outline-none"
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
                  : 'border-stone-200 dark:border-stone-700'
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
                : 'fill-transparent text-stone-300 dark:text-stone-300'
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
            s <= rating ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-stone-300 dark:text-stone-300'
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
    <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5 shadow-sm dark:shadow-stone-900/30">
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
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">عضو #{String(Math.abs(leader.user_id.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % 9000 + 1000)}</span>
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
  useScrollReveal();
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const replySubmittingRef = useRef(false);
  const upvotingRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [upvotedPosts, setUpvotedPosts] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`pptides_upvoted_${user?.id ?? 'anon'}`);
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
  }, [searchParams, user, subscription]);

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

  // Post edit/delete state
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editResults, setEditResults] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const deletePost = useCallback(async (postId: string) => {
    if (!user) return;
    const prev = logs;
    setLogs(l => l.filter(x => x.id !== postId));
    setDeletingPostId(null);
    await supabase.from('community_replies').delete().eq('post_id', postId);
    const { error } = await supabase
      .from('community_logs')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id);
    if (error) {
      setLogs(prev);
      toast.error('تعذّر حذف المشاركة');
    } else {
      toast.success('تم حذف المشاركة');
    }
  }, [user, logs]);

  const startEditPost = useCallback((log: LogEntry) => {
    setEditingPostId(log.id);
    setEditResults(log.results);
  }, []);

  const saveEditPost = useCallback(async () => {
    if (!user || !editingPostId || editSaving) return;
    const trimmed = sanitizeInput(editResults.trim(), 2000);
    if (!trimmed) { toast.error('النص مطلوب'); return; }
    setEditSaving(true);
    const prev = logs;
    setLogs(l => l.map(x => x.id === editingPostId ? { ...x, results: trimmed } : x));
    const { error } = await supabase
      .from('community_logs')
      .update({ results: trimmed })
      .eq('id', editingPostId)
      .eq('user_id', user.id);
    if (error) {
      setLogs(prev);
      toast.error('تعذّر تعديل المشاركة');
    } else {
      toast.success('تم تعديل المشاركة');
      setEditingPostId(null);
      setEditResults('');
    }
    setEditSaving(false);
  }, [user, editingPostId, editResults, editSaving, logs]);

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
  const lastPostTimeRef = useRef(0);
  const POST_COOLDOWN_MS = 60_000;

  useEffect(() => {
    try { sessionStorage.setItem(`${DRAFT_KEY}_protocol`, protocol); } catch { /* */ }
  }, [protocol]);
  useEffect(() => {
    try { sessionStorage.setItem(`${DRAFT_KEY}_results`, results); } catch { /* */ }
  }, [results]);

  const loadReplyCounts = useCallback(async (postIds: string[]) => {
    if (postIds.length === 0) return;
    // Single batch query: fetch post_id + id, paginate to avoid 1000-row default cap
    let allRows: { post_id: string }[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data } = await supabase
        .from('community_replies')
        .select('post_id')
        .in('post_id', postIds)
        .range(from, from + batchSize - 1);
      if (!data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }
    const counts: Record<string, number> = {};
    // Initialize all requested posts to 0 so missing ones show 0 not undefined
    for (const id of postIds) counts[id] = 0;
    for (const r of allRows) counts[r.post_id] = (counts[r.post_id] ?? 0) + 1;
    setReplyCountByPost(prev => ({ ...prev, ...counts }));
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('community_logs')
        .select('user_id')
        .limit(100);
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
            display_initial: 'م',
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
    const content = sanitizeInput((replyText[postId] ?? '').trim(), 500);
    if (!user || !content) return;
    if (replySubmittingRef.current) return;
    replySubmittingRef.current = true;
    try {
      const hasProfanity = await checkProfanity(content);
      if (hasProfanity) {
        toast.error('يحتوي المحتوى على كلمات غير مناسبة — يرجى تعديل النص');
        return;
      }
      if (containsSpamKeywords(content)) {
        toast.error('يحتوي الرد على مصطلحات تجارية غير مسموحة — يرجى تعديل النص');
        return;
      }
      if (containsUrl(content)) {
        toast('يرجى عدم نشر روابط خارجية — قد يتم مراجعة ردك.', { icon: '⚠️' });
      }
      setSubmittingReply(prev => new Set(prev).add(postId));
    const isSub = subscription?.isProOrTrial ?? false;
    const optimistic: Reply = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
      if (error.code === 'P0429' || error.message?.includes('Rate limit')) {
        toast.error('لقد أرسلت ردود كثيرة — حاول مرة أخرى لاحقاً');
      } else {
        toast.error('تعذّر إرسال الرد');
      }
      setRepliesByPost(prev => ({ ...prev, [postId]: (prev[postId] ?? []).filter(r => r.id !== optimistic.id) }));
      setReplyCountByPost(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] ?? 1) - 1) }));
      setReplyText(prev => ({ ...prev, [postId]: content }));
    }
    setSubmittingReply(prev => { const n = new Set(prev); n.delete(postId); return n; });
    } finally {
      replySubmittingRef.current = false;
    }
  }, [replyText, user, subscription]);

  const deleteReply = useCallback(async (reply: Reply) => {
    setRepliesByPost(prev => ({ ...prev, [reply.post_id]: (prev[reply.post_id] ?? []).filter(r => r.id !== reply.id) }));
    setReplyCountByPost(prev => ({ ...prev, [reply.post_id]: Math.max(0, (prev[reply.post_id] ?? 1) - 1) }));
    const { error } = await supabase.from('community_replies').delete().eq('id', reply.id).eq('user_id', user?.id ?? '');
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
    if (Date.now() - lastPostTimeRef.current < POST_COOLDOWN_MS) {
      toast.error('انتظر 60 ثانية قبل نشر تجربة أخرى');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const dur = Math.max(1, Math.min(52, durationWeeks));
      const peptideStr = selectedPeptides.join(', ');
      // Sanitize user inputs: strip HTML, limit length
      const sanitize = (s: string, max: number) => sanitizeInput(s.trim(), max);
      const contentToCheck = [goal, protocol, results].filter(Boolean).join(' ');
      if (contentToCheck) {
        const hasProfanity = await checkProfanity(contentToCheck);
        if (hasProfanity) {
          submittingRef.current = false;
          setSubmitting(false);
          toast.error('يحتوي المحتوى على كلمات غير مناسبة — يرجى تعديل النص');
          return;
        }
        if (containsSpamKeywords(contentToCheck)) {
          submittingRef.current = false;
          setSubmitting(false);
          toast.error('يحتوي المحتوى على مصطلحات تجارية غير مسموحة — يرجى تعديل النص');
          return;
        }
        if (containsUrl(contentToCheck)) {
          toast('يرجى عدم نشر روابط خارجية — قد يتم مراجعة منشورك.', { icon: '⚠️' });
        }
      }
      // Duplicate content detection: check if user's most recent post has same results text
      const userMostRecent = logs.find(l => l.user_id === user.id);
      if (userMostRecent && userMostRecent.results === results.trim()) {
        toast.error('يبدو أنك نشرت هذه التجربة مسبقًا');
        return;
      }
      const { error } = await supabase.from('community_logs').insert({
        user_id: user.id,
        peptide_name: peptideStr,
        goal: sanitize(goal, 200),
        protocol: sanitize(protocol, 1000),
        duration_weeks: dur,
        results: sanitize(results, 2000),
        rating,
        is_subscriber: isPaid,
      });

      if (!mountedRef.current) return;

      if (error) {
        if (error.code === 'P0429' || error.message?.includes('Rate limit')) {
          toast.error('لقد نشرت تجارب كثيرة — حاول مرة أخرى لاحقاً');
        } else {
          toast.error('تعذّر نشر تجربتك — تحقق من البيانات وحاول مرة أخرى');
        }
        return;
      }

      lastPostTimeRef.current = Date.now();
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
    return [];
  }, [logs.length, filteredLogs]);

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
        <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">محتوى تعليمي — استشر طبيبك قبل استخدام أي ببتيد</div>
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <MessageSquare className="h-7 w-7 text-emerald-700" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
            مجتمع <span className="text-emerald-700">الببتيدات</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-stone-600 dark:text-stone-300 mb-8">
            مجتمع عربي متخصص يضم مشتركين يشاركون تجاربهم الحقيقية مع الببتيدات — بروتوكولات مُجرَّبة، نتائج فعلية، تقييمات صادقة.
          </p>
          {/* Value prop pills */}
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2">
              <Shield className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">مشتركون موثَّقون فقط</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2">
              <Users className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">مشاركات مجهولة الهوية</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2">
              <FlaskRound className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">بروتوكولات وجرعات دقيقة</span>
            </div>
          </div>
        </div>

        {/* Success banner */}
        {submitted && (
          <div className="mb-6 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center text-sm font-bold text-emerald-800 dark:text-emerald-300">
            تم نشر تجربتك بنجاح — شكرًا لمشاركتك!
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
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">ساعد غيرك — شارك البروتوكول والنتائج</p>
                  </button>
                ) : (
                  <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-6 shadow-sm dark:shadow-stone-900/30 md:p-8">
                    <div className="mb-6 flex items-center gap-3">
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
                        getAvatarColor(user.id)
                      )}>
                        م
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">شارك تجربتك</h3>
                        <p className="text-xs text-stone-500 dark:text-stone-300">ستُنشر تجربتك بشكل مجهول</p>
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
                          'w-full resize-none rounded-xl border bg-stone-50 dark:bg-stone-900 px-4 py-3 text-stone-900 dark:text-stone-100 placeholder:text-stone-500 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500',
                          attempted && !results.trim() ? 'border-red-400 ring-1 ring-red-200' : 'border-stone-200 dark:border-stone-600'
                        )}
                        style={{ overflow: 'hidden' }}
                      />
                      <div className="mt-1 flex justify-between">
                        {attempted && !results.trim() ? (
                          <p data-error="true" role="alert" className="text-xs text-red-600 dark:text-red-400">يرجى وصف تجربتك والنتائج</p>
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
                        <p data-error="true" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">يرجى اختيار ببتيد واحد على الأقل</p>
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
                                : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-emerald-200 dark:hover:border-emerald-800'
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
                        className="w-full resize-none rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-stone-900 dark:text-stone-100 placeholder:text-stone-500 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500"
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
                          className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-stone-900 dark:text-stone-100 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500"
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
                        className="flex-1 rounded-full bg-emerald-600 py-3.5 min-h-[44px] text-base font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="rounded-xl border border-stone-200 dark:border-stone-700 px-6 py-3 min-h-[44px] font-bold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
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
              <div className="mb-8 rounded-2xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 p-6 text-center">
                <p className="font-bold text-stone-900 dark:text-stone-100">سجّل الدخول لمشاركة تجربتك</p>
                <Link to="/login" className="mt-3 inline-block rounded-full bg-emerald-600 px-8 py-3.5 min-h-[44px] text-base font-semibold text-white transition-colors hover:bg-emerald-700">
                  تسجيل الدخول
                </Link>
              </div>
            )}

            {/* Not subscribed — locked form preview */}
            {user && !isPaid && (
              <div className="mb-8 overflow-hidden rounded-2xl border-2 border-emerald-200 dark:border-emerald-800">
                {/* Preview of the form — blurred + locked */}
                <div className="relative">
                  <div className="pointer-events-none select-none opacity-40 blur-[2px] p-6 space-y-4 bg-white dark:bg-stone-900">
                    <div className="h-24 rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800" />
                    <div className="flex gap-2">
                      {['BPC-157', 'Semaglutide', 'GHK-Cu'].map(p => (
                        <span key={p} className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-bold text-emerald-700">{p}</span>
                      ))}
                    </div>
                    <div className="h-10 rounded-xl bg-emerald-600 opacity-50" />
                  </div>
                  {/* Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-stone-900/80 p-6 text-center backdrop-blur-[1px]">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <Send className="h-5 w-5 text-emerald-700" />
                    </div>
                    <p className="mb-1 font-bold text-stone-900 dark:text-stone-100">شارك تجربتك مع المجتمع</p>
                    <p className="mb-1 text-sm text-stone-600 dark:text-stone-300">اشترك للوصول الكامل للمجتمع</p>
                    <ul className="mb-4 mt-2 text-start text-xs text-stone-600 dark:text-stone-300 space-y-1">
                      <li className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />نشر تجاربك وبروتوكولاتك</li>
                      <li className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />الرد على تجارب الآخرين</li>
                      <li className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />التفاعل والتصويت على الأفضل</li>
                    </ul>
                    <Link to="/pricing" className="inline-block rounded-full bg-emerald-600 px-8 py-3.5 min-h-[44px] text-base font-semibold text-white transition-colors hover:bg-emerald-700">
                      اشترك — {PRICING.essentials.label}/شهريًا
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Search + Filter bar */}
            {!loading && logs.length > 0 && (
              <div className="mb-6 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث في التجارب..."
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 py-3 pe-4 ps-10 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute end-3 top-1/2 -translate-y-1/2 rounded p-1 text-stone-500 dark:text-stone-300 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
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
                                : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-emerald-200 dark:hover:border-emerald-800'
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
                      className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 min-h-[44px] text-sm text-stone-700 dark:text-stone-200 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none"
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
                    className="rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 min-h-[44px] text-sm text-stone-700 dark:text-stone-200 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none"
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
                  <div key={i} className="animate-pulse rounded-2xl border border-stone-200 dark:border-stone-600 p-5 space-y-3">
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
                {/* Empty state — no community posts yet */}
                {displayedLogs.length === 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-stone-950 px-6 py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                      <Users className="h-8 w-8 text-emerald-700" />
                    </div>
                    <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">كن أول من يشارك تجربته!</h3>
                    <p className="mx-auto max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-300 mb-4">
                      المجتمع ينتظر أول تجربة حقيقية — شارك الببتيد الذي استخدمته، بروتوكولك، ونتائجك لتُلهم الآخرين.
                    </p>
                    <div className="mx-auto max-w-sm rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4 text-start text-sm text-stone-600 dark:text-stone-300">
                      <p className="font-bold text-stone-900 dark:text-stone-100 mb-2">مثال على مشاركة:</p>
                      <p className="mb-1"><strong>الببتيد:</strong> BPC-157</p>
                      <p className="mb-1"><strong>الهدف:</strong> تعافي من إصابة</p>
                      <p className="mb-1"><strong>البروتوكول:</strong> 250mcg مرتين يوميًا لمدة 6 أسابيع</p>
                      <p><strong>النتيجة:</strong> تحسّن واضح بعد الأسبوع الثالث</p>
                    </div>
                    {user && isPaid ? (
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 min-h-[44px] text-base font-semibold text-white transition-all hover:bg-emerald-700"
                      >
                        <Send className="h-4 w-4" />
                        شارك تجربتك الآن
                      </button>
                    ) : (
                      <Link
                        to="/pricing"
                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 min-h-[44px] text-base font-semibold text-white transition-all hover:bg-emerald-700"
                      >
                        اشترك لتشارك تجربتك
                      </Link>
                    )}
                  </div>
                )}

                {/* Post cards */}
                {displayedLogs.map((log) => {
                  const peptideNames = parsePeptideNames(log.peptide_name);
                  const replyCount = replyCountByPost[log.id] ?? 0;

                  return (
                    <article key={log.id} className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-6 shadow-sm dark:shadow-stone-900/30 transition-all hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-md">
                      {/* Post header */}
                      <div className="mb-4 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="relative">
                            <div className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
                              getAvatarColor(log.user_id)
                            )}>
                              {getInitial(log.user_id)}
                            </div>
                            {log.is_subscriber && (
                              <span className="absolute -top-1 -start-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 shadow" title="مشترك">
                                <BadgeCheck className="h-3 w-3 text-white" />
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {log.is_subscriber && (
                                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">مشترك</span>
                              )}
                            </div>
                            <span className="text-xs text-stone-500 dark:text-stone-300">{relativeTimeAr(log.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <StarRating rating={log.rating} />
                          {/* Author actions: edit (24h) + delete */}
                          {user && user.id === log.user_id && (
                            <>
                              {Date.now() - new Date(log.created_at).getTime() < 24 * 60 * 60 * 1000 && (
                                <button
                                  type="button"
                                  onClick={() => startEditPost(log)}
                                  className="rounded-lg p-2.5 min-h-[44px] min-w-[44px] text-stone-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                  aria-label="تعديل المشاركة"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {deletingPostId === log.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => deletePost(log.id)}
                                    className="rounded-lg px-2.5 py-1.5 min-h-[44px] text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                  >
                                    تأكيد الحذف
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingPostId(null)}
                                    className="rounded-lg px-2.5 py-1.5 min-h-[44px] text-xs font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeletingPostId(log.id)}
                                  className="rounded-lg p-2.5 min-h-[44px] min-w-[44px] text-stone-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  aria-label="حذف المشاركة"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          )}
                          {/* Report — for other users */}
                          {(!user || user.id !== log.user_id) && (
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
                                  const { count } = await supabase
                                    .from('reports')
                                    .select('*', { count: 'exact', head: true })
                                    .eq('target_type', 'community_log')
                                    .eq('target_id', log.id);
                                  if (count != null && count >= 3) {
                                    await supabase
                                      .from('community_logs')
                                      .update({ visibility: 'hidden' })
                                      .eq('id', log.id);
                                    setLogs(prev => prev.filter(l => l.id !== log.id));
                                  }
                                }
                              }}
                              className="rounded-lg p-2.5 min-h-[44px] min-w-[44px] text-stone-300 dark:text-stone-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 min-h-[44px] text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                              dir="ltr"
                            >
                              <FlaskConical className="h-3 w-3" />
                              {pName}
                            </Link>
                          ) : (
                            <span
                              key={pName}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 min-h-[44px] text-xs font-bold text-emerald-800 dark:text-emerald-300"
                              dir="ltr"
                            >
                              <FlaskConical className="h-3 w-3" />
                              {pName}
                            </span>
                          );
                        })}
                        {log.goal && (
                          <span className="rounded-full border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-3 py-1.5 min-h-[44px] text-xs font-medium text-stone-600 dark:text-stone-300">
                            {log.goal}
                          </span>
                        )}
                      </div>

                      {/* Protocol */}
                      {log.protocol && (
                        <div className="mb-3 rounded-xl bg-stone-50 dark:bg-stone-900 p-3 text-sm text-stone-700 dark:text-stone-200">
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
                      {editingPostId === log.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editResults}
                            onChange={e => setEditResults(e.target.value)}
                            maxLength={2000}
                            rows={4}
                            aria-label="تعديل نص المشاركة"
                            className="w-full resize-none rounded-xl border border-emerald-300 dark:border-emerald-700 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500"
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => { setEditingPostId(null); setEditResults(''); }}
                              className="rounded-lg px-4 py-2 min-h-[44px] text-sm font-bold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              onClick={saveEditPost}
                              disabled={editSaving || !editResults.trim()}
                              className="rounded-lg bg-emerald-600 px-4 py-2 min-h-[44px] text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              {editSaving ? 'جارٍ الحفظ...' : 'حفظ التعديل'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-base leading-relaxed text-stone-900 dark:text-stone-100">
                          {(() => {
                            const isLong = (log.results?.length ?? 0) > 200;
                            const isExpanded = expandedPosts.has(log.id);
                            if (!isLong) return <p className="whitespace-pre-line break-words overflow-hidden">{log.results}</p>;
                            return (
                              <div>
                                <p className={cn('whitespace-pre-line break-words overflow-hidden', !isExpanded && 'line-clamp-6')}>
                                  {log.results}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(log.id)}
                                  className="mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                                >
                                  {isExpanded ? 'عرض أقل' : 'عرض المزيد'}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Footer: meta + actions */}
                      <div className="mt-4 flex items-center justify-between border-t border-stone-100 dark:border-stone-700 pt-3">
                        <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-300">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {log.duration_weeks} أسابيع
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Upvote */}
                          {(
                            <button
                              type="button"
                              onClick={async () => {
                                if (!user) { toast('سجّل الدخول للتفاعل مع التجارب', { action: { label: 'تسجيل الدخول', onClick: () => navigate('/login') } }); return; }
                                if (user.id === log.user_id) { toast('لا يمكنك التصويت على تجربتك الخاصة'); return; }
                                if (upvotedPosts.has(log.id) || upvotingRef.current.has(log.id)) return;
                                upvotingRef.current.add(log.id);
                                const next = new Set(upvotedPosts).add(log.id);
                                setUpvotedPosts(next);
                                try { localStorage.setItem(`pptides_upvoted_${user?.id ?? 'anon'}`, JSON.stringify([...next])); } catch { /* */ }
                                setLogs(prev => prev.map(l => l.id === log.id ? { ...l, upvotes: (l.upvotes ?? 0) + 1 } : l));
                                // TODO: increment_upvote SQL function increments blindly — server-side dedup needed
                                try {
                                  const { error } = await supabase
                                    .rpc('increment_upvote', { p_post_id: log.id, p_user_id: user.id });
                                  if (error) {
                                    setLogs(prev => prev.map(l => l.id === log.id ? { ...l, upvotes: (l.upvotes ?? 0) - 1 } : l));
                                    const reverted = new Set(upvotedPosts);
                                    reverted.delete(log.id);
                                    setUpvotedPosts(reverted);
                                    try { localStorage.setItem(`pptides_upvoted_${user?.id ?? 'anon'}`, JSON.stringify([...reverted])); } catch { /* */ }
                                    toast.error('تعذّر التصويت — حاول مرة أخرى');
                                  }
                                } finally {
                                  upvotingRef.current.delete(log.id);
                                }
                              }}
                              className={cn(
                                'flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-[44px] text-sm font-medium transition-all',
                                upvotedPosts.has(log.id)
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                  : 'text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-emerald-700'
                              )}
                              disabled={upvotedPosts.has(log.id)}
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span>{log.upvotes ?? 0}</span>
                            </button>
                          )}

                          {/* Reply toggle */}
                          {(
                            <button
                              type="button"
                              onClick={() => toggleReplies(log.id)}
                              className={cn(
                                'flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-[44px] text-sm font-medium transition-all',
                                expandedReplies.has(log.id)
                                  ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200'
                                  : 'text-stone-500 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
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
                      {expandedReplies.has(log.id) && (
                        <div className="mt-3 space-y-3 border-t border-stone-100 dark:border-stone-700 pt-3">
                          {loadingReplies.has(log.id) ? (
                            <div className="flex items-center gap-2 text-sm text-stone-400">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 dark:border-stone-600 border-t-emerald-500" />
                              جارٍ تحميل الردود...
                            </div>
                          ) : (
                            <>
                              {(repliesByPost[log.id] ?? []).length === 0 && (
                                <p className="py-2 text-sm text-stone-500 dark:text-stone-300 italic flex items-center gap-1.5">لا توجد ردود بعد — كن أول من يرد! <MessageCircle className="h-4 w-4" /></p>
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
                                      <div className="me-auto flex items-center gap-1">
                                        {user && user.id === reply.user_id && (
                                          <button
                                            type="button"
                                            onClick={() => deleteReply(reply)}
                                            className="rounded p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                            aria-label="حذف الرد"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                        {user && user.id !== reply.user_id && (
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              const { error } = await supabase.from('reports').insert({
                                                user_id: user.id,
                                                target_type: 'community_reply',
                                                target_id: reply.id,
                                              });
                                              if (error && error.code === '23505') {
                                                toast('سبق لك الإبلاغ عن هذا الرد');
                                              } else if (error) {
                                                toast.error('تعذّر الإبلاغ. حاول مرة أخرى.');
                                              } else {
                                                toast.success('تم الإبلاغ — سنراجع الرد');
                                              }
                                            }}
                                            className="rounded p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-200 dark:text-stone-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-400 dark:hover:text-red-400 transition-colors"
                                            aria-label="إبلاغ عن الرد"
                                          >
                                            <Flag className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
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
                                م
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex gap-2">
                                  <textarea
                                    value={replyText[log.id] ?? ''}
                                    onChange={e => {
                                      setReplyText(prev => ({ ...prev, [log.id]: e.target.value }));
                                      e.target.style.height = 'auto';
                                      e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                    placeholder="اكتب ردًا... (↵ للإرسال، ⇧+↵ لسطر جديد)"
                                    maxLength={1000}
                                    rows={1}
                                    style={{ overflow: 'hidden' }}
                                    className="flex-1 resize-none rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 focus:border-emerald-300 dark:focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-100 dark:focus:ring-emerald-500"
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
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
                                    aria-label="إرسال الرد"
                                  >
                                    {submittingReply.has(log.id)
                                      ? <Loader2 className="h-4 w-4 animate-spin" />
                                      : <Send className="h-4 w-4" />}
                                  </button>
                                </div>
                                {/* Character counter */}
                                {(replyText[log.id] ?? '').length > 0 && (
                                  <p className={cn(
                                    'text-end text-[11px]',
                                    (replyText[log.id] ?? '').length > 900
                                      ? 'text-amber-500 dark:text-amber-400'
                                      : 'text-stone-400'
                                  )}>
                                    {(replyText[log.id] ?? '').length}/1000
                                  </p>
                                )}
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
                {hasMore && (
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
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 py-4 min-h-[44px] text-sm font-bold text-stone-600 dark:text-stone-300 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل...</>
                    ) : 'تحميل المزيد'}
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
              <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-5 shadow-sm dark:shadow-stone-900/30">
                <h3 className="mb-3 text-base font-bold text-stone-900 dark:text-stone-100">إحصائيات المجتمع</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-300">عدد التجارب</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{logs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-300">ببتيدات مختلفة</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{uniquePeptides.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-300">متوسط التقييم</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {(logs.reduce((sum, l) => sum + l.rating, 0) / logs.length).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CTA for sidebar */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-5">
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-2">انضم للمجتمع</p>
              <p className="text-xs text-stone-600 dark:text-stone-300 mb-3">شارك تجربتك وتعلّم من تجارب الآخرين</p>
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
