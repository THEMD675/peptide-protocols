import { useState, useRef, useEffect, useCallback, type ElementType } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { peptides as allPeptides } from '@/data/peptides';
import {
  Bot, Send, Sparkles, TrendingDown, Heart, Dumbbell, Brain,
  Clock, Zap, Calculator, FlaskConical, Shield, RotateCcw, ArrowLeft,
} from 'lucide-react';
import { cn, arPlural } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let tableRows: string[][] = [];

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const inlineMd = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-stone-900">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="rounded bg-stone-200 px-1 py-0.5 text-xs font-mono">$1</code>');

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-2 space-y-1 pr-4">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span dangerouslySetInnerHTML={{ __html: inlineMd(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      elements.push(
        <div key={`tbl-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <tbody>
              {tableRows.map((cells, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-stone-50' : 'bg-white'}>
                  {cells.map((cell, ci) => (
                    <td key={ci} className={cn('px-3 py-2 border-b border-stone-100', ci === 0 && 'font-bold text-stone-700 w-[35%]')} dangerouslySetInnerHTML={{ __html: inlineMd(cell) }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(<pre key={`code-${i}`} className="my-3 overflow-x-auto rounded-xl bg-stone-800 p-4 text-xs text-stone-100 leading-relaxed" dir="ltr"><code>{codeLines.join('\n')}</code></pre>);
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushList(); flushTable();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(lines[i]); continue; }

    if (!line) { flushList(); flushTable(); elements.push(<div key={`br-${i}`} className="h-2" />); continue; }

    if (line.startsWith('|') && line.endsWith('|')) {
      if (/^\|[\s-:|]+\|$/.test(line)) continue;
      flushList();
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (cells.length > 0) { tableRows.push(cells); continue; }
    } else {
      flushTable();
    }

    if (line === '---') { flushList(); elements.push(<hr key={`hr-${i}`} className="my-3 border-stone-200" />); continue; }
    if (line.startsWith('###')) { flushList(); elements.push(<h4 key={i} className="mt-4 mb-1 font-bold text-emerald-700 text-sm">{line.replace(/^###\s*/, '')}</h4>); continue; }
    if (line.startsWith('##')) { flushList(); elements.push(<h3 key={i} className="mt-4 mb-1 text-base font-bold text-stone-900">{line.replace(/^##\s*/, '')}</h3>); continue; }
    if (line.startsWith('#')) { flushList(); elements.push(<h3 key={i} className="mt-4 mb-1 text-base font-bold text-stone-900">{line.replace(/^#\s*/, '')}</h3>); continue; }
    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) { listItems.push(line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '')); continue; }
    if (line.startsWith('⚠️')) { flushList(); elements.push(<p key={i} className="my-2 text-xs text-stone-400 italic">{line}</p>); continue; }
    flushList();
    elements.push(<p key={i} className="my-1" dangerouslySetInnerHTML={{ __html: inlineMd(line) }} />);
  }
  flushList();
  flushTable();
  return elements;
}

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
      .select('peptide_name, dose, unit, injection_site, injected_at')
      .eq('user_id', userId)
      .order('injected_at', { ascending: false })
      .limit(10);
    if (logs && logs.length > 0) {
      ctx += `\nسجل حقن المستخدم (آخر ${logs.length}):\n`;
      logs.forEach(l => { ctx += `- ${l.peptide_name}: ${l.dose}${l.unit} (${new Date(l.injected_at).toLocaleDateString('ar-u-nu-latn')})\n`; });
      ctx += `لديه خبرة فعلية. ابنِ على ما يستخدمه.\n`;
    }
    const favs = (() => { try { const s = localStorage.getItem('pptides_favorites'); return s ? JSON.parse(s) as string[] : []; } catch { return []; } })();
    if (favs.length > 0) {
      const names = favs.map(id => allPeptides.find(p => p.id === id)?.nameEn).filter(Boolean);
      if (names.length) ctx += `ببتيدات مفضّلة: ${names.join(', ')}\n`;
    }
  } catch {}
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
    } catch {}
    const quiz = loadQuizAnswers();
    if (quiz?.goal && quiz?.experience && quiz?.injection) return 'details';
    return 'goal';
  });
  const [intake, setIntake] = useState<IntakeData>(() => {
    try {
      const s = localStorage.getItem(storageKey);
      if (s) return JSON.parse(s).intake ?? { goal: '', goalLabel: '', experience: '', injection: '', age: '', medications: '' };
    } catch {}
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
    try { const s = localStorage.getItem(storageKey); if (s) return JSON.parse(s).messages ?? []; } catch {} return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userContextRef = useRef('');
  const autoSentRef = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ messages, intake })); } catch {}
  }, [messages, intake, storageKey]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, intakeStep]);
  useEffect(() => { if (user) buildUserContext(user.id).then(ctx => { userContextRef.current = ctx; }); }, [user]);

  const isLoadingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  const normalizeDigits = (s: string) => s.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  const sendToAI = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoadingRef.current) return;
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    setInput('');
    setIsLoading(true);
    isLoadingRef.current = true;
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
      });
      if (!res.ok) throw new Error();

      const reader = res.body?.getReader();
      if (!reader) throw new Error();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

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
          } catch {}
        }
      }

      if (!accumulated) {
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: 'عذرًا، حدث خطأ. حاول مرة أخرى.' };
          return copy;
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'تعذّر الاتصال بالخادم. تأكد من اتصالك وحاول مرة أخرى.' }]);
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

  const resetConversation = () => {
    setMessages([]);
    setIntakeStep('goal');
    setIntake({ goal: '', goalLabel: '', experience: '', injection: '', age: '', medications: '' });
    autoSentRef.current = false;
    try { localStorage.removeItem(storageKey); } catch {}
  };

  const hasAccess = subscription.isProOrTrial;
  const isElite = hasAccess && subscription.tier === 'elite';
  const limit = isElite ? Infinity : hasAccess ? 15 : 5;
  const userMsgCount = messages.filter(m => m.role === 'user').length;
  const limitReached = userMsgCount >= limit;

  const lastAI = [...messages].reverse().find(m => m.role === 'assistant');
  const peptideActions = lastAI ? extractPeptideActions(lastAI.content) : [];
  const aiMsgCount = messages.filter(m => m.role === 'assistant').length;
  const followUps = lastAI ? getFollowUps(lastAI.content, aiMsgCount <= 1) : [];

  return (
    <div className="min-h-screen">
      <Helmet><title>استشاري الببتيدات — بروتوكول مخصّص بالذكاء الاصطناعي | AI Peptide Coach</title></Helmet>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Bot className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold">استشاري الببتيدات</h1>
              <p className="text-xs text-stone-500">بروتوكول مخصّص لحالتك</p>
            </div>
          </div>
          {intakeStep === 'done' && messages.length > 0 && (
            <button onClick={resetConversation} className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50">
              <RotateCcw className="h-3.5 w-3.5" />
              استشارة جديدة
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
          <div ref={scrollRef} className="max-h-[560px] min-h-[360px] overflow-y-auto p-5 space-y-4 bg-stone-50/50">

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
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-w-[88%]">
                  {GOALS.map(g => (
                    <button key={g.id} onClick={() => { setIntake(p => ({ ...p, goal: g.id, goalLabel: g.label })); if (intakeStep === 'goal') setIntakeStep('experience'); }}
                      className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all', intake.goal === g.id ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200' : 'border-stone-200 bg-white hover:border-emerald-300')}>
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
                          className={cn('rounded-xl border px-4 py-3 text-right transition-all', intake.experience === o.id ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200' : 'border-stone-200 bg-white hover:border-emerald-300')}>
                          <span className="text-sm font-bold text-stone-800">{o.label}</span>
                          <span className="block text-xs text-stone-500 mt-0.5">{o.desc}</span>
                        </button>
                      ))}
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
                          className={cn('rounded-xl border px-4 py-3 text-right transition-all', intake.injection === o.id ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200' : 'border-stone-200 bg-white hover:border-emerald-300')}>
                          <span className="text-sm font-bold text-stone-800">{o.label}</span>
                          <span className="block text-xs text-stone-500 mt-0.5">{o.desc}</span>
                        </button>
                      ))}
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
                          <input type="text" value={intake.age} onChange={e => setIntake(p => ({ ...p, age: e.target.value }))} placeholder="مثال: 32" className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-stone-600">أدوية أو مكملات حالية</label>
                          <input type="text" value={intake.medications} onChange={e => setIntake(p => ({ ...p, medications: e.target.value }))} placeholder="مثال: فيتامين D، كرياتين" className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                        </div>
                      </div>
                      <button onClick={submitIntake}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]">
                        <Bot className="h-4 w-4" />
                        صمّم بروتوكولي المخصّص
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══ CHAT MESSAGES ═══ */}
            {intakeStep === 'done' && messages.map((msg, i) => (
              <div key={i}>
                <div className={cn('flex', msg.role === 'user' ? 'justify-start' : 'justify-end')}>
                  <div className={cn('max-w-[88%] rounded-2xl px-5 py-3', msg.role === 'user' ? 'gold-gradient rounded-br-md' : 'rounded-bl-md border border-stone-200 bg-white')}>
                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">{
                        msg.content.startsWith('USER PROFILE')
                          ? `هدفي: ${intake.goalLabel || 'استشارة عامة'}`
                          : msg.content
                      }</p>
                    ) : (
                      <div className="text-sm leading-relaxed text-stone-800">{renderMarkdown(msg.content)}</div>
                    )}
                  </div>
                </div>
                {msg.role === 'assistant' && i === messages.length - 1 && !isLoading && msg.content.length > 50 && (
                  <div className="mt-2 flex justify-end">
                    <div className="flex flex-wrap gap-1.5 max-w-[88%]">
                      {peptideActions.map(p => (
                        <Link key={p.id} to={`/peptide/${p.id}`} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">
                          <FlaskConical className="h-3 w-3" />{p.nameAr}
                        </Link>
                      ))}
                      {peptideActions.length > 0 && (
                        <Link to={`/calculator?peptide=${encodeURIComponent(peptideActions[0]?.nameEn ?? '')}`} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-50">
                          <Calculator className="h-3 w-3" />احسب الجرعة
                        </Link>
                      )}
                      {peptideActions.length >= 2 && (
                        <Link to="/interactions" className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-50">
                          <Shield className="h-3 w-3" />فحص التعارض
                        </Link>
                      )}
                      {peptideActions.length > 0 && (
                        <Link to={`/tracker?peptide=${encodeURIComponent(peptideActions[0]?.nameEn ?? '')}`} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-50">
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
                <div className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-5 py-4 min-w-[200px]">
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
                  {!isElite && <button onClick={() => hasAccess ? upgradeTo('elite') : navigate('/pricing')} className="mt-3 rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">{hasAccess ? 'ترقَّ إلى Elite' : 'اشترك الآن'}</button>}
                </div>
              ) : (
                <>
                  {followUps.length > 0 && !isLoading && userMsgCount > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5 justify-center">
                      {followUps.map(q => (
                        <button key={q} onClick={() => sendToAI(q)} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">{q}</button>
                      ))}
                    </div>
                  )}
                  {!isElite && userMsgCount > 0 && (
                    <p className="mb-2 text-center text-xs text-stone-400">{arPlural(limit - userMsgCount, 'سؤال متبقي', 'سؤالان متبقيان', 'أسئلة متبقية')}</p>
                  )}
                  <div className="flex items-end gap-3">
                    <textarea value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendToAI(input); } }}
                      placeholder="اسأل المزيد عن البروتوكول..." rows={1} disabled={isLoading}
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
