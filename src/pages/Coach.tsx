import { useState, useRef, useEffect, useCallback, memo, useMemo, type ElementType } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { peptides as allPeptides } from '@/data/peptides';
import { renderMarkdown } from '@/lib/markdown';
import {
  Bot, Send, Sparkles, TrendingDown, Heart, Dumbbell, Brain,
  Clock, Zap, Calculator, FlaskConical, Shield, RotateCcw, ArrowLeft, ArrowRight,
  Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, arPlural } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';


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

interface ChatMessage { role: 'user' | 'assistant'; content: string }

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
  { id: 'yes', label: 'نعم، عادي', desc: 'حقن تحت الجلد ما عندي مشكلة فيها' },
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
  } catch { /* expected */ }
  return ctx;
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
  prompt += `\nGive the full personalized protocol NOW using the format in your instructions. Reply in Gulf Arabic. Do NOT ask questions — give the protocol immediately.`;
  return prompt;
}

async function getSessionToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

function getFollowUps(text: string, isFirstProtocol: boolean): string[] {
  if (!isFirstProtocol) {
    return [
      'وش لو حسّيت بأعراض جانبية؟',
      'كيف أحسّن النتائج أكثر؟',
      'صمّم لي جدول يومي كامل',
    ];
  }

  const actions: string[] = [];

  actions.push('اكتب لي قائمة تسوّق كاملة — وش أشتري بالضبط مع الكميات');
  actions.push('صمّم لي جدول أسبوعي كامل بالمواعيد والجرعات');

  const t = text.toLowerCase();
  if (t.includes('bpc') || t.includes('tb-500'))
    actions.push('وين بالضبط أحقن لإصابتي؟ ارسم لي خريطة');
  else if (t.includes('tesamorelin') || t.includes('aod'))
    actions.push('وش النظام الغذائي اللي يعزّز النتيجة؟');
  else if (t.includes('semax') || t.includes('selank'))
    actions.push('وش أفضل ستاك نوتروبيكس أجمعه معاه؟');
  else if (t.includes('cjc') || t.includes('ipamorelin'))
    actions.push('صمّم لي بروتوكول نوم يعزّز إفراز هرمون النمو');
  else
    actions.push('وش أضيف لتحسين النتيجة — ستاك ثاني؟');

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

  const storageKey = `pptides_coach_${user?.id ?? 'anon'}`;

  function loadQuizAnswers(): { goal: string; experience: string; injection: string } | null {
    try {
      const raw = localStorage.getItem('pptides_quiz_answers');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - (data.ts ?? 0) > 24 * 60 * 60 * 1000) return null;
      return data;
    } catch { return null; }
  }

  const [intakeStep, setIntakeStep] = useState<IntakeStep>(() => {
    try {
      const s = localStorage.getItem(storageKey);
      if (s) { const d = JSON.parse(s); if (d.messages?.length > 0) return 'done'; }
    } catch { /* expected */ }
    const quiz = loadQuizAnswers();
    if (quiz?.goal && quiz?.experience && quiz?.injection) return 'details';
    return 'goal';
  });
  const [intake, setIntake] = useState<IntakeData>(() => {
    try {
      const s = localStorage.getItem(storageKey);
      if (s) return JSON.parse(s).intake ?? { goal: '', goalLabel: '', experience: '', injection: '', age: '', medications: '' };
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
  const [input, setInput] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userContextRef = useRef('');
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    let cleanMessages = messages.filter(m => !m.content.startsWith('__ERROR'));
    if (cleanMessages.length > 50) cleanMessages = cleanMessages.slice(-50);
    try { localStorage.setItem(storageKey, JSON.stringify({ messages: cleanMessages, intake })); } catch { /* expected */ }
  }, [messages, intake, storageKey, isLoading]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, intakeStep]);
  useEffect(() => { if (user) buildUserContext(user.id).then(ctx => { userContextRef.current = ctx; }).catch(() => {}); }, [user]);

  const isLoadingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  const normalizeDigits = (s: string) => s.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  const abortRef = useRef<AbortController | null>(null);
  const hasAccessRef = useRef(false);
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const sendToAI = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoadingRef.current) return;
    isLoadingRef.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    setInput('');
    setIsLoading(true);
    setLoadingStage(0);
    const stageTimer1 = setTimeout(() => setLoadingStage(1), 3000);
    const stageTimer2 = setTimeout(() => setLoadingStage(2), 8000);
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
      if (!res.ok) throw new Error(String(res.status));

      const reader = res.body?.getReader();
      if (!reader) throw new Error();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';
      const streamTimeout = setTimeout(() => controller.abort(), 60_000);

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
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
      }

      clearTimeout(streamTimeout);
      if (!accumulated) {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: 'لم أتمكن من إنشاء رد. حاول مرة أخرى بصياغة مختلفة.' };
          return copy;
        });
      }
    } catch (err) {
      const status = err instanceof Error ? err.message : '';
      const errorTag = status === '429' ? '__ERROR__:429' : status === '403' ? '__ERROR__:403' : '__ERROR__';
      setMessages(prev => {
        const copy = [...prev];
        if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
          copy[copy.length - 1] = { role: 'assistant', content: errorTag };
        } else {
          copy.push({ role: 'assistant', content: errorTag });
        }
        return copy;
      });
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setIsLoading(false);
      isLoadingRef.current = false;
      setLoadingStage(0);
    }
  }, []);

  useEffect(() => {
    const p = searchParams.get('peptide');
    if (p && !autoSentRef.current && user) {
      autoSentRef.current = true;
      setIntakeStep('done');
      sendToAI(`أبغى بروتوكول كامل لـ ${p} — الجرعة، التوقيت، المدة، التحاليل، والتكلفة.`);
    }
  }, [searchParams, user, sendToAI]);

  const submitIntake = useCallback(() => {
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
    try { localStorage.removeItem(storageKey); } catch { /* expected */ }
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
  const limit = isElite ? Infinity : hasAccess && !isTrial ? 15 : isTrial ? 5 : 3;

  hasAccessRef.current = hasAccess;
  const userMsgCount = messages.filter(m => m.role === 'user').length;
  const limitReached = userMsgCount >= limit;

  const lastAI = [...messages].reverse().find(m => m.role === 'assistant');
  const peptideActions = lastAI ? extractPeptideActions(lastAI.content) : [];
  const aiMsgCount = messages.filter(m => m.role === 'assistant').length;
  const followUps = lastAI ? getFollowUps(lastAI.content, aiMsgCount <= 1) : [];

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>استشاري الببتيدات | بروتوكول مخصّص بالذكاء الاصطناعي | pptides</title>
        <meta name="description" content="مدرب ذكي بالذكاء الاصطناعي يصمّم لك بروتوكول ببتيدات مخصّص حسب أهدافك وخبرتك. AI-powered peptide protocol coach." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Bot className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold">استشاري الببتيدات</h1>
              <p className="text-xs text-stone-500">
                {limit === Infinity ? 'بروتوكول مخصّص لحالتك' : `${Math.max(0, limit - userMsgCount)} رسائل متبقية من ${limit}`}
              </p>
            </div>
          </div>
          {intakeStep === 'done' && messages.length > 0 && (
            <button onClick={handleResetClick} className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors', confirmReset ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50')}>
              <RotateCcw className="h-3.5 w-3.5" />
              {confirmReset ? 'تأكيد' : 'استشارة جديدة'}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
          <div ref={scrollRef} role="log" aria-label="محادثة المدرب الذكي" className="max-h-[65vh] min-h-[360px] overflow-y-auto p-5 space-y-4 bg-stone-50/50">

            {/* ═══ INTAKE AS CONVERSATION ═══ */}
            {intakeStep !== 'done' && (
              <div className="space-y-4">
                {/* Coach greeting */}
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-stone-200 bg-white px-5 py-3">
                    <p className="text-sm leading-relaxed text-stone-800">
                      <strong>أهلًا!</strong> أنا مستشارك المتخصص في الببتيدات البحثية. عندي خبرة 10 سنوات أساعد ناس يحققون نتائج حقيقية.
                    </p>
                    <p className="mt-2 text-sm text-stone-800">خلنا نبدأ — <strong>وش هدفك الأساسي؟</strong></p>
                  </div>
                </div>

                {/* Step 1: Goal */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 max-w-[88%]">
                  {GOALS.map(g => (
                    <button key={g.id} onClick={() => { setIntake(p => ({ ...p, goal: g.id, goalLabel: g.label })); if (intakeStep === 'goal') setIntakeStep('experience'); }}
                      className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all', intake.goal === g.id ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100' : 'border-stone-200 bg-white hover:border-emerald-300')}>
                      <g.Icon className={cn('h-5 w-5', intake.goal === g.id ? 'text-emerald-600' : 'text-stone-400')} />
                      <span className="text-xs font-bold text-stone-800">{g.label}</span>
                    </button>
                  ))}
                </div>

                {/* User's goal answer + Coach's next question */}
                {(intakeStep === 'experience' || intakeStep === 'injection' || intakeStep === 'details') && (
                  <>
                    <div className="flex justify-start">
                      <div className="gold-gradient rounded-2xl rounded-br-md px-5 py-2.5">
                        <p className="text-sm font-bold text-white">{intake.goalLabel}</p>
                      </div>
                    </div>
                    <div className="flex justify-end animate-fade-up">
                      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-stone-200 bg-white px-5 py-3">
                        <p className="text-sm text-stone-800">تمام، <strong>{intake.goalLabel}</strong>. عندي بروتوكولات ممتازة لهذا الهدف. <strong>ما مستوى خبرتك مع الببتيدات؟</strong></p>
                      </div>
                    </div>
                    <div className="grid gap-2 max-w-[88%]">
                      {EXPERIENCE_OPTIONS.map(o => (
                        <button key={o.id} onClick={() => { setIntake(p => ({ ...p, experience: o.id })); if (intakeStep === 'experience') setIntakeStep('injection'); }}
                          className={cn('rounded-xl border px-4 py-3 text-right transition-all', intake.experience === o.id ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100' : 'border-stone-200 bg-white hover:border-emerald-300')}>
                          <span className="text-sm font-bold text-stone-800">{o.label}</span>
                          <span className="block text-xs text-stone-500 mt-0.5">{o.desc}</span>
                        </button>
                      ))}
                      {intakeStep === 'experience' && (
                        <button onClick={() => setIntakeStep('goal')} className="mt-1 flex items-center gap-1 min-h-[44px] text-sm text-stone-500 hover:text-stone-800 transition-colors">
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
                      <div className="gold-gradient rounded-2xl rounded-br-md px-5 py-2.5">
                        <p className="text-sm font-bold text-white">{EXPERIENCE_OPTIONS.find(o => o.id === intake.experience)?.label}</p>
                      </div>
                    </div>
                    <div className="flex justify-end animate-fade-up">
                      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-stone-200 bg-white px-5 py-3">
                        <p className="text-sm text-stone-800">
                          {intake.experience === 'beginner' ? 'ممتاز، رح أختار لك شي آمن وسهل للبداية.' : intake.experience === 'advanced' ? 'عندك خبرة — رح أعطيك بروتوكول متقدم.' : 'جيد، عندك أساس نبني عليه.'}
                          {' '}<strong>هل تتقبّل الحقن؟</strong>
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2 max-w-[88%]">
                      {INJECTION_OPTIONS.map(o => (
                        <button key={o.id} onClick={() => { setIntake(p => ({ ...p, injection: o.id })); if (intakeStep === 'injection') setIntakeStep('details'); }}
                          className={cn('rounded-xl border px-4 py-3 text-right transition-all', intake.injection === o.id ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100' : 'border-stone-200 bg-white hover:border-emerald-300')}>
                          <span className="text-sm font-bold text-stone-800">{o.label}</span>
                          <span className="block text-xs text-stone-500 mt-0.5">{o.desc}</span>
                        </button>
                      ))}
                      {intakeStep === 'injection' && (
                        <button onClick={() => setIntakeStep('experience')} className="mt-1 flex items-center gap-1 min-h-[44px] text-sm text-stone-500 hover:text-stone-800 transition-colors">
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
                      <div className="gold-gradient rounded-2xl rounded-br-md px-5 py-2.5">
                        <p className="text-sm font-bold text-white">{INJECTION_OPTIONS.find(o => o.id === intake.injection)?.label}</p>
                      </div>
                    </div>
                    <div className="flex justify-end animate-fade-up">
                      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-stone-200 bg-white px-5 py-3">
                        <p className="text-sm text-stone-800">عندي صورة واضحة الحين. آخر شي — لو تبي تعطيني عمرك أو أي أدوية تأخذها، رح يكون البروتوكول أدق. <strong>أو اضغط "صمّم بروتوكولي" مباشرة.</strong></p>
                      </div>
                    </div>
                    <div className="animate-fade-up space-y-3 max-w-[88%]">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-stone-600">العمر تقريبًا</label>
                          <input type="number" inputMode="numeric" min={16} max={120} value={intake.age} onChange={e => setIntake(p => ({ ...p, age: e.target.value }))} placeholder="مثال: 32" dir="ltr" className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-stone-600">أدوية أو مكملات حالية</label>
                          <input type="text" value={intake.medications} onChange={e => setIntake(p => ({ ...p, medications: e.target.value }))} placeholder="مثال: فيتامين D، كرياتين" className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                        </div>
                      </div>
                      <button onClick={submitIntake} disabled={isLoading}
                        className={cn("w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]", isLoading && "opacity-60 cursor-not-allowed")}>
                        <Bot className="h-4 w-4" />
                        صمّم بروتوكولي المخصّص
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <button onClick={() => setIntakeStep('injection')} className="mt-1 flex items-center gap-1 min-h-[44px] text-sm text-stone-500 hover:text-stone-800 transition-colors">
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
                      {user?.email?.charAt(0).toUpperCase() ?? ''}
                    </div>
                  )}
                  <div className={cn('max-w-[88%] rounded-2xl px-5 py-3', msg.role === 'user' ? 'gold-gradient rounded-br-md' : 'rounded-bl-md border border-stone-200 bg-white')}>
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">{
                        msg.content.startsWith('USER PROFILE')
                          ? `هدفي: ${intake.goalLabel || 'استشارة عامة'}`
                          : msg.content
                      }</p>
                    ) : msg.content.startsWith('__ERROR') ? (
                      <div className="text-sm text-stone-800">
                        <p className="mb-2">{
                          msg.content === '__ERROR__:429' ? 'لقد تجاوزت الحد المسموح. حاول بعد قليل.' :
                          msg.content === '__ERROR__:403' ? 'انتهت صلاحية جلستك. أعد تسجيل الدخول.' :
                          'حدث خطأ في الاتصال. حاول مرة أخرى.'
                        }</p>
                        <button
                          onClick={() => {
                            const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                            if (lastUserMsg) {
                              setMessages(prev => prev.filter((_, idx) => idx < i));
                              sendToAI(lastUserMsg.content);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                          <RotateCcw className="h-3 w-3" />
                          إعادة المحاولة
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed text-stone-800">
                        <MarkdownBubble content={msg.content} />
                        {isLoading && i === messages.length - 1 && msg.content.length > 0 && (
                          <span className="inline-block w-2 h-4 bg-emerald-600 animate-pulse align-text-bottom me-0.5" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {msg.role === 'assistant' && !isLoading && msg.content.length > 50 && (
                  <div className="mt-1.5 flex justify-end gap-1.5">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(msg.content);
                          setCopiedIdx(i);
                          toast.success('تم النسخ');
                          setTimeout(() => setCopiedIdx(null), 2000);
                        } catch {
                          toast.error('تعذّر النسخ');
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
                    >
                      {copiedIdx === i ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      {copiedIdx === i ? 'تم' : 'نسخ'}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent('استشرت مدرب الببتيدات في pptides.com — جرّبه مجانًا: https://pptides.com/coach')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      واتساب
                    </a>
                  </div>
                )}
                {msg.role === 'assistant' && i === messages.length - 1 && !isLoading && msg.content.length > 50 && (
                  <div className="mt-2 flex justify-end">
                    <div className="flex flex-wrap gap-1.5 max-w-[88%]">
                      {peptideActions.map(p => (
                        <Link key={p.id} to={`/peptide/${p.id}`} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100">
                          <FlaskConical className="h-3 w-3" />{p.nameAr}
                        </Link>
                      ))}
                      {peptideActions.length > 0 && (
                        <Link to={`/calculator?peptide=${encodeURIComponent(peptideActions[0]?.nameEn ?? '')}`} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50">
                          <Calculator className="h-3 w-3" />احسب الجرعة
                        </Link>
                      )}
                      {peptideActions.length >= 2 && (
                        <Link to="/interactions" className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50">
                          <Shield className="h-3 w-3" />فحص التعارض
                        </Link>
                      )}
                      {peptideActions.length > 0 && (
                        <Link to={`/tracker?peptide=${encodeURIComponent(peptideActions[0]?.nameEn ?? '')}`} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50">
                          <Sparkles className="h-3 w-3" />ابدأ التتبّع
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content === '' && (
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-5 py-4 min-w-0 sm:min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-stone-500">
                      {loadingStage === 0 ? 'يحلّل حالتك...' : loadingStage === 1 ? 'يبني البروتوكول...' : 'يحسب الجرعات...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ INPUT AREA ═══ */}
          {intakeStep === 'done' && (
            <div className="border-t border-stone-200 bg-white p-4">
              {limitReached ? (
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5 text-center">
                  <Sparkles className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
                  <p className="font-bold text-stone-900">{hasAccess ? 'وصلت حد الأسئلة لهذه الجلسة' : 'أعجبتك الاستشارة؟'}</p>
                  <p className="mt-1 text-sm text-stone-600">{!isElite && (hasAccess ? 'ترقَّ إلى Elite لاستشارات بلا حدود.' : 'اشترك للحصول على استشارات مخصّصة.')}</p>
                  {!isElite && <button onClick={() => hasAccess ? upgradeTo('elite') : navigate('/pricing')} className="mt-3 rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">{hasAccess ? 'ترقَّ إلى Elite' : 'اشترك الآن'}</button>}
                </div>
              ) : (
                <>
                  {followUps.length > 0 && !isLoading && userMsgCount > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5 justify-center">
                      {followUps.map(q => (
                        <button key={q} onClick={() => sendToAI(q)} disabled={isLoading} className={cn("rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100", isLoading && "opacity-50 cursor-not-allowed")}>{q}</button>
                      ))}
                    </div>
                  )}
                  {!isElite && userMsgCount > 0 && (
                    <p className="mb-2 text-center text-xs text-stone-400">{arPlural(limit - userMsgCount, 'سؤال متبقي', 'سؤالان متبقيان', 'أسئلة متبقية')}</p>
                  )}
                  <div className="flex items-end gap-3">
                    <textarea value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendToAI(input); } }}
                      onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
                      placeholder="اسأل المزيد عن البروتوكول..." rows={1} disabled={isLoading}
                      aria-label="اكتب رسالتك"
                      className={cn('flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100', isLoading && 'opacity-60')} />
                    <button onClick={() => sendToAI(input)} disabled={!input.trim() || isLoading}
                      className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 transition-all', input.trim() && !isLoading ? 'hover:bg-emerald-700' : 'opacity-40')}>
                      <Send className="h-5 w-5 text-white" /><span className="sr-only">إرسال</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-stone-400">محتوى تعليمي بحثي — استشر طبيبك قبل استخدام أي ببتيد</p>
      </div>
    </div>
  );
}
