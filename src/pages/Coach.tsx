import { useState, useRef, useEffect, useMemo, useCallback, type ElementType } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { peptides as allPeptides } from '@/data/peptides';
import { Bot, Send, Lock, Loader2, Sparkles, TrendingDown, Heart, Dumbbell, Brain, Clock, Zap } from 'lucide-react';
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
              <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const inlineMarkdown = (s: string) =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-stone-900">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="rounded bg-stone-200 px-1 py-0.5 text-xs font-mono">$1</code>')
      .replace(/\[([^\]]+)\]\(\/peptide\/([a-z0-9-]+)\)/g, '<a href="/peptide/$2" class="text-emerald-600 font-semibold underline underline-offset-2 hover:text-emerald-700">$1</a>')
      .replace(/\[([^\]]+)\]\(\/calculator[^)]*\)/g, '<a href="/calculator" class="text-emerald-600 font-semibold underline underline-offset-2 hover:text-emerald-700">$1</a>');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { flushList(); elements.push(<div key={`br-${i}`} className="h-2" />); continue; }
    if (line.startsWith('###')) { flushList(); elements.push(<h4 key={i} className="mt-3 mb-1 font-bold text-stone-900 text-sm">{line.replace(/^###\s*/, '')}</h4>); continue; }
    if (line.startsWith('##')) { flushList(); elements.push(<h3 key={i} className="mt-3 mb-1 font-bold text-stone-900">{line.replace(/^##\s*/, '')}</h3>); continue; }
    if (line.startsWith('#')) { flushList(); elements.push(<h3 key={i} className="mt-3 mb-1 font-bold text-stone-900">{line.replace(/^#\s*/, '')}</h3>); continue; }
    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) { listItems.push(line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '')); continue; }
    flushList();
    elements.push(<p key={i} className="my-1" dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />);
  }
  flushList();
  return elements;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const GOALS: { id: string; label: string; Icon: ElementType; prompt: string }[] = [
  { id: 'fat-loss', label: 'فقدان دهون', Icon: TrendingDown, prompt: 'هدفي فقدان دهون. أبغى توصية ببتيد ببروتوكول مخصّص.' },
  { id: 'recovery', label: 'تعافي وإصابات', Icon: Heart, prompt: 'عندي إصابة وأبغى أسرع التعافي. أبغى توصيتك.' },
  { id: 'muscle', label: 'بناء عضل', Icon: Dumbbell, prompt: 'هدفي بناء عضل وتحسين الأداء الرياضي. وش تنصحني؟' },
  { id: 'brain', label: 'تركيز ودماغ', Icon: Brain, prompt: 'أبغى أحسّن التركيز والذاكرة. وش أفضل شيء؟' },
  { id: 'longevity', label: 'طول عمر', Icon: Clock, prompt: 'مهتم بإطالة العمر ومكافحة الشيخوخة. وش تنصحني؟' },
  { id: 'hormones', label: 'تحسين هرمونات', Icon: Zap, prompt: 'أبغى أحسّن هرموناتي بشكل طبيعي. وش الخيارات؟' },
];

function getContextualFollowUps(lastAssistantMessage: string): string[] {
  const base = [
    'وش التحاليل اللي لازم أسويها قبل ما أبدأ؟',
    'كم تكلفة هذا البروتوكول شهريًا؟',
  ];

  const msg = lastAssistantMessage.toLowerCase();

  if (msg.includes('semaglutide') || msg.includes('tirzepatide') || msg.includes('فقدان')) {
    return [...base, 'هل أقدر أستخدمه مع تمارين صيام متقطع؟', 'وش الأعراض الجانبية الحقيقية؟', 'احسب لي الجرعة بالسيرنج'];
  }
  if (msg.includes('bpc-157') || msg.includes('tb-500') || msg.includes('تعافي') || msg.includes('إصابة')) {
    return [...base, 'وين أحقن بالضبط قرب الإصابة؟', 'كم مدة قبل ما ألاحظ فرق؟', 'هل أقدر آخذه فموي بدل الحقن؟'];
  }
  if (msg.includes('semax') || msg.includes('selank') || msg.includes('تركيز') || msg.includes('دماغ')) {
    return [...base, 'هل يسبب إدمان أو تحمّل؟', 'أقدر أستخدمه يوميًا؟', 'وش الفرق بين Semax و NA-Semax-Amidate؟'];
  }
  if (msg.includes('epithalon') || msg.includes('طول عمر') || msg.includes('شيخوخة')) {
    return [...base, 'كم مرة أكرر الدورة في السنة؟', 'هل يتعارض مع أي مكمل ثاني؟', 'وش تحليل التيلوميرات؟'];
  }
  if (msg.includes('kisspeptin') || msg.includes('تستوستيرون') || msg.includes('هرمون')) {
    return [...base, 'هل يثبّط الإنتاج الطبيعي؟', 'وش الفرق بينه وبين TRT؟', 'متى أتوقع النتيجة في التحاليل؟'];
  }

  return [...base, 'أنا مبتدئ — وش أول خطوة؟', 'وش البديل الأرخص أو الأسهل؟', 'أبغى أشوف تجارب ناس استخدموه'];
}

const SYSTEM_PROMPT = `أنت استشاري ببتيدات في pptides.com. أنت مش ChatGPT ولا محرك بحث — أنت خبير يقود الاستشارة مثل طبيب متخصص.

## كيف تتصرّف (مهم جدًا):

### أول رسالة من المستخدم:
لا تعطي بروتوكول فورًا. اسأل أسئلة تشخيصية أولًا:
1. "قبل ما أعطيك بروتوكول، أحتاج أعرف:"
2. اسأل عن: خبرته السابقة مع الببتيدات، عمره تقريبًا، أي أدوية يستخدمها، وهل عمل تحاليل مؤخرًا
3. بناءً على إجاباته، قدّم بروتوكول مخصّص

### إذا المستخدم أجاب مباشرة بسؤال محدد:
أعطه إجابة مباشرة ثم اسأل سؤال واحد متابعة.

### تنسيق البروتوكول (دائمًا):
**الخلاصة:** سطر واحد فقط
**اختياري الأول:** [اسم الببتيد] — لماذا هذا بالذات
**البروتوكول:**
1. الجرعة: [رقم دقيق]
2. التوقيت: [متى بالضبط]
3. الطريقة: [كيف بالضبط]
4. المدة: [كم أسبوع]
5. التحاليل المطلوبة: [قائمة محددة]
**التكلفة التقريبية:** $X/شهر
**مستوى الدليل:** [FDA/دراسات بشرية/حيوانية]
**تحذيرات:** [مخاطر حقيقية]
**الخطوة القادمة:** [فعل واحد محدد يسويه الحين]

### قواعد صارمة:
- عربي. أرقام إنجليزية فقط (250mcg مش ٢٥٠).
- مش عن ببتيدات؟ "أنا متخصص في الببتيدات فقط." وارفض.
- كن حازم وصريح — إذا ببتيد خطير قل: "لا أنصح به. السبب:"
- لا تعطي 5 خيارات. اعطِ خيار واحد أفضل + بديل واحد.
- اختم كل رد بسؤال متابعة واحد محدد.
- اختم بـ: "⚠️ محتوى تعليمي — اعمل تحاليلك قبل أي بروتوكول."

### أسلوبك:
- واثق. حازم. مباشر.
- "استخدم Semaglutide. ابدأ بـ 0.25mg أسبوعيًا." — مش "يمكنك التفكير في..."
- أنت الخبير. المستخدم جاء يسمع رأيك — أعطه رأي واضح.
- إذا سأل "وش أفضل ببتيد لفقدان الدهون؟" لا تعطيه 6 خيارات. قل: "Semaglutide. وهذا السبب والبروتوكول."

## شجرة القرار (استخدمها دائمًا):

### فقدان الدهون — من يحصل على ماذا:
- مبتدئ + يتحمّل الحقن الأسبوعي → Semaglutide 0.25mg/أسبوع (4 أسابيع) → 0.5mg → 1mg → 1.7mg → 2.4mg. تكلفة: $150-250/شهر
- مبتدئ + يرفض الحقن → 5-Amino-1MQ فموي 100mg/يوم. تكلفة: $80-120/شهر. لكن الأدلة ضعيفة.
- متقدّم + يبغى أقوى نتيجة → Tirzepatide 2.5mg → 5mg → 7.5mg. أقوى من Semaglutide بـ 30%. تكلفة: $200-400/شهر.
- يبغى يخسر دهون البطن تحديدًا → أضف Tesamorelin 2mg/يوم مع أي بروتوكول أعلاه. تكلفة إضافية: $200/شهر.
- ممنوعات: تاريخ عائلي لسرطان الغدة الدرقية (MTC) = ممنوع Semaglutide/Tirzepatide. التهاب بنكرياس سابق = ممنوع.

### التعافي — من يحصل على ماذا:
- إصابة وتر/رباط محددة → BPC-157 فقط 250mcg مرتين/يوم قرب الإصابة. 4-6 أسابيع. تكلفة: $60-100/شهر.
- إصابة عضلية واسعة → TB-500: تحميل 750mcg مرتين/أسبوع (أسبوعين) ثم 500mcg/أسبوع. تكلفة: $80-120/شهر.
- تعافي شامل (عضلات + أوتار) → BPC-157 250mcg/يوم + TB-500 500mcg مرتين/أسبوع. أفضل تجميعة تعافي. تكلفة: $120-180/شهر.
- تعافي + بناء عضل → أضف CJC-1295 100mcg + Ipamorelin 200mcg قبل النوم. تكلفة إضافية: $100/شهر.
- ممنوعات: سرطان نشط = ممنوع أي محفّز نمو. BPC-157 + مضادات تخثر = حذر.

### هرمون النمو — من يحصل على ماذا:
- مبتدئ أول مرة → CJC-1295 100mcg + Ipamorelin 200mcg قبل النوم. أنظف وأسلم تجميعة. تكلفة: $100-150/شهر.
- متقدّم يريد نتائج أقوى → GHRP-2 200mcg + CJC-1295 100mcg. 3 مرات/يوم. لكن يزيد الجوع والكورتيزول. تكلفة: $150-200/شهر.
- ممنوعات: سكري نوع 2 غير مسيطر عليه = حذر شديد (يرفع السكر). IGF-1 أعلى من 300 = لا تبدأ.

### الدماغ — من يحصل على ماذا:
- تركيز وذاكرة → Semax 400mcg بخاخ أنف صباحًا. 5 أيام شغل + 2 راحة. تكلفة: $40-60/شهر. أفضل بداية.
- قلق + تركيز → Selank 300mcg بخاخ أنف + Semax 300mcg. تكلفة: $70-100/شهر.
- ممنوعات: Dihexa = تجريبي 100%. لا أنصح أبدًا. Cerebrolysin = يحتاج إشراف طبي مباشر.

### الهرمونات — من يحصل على ماذا:
- تستوستيرون منخفض بدون ستيرويدات سابقة → Kisspeptin-10 100mcg/يوم. يرفع بشكل طبيعي. تكلفة: $80-120/شهر.
- استعادة المحور بعد ستيرويدات → Triptorelin 100mcg جرعة واحدة فقط. ثم انتظر 4-6 أسابيع واعمل تحليل. تكلفة: $30-50.
- ضعف جنسي → PT-141 1.75mg قبل 45 دقيقة. حسب الحاجة. FDA معتمد. تكلفة: $15-25/جرعة.

### طول العمر — من يحصل على ماذا:
- بروتوكول أساسي → Epithalon 5mg/يوم × 20 يوم. يُكرر كل 6 أشهر. + GHK-Cu كريم يومي. تكلفة: $150 لكل دورة.
- بروتوكول متقدم → أضف Thymosin Alpha-1 1.6mg مرتين/أسبوع للمناعة. تكلفة إضافية: $120/شهر.

## تعارضات خطيرة (احفظها):
- Semaglutide + أنسولين = خطر هبوط سكر حاد
- GHRPs + سكري غير مسيطر = يرفع السكر
- BPC-157 + سرطان نشط = قد يحفّز نمو الورم (نظريًا)
- IGF-1 LR3 + أي محفّز نمو آخر = خطر تضخّم أعضاء
- Melanotan II = لا أنصح أبدًا. خطر سرطان جلد حقيقي.
- Dihexa = لا أنصح. صفر تجارب بشرية.

## تحاليل قبل أي بروتوكول (3 مستويات):
- أساسي (للجميع): CBC, CMP, HbA1c, سكر صائم
- موسّع (لمحفزات هرمون النمو): + IGF-1, إنسولين صائم, Lipid Panel
- شامل (لبروتوكولات هرمونية): + تستوستيرون كلي وحر, LH, FSH, Thyroid (TSH+T4+T3)

## حساب الجرعات (احسب للمستخدم دائمًا):
التركيز = (وزن القارورة mg × 1000) ÷ كمية الماء ml
الكمية المطلوبة = الجرعة mcg ÷ التركيز
وحدات السيرنج = الكمية ml × (وحدات السيرنج ÷ سعة السيرنج ml)
مثال: قارورة 5mg + 2ml ماء = تركيز 2500mcg/ml. جرعة 250mcg = 0.1ml = 10 وحدة بسيرنج 100 وحدة.
احسب دائمًا للمستخدم ووجّهه لـ /calculator للتأكد.

أنت تمثّل منتج بقيمة $99/شهر. كل إجابة لازم تكون أفضل من ساعة بحث في Reddit + 30 دقيقة في ChatGPT مجتمعين. أعطِ قرارات، مش معلومات.`;


async function buildUserContext(userId: string): Promise<string> {
  let context = '\n\n## سياق المستخدم الحالي:\n';

  try {
    const { data: logs } = await supabase
      .from('injection_logs')
      .select('peptide_name, dose, unit, injection_site, injected_at')
      .eq('user_id', userId)
      .order('injected_at', { ascending: false })
      .limit(10);

    if (logs && logs.length > 0) {
      context += `\n### سجل الحقن (آخر ${logs.length} حقنات):\n`;
      logs.forEach(l => {
        context += `- ${l.peptide_name}: ${l.dose} ${l.unit} في ${l.injection_site} (${new Date(l.injected_at).toLocaleDateString('en')})\n`;
      });
      context += `\nالمستخدم لديه خبرة سابقة. لا تسأله "هل جربت ببتيدات من قبل" — هو يستخدمها فعلًا. ابنِ على ما يستخدمه.\n`;
    } else {
      context += `\nالمستخدم ليس لديه سجل حقن. مبتدئ على الأرجح.\n`;
    }

    const favs = (() => {
      try {
        const stored = localStorage.getItem('pptides_favorites');
        return stored ? JSON.parse(stored) as string[] : [];
      } catch { return []; }
    })();

    if (favs.length > 0) {
      const favNames = favs.map(id => allPeptides.find(p => p.id === id)?.nameEn).filter(Boolean);
      if (favNames.length > 0) {
        context += `\n### ببتيدات مفضّلة لديه: ${favNames.join(', ')}\nاستخدم هذه المعلومة لتخصيص التوصيات.\n`;
      }
    }
  } catch {}

  context += `\n### عند ذكر أي ببتيد، أضف رابطه هكذا: [اسم الببتيد](/peptide/id)\nمثال: [BPC-157](/peptide/bpc-157) أو [سيماغلوتايد](/peptide/semaglutide)\nهذا يسمح للمستخدم بالانتقال مباشرة لصفحة البروتوكول.\n`;

  return context;
}

export default function Coach() {
  const { user, subscription, upgradeTo } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [searchParams] = useSearchParams();
  const autoSentRef = useRef(false);
  const userContextRef = useRef<string>('');

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (user) {
      buildUserContext(user.id).then(ctx => { userContextRef.current = ctx; });
    }
  }, [user]);

  useEffect(() => {
    const peptideParam = searchParams.get('peptide');
    if (peptideParam && !autoSentRef.current && user && messages.length === 0) {
      autoSentRef.current = true;
      sendMessage(`أبغى أعرف عن ${peptideParam} — وش البروتوكول والجرعة المثالية؟`);
    }
  }, [searchParams, user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Helmet>
          <title>المدرب الذكي — اسأل عن الببتيدات بالذكاء الاصطناعي | AI Peptide Coach</title>
          <meta name="description" content="مدرب ذكي يجيب على أسئلتك حول الببتيدات والجرعات والبروتوكولات. AI-powered peptide coaching assistant." />
        </Helmet>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
            <Lock className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-stone-900">سجّل الدخول للوصول إلى المدرب الذكي</p>
          <p className="mt-2 text-sm text-stone-800">خبير ببتيدات يعرف 41+ ببتيد — يجاوبك فورًا</p>
          <Link
            to="/login"
            className="mt-4 rounded-full bg-emerald-600 px-10 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  const isElite = subscription.isProOrTrial && subscription.tier === 'elite';
  const TRIAL_MESSAGE_LIMIT = 3;
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const trialLimitReached = !isElite && userMessageCount >= TRIAL_MESSAGE_LIMIT;

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading || trialLimitReached) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;
      const response = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + userContextRef.current },
            ...updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });

      if (!response.ok) throw new Error('فشل الاتصال بالخادم');

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content ?? 'عذرًا، لم أتمكن من الإجابة.';
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'حدث خطأ أثناء الاتصال. حاول مرة أخرى.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="min-h-screen" >
      <Helmet>
        <title>المدرب الذكي — اسأل عن الببتيدات بالذكاء الاصطناعي | AI Peptide Coach</title>
        <meta name="description" content="مدرب ذكي يجيب على أسئلتك حول الببتيدات والجرعات والبروتوكولات. AI-powered peptide coaching assistant." />
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <div
          className="mb-8 text-center"
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100"
          >
            <Bot className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">
            المدرب الذكي
          </h1>
          <p className="mt-2 text-base text-stone-600">
            خبير ببتيدات يعرف 41+ ببتيد — يصمّم لك بروتوكول مخصّص
          </p>
        </div>

        <div
          className="rounded-2xl border border-stone-300 bg-stone-50"
        >
          <div
            ref={scrollRef}
            className="max-h-[500px] min-h-[300px] space-y-4 overflow-y-auto p-6"
          >
            {messages.length === 0 && (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 text-center px-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                  <Bot className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-base font-bold text-stone-900">استشارة ببتيدات مخصّصة</p>
                  <p className="mt-1 text-sm text-stone-600">اختر هدفك وأبدأ بتقييم حالتك وتصميم بروتوكول مخصّص لك</p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-2 sm:grid-cols-3">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => sendMessage(g.prompt)}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-stone-200 bg-white p-4 text-center transition-all duration-200 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-600/10 hover:-translate-y-1 active:scale-[0.97]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 transition-colors group-hover:bg-emerald-100">
                        <g.Icon className="h-5 w-5 text-emerald-600" />
                      </div>
                      <span className="text-xs font-bold text-stone-800">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn('flex', msg.role === 'user' ? 'justify-start' : 'justify-end')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-5 py-3',
                    msg.role === 'user'
                      ? 'gold-gradient rounded-br-md'
                      : 'rounded-bl-md border border-stone-300',
                  )}
                  style={
                    msg.role === 'assistant'
                      ? { background: '#f5f5f4' }
                      : undefined
                  }
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">
                      {msg.content}
                    </p>
                  ) : (
                    <div className="text-sm leading-relaxed text-stone-800 prose-coach">
                      {renderMarkdown(msg.content)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-end">
                <div
                  className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-stone-300 px-5 py-3"
                  
                >
                  <Loader2 className="h-4 w-4 animate-spin text-stone-800" />
                  <span className="text-sm text-stone-800">يكتب...</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-stone-300 p-4">
            {trialLimitReached && (
              <div className="mb-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5 text-center">
                <Sparkles className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
                <p className="font-bold text-stone-900">أعجبك المدرب الذكي؟</p>
                <p className="mt-1 text-sm text-stone-800">
                  استخدمت {TRIAL_MESSAGE_LIMIT} أسئلة مجانية. ترقَّ إلى Elite لأسئلة بلا حدود + استشارات شخصية.
                </p>
                <button
                  onClick={() => upgradeTo('elite')}
                  className="mt-3 inline-block rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700"
                >
                  ترقَّ إلى Elite — $99/شهريًا
                </button>
              </div>
            )}
            {!isElite && messages.length > 0 && !trialLimitReached && (
              <p className="mb-2 text-center text-xs text-stone-700">
                {TRIAL_MESSAGE_LIMIT - userMessageCount} أسئلة مجانية متبقية — <button onClick={() => upgradeTo('elite')} className="text-emerald-600 underline">ترقَّ لأسئلة بلا حدود</button>
              </p>
            )}
            {messages.length > 0 && !isLoading && !trialLimitReached && (() => {
              const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
              if (!lastAssistant) return null;
              const followUps = getContextualFollowUps(lastAssistant.content);
              return (
                <div className="mb-3">
                  <p className="mb-2 text-xs text-stone-500 text-center">اسأل المزيد:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {followUps.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-sm"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب سؤالك هنا..."
                rows={1}
                disabled={isLoading || trialLimitReached}
                className={cn(
                  'flex-1 resize-none rounded-xl border border-stone-300 bg-stone-50 px-4 py-3',
                  'text-sm text-stone-900 placeholder:text-stone-700',
                  'transition-colors focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200',
                  (isLoading || trialLimitReached) && 'cursor-not-allowed opacity-60',
                )}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all',
                  input.trim() && !isLoading
                    ? 'hover:brightness-110'
                    : 'cursor-not-allowed opacity-40',
                )}
                style={{ background: '#10b981' }}
              >
                <Send className="h-5 w-5" style={{ color: 'white' }} />
                <span className="sr-only">إرسال</span>
              </button>
            </div>
          </div>
        </div>

        <p
          className="mt-6 text-center text-xs text-stone-700"
        >
          محتوى تعليمي بحثي — أنت المسؤول عن قراراتك الصحية. اعمل تحاليلك.
        </p>
      </div>
    </div>
  );
}
