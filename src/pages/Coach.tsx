import { useState, useRef, useEffect, useCallback, memo, useMemo, type ElementType } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { peptidesLite as allPeptides } from '@/data/peptides-lite';
import { renderMarkdown, renderMarkdownToHtml } from '@/lib/markdown';
import {
  Bot, Send, Sparkles, TrendingDown, Heart, Dumbbell, Brain,
  Clock, Zap, Calculator, FlaskConical, Shield, RotateCcw, ArrowLeft, ArrowRight,
  Copy, Check, BookOpen, Play, Printer, Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { events } from '@/lib/analytics';
import { cn, arPlural } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { SITE_URL, PRICING, TRIAL_DAYS } from '@/lib/constants';
import ProtocolWizard from '@/components/ProtocolWizard';
import CoachHistory from '@/components/CoachHistory';
import CoachInsightsBanner from '@/components/CoachInsightsBanner';
import { useProactiveCoach } from '@/hooks/useProactiveCoach';


function extractPeptideActions(text: string) {
  const found: { id: string; nameAr: string; nameEn: string }[] = [];
  const lower = text.toLowerCase();
  for (const p of allPeptides) {
    if (lower.includes(p.nameEn.toLowerCase())) {
      found.push({ id: p.id, nameAr: p.nameAr, nameEn: p.nameEn });
    }
  }
  return found.slice(0, 4);
}

interface ChatMessage { role: 'user' | 'assistant'; content: string; timestamp?: number }

type IntakeStep = 'goal' | 'experience' | 'injection' | 'details' | 'done';

interface IntakeData {
  goal: string;
  goalLabel: string;
  experience: string;
  injection: string;
  age: string;
  medications: string;
}

const GOALS: { id: string; label: string; Icon: ElementType }[] = [
  { id: 'fat-loss', label: 'فقدان دهون', Icon: TrendingDown },
  { id: 'recovery', label: 'تعافي وإصابات', Icon: Heart },
  { id: 'muscle', label: 'بناء عضل', Icon: Dumbbell },
  { id: 'brain', label: 'تركيز ودماغ', Icon: Brain },
  { id: 'longevity', label: 'طول عمر', Icon: Clock },
  { id: 'hormones', label: 'تحسين هرمونات', Icon: Zap },
  { id: 'gut-skin', label: 'بشرة وأمعاء ونوم', Icon: Shield },
];

const EXPERIENCE_OPTIONS = [
  { id: 'beginner', label: 'مبتدئ — أول مرة', desc: 'ما جربت ببتيدات قبل' },
  { id: 'intermediate', label: 'متوسط — جربت قبل', desc: 'استخدمت ببتيد أو اثنين' },
  { id: 'advanced', label: 'متقدم — أستخدم بانتظام', desc: 'خبرة مع عدة ببتيدات' },
];

const INJECTION_OPTIONS = [
  { id: 'yes', label: 'نعم، عادي', desc: 'حقن تحت الجلد لا مشكلة لدي' },
  { id: 'prefer-no', label: 'أفضّل بدون إن أمكن', desc: 'بخاخ أنف أو فموي أفضل' },
  { id: 'no', label: 'لا أبدًا', desc: 'فموي أو موضعي فقط' },
];

// System prompt is now server-side in the edge function — hidden from view-source and saves tokens per request

async function buildUserContext(userId: string): Promise<string> {
  let ctx = '';
  try {
    const { data: logs } = await supabase
      .from('injection_logs')
      .select('peptide_name, dose, dose_unit, injection_site, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(10);
    if (logs && logs.length > 0) {
      ctx += `\nسجل حقن المستخدم (آخر ${logs.length}):\n`;
      logs.forEach(l => { ctx += `- ${l.peptide_name}: ${l.dose}${l.dose_unit} (${new Date(l.logged_at).toLocaleDateString('ar-u-nu-latn')})\n`; });
      ctx += `لديه خبرة فعلية. ابنِ على ما يستخدمه.\n`;
    }
    const favs = (() => { try { const s = localStorage.getItem('pptides_favorites'); return s ? JSON.parse(s) as string[] : []; } catch { return []; } })();
    if (favs.length > 0) {
      const names = favs.map(id => allPeptides.find(p => p.id === id)?.nameEn).filter(Boolean);
      if (names.length) ctx += `ببتيدات مفضّلة: ${names.join(', ')}\n`;
    }
  } catch (e) {
    void e;
  }
  return ctx;
}

function buildPeptideRequestPrompt(peptideName: string, intake: IntakeData | null, userContext: string): string {
  const goalMap: Record<string, string> = {
    'fat-loss': 'fat loss', recovery: 'injury recovery', muscle: 'muscle building',
    brain: 'brain/focus', longevity: 'longevity', hormones: 'hormone optimization', 'gut-skin': 'gut/skin',
  };
  const expMap: Record<string, string> = { beginner: 'complete beginner', intermediate: 'intermediate', advanced: 'advanced' };
  const injMap: Record<string, string> = { yes: 'accepts injections', 'prefer-no': 'prefers non-injection', no: 'oral/nasal only' };

  let prompt = `أريد بروتوكول كامل لـ ${peptideName} — الجرعة، التوقيت، المدة، التحاليل، والتكلفة.\n\n`;
  if (intake?.goal || intake?.experience || intake?.injection || intake?.age || intake?.medications) {
    prompt += `USER PROFILE:\n`;
    if (intake.goal) prompt += `- Goal: ${goalMap[intake.goal] ?? intake.goal}\n`;
    if (intake.experience) prompt += `- Experience: ${expMap[intake.experience] ?? intake.experience}\n`;
    if (intake.injection) prompt += `- Injection: ${injMap[intake.injection] ?? intake.injection}\n`;
    if (intake.age) prompt += `- Age: ${intake.age}\n`;
    if (intake.medications) prompt += `- Meds/supplements: ${intake.medications}\n`;
    prompt += `\n`;
  }
  if (userContext) prompt += `USER HISTORY:\n${userContext}\n\n`;
  prompt += `Give the full personalized protocol NOW using the format in your instructions. Reply in Modern Standard Arabic (فصحى). Do NOT ask questions — give the protocol immediately.`;
  return prompt;
}

function buildIntakePrompt(intake: IntakeData, userContext: string): string {
  const goalMap: Record<string, string> = {
    'fat-loss': 'fat loss',
    recovery: 'injury recovery / athletic performance',
    muscle: 'muscle building',
    brain: 'brain / focus / cognitive enhancement',
    longevity: 'longevity / anti-aging',
    hormones: 'hormone optimization (testosterone/GH)',
    'gut-skin': 'gut repair / skin',
  };
  const expMap: Record<string, string> = { beginner: 'complete beginner (never used peptides)', intermediate: 'intermediate (used 1-2 peptides before)', advanced: 'advanced (regular peptide user)' };
  const injMap: Record<string, string> = { yes: 'accepts injections', 'prefer-no': 'prefers non-injection routes', no: 'NO injections — oral or nasal spray only' };

  let prompt = `USER PROFILE:\n- Goal: ${goalMap[intake.goal] ?? intake.goal}\n- Experience: ${expMap[intake.experience] ?? intake.experience}\n- Injection: ${injMap[intake.injection] ?? intake.injection}\n`;
  if (intake.age) prompt += `- Age: ${intake.age}\n`;
  if (intake.medications) prompt += `- Current meds/supplements: ${intake.medications}\n`;
  if (userContext) prompt += `\nUSER HISTORY:\n${userContext}\n`;
  prompt += `\nGive the full personalized protocol NOW using the format in your instructions. Reply in Modern Standard Arabic (فصحى). Do NOT ask questions — give the protocol immediately.`;
  return prompt;
}

async function getSessionToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

const COACH_PREVIEW_SAMPLE_QS = [
  'أريد بروتوكول BPC-157 للتعافي من إصابة في الكتف',
  'ما أفضل ببتيد لفقدان الوزن لمبتدئ؟',
  'صمّم لي بروتوكول CJC-1295 + Ipamorelin',
  'أريد بروتوكول Semaglutide مع جدول جرعات',
];

const DEFAULT_STARTERS = [
  'ما أفضل ببتيد للمبتدئين؟',
  'اشرح لي الفرق بين BPC-157 و TB-500',
  'أريد بروتوكول لفقدان الوزن',
  'كيف أخزن الببتيدات بشكل صحيح؟',
  'هل يمكنني الجمع بين عدة ببتيدات؟',
];

const GOAL_STARTERS: Record<string, string[]> = {
  'fat-loss': ['ما أفضل ببتيد لحرق الدهون؟', 'كيف أجمع بين Semaglutide وببتيد آخر؟', 'ما الجرعة المثالية لـ Tesamorelin؟'],
  'weight-loss': ['ما أفضل ببتيد لحرق الدهون؟', 'كيف أجمع بين Semaglutide وببتيد آخر؟', 'ما الجرعة المثالية لـ Tesamorelin؟'],
  recovery: ['كيف أستخدم BPC-157 للإصابات؟', 'ما الفرق بين BPC-157 و TB-500 للتعافي؟', 'متى أبدأ بروتوكول التعافي بعد الإصابة؟'],
  muscle: ['ما أفضل ببتيد لبناء العضل؟', 'كيف أستخدم CJC-1295 مع Ipamorelin؟', 'ما جدول الجرعات لهرمون النمو؟'],
  brain: ['ما أفضل ببتيد للتركيز الذهني؟', 'كيف أستخدم Semax للأداء العقلي؟', 'هل Dihexa آمن للاستخدام اليومي؟'],
  longevity: ['ما أفضل ببتيد لمقاومة الشيخوخة؟', 'كيف أستخدم Epitalon؟', 'ما بروتوكول NAD+ مع الببتيدات؟'],
  hormones: ['كيف أحسّن هرموناتي بالببتيدات؟', 'ما الفرق بين GHRP-6 و GHRP-2؟', 'هل Kisspeptin مناسب لي؟'],
  'gut-skin': ['كيف أستخدم BPC-157 لصحة الأمعاء؟', 'ما أفضل ببتيد للبشرة؟', 'هل GHK-Cu يساعد في تجديد البشرة؟'],
  'anti-aging': ['ما أفضل ببتيد لمقاومة الشيخوخة؟', 'كيف أستخدم Epitalon؟', 'ما بروتوكول GHK-Cu للبشرة والشعر؟'],
  sleep: ['ما أفضل ببتيد لتحسين النوم؟', 'كيف أستخدم DSIP للنوم العميق؟', 'هل CJC-1295 يحسّن جودة النوم؟'],
  immunity: ['ما أفضل ببتيد لتقوية المناعة؟', 'كيف أستخدم Thymosin Alpha-1؟', 'ما الفرق بين TA1 و BPC-157 للمناعة؟'],
  skin: ['ما أفضل ببتيد لنضارة البشرة؟', 'كيف أستخدم GHK-Cu موضعياً؟', 'هل Melanotan آمن للتسمير؟'],
  general: ['ما أفضل ببتيد للمبتدئين؟', 'كيف أختار البروتوكول المناسب؟', 'ما أهم التحاليل قبل البدء؟'],
};

function getPersonalizedStarters(): string[] {
  try {
    const raw = localStorage.getItem('pptides_quiz_results');
    if (!raw) return DEFAULT_STARTERS;
    const data = JSON.parse(raw);
    const goal = data.goal ?? data.answers?.goal;
    const primaryName = data.result?.primary?.nameAr;

    const goalPrompts = goal && GOAL_STARTERS[goal] ? GOAL_STARTERS[goal] : [];

    // If they have a primary peptide from quiz, add a personalized prompt
    const peptidePrompt = primaryName
      ? [`أريد بروتوكول كامل لـ ${primaryName}`]
      : [];

    // Combine: 1 peptide-specific + 2 goal-specific + 2 defaults (deduplicated, max 5)
    const combined = [...peptidePrompt, ...goalPrompts, ...DEFAULT_STARTERS];
    const seen = new Set<string>();
    return combined.filter(s => { if (seen.has(s)) return false; seen.add(s); return true; }).slice(0, 5);
  } catch {
    return DEFAULT_STARTERS;
  }
}

function formatMessageTime(ts?: number): string {
  if (!ts) return '';
  const now = new Date();
  const date = new Date(ts);
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const timeStr = date.toLocaleTimeString('ar-u-nu-latn', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (isToday) return `اليوم ${timeStr}`;
  if (isYesterday) return `أمس ${timeStr}`;
  return `${date.toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })} ${timeStr}`;
}

function getFollowUps(text: string, isFirstProtocol: boolean): string[] {
  if (!isFirstProtocol) {
    return [
      'ماذا لو شعرت بأعراض جانبية؟',
      'كيف أحسّن النتائج أكثر؟',
      'صمّم لي جدول يومي كامل',
    ];
  }

  const actions: string[] = [];

  actions.push('اكتب لي قائمة تسوّق كاملة — ما الذي أشتريه بالضبط مع الكميات');
  actions.push('صمّم لي جدول أسبوعي كامل بالمواعيد والجرعات');

  const t = text.toLowerCase();
  if (t.includes('bpc') || t.includes('tb-500'))
    actions.push('وين بالضبط أحقن لإصابتي؟ ارسم لي خريطة');
  else if (t.includes('tesamorelin') || t.includes('aod'))
    actions.push('ما النظام الغذائي الذي يعزّز النتيجة؟');
  else if (t.includes('semax') || t.includes('selank'))
    actions.push('ما أفضل ستاك نوتروبيكس يمكن دمجه معه؟');
  else if (t.includes('cjc') || t.includes('ipamorelin'))
    actions.push('صمّم لي بروتوكول نوم يعزّز إفراز هرمون النمو');
  else
    actions.push('ما الذي أضيفه لتحسين النتيجة — ستاك ثاني؟');

  return actions.slice(0, 3);
}

const MarkdownBubble = memo(function MarkdownBubble({ content }: { content: string }) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);
  return <>{rendered}</>;
});

export default function Coach() {
  const { user, subscription, upgradeTo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { smartStarters, insights } = useProactiveCoach(user?.id);

  // Build conversation starters: smart (proactive) first, then fallback to personalized/defaults
  const conversationStarters = useMemo(() => {
    if (smartStarters.length > 0) {
      const smart = smartStarters.map(s => s.text);
      const fallback = getPersonalizedStarters().filter(s => !smart.includes(s));
      return [...smart, ...fallback].slice(0, 5);
    }
    return getPersonalizedStarters();
  }, [smartStarters]);

  const storageKey = `pptides_coach_${user?.id ?? 'anon'}`;

  function loadQuizAnswers(): { goal: string; experience: string; injection: string } | null {
    try {
      const raw = localStorage.getItem('pptides_quiz_results');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - (data.ts ?? 0) > 24 * 60 * 60 * 1000) return null;
      return data;
    } catch { return null; }
  }

  const stepStorageKey = `pptides_coach_step_${user?.id ?? 'anon'}`;
  const [intakeStep, setIntakeStep] = useState<IntakeStep>(() => {
    try {
      const sess = sessionStorage.getItem(`pptides_coach_step_${user?.id ?? 'anon'}`);
      if (sess && ['goal', 'experience', 'injection', 'details', 'done'].includes(sess)) return sess as IntakeStep;
    } catch { /* expected */ }
    try {
      const s = localStorage.getItem(storageKey);
      if (s) { const d = JSON.parse(s); if (d.messages?.length > 0) return 'done'; }
    } catch { /* expected */ }
    const quiz = loadQuizAnswers();
    if (quiz?.goal && quiz?.experience && quiz?.injection) return 'details';
    return 'goal';
  });
  const [intake, setIntake] = useState<IntakeData>(() => {
    const empty = { goal: '', goalLabel: '', experience: '', injection: '', age: '', medications: '' };
    try {
      const sess = sessionStorage.getItem(`pptides_coach_intake_${user?.id ?? 'anon'}`);
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed && typeof parsed === 'object') return { ...empty, ...parsed };
      }
      const s = localStorage.getItem(storageKey);
      if (s) return JSON.parse(s).intake ?? empty;
    } catch { /* expected */ }
    const quiz = loadQuizAnswers();
    if (quiz) {
      const goalMap: Record<string, string> = { 'fat-loss': 'فقدان دهون', recovery: 'تعافي وإصابات', muscle: 'بناء عضل', brain: 'تركيز ودماغ', longevity: 'طول عمر', hormones: 'تحسين هرمونات', 'gut-skin': 'بشرة أو أمعاء أو نوم' };
      const expMap: Record<string, string> = { beginner: 'beginner', some: 'intermediate', advanced: 'advanced' };
      const injMap: Record<string, string> = { yes: 'yes', 'prefer-no': 'prefer-no', no: 'no' };
      return {
        goal: quiz.goal,
        goalLabel: goalMap[quiz.goal] ?? '',
        experience: expMap[quiz.experience] ?? quiz.experience,
        injection: injMap[quiz.injection] ?? quiz.injection,
        age: '', medications: '',
      };
    }
    return { goal: '', goalLabel: '', experience: '', injection: '', age: '', medications: '' };
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try { const s = localStorage.getItem(storageKey); if (s) return JSON.parse(s).messages ?? []; } catch { /* expected */ } return [];
  });

  // Track current conversation row ID for multi-conversation support
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Hydrate from Supabase (load most recent conversation)
  const supabaseLoadedRef = useRef(false);
  useEffect(() => {
    if (!user?.id || supabaseLoadedRef.current) return;
    supabaseLoadedRef.current = true;
    supabase
      .from('coach_conversations')
      .select('id, messages')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages as ChatMessage[]);
          setConversationId(data.id);
          setIntakeStep('done');
        }
      })
      .catch(() => {});
  }, [user?.id]);
  const DRAFT_KEY = 'pptides_coach_draft';
  const DEEPSEEK_CONSENT_KEY = 'pptides_deepseek_consent';
  const [showDeepSeekConsent, setShowDeepSeekConsent] = useState(() => {
    try { return localStorage.getItem(DEEPSEEK_CONSENT_KEY) !== 'true'; } catch { return true; }
  });
  const [input, setInput] = useState(() => {
    try { return sessionStorage.getItem(DRAFT_KEY) ?? ''; } catch { return ''; }
  });
  const draftTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [protocolWizardPeptide, setProtocolWizardPeptide] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userContextRef = useRef('');
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    let cleanMessages = messages.filter(m => !m.content.startsWith('__ERROR'));
    if (cleanMessages.length > 50) cleanMessages = cleanMessages.slice(-50);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ messages: cleanMessages, intake }));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        toast.error('ذاكرة المتصفح ممتلئة — سيتم حذف المحادثات القديمة');
        const trimmed = cleanMessages.slice(-20);
        try { localStorage.setItem(storageKey, JSON.stringify({ messages: trimmed, intake })); } catch { /* give up */ }
      }
    }
    // Fire-and-forget save to Supabase for cross-device sync (multi-conversation)
    if (user?.id && cleanMessages.length > 0) {
      if (conversationId) {
        // Update existing conversation row
        supabase
          .from('coach_conversations')
          .update({ messages: cleanMessages, updated_at: new Date().toISOString() })
          .eq('id', conversationId)
          .then(() => {})
          .catch(() => { /* cross-device sync failed — non-critical */ });
      } else {
        // Insert new conversation row
        supabase
          .from('coach_conversations')
          .insert({ user_id: user.id, messages: cleanMessages, updated_at: new Date().toISOString() })
          .select('id')
          .single()
          .then(({ data }) => {
            if (data?.id) setConversationId(data.id);
          })
          .catch(() => { /* cross-device sync failed — non-critical */ });
      }
    }
  }, [messages, intake, storageKey, isLoading, user?.id]);

  useEffect(() => {
    try { sessionStorage.setItem(stepStorageKey, intakeStep); } catch { /* expected */ }
  }, [intakeStep, stepStorageKey]);

  useEffect(() => {
    const key = `pptides_coach_intake_${user?.id ?? 'anon'}`;
    try { sessionStorage.setItem(key, JSON.stringify(intake)); } catch { /* expected */ }
  }, [intake, user?.id]);

  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      try { if (input) sessionStorage.setItem(DRAFT_KEY, input); else sessionStorage.removeItem(DRAFT_KEY); } catch { /* expected */ }
    }, 500);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [input, DRAFT_KEY]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, intakeStep]);
  useEffect(() => { if (user) buildUserContext(user.id).then(ctx => { userContextRef.current = ctx; }).catch(() => {}); }, [user]);

  // Migrate anon session data when user logs in (prevents loss on session expiry mid-form)
  useEffect(() => {
    if (!user?.id) return;
    try {
      const anonStep = sessionStorage.getItem('pptides_coach_step_anon');
      const anonIntake = sessionStorage.getItem('pptides_coach_intake_anon');
      if (anonStep || anonIntake) {
        if (anonStep) { sessionStorage.setItem(`pptides_coach_step_${user.id}`, anonStep); sessionStorage.removeItem('pptides_coach_step_anon'); }
        if (anonIntake) { sessionStorage.setItem(`pptides_coach_intake_${user.id}`, anonIntake); sessionStorage.removeItem('pptides_coach_intake_anon'); }
      }
    } catch { /* expected */ }
  }, [user?.id]);

  const isLoadingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  const normalizeDigits = (s: string) => s.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const setConsentGiven = useCallback(() => {
    try { localStorage.setItem(DEEPSEEK_CONSENT_KEY, 'true'); } catch { /* ok */ }
    setShowDeepSeekConsent(false);
  }, []);

  const sendToAI = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoadingRef.current) return;
    if (showDeepSeekConsent) setConsentGiven();
    isLoadingRef.current = true;
    events.coachMessage();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const userMsg: ChatMessage = { role: 'user', content: trimmed, timestamp: Date.now() };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    setInput('');
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* expected */ }
    setIsLoading(true);
    setLoadingStage(0);
    const stageTimer1 = setTimeout(() => setLoadingStage(1), 3000);
    const stageTimer2 = setTimeout(() => setLoadingStage(2), 8000);
    let streamTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const token = await getSessionToken();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          messages: updated.map(m => ({ role: m.role, content: m.content })),
          stream: true,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        let errMsg = String(res.status);
        try {
          const body = await res.json().catch(() => null);
          if (body?.error && typeof body.error === 'string') errMsg = `${res.status}:${body.error}`;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('text/event-stream') && !contentType.includes('text/plain')) {
        throw new Error('Unexpected response format');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';
      streamTimeout = setTimeout(() => controller.abort(), 60_000);

      setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }]);

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              const normalized = normalizeDigits(accumulated);
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: normalized };
                return copy;
              });
            }
          } catch { /* expected */ }
        }
        if (streamDone) break;
      }

      clearTimeout(streamTimeout);
      if (!accumulated) {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: '__ERROR__:500' };
          return copy;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const statusMatch = msg.match(/^(\d+)/);
      const status = statusMatch ? statusMatch[1] : '';
      const errorTag = status === '429' ? '__ERROR__:429' : status === '403' ? '__ERROR__:403' : status === '401' ? '__ERROR__:401' : status === '500' ? '__ERROR__:500' : '__ERROR__';
      setMessages(prev => {
        const filtered = prev.filter(m => !(m.role === 'assistant' && m.content === ''));
        if (filtered.length > 0 && filtered[filtered.length - 1].role === 'assistant') {
          filtered[filtered.length - 1] = { role: 'assistant', content: errorTag };
        } else {
          filtered.push({ role: 'assistant', content: errorTag });
        }
        return filtered;
      });
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      if (streamTimeout) clearTimeout(streamTimeout);
      setIsLoading(false);
      isLoadingRef.current = false;
      setLoadingStage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sendToAI intentionally stable
  }, []);

  useEffect(() => {
    const p = searchParams.get('peptide');
    if (!p || autoSentRef.current || !user || messages.length > 0) return;
    autoSentRef.current = true;
    setIntakeStep('done');
    (async () => {
      const ctx = await buildUserContext(user.id);
      userContextRef.current = ctx;
      const prompt = buildPeptideRequestPrompt(p, intake.goal || intake.experience || intake.injection ? intake : null, ctx);
      sendToAI(prompt);
    })().catch(() => {});
  }, [searchParams, user, sendToAI, messages.length, intake]);

  const submitIntake = useCallback(() => {
    if (intake.age) {
      const ageNum = parseInt(intake.age, 10);
      if (isNaN(ageNum) || ageNum < 16 || ageNum > 120) {
        toast.error('أدخل عمرًا بين 16 و 120');
        return;
      }
    }
    setIntakeStep('done');
    const prompt = buildIntakePrompt(intake, userContextRef.current);
    sendToAI(prompt);
  }, [intake, sendToAI]);

  const [confirmReset, setConfirmReset] = useState(false);
  const confirmResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (confirmResetTimer.current) clearTimeout(confirmResetTimer.current); }, []);

  const resetConversation = () => {
    setMessages([]);
    setIntakeStep('goal');
    setIntake({ goal: '', goalLabel: '', experience: '', injection: '', age: '', medications: '' });
    autoSentRef.current = false;
    try {
      localStorage.removeItem(storageKey);
      sessionStorage.removeItem(`pptides_coach_intake_${user?.id ?? 'anon'}`);
      sessionStorage.removeItem(stepStorageKey);
    } catch { /* expected */ }
    // Clear current conversation ID so next save creates a new row
    setConversationId(null);
    setConfirmReset(false);
  };

  const handleResetClick = () => {
    if (confirmReset) {
      resetConversation();
    } else {
      setConfirmReset(true);
      if (confirmResetTimer.current) clearTimeout(confirmResetTimer.current);
      confirmResetTimer.current = setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  const hasAccess = subscription.isProOrTrial;
  const isElite = hasAccess && subscription.tier === 'elite';
  const isTrial = subscription.isTrial;
  const limit = isElite ? Infinity : hasAccess && !isTrial ? 15 : isTrial ? 5 : 5;

  const userMsgCount = messages.filter(m => m.role === 'user').length;
  const limitReached = userMsgCount >= limit;

  const lastAI = [...messages].reverse().find(m => m.role === 'assistant');
  const peptideActions = lastAI ? extractPeptideActions(lastAI.content) : [];
  const aiMsgCount = messages.filter(m => m.role === 'assistant').length;
  const followUps = lastAI ? getFollowUps(lastAI.content, aiMsgCount <= 1) : [];

  return (
    <div className="min-h-screen animate-fade-in">
      <Helmet>
        <title>استشاري الببتيدات | بروتوكول مخصّص بالذكاء الاصطناعي | pptides</title>
        <meta name="description" content="استشاري الببتيدات بالذكاء الاصطناعي" />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content="استشاري الببتيدات | pptides" />
        <meta property="og:description" content="مدرب ذكي بالذكاء الاصطناعي يصمّم لك بروتوكول ببتيدات مخصّص" />
        <meta property="og:url" content={`${SITE_URL}/coach`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`${SITE_URL}/coach`} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'استشاري الببتيدات بالذكاء الاصطناعي',
          url: `${SITE_URL}/coach`,
          description: 'مدرب ذكي بالذكاء الاصطناعي يصمّم لك بروتوكول ببتيدات مخصّص.',
          applicationCategory: 'HealthApplication',
          operatingSystem: 'Web',
          inLanguage: 'ar',
        })}</script>
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Bot className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-lg font-bold">استشاري الببتيدات</h1>
              <p className="text-xs text-stone-500 dark:text-stone-300">
                {limit === Infinity
                  ? 'بروتوكول مخصّص لحالتك'
                  : userMsgCount === 0
                    ? 'اسأل أي سؤال عن الببتيدات'
                    : `${Math.max(0, limit - userMsgCount)} رسائل متبقية من ${limit}`}
              </p>
            </div>
          </div>
          {intakeStep === 'done' && messages.length === 0 && (
            <div className="text-xs text-stone-500 dark:text-stone-300">جاهز لمساعدتك</div>
          )}
          {intakeStep === 'done' && messages.length > 0 && (
            <button onClick={handleResetClick} className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors', confirmReset ? 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100' : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800')}>
              <RotateCcw className="h-3.5 w-3.5" />
              {confirmReset ? 'تأكيد' : 'استشارة جديدة'}
            </button>
          )}
        </div>

        {/* Coach History */}
        {user && (
          <CoachHistory
            onLoadConversation={(msgs) => {
              setMessages(msgs);
              setIntakeStep('done');
            }}
          />
        )}

        <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 overflow-hidden shadow-sm dark:shadow-stone-900/30">
          <div ref={scrollRef} role="log" aria-label="محادثة المدرب الذكي" aria-live="polite" className="min-h-[320px] max-h-[65dvh] overflow-y-auto p-5 space-y-4 bg-stone-50/50 dark:bg-stone-950/50">

            {/* Proactive Insights Banner — shows contextual insights based on user data */}
            {intakeStep === 'done' && messages.length === 0 && insights.length > 0 && (
              <CoachInsightsBanner
                insights={insights}
                onInsightClick={(text) => sendToAI(text)}
              />
            )}

            {/* DeepSeek consent — one-time */}
            {showDeepSeekConsent && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                <p className="font-medium">🔒 للإفصاح: يعتمد المدرب الذكي على نموذج DeepSeek AI لتوليد الردود. رسائلك تُعالَج على خوادمهم بشكل مشفّر — لا يتم تخزين بياناتك الشخصية أو مشاركتها مع أطراف ثالثة.</p>
                <button onClick={setConsentGiven} className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-400 underline hover:no-underline">فهمت — ابدأ المحادثة</button>
              </div>
            )}

            {/* ═══ INTAKE AS CONVERSATION ═══ */}
            {intakeStep !== 'done' && (
              <div className="space-y-4">
                {/* Coach greeting */}
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-5 py-3">
                    <p className="text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                      <strong>مرحبًا!</strong> أنا مستشارك المتخصص في الببتيدات العلاجية. سأساعدك في تصميم بروتوكول مخصّص بناءً على هدفك وحالتك.
                    </p>
                    <p className="mt-2 text-sm text-stone-800 dark:text-stone-200">اختر هدفك وسأصمّم لك بروتوكول مخصّص، أو <button onClick={() => setIntakeStep('done')} className="font-bold text-emerald-700 hover:underline">اسأل مباشرة</button></p>
                  </div>
                </div>

                {/* Step 1: Goal */}
                <div className="flex flex-wrap gap-2 max-w-[88%]">
                  {GOALS.map((g, idx) => (
                    <button key={g.id} onClick={() => { setIntake(p => ({ ...p, goal: g.id, goalLabel: g.label })); if (intakeStep === 'goal') setIntakeStep('experience'); }}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all',
                        // Even distribution: 2 per row on mobile, 3 per row on sm+, last item fills remaining
                        idx === GOALS.length - 1 && GOALS.length % 3 !== 0
                          ? 'flex-1 min-w-[calc(50%-4px)]'
                          : 'w-[calc(50%-4px)] sm:w-[calc(33.333%-6px)]',
                        intake.goal === g.id ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-100' : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 hover:border-emerald-300 dark:border-emerald-700')}>
                      <g.Icon className={cn('h-5 w-5', intake.goal === g.id ? 'text-emerald-700' : 'text-stone-500 dark:text-stone-300')} />
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-200">{g.label}</span>
                    </button>
                  ))}
                </div>
                {/* Persistent skip button — always visible during intake */}
                {intakeStep === 'goal' && (
                  <div className="max-w-[88%] flex justify-center mt-1">
                    <button
                      onClick={() => setIntakeStep('done')}
                      className="rounded-full border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2 text-xs font-medium text-stone-500 dark:text-stone-300 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                    >
                      ✍️ تخطّ الإعداد — اسأل مباشرة
                    </button>
                  </div>
                )}

                {/* User's goal answer + Coach's next question */}
                {(intakeStep === 'experience' || intakeStep === 'injection' || intakeStep === 'details') && (
                  <>
                    <div className="flex justify-start">
                      <div className="primary-gradient rounded-2xl rounded-br-md px-5 py-2.5">
                        <p className="text-sm font-bold text-white">{intake.goalLabel}</p>
                      </div>
                    </div>
                    <div className="flex justify-end animate-fade-up">
                      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-5 py-3">
                        <p className="text-sm text-stone-800 dark:text-stone-200">ممتاز — <strong>{intake.goalLabel}</strong>. لديّ بروتوكولات فعّالة لهذا الهدف. <strong>ما مستوى خبرتك مع الببتيدات؟</strong></p>
                      </div>
                    </div>
                    <div className="grid gap-2 max-w-[88%]">
                      {EXPERIENCE_OPTIONS.map(o => (
                        <button key={o.id} onClick={() => { setIntake(p => ({ ...p, experience: o.id })); if (intakeStep === 'experience') setIntakeStep('injection'); }}
                          className={cn('rounded-xl border px-4 py-3 text-start transition-all', intake.experience === o.id ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-100' : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 hover:border-emerald-300 dark:border-emerald-700')}>
                          <span className="text-sm font-bold text-stone-800 dark:text-stone-200">{o.label}</span>
                          <span className="block text-xs text-stone-500 dark:text-stone-300 mt-0.5">{o.desc}</span>
                        </button>
                      ))}
                      {intakeStep === 'experience' && (
                        <button onClick={() => setIntakeStep('goal')} className="mt-1 flex items-center gap-1 min-h-[44px] text-sm text-stone-500 dark:text-stone-300 hover:text-stone-800 dark:text-stone-200 transition-colors">
                          <ArrowRight className="h-3 w-3 shrink-0" /> رجوع
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* User's experience answer + Coach's injection question */}
                {(intakeStep === 'injection' || intakeStep === 'details') && (
                  <>
                    <div className="flex justify-start">
                      <div className="primary-gradient rounded-2xl rounded-br-md px-5 py-2.5">
                        <p className="text-sm font-bold text-white">{EXPERIENCE_OPTIONS.find(o => o.id === intake.experience)?.label}</p>
                      </div>
                    </div>
                    <div className="flex justify-end animate-fade-up">
                      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-5 py-3">
                        <p className="text-sm text-stone-800 dark:text-stone-200">
                          {intake.experience === 'beginner' ? 'ممتاز، سأختار لك خيارًا آمنًا وسهلًا للبداية.' : intake.experience === 'advanced' ? 'لديك خبرة — سأقدّم لك بروتوكولًا متقدمًا.' : 'جيد، لديك أساس نبني عليه.'}
                          {' '}<strong>هل تتقبّل الحقن؟</strong>
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2 max-w-[88%]">
                      {INJECTION_OPTIONS.map(o => (
                        <button key={o.id} onClick={() => { setIntake(p => ({ ...p, injection: o.id })); if (intakeStep === 'injection') setIntakeStep('details'); }}
                          className={cn('rounded-xl border px-4 py-3 text-start transition-all', intake.injection === o.id ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-100' : 'border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 hover:border-emerald-300 dark:border-emerald-700')}>
                          <span className="text-sm font-bold text-stone-800 dark:text-stone-200">{o.label}</span>
                          <span className="block text-xs text-stone-500 dark:text-stone-300 mt-0.5">{o.desc}</span>
                        </button>
                      ))}
                      {intakeStep === 'injection' && (
                        <button onClick={() => setIntakeStep('experience')} className="mt-1 flex items-center gap-1 min-h-[44px] text-sm text-stone-500 dark:text-stone-300 hover:text-stone-800 dark:text-stone-200 transition-colors">
                          <ArrowRight className="h-3 w-3 shrink-0" /> رجوع
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* User's injection answer + Optional details + Submit */}
                {intakeStep === 'details' && (
                  <>
                    <div className="flex justify-start">
                      <div className="primary-gradient rounded-2xl rounded-br-md px-5 py-2.5">
                        <p className="text-sm font-bold text-white">{INJECTION_OPTIONS.find(o => o.id === intake.injection)?.label}</p>
                      </div>
                    </div>
                    <div className="flex justify-end animate-fade-up">
                      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-5 py-3">
                        <p className="text-sm text-stone-800 dark:text-stone-200">لدي صورة واضحة الآن. آخر شي — إذا أردت أن تعطيني عمرك أو أي أدوية تتناولها، سيكون البروتوكول أدق. <strong>أو اضغط "صمّم بروتوكولي" مباشرة.</strong></p>
                      </div>
                    </div>
                    <div className="animate-fade-up space-y-3 max-w-[88%]">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor="coach-age" className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-300">العمر تقريبًا</label>
                          <input id="coach-age" type="number" inputMode="numeric" min={16} max={120} value={intake.age} onChange={e => setIntake(p => ({ ...p, age: e.target.value }))} placeholder="مثال: 32" dir="ltr" className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2.5 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900" />
                        </div>
                        <div>
                          <label htmlFor="coach-medications" className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-300">أدوية أو مكملات حالية</label>
                          <input id="coach-medications" type="text" value={intake.medications} onChange={e => setIntake(p => ({ ...p, medications: e.target.value }))} placeholder="مثال: فيتامين D، كرياتين" className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-2.5 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900" />
                        </div>
                      </div>
                      <button onClick={submitIntake} disabled={isLoading}
                        className={cn("w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]", isLoading && "opacity-60 cursor-not-allowed")}>
                        <Bot className="h-4 w-4" />
                        صمّم بروتوكولي المخصّص
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <button onClick={() => setIntakeStep('injection')} className="mt-1 flex items-center gap-1 min-h-[44px] text-sm text-stone-500 dark:text-stone-300 hover:text-stone-800 dark:text-stone-200 transition-colors">
                        <ArrowRight className="h-3 w-3 shrink-0" /> رجوع
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══ CHAT MESSAGES ═══ */}
            {intakeStep === 'done' && messages.map((msg, i) => (
              <div key={`${msg.role}-${i}`}>
                <div className={cn('flex', msg.role === 'user' ? 'justify-start' : 'justify-end')}>
                  {msg.role === 'user' && (
                    <div className="ms-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      {user?.email?.charAt(0).toUpperCase() ?? '؟'}
                    </div>
                  )}
                  <div className={cn('max-w-[88%] rounded-2xl px-5 py-3', msg.role === 'user' ? 'primary-gradient rounded-br-md' : 'rounded-bl-md border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900')}>
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">{
                        msg.content.startsWith('USER PROFILE')
                          ? `هدفي: ${intake.goalLabel || 'استشارة عامة'}`
                          : msg.content
                      }</p>
                    ) : msg.content.startsWith('__ERROR') ? (
                      <div className="text-sm text-stone-800 dark:text-stone-200">
                        <p className="mb-2">{
                          msg.content === '__ERROR__:429' ? `⏱️ وصلت إلى حد الرسائل. Elite يعطيك استشارات بلا حدود — ${PRICING.elite.label}/شهر، ${TRIAL_DAYS} أيام مجانًا.` :
                          msg.content === '__ERROR__:403' ? '🔑 انتهت صلاحية جلستك — أعد تسجيل الدخول للمتابعة.' :
                          msg.content === '__ERROR__:401' ? '🔐 سجّل دخولك أولًا للاستفادة من المدرب الذكي.' :
                          msg.content === '__ERROR__:500' ? '⚠️ خدمة المدرب الذكي غير متاحة حاليًا — حاول مرة أخرى بعد لحظات.' :
                          '⚠️ خدمة المدرب الذكي غير متاحة حاليًا — حاول مرة أخرى لاحقًا'
                        }</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.content === '__ERROR__:429' && (
                            <Link
                              to={user ? '/pricing?plan=elite' : '/signup?redirect=/pricing'}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                            >
                              <Crown className="h-3 w-3" />
                              {user ? `ترقية إلى Elite — ${PRICING.elite.label}/شهر` : `ابدأ مجانًا — ${TRIAL_DAYS} أيام`}
                            </Link>
                          )}
                          {(msg.content === '__ERROR__:403' || msg.content === '__ERROR__:401') && (
                            <Link
                              to="/login"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100"
                            >
                              تسجيل الدخول
                            </Link>
                          )}
                          {msg.content !== '__ERROR__:429' && (
                            <button
                              onClick={() => {
                                // FIX: `cleaned` must exclude the user message that triggered the
                                // error (at i-1), not just the error itself (at i). The old code kept
                                // the user message in `cleaned` then `sendToAI` appended it again,
                                // duplicating it in conversation history.
                                const lastUserIdx = messages
                                  .slice(0, i)
                                  .reduce((acc, m, idx) => (m.role === 'user' ? idx : acc), -1);
                                if (lastUserIdx >= 0) {
                                  const cleaned = messages.slice(0, lastUserIdx);
                                  setMessages(cleaned);
                                  messagesRef.current = cleaned;
                                  sendToAI(messages[lastUserIdx].content);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs font-bold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                            >
                              <RotateCcw className="h-3 w-3" />
                              إعادة المحاولة
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed text-stone-800 dark:text-stone-200" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        <MarkdownBubble content={msg.content} />
                        {isLoading && i === messages.length - 1 && msg.content.length > 0 && (
                          <span className="inline-block w-2 h-4 bg-emerald-600 animate-pulse align-text-bottom me-0.5" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Timestamp */}
                {msg.timestamp && !msg.content.startsWith('__ERROR') && (
                  <p className={cn('mt-1 text-[10px] text-stone-400 dark:text-stone-500', msg.role === 'user' ? 'text-start ms-9' : 'text-end max-w-[88%] ms-auto')}>
                    {formatMessageTime(msg.timestamp)}
                  </p>
                )}
                {msg.role === 'assistant' && !msg.content.startsWith('__ERROR') && (
                  <p className="mt-0.5 text-[10px] text-stone-400 dark:text-stone-500 text-end max-w-[88%] ms-auto">هذه معلومات تعليمية وليست نصيحة طبية — استشر طبيبك</p>
                )}
                {/* Action pills: for non-last messages, show Copy + WhatsApp only */}
                {msg.role === 'assistant' && !isLoading && msg.content.length > 50 && i !== messages.length - 1 && (
                  <div className="mt-1.5 flex justify-end gap-1.5">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(msg.content);
                          setCopiedIdx(i);
                          toast.success('تم النسخ');
                          setTimeout(() => setCopiedIdx(null), 2000);
                        } catch {
                          toast.error('تعذّر نسخ المحتوى إلى الحافظة');
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:text-stone-200"
                    >
                      {copiedIdx === i ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      {copiedIdx === i ? 'تم' : 'نسخ'}
                    </button>
                    <button
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          const rendered = renderMarkdownToHtml(msg.content);
                          printWindow.document.write(`
                            <html dir="rtl"><head><title>بروتوكول pptides</title>
                            <style>body{font-family:Arial,sans-serif;padding:40px;line-height:1.8;color:#1c1917;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #e7e5e4;padding:6px 10px;}th{background:#f5f5f4;font-weight:bold;}h3,h4{margin-top:1rem;}strong{font-weight:bold;}</style></head>
                            <body>${rendered}<p style="margin-top:2rem;font-size:12px;color:#a8a29e;">محتوى تعليمي بحثي — استشر طبيبك قبل استخدام أي ببتيد | pptides.com</p></body></html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                    >
                      <Printer className="h-3 w-3" /> طباعة
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`بروتوكول من pptides:\n\n${msg.content.slice(0, 500)}\n\nاقرأ المزيد: ${SITE_URL}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      واتساب
                    </a>
                  </div>
                )}
                {/* Last message: two-row layout — Row 1 primary, Row 2 secondary (scrollable) */}
                {msg.role === 'assistant' && i === messages.length - 1 && !isLoading && msg.content.length > 50 && (
                  <div className="mt-2 flex flex-col gap-2 max-w-[88%] ms-auto">
                    {/* Row 1 — Primary: نسخ, واتساب, ابدأ بروتوكول */}
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(msg.content);
                            setCopiedIdx(i);
                            toast.success('تم النسخ');
                            setTimeout(() => setCopiedIdx(null), 2000);
                          } catch {
                            toast.error('تعذّر نسخ المحتوى إلى الحافظة');
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:text-stone-200"
                      >
                        {copiedIdx === i ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        {copiedIdx === i ? 'تم' : 'نسخ'}
                      </button>
                      <button
                        onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            const rendered = renderMarkdownToHtml(msg.content);
                            printWindow.document.write(`
                              <html dir="rtl"><head><title>بروتوكول pptides</title>
                              <style>body{font-family:Arial,sans-serif;padding:40px;line-height:1.8;color:#1c1917;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #e7e5e4;padding:6px 10px;}th{background:#f5f5f4;font-weight:bold;}h3,h4{margin-top:1rem;}strong{font-weight:bold;}</style></head>
                              <body>${rendered}<p style="margin-top:2rem;font-size:12px;color:#a8a29e;">محتوى تعليمي بحثي — استشر طبيبك قبل استخدام أي ببتيد | pptides.com</p></body></html>
                            `);
                            printWindow.document.close();
                            printWindow.print();
                          }
                        }}
                        className="flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                      >
                        <Printer className="h-3 w-3" /> طباعة
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`بروتوكول من pptides:\n\n${msg.content.slice(0, 500)}\n\nاقرأ المزيد: ${SITE_URL}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        واتساب
                      </a>
                      {peptideActions.length > 0 && (
                        <button onClick={() => setProtocolWizardPeptide(peptideActions[0].id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 shrink-0">
                          <Play className="h-3 w-3" />ابدأ بروتوكول
                        </button>
                      )}
                    </div>
                    {/* Divider + Row 2 — Secondary contextual (horizontally scrollable) */}
                    <div className="border-t border-stone-200 dark:border-stone-600 pt-2">
                      <div className="overflow-x-auto flex flex-nowrap gap-1.5 pb-0.5 -mx-0.5">
                        {peptideActions.map(p => (
                          <Link key={p.id} to={`/peptide/${p.id}`} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                            <FlaskConical className="h-3 w-3" />{p.nameAr}
                          </Link>
                        ))}
                        {peptideActions.length > 0 && (
                          <Link to={`/calculator?peptide=${encodeURIComponent(peptideActions[0]?.nameEn ?? '')}`} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-2.5 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 shrink-0">
                            <Calculator className="h-3 w-3" />احسب الجرعة
                          </Link>
                        )}
                        {peptideActions.length >= 2 && (
                          <Link to="/interactions" className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-2.5 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 shrink-0">
                            <Shield className="h-3 w-3" />فحص التعارض
                          </Link>
                        )}
                        {peptideActions.length > 0 && (
                          <Link to={`/tracker?peptide=${encodeURIComponent(peptideActions[0]?.nameEn ?? '')}`} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-2.5 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 shrink-0">
                            <Sparkles className="h-3 w-3" />سجّل حقنة
                          </Link>
                        )}
                        <Link to="/guide" className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-2.5 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800 shrink-0">
                          <BookOpen className="h-3 w-3" />دليل الحقن
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content === '' && (
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-bl-md border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-5 py-4 min-w-0 sm:min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-stone-500 dark:text-stone-300">
                      {loadingStage === 0 ? 'يحلّل حالتك...' : loadingStage === 1 ? 'يبني البروتوكول...' : 'يحسب الجرعات...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ INPUT AREA ═══ */}
          {intakeStep === 'done' && (
            <div className="border-t border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-4">
              {limitReached ? (
                subscription.tier === 'essentials' ? (
                <div className="rounded-xl border-2 border-emerald-400 bg-gradient-to-b from-emerald-50 to-white dark:to-stone-950 p-6 text-center shadow-sm dark:shadow-stone-900/30">
                  <Crown className="mx-auto mb-3 h-8 w-8 text-emerald-700" />
                  <p className="text-lg font-bold text-stone-900 dark:text-stone-100">لقد وصلت للحد الأقصى</p>
                  <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">ترقَّ إلى Elite لاستشارات بلا حدود</p>
                  <Link to="/pricing?plan=elite" className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
                    <Crown className="h-4 w-4" />
                    ترقية إلى Elite
                  </Link>
                </div>
                ) : (
                <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-5 text-center">
                  <Sparkles className="mx-auto mb-2 h-6 w-6 text-emerald-700" />
                  <p className="font-bold text-stone-900 dark:text-stone-100">{hasAccess ? 'وصلت حد الأسئلة لهذه الجلسة' : 'أعجبتك الاستشارة؟'}</p>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{!isElite && (hasAccess ? 'ترقَّ إلى Elite لاستشارات بلا حدود.' : `اشترك لاستشارات مخصّصة بلا حدود — ${TRIAL_DAYS} أيام مجانًا`)}</p>
                  {!isElite && <button onClick={async () => { try { if (hasAccess) await upgradeTo('elite'); else navigate(user ? '/pricing' : '/signup?redirect=/pricing'); } catch { /* non-blocking */ } }} className="mt-3 rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">{hasAccess ? 'ترقَّ إلى Elite' : `اشترك — ${PRICING.essentials.label}/شهر`}</button>}
                </div>
                )
              ) : (
                <>
                  {/* Conversation starters — when chat is empty */}
                  {messages.length === 0 && !isLoading && (
                    <div className="mb-4">
                      <p className="text-sm font-bold text-stone-600 dark:text-stone-300 mb-3 text-center">ابدأ محادثتك مع المدرب الذكي</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {conversationStarters.map(q => (
                          <button
                            key={q}
                            onClick={() => sendToAI(q)}
                            disabled={isLoading}
                            className={cn(
                              "rounded-full border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-stone-900 px-4 py-2.5 min-h-[44px] text-sm font-medium text-emerald-700 dark:text-emerald-400 transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-sm active:scale-[0.97]",
                              isLoading && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {followUps.length > 0 && !isLoading && userMsgCount > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5 justify-center">
                      {followUps.map(q => (
                        <button key={q} onClick={() => sendToAI(q)} disabled={isLoading} className={cn("rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 min-h-[44px] text-xs font-medium text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30", isLoading && "opacity-50 cursor-not-allowed")}>{q}</button>
                      ))}
                    </div>
                  )}
                  {!isElite && userMsgCount > 0 && limit - userMsgCount > 0 && (
                    <p className="mb-2 text-center text-xs text-stone-500 dark:text-stone-300">{arPlural(limit - userMsgCount, 'سؤال متبقي', 'سؤالان متبقيان', 'أسئلة متبقية')}</p>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-end gap-3">
                      <textarea value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendToAI(input); } }}
                        onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
                        placeholder="اكتب سؤالك هنا..." rows={2} maxLength={2000} disabled={isLoading}
                        dir="rtl"
                        aria-label="اكتب رسالتك"
                        className={cn('flex-1 resize-none rounded-xl border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 focus:border-emerald-300 dark:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900', isLoading && 'opacity-60')} />
                      <button onClick={() => sendToAI(input)} disabled={!input.trim() || isLoading}
                        className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 transition-all', input.trim() && !isLoading ? 'hover:bg-emerald-700 active:scale-[0.98]' : 'opacity-40')}>
                        <Send className="h-5 w-5 text-white" /><span className="sr-only">إرسال</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-400 dark:text-stone-500 text-start px-1">
                      ⏎ Enter للإرسال · Shift+Enter لسطر جديد
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-stone-500 dark:text-stone-300">المدرب الذكي يقدم معلومات تعليمية فقط — استشر طبيبك دائماً</p>
      </div>
      {protocolWizardPeptide && (
        <ProtocolWizard peptideId={protocolWizardPeptide} onClose={() => setProtocolWizardPeptide(null)} />
      )}
    </div>
  );
}
