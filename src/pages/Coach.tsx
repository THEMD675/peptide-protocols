import { useState, useRef, useEffect, useCallback, type ElementType } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { peptides as allPeptides } from '@/data/peptides';
import {
  Bot, Send, Lock, Sparkles, TrendingDown, Heart, Dumbbell, Brain,
  Clock, Zap, Calculator, FlaskConical, Shield, RotateCcw, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
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
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inlineMd = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-stone-900">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="rounded bg-stone-200 px-1 py-0.5 text-xs font-mono">$1</code>');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { flushList(); elements.push(<div key={`br-${i}`} className="h-2" />); continue; }
    if (line.startsWith('###')) { flushList(); elements.push(<h4 key={i} className="mt-3 mb-1 font-bold text-stone-900 text-sm">{line.replace(/^###\s*/, '')}</h4>); continue; }
    if (line.startsWith('##')) { flushList(); elements.push(<h3 key={i} className="mt-3 mb-1 font-bold text-stone-900">{line.replace(/^##\s*/, '')}</h3>); continue; }
    if (line.startsWith('#')) { flushList(); elements.push(<h3 key={i} className="mt-3 mb-1 font-bold text-stone-900">{line.replace(/^#\s*/, '')}</h3>); continue; }
    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) { listItems.push(line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '')); continue; }
    flushList();
    elements.push(<p key={i} className="my-1" dangerouslySetInnerHTML={{ __html: inlineMd(line) }} />);
  }
  flushList();
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

const SYSTEM_PROMPT = `أنت استشاري ببتيدات في pptides.com. خبير حازم وواثق يقود الاستشارة. لست ChatGPT ولا محرك بحث.

## المعلومات اللي عندك عن المستخدم مُعطاة لك مسبقًا — لا تسأل أسئلة تشخيصية. أعطِ البروتوكول فورًا.

## تنسيق الرد (التزم فيه دائمًا):
**الخلاصة:** جملة واحدة مباشرة
**البروتوكول المُوصى:**
**الببتيد:** [الاسم بالعربي] (الاسم الإنجليزي) — لماذا هذا بالذات
1. **الجرعة:** [رقم دقيق بالمايكروغرام أو الملليغرام]
2. **التوقيت:** [صباح/مساء/قبل نوم — متى بالضبط]
3. **الطريقة:** [SubQ/IM/بخاخ أنف/فموي — وين بالضبط]
4. **المدة:** [عدد الأسابيع + فترة الراحة]
5. **التدرّج:** [كيف يزيد الجرعة تدريجيًا إن لزم]
**التحاليل المطلوبة قبل البدء:** [قائمة محددة]
**التكلفة التقريبية:** ~$X/شهر
**مستوى الدليل:** [FDA معتمد / تجارب بشرية / تجارب حيوانية]
**تحذيرات:** [مخاطر حقيقية فقط — لا تحذيرات عامة]
**البديل:** [ببتيد واحد بديل + سبب واحد]
**خطوتك القادمة:** [فعل واحد محدد يسويه الآن]

## قواعد:
- عربي بلهجة خليجية. أرقام إنجليزية فقط.
- خيار واحد أفضل + بديل واحد. لا تعطي 5 خيارات.
- كن حازم: "استخدم Semaglutide." مش "يمكنك التفكير في..."
- اختم بسؤال متابعة واحد.
- اختم بـ: "⚠️ محتوى تعليمي — اعمل تحاليلك قبل أي بروتوكول."
- اكتب اسم كل ببتيد بالإنجليزي بالضبط مرة واحدة على الأقل.

## شجرة القرار:
### فقدان دهون:
- مبتدئ + حقن → Semaglutide 0.25mg/أسبوع → 0.5 → 1 → 1.7 → 2.4mg. $150-250/شهر
- بدون حقن → 5-Amino-1MQ فموي 100mg/يوم. $80-120/شهر. أدلة ضعيفة.
- متقدّم → Tirzepatide 2.5mg → 5 → 7.5mg. $200-400/شهر.
- دهون البطن → أضف Tesamorelin 2mg/يوم. $200/شهر إضافي.
### التعافي:
- وتر/رباط → BPC-157 250mcg مرتين/يوم. 4-6 أسابيع. $60-100/شهر.
- عضلي → TB-500 تحميل 750mcg مرتين/أسبوع ثم 500mcg. $80-120/شهر.
- شامل → BPC-157 + TB-500. $120-180/شهر.
### هرمون النمو:
- مبتدئ → CJC-1295 100mcg + Ipamorelin 200mcg قبل النوم. $100-150/شهر.
- متقدّم → GHRP-2 200mcg + CJC-1295 × 3/يوم. $150-200/شهر.
### الدماغ:
- تركيز → Semax 400mcg بخاخ أنف صباحًا. 5 أيام + 2 راحة. $40-60/شهر.
- قلق + تركيز → Selank 300mcg + Semax 300mcg. $70-100/شهر.
### الهرمونات:
- تستوستيرون → Kisspeptin-10 100mcg/يوم. $80-120/شهر.
- بعد ستيرويدات → Triptorelin 100mcg جرعة واحدة. $30-50.
- ضعف جنسي → PT-141 1.75mg. FDA معتمد. $15-25/جرعة.
### طول العمر:
- أساسي → Epithalon 5mg/يوم × 20 يوم كل 6 أشهر + GHK-Cu كريم. $150/دورة.
- متقدم → أضف Thymosin Alpha-1 1.6mg مرتين/أسبوع. $120/شهر.

## تعارضات: Semaglutide+أنسولين=خطر. GHRPs+سكري=يرفع. BPC-157+سرطان=ممنوع. IGF-1 LR3+محفزات نمو=تضخم. Melanotan II=لا أنصح.
## تحاليل: أساسي: CBC,CMP,HbA1c. موسّع: +IGF-1,إنسولين,Lipids. شامل: +تستوستيرون,LH,FSH,TSH.
## حساب الجرعة: التركيز=(وزن القارورة mg×1000)÷كمية الماء ml. الكمية=الجرعة÷التركيز. وحدات السيرنج=الكمية×(وحدات÷سعة). احسب للمستخدم دائمًا.`;

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
      logs.forEach(l => { ctx += `- ${l.peptide_name}: ${l.dose}${l.unit} (${new Date(l.injected_at).toLocaleDateString('en')})\n`; });
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
    'fat-loss': 'فقدان دهون وإنقاص وزن',
    recovery: 'تعافي من إصابة أو تحسين أداء رياضي',
    muscle: 'بناء عضل وتحسين أداء رياضي',
    brain: 'تحسين التركيز والذاكرة والأداء الذهني',
    longevity: 'إطالة عمر ومكافحة شيخوخة',
    hormones: 'تحسين هرمونات (تستوستيرون / نمو)',
  };
  const expMap: Record<string, string> = { beginner: 'مبتدئ — أول مرة', intermediate: 'متوسط — جرب قبل', advanced: 'متقدم — يستخدم بانتظام' };
  const injMap: Record<string, string> = { yes: 'يتقبل الحقن', 'prefer-no': 'يفضل بدون حقن', no: 'لا يقبل الحقن — فموي أو بخاخ فقط' };

  let prompt = `## ملف المستخدم:\n- الهدف: ${goalMap[intake.goal] ?? intake.goal}\n- الخبرة: ${expMap[intake.experience] ?? intake.experience}\n- الحقن: ${injMap[intake.injection] ?? intake.injection}\n`;
  if (intake.age) prompt += `- العمر: ${intake.age}\n`;
  if (intake.medications) prompt += `- أدوية/مكملات حالية: ${intake.medications}\n`;
  if (userContext) prompt += `\n${userContext}\n`;
  prompt += `\nأعطه البروتوكول المخصّص فورًا بالتنسيق المطلوب. لا تسأل أسئلة إضافية.`;
  return prompt;
}

async function getSessionToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

function getFollowUps(text: string): string[] {
  const t = text.toLowerCase();
  if (t.includes('semaglutide') || t.includes('tirzepatide')) return ['وش الأعراض الجانبية الحقيقية؟', 'احسب لي الجرعة بالسيرنج', 'وش لو ما نزل وزني؟'];
  if (t.includes('bpc-157') || t.includes('tb-500')) return ['وين أحقن بالضبط؟', 'كم مدة قبل ما ألاحظ فرق؟', 'هل أقدر آخذه فموي؟'];
  if (t.includes('semax') || t.includes('selank')) return ['هل يسبب تحمّل؟', 'أقدر أستخدمه يوميًا؟', 'وش الفرق بين Semax العادي و NA-Semax?'];
  if (t.includes('epithalon') || t.includes('thymosin')) return ['كم مرة أكرر الدورة؟', 'هل يتعارض مع مكملاتي؟', 'وش التحاليل بعد الدورة؟'];
  if (t.includes('kisspeptin') || t.includes('pt-141') || t.includes('triptorelin')) return ['هل يثبّط الإنتاج الطبيعي؟', 'متى تظهر النتيجة بالتحاليل؟', 'وش البديل الطبيعي؟'];
  return ['وش التحاليل بعد البروتوكول؟', 'كم تكلفة الشهر كاملة؟', 'وش لو حسّيت بأعراض جانبية؟'];
}

export default function Coach() {
  const { user, subscription, upgradeTo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const storageKey = `pptides_coach_${user?.id ?? 'anon'}`;
  const [intakeStep, setIntakeStep] = useState<IntakeStep>(() => {
    try { const s = sessionStorage.getItem(storageKey); if (s) { const d = JSON.parse(s); if (d.messages?.length > 0) return 'done'; } } catch {} return 'goal';
  });
  const [intake, setIntake] = useState<IntakeData>(() => {
    try { const s = sessionStorage.getItem(storageKey); if (s) return JSON.parse(s).intake ?? { goal: '', goalLabel: '', experience: '', injection: '', age: '', medications: '' }; } catch {} return { goal: '', goalLabel: '', experience: '', injection: '', age: '', medications: '' };
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try { const s = sessionStorage.getItem(storageKey); if (s) return JSON.parse(s).messages ?? []; } catch {} return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userContextRef = useRef('');
  const autoSentRef = useRef(false);

  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ messages, intake })); } catch {}
  }, [messages, intake, storageKey]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, intakeStep]);
  useEffect(() => { if (user) buildUserContext(user.id).then(ctx => { userContextRef.current = ctx; }); }, [user]);

  useEffect(() => {
    const p = searchParams.get('peptide');
    if (p && !autoSentRef.current && user) {
      autoSentRef.current = true;
      setIntakeStep('done');
      sendToAI(`أبغى بروتوكول كامل لـ ${p} — الجرعة، التوقيت، المدة، التحاليل، والتكلفة.`);
    }
  }, [searchParams, user]);

  const sendToAI = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsLoading(true);
    setLoadingStage(0);
    const stageTimer1 = setTimeout(() => setLoadingStage(1), 2000);
    const stageTimer2 = setTimeout(() => setLoadingStage(2), 5000);
    try {
      const token = await getSessionToken();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...updated.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.choices?.[0]?.message?.content ?? 'عذرًا، حدث خطأ. حاول مرة أخرى.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'تعذّر الاتصال بالخادم. تأكد من اتصالك وحاول مرة أخرى.' }]);
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setIsLoading(false);
      setLoadingStage(0);
    }
  }, [messages, isLoading]);

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
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Helmet><title>استشاري الببتيدات — بروتوكول مخصّص بالذكاء الاصطناعي | AI Peptide Coach</title></Helmet>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4"><Lock className="h-7 w-7 text-emerald-600" /></div>
          <p className="text-xl font-bold text-stone-900">سجّل الدخول لبدء الاستشارة</p>
          <p className="mt-2 text-sm text-stone-600">استشاري ببتيدات يصمّم بروتوكول مخصّص لحالتك</p>
          <Link to="/login" className="mt-4 rounded-full bg-emerald-600 px-10 py-3 text-sm font-bold text-white hover:bg-emerald-700">تسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  const hasAccess = subscription.isProOrTrial;
  const isElite = hasAccess && subscription.tier === 'elite';
  const limit = isElite ? Infinity : hasAccess ? 15 : 5;
  const userMsgCount = messages.filter(m => m.role === 'user').length;
  const limitReached = userMsgCount >= limit;

  const lastAI = [...messages].reverse().find(m => m.role === 'assistant');
  const peptideActions = lastAI ? extractPeptideActions(lastAI.content) : [];
  const followUps = lastAI ? getFollowUps(lastAI.content) : [];

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

            {/* ═══ INTAKE FORM ═══ */}
            {intakeStep !== 'done' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-bold text-emerald-900">أجب على 3 أسئلة سريعة وأصمّم لك بروتوكول مخصّص فورًا.</p>
                  <p className="mt-1 text-xs text-emerald-700">بدون تشخيص مطوّل — نتيجة مباشرة.</p>
                </div>

                {/* Step 1: Goal */}
                <div>
                  <p className="mb-2 text-sm font-bold text-stone-900">1. ما هدفك الأساسي؟</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {GOALS.map(g => (
                      <button key={g.id} onClick={() => { setIntake(p => ({ ...p, goal: g.id, goalLabel: g.label })); if (intakeStep === 'goal') setIntakeStep('experience'); }}
                        className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all', intake.goal === g.id ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200' : 'border-stone-200 bg-white hover:border-emerald-300')}>
                        <g.Icon className={cn('h-5 w-5', intake.goal === g.id ? 'text-emerald-600' : 'text-stone-400')} />
                        <span className="text-xs font-bold text-stone-800">{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Experience */}
                {(intakeStep === 'experience' || intakeStep === 'injection' || intakeStep === 'details') && (
                  <div className="animate-fade-up">
                    <p className="mb-2 text-sm font-bold text-stone-900">2. ما مستوى خبرتك مع الببتيدات؟</p>
                    <div className="grid gap-2">
                      {EXPERIENCE_OPTIONS.map(o => (
                        <button key={o.id} onClick={() => { setIntake(p => ({ ...p, experience: o.id })); if (intakeStep === 'experience') setIntakeStep('injection'); }}
                          className={cn('rounded-xl border px-4 py-3 text-right transition-all', intake.experience === o.id ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200' : 'border-stone-200 bg-white hover:border-emerald-300')}>
                          <span className="text-sm font-bold text-stone-800">{o.label}</span>
                          <span className="block text-xs text-stone-500 mt-0.5">{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Injection */}
                {(intakeStep === 'injection' || intakeStep === 'details') && (
                  <div className="animate-fade-up">
                    <p className="mb-2 text-sm font-bold text-stone-900">3. هل تتقبّل الحقن؟</p>
                    <div className="grid gap-2">
                      {INJECTION_OPTIONS.map(o => (
                        <button key={o.id} onClick={() => { setIntake(p => ({ ...p, injection: o.id })); if (intakeStep === 'injection') setIntakeStep('details'); }}
                          className={cn('rounded-xl border px-4 py-3 text-right transition-all', intake.injection === o.id ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200' : 'border-stone-200 bg-white hover:border-emerald-300')}>
                          <span className="text-sm font-bold text-stone-800">{o.label}</span>
                          <span className="block text-xs text-stone-500 mt-0.5">{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Optional details + Submit */}
                {intakeStep === 'details' && (
                  <div className="animate-fade-up space-y-3">
                    <p className="text-sm font-bold text-stone-900">معلومات إضافية <span className="font-normal text-stone-400">(اختياري)</span></p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-stone-600">العمر تقريبًا</label>
                        <input type="text" value={intake.age} onChange={e => setIntake(p => ({ ...p, age: e.target.value }))} placeholder="مثال: 32" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-stone-600">أدوية أو مكملات حالية</label>
                        <input type="text" value={intake.medications} onChange={e => setIntake(p => ({ ...p, medications: e.target.value }))} placeholder="مثال: فيتامين D، كرياتين" className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none" />
                      </div>
                    </div>
                    <button onClick={submitIntake}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98]">
                      <Bot className="h-4 w-4" />
                      صمّم بروتوكولي المخصّص
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  </div>
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
                        msg.content.startsWith('## ملف المستخدم')
                          ? `هدفي: ${intake.goalLabel || 'استشارة عامة'}`
                          : msg.content
                      }</p>
                    ) : (
                      <div className="text-sm leading-relaxed text-stone-800">{renderMarkdown(msg.content)}</div>
                    )}
                  </div>
                </div>
                {msg.role === 'assistant' && i === messages.length - 1 && peptideActions.length > 0 && !isLoading && (
                  <div className="mt-2 flex justify-end">
                    <div className="flex flex-wrap gap-1.5 max-w-[88%]">
                      {peptideActions.map(p => (
                        <Link key={p.id} to={`/peptide/${p.id}`} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">
                          <FlaskConical className="h-3 w-3" />{p.nameAr}
                        </Link>
                      ))}
                      <Link to={`/calculator?peptide=${encodeURIComponent(peptideActions[0]?.nameEn ?? '')}`} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-50">
                        <Calculator className="h-3 w-3" />احسب الجرعة
                      </Link>
                      {peptideActions.length >= 2 && (
                        <Link to="/interactions" className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-50">
                          <Shield className="h-3 w-3" />فحص التعارض
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-5 py-4 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {['يحلّل ملفك الصحي...', 'يختار الببتيد المثالي...', 'يبني البروتوكول المخصّص...'].map((stage, idx) => (
                      <div key={idx} className={cn('flex items-center gap-2 text-xs transition-all duration-500', idx <= loadingStage ? 'text-emerald-700 opacity-100' : 'text-stone-300 opacity-60')}>
                        <span className={cn('h-1.5 w-1.5 rounded-full transition-colors', idx < loadingStage ? 'bg-emerald-500' : idx === loadingStage ? 'bg-emerald-400 animate-pulse' : 'bg-stone-300')} />
                        {stage}
                      </div>
                    ))}
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
                    <p className="mb-2 text-center text-xs text-stone-400">{limit - userMsgCount} {(limit - userMsgCount) === 1 ? 'سؤال متبقي' : 'أسئلة متبقية'}</p>
                  )}
                  <div className="flex items-end gap-3">
                    <textarea value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendToAI(input); } }}
                      placeholder="اسأل المزيد عن البروتوكول..." rows={1} disabled={isLoading}
                      className={cn('flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200', isLoading && 'opacity-60')} />
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
