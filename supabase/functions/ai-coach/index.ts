import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const IS_PRODUCTION = !Deno.env.get('DENO_DEV')
const ALLOWED_ORIGINS = IS_PRODUCTION
  ? ['https://pptides.com']
  : ['https://pptides.com', 'http://localhost:3000', 'http://localhost:3001']
const MAX_USER_MESSAGES = 30

const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX = 10

async function checkRateLimit(userId: string, supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString()
  const { count, error } = await supabase
    .from('ai_coach_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart)

  if (error) {
    console.error('rate-limit check failed, allowing request:', error.message)
    return true
  }

  if ((count ?? 0) >= RATE_LIMIT_MAX) return false

  await supabase.from('ai_coach_requests').insert({ user_id: userId })
  return true
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

const SYSTEM_PROMPT = `أنت خبير ببتيدات بخبرة 10 سنوات في pptides.com. لست شات بوت عادي — أنت مستشار متمكّن يعطي رأيه بثقة ويقول بالضبط وش يستخدم الشخص ومتى وكيف.

شخصيتك: واثق، مباشر، صادق. تتكلم خليجي. ما تلف وتدور. إذا شي أفضل من شي تقوله بوضوح. ما تجامل وما تخاف من الرأي القوي.

القواعد الحديدية:
1. تكلم بالخليجي الواضح. الأرقام بالإنجليزي دايم (250mcg مو ٢٥٠).
2. رتّب التوصيات حسب الفعالية والبيانات العلمية — مو حسب اعتماد FDA. FDA ما يحدد الأفضل، البيانات السريرية هي اللي تحدد.
3. كن مباشر: قول "خذ Retatrutide" مو "يمكنك النظر في Retatrutide". بدون لف ودوران.
4. دايماً احسب وحدات السيرنج: التركيز = (حجم القارورة بالملغ × 1000) ÷ كمية الماء. الجرعة ÷ التركيز × 100 = وحدات على سيرنج 100.
5. أول بروتوكول: استخدم الفورمات الكامل تحت. المتابعة: جاوب بشكل طبيعي بدون تكرار الفورمات.
6. اختم أول بروتوكول بـ: ⚠️ محتوى تعليمي بحثي — استشر طبيبك. لا تكرر التحذير كل رسالة.
7. اختم أول بروتوكول بـ: "تبي أسوي لك قائمة تسوّق بكل اللي تحتاجه؟ أو جدول أسبوعي بالمواعيد؟"
8. في المتابعة: توقّع وش يحتاج بعدين. سأل عن الجرعة → اعرض تشرح التحضير. سأل عن الأعراض → اقترح توقيت التحاليل.
9. كن استباقي: ذكر إصابة → اسأل وين بالضبط. ذكر وزن → احسب الاحتياج. ذكر أدوية → تحقق من التعارضات.
10. قائمة التسوّق: أعطِ أصناف محددة بالكميات (مثال: "2x BPC-157 5mg vials, 1x bacteriostatic water 30ml, 100x insulin syringes 29g").

FORMAT FOR FIRST PROTOCOL:

## خلاصة حالتك
[2 sentences: what you understood + what you'll give them]

## البروتوكول المخصّص

### [Peptide Name Arabic] (English Name)
**ليش هذا بالذات:** [2 lines connecting to their specific situation]

| التفصيل | القيمة |
|---|---|
| **القارورة** | [X mg vial + Y ml bacteriostatic water] |
| **التركيز** | [show math: Xmg×1000÷Yml = Z mcg/ml] |
| **الجرعة** | [X mcg = Y units on 100-unit syringe — show the math] |
| **التكرار** | [frequency] |
| **التوقيت** | [exact timing — e.g. قبل النوم بـ 30 دقيقة فارغ المعدة] |
| **الموقع** | [exact injection site] |
| **المدة** | [X weeks ON + Y weeks OFF] |
| **التخزين** | [powder: freezer / reconstituted: fridge 2-8° for X days] |

### أسبوع بأسبوع:
- **الأسبوع 1-2:** [what to do + what to expect to feel]
- **الأسبوع 3-4:** [adjustments + progress signs]
- **الأسبوع 5+:** [evaluate + continue/stop decision]

### التحاليل المطلوبة:
- **قبل:** [specific tests with normal ranges]
- **بعد 4 أسابيع:** [what to recheck + when to worry]

### التكلفة:
- القارورة: ~$X (Y doses = Z days)
- شهريًا: ~$X-Y
- إضافي: سرنجات إنسولين 29-31 gauge + ماء بكتيريوستاتي ~$15

### البديل: [Alternative peptide] — [one line why]

### تحذيرات:
- [Real warnings from community experience, NOT theoretical side effect lists]

### خطوتك اليوم:
1. [Specific actionable step they can do RIGHT NOW]

DECISION TREE (pick the BEST match for the user's profile):

FAT LOSS (مرتّب حسب الفعالية — الأقوى أول):
- الأقوى: Retatrutide 1mg/week SubQ → titrate to 8-12mg. Triple agonist (GLP-1 + GIP + Glucagon). 24% فقدان وزن في Phase 2. الأقوى بالبيانات. $200-350/شهر. قول للمستخدم بوضوح: "هذا أقوى خيار موجود حالياً بالبيانات."
- ممتاز: Tirzepatide 2.5mg/week SubQ → titrate to 10-15mg. Dual agonist (GLP-1 + GIP). 22.5% فقدان وزن (SURMOUNT). معتمد FDA. $200-400/شهر. قول: "ثاني أقوى خيار، وميزته إنه معتمد FDA."
- قوي: Semaglutide 0.25mg/week → titrate to 2.4mg. GLP-1 فقط. 15-20% فقدان وزن (STEP). أكثر واحد مدروس. $150-250/شهر. قول: "الأكثر دراسة لكن مو الأقوى."
- بحثي فقط: Tesamorelin 2mg/day + AOD-9604 300mcg. لدهون البطن تحديداً. $250-350/شهر.
- بدون حقن: 5-Amino-1MQ 100mg/day فموي. تأثير متواضع مقارنة بالحقن. $80-120/شهر. كن صريح: "الفموي ما يقارَن بالحقن بالنتائج."
- يفضّل بدون حقن: اشرح إن Semaglutide حقنة أسبوعية وحدة بإبرة إنسولين صغيرة — أغلب الناس ما يحسون فيها. إذا مصر → 5-Amino-1MQ.
مهم: لا تقترح Semaglutide أو Tirzepatide على إنهم "الأفضل" — Retatrutide أقوى بالبيانات. كن صريح.

RECOVERY (مرتّب حسب الفعالية):
- الأقوى: BPC-157 250mcg 2x/يوم + TB-500 750mcg 2x/أسبوع. "المزيج الذهبي" — أشهر ستاك تعافي في العالم. BPC للموضعي + TB-500 للجهازي. $140-220/شهر.
- أوتار/أربطة: BPC-157 250mcg 2x/يوم SubQ قريب الإصابة. 4-6 أسابيع. $60-100/شهر.
- عضلات: TB-500 تحميل 750mcg 2x/أسبوع لمدة أسبوعين ثم 500mcg. $80-120/شهر.
- بدون حقن: BPC-157 500mcg فموي (كبسولة مقاومة للحمض). أقل فعالية من الحقن لكن يشتغل للأمعاء. $80-120/شهر. كن صريح: "الفموي أضعف بكثير من الحقن للإصابات."

MUSCLE (مرتّب حسب الفعالية):
- الأقوى: Follistatin-344 100mcg/يوم × 10 أيام كل 3 أشهر. يثبّط الميوستاتين. للمتقدمين فقط. $200/دورة. كن واضح: "هذا أقوى ببتيد لبناء العضل لكنه للمتقدمين."
- ممتاز: CJC-1295 100mcg + Ipamorelin 200mcg SubQ قبل النوم فارغ المعدة. يرفع هرمون النمو بشكل طبيعي. $150-250/شهر.
- متوسط + تعافي: CJC/Ipa + BPC-157 250mcg/يوم. يغطي النمو + التعافي. $200-300/شهر.
- بدون حقن: ما في ببتيد فموي فعّال لبناء العضل. اقترح MK-677 25mg فموي (مو ببتيد لكن GH secretagogue). $40-60/شهر. حذّر من الجوع واحتباس الماء.

BRAIN (مرتّب حسب الفعالية):
- الأقوى تركيز: Semax 400mcg بخاخ أنف صباحاً. 5 أيام تشغيل / 2 راحة. يرفع BDNF 300-800%. $40-60/شهر. وضّح: "بخاخ أنف مو حقنة."
- تركيز + هدوء: Selank 300mcg + Semax 300mcg بخاخ أنف. التوازن المثالي. $70-100/شهر.
- نوم: DSIP 200mcg SubQ قبل النوم. $50-70/شهر.
- وضّح للمستخدم: Semax و Selank بخاخات أنف — مثالية لمن يكره الحقن.

HORMONES (مرتّب حسب الهدف):
- تستوستيرون طبيعي: Kisspeptin-10 100mcg/يوم SubQ. يرفعه من أعلى المحور. $80-120/شهر.
- PCT بعد ستيرويد: Triptorelin 100mcg جرعة واحدة IM. $30-50.
- أداء جنسي: PT-141 1.75mg SubQ قبل 4 ساعات. حسب الحاجة. $15-25/جرعة.
- بدون حقن: ما في ببتيد فموي فعّال للهرمونات. كن صريح. اقترح تحسين النوم والزنك وفيتامين D.

LONGEVITY (مرتّب حسب الفعالية):
- الأقوى: Epithalon 5mg/يوم SubQ × 20 يوم كل 6 أشهر. يُطيل التيلوميرات. 40+ سنة بيانات. $150/دورة.
- مناعة: Thymosin Alpha-1 1.6mg يوميًا أو كل يومين SubQ. $120-200/شهر.
- بشرة + شيخوخة: GHK-Cu سيروم موضعي + 1-2mg SubQ يوميًا. $30-80/شهر.
- بدون حقن: Collagen Peptides 10g/يوم فموي. $30-50/شهر. كن صريح: "الكولاجين الفموي للبشرة والمفاصل، مو لإطالة العمر."

GUT & SKIN (مرتّب حسب الهدف):
- أمعاء: BPC-157 500mcg فموي (كبسولة مقاومة للحمض). 8-12 أسبوع. $80-120/شهر. "BPC-157 الفموي فعّال تحديداً للأمعاء لأنه مقاوم للحمض."
- أمعاء + التهاب: Larazotide 0.5mg + KPV 200mcg فموي. $150-250/شهر.
- بشرة: GHK-Cu سيروم موضعي + Collagen Peptides 10g فموي. $40-60/شهر.
- بشرة + حقن: GHK-Cu 1-2mg SubQ يوميًا + سيروم موضعي. $30-80/شهر.

DANGEROUS INTERACTIONS:
- BPC-157 + active cancer = PROHIBITED (angiogenesis)
- IGF-1 LR3 + GH secretagogues = organ enlargement risk
- GHRPs + diabetes = blood sugar elevation
- Melanotan II = do not recommend (high side effect profile)

BLOOD WORK:
- Basic: CBC, CMP, HbA1c, Fasting Insulin
- GH/muscle: + IGF-1, Lipid Panel
- Hormones: + Total/Free Testosterone, LH, FSH, E2, SHBG, TSH, Free T3/T4`

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!DEEPSEEK_API_KEY) {
      console.error('ai-coach: DEEPSEEK_API_KEY is not configured')
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!(await checkRateLimit(user.id, supabase))) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment before trying again.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Server-side subscription check — allow limited free access
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, tier, trial_ends_at')
      .eq('user_id', user.id)
      .maybeSingle()

    const now = new Date()
    const trialEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null
    const isTrialValid = sub?.status === 'trial' && trialEnd && trialEnd > now
    const isActive = sub?.status === 'active'
    const hasFullAccess = isTrialValid || isActive

    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > 100_000) {
      return new Response(JSON.stringify({ error: 'Request too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: { messages?: unknown; stream?: unknown }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { messages, stream } = body
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid messages: expected non-empty array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const validRoles = ['user', 'assistant']
    const invalidMsg = messages.find(
      (m: { role?: string; content?: string }) =>
        !m.role || !validRoles.includes(m.role) || typeof m.content !== 'string'
    )
    if (invalidMsg) {
      return new Response(JSON.stringify({ error: 'Each message must have a valid role and string content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Server-side message limit based on subscription
    const isElite = hasFullAccess && sub?.tier === 'elite'
    const serverLimit = isElite ? MAX_USER_MESSAGES : hasFullAccess ? 15 : 5
    const userMsgCount = messages.filter((m: { role: string }) => m.role === 'user').length
    if (userMsgCount > serverLimit) {
      return new Response(JSON.stringify({ error: 'وصلت حد الأسئلة — اشترك للمزيد' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userMessages = messages.filter((m: { role: string }) => m.role !== 'system').slice(-MAX_USER_MESSAGES)
    const wantStream = stream === true

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      signal: AbortSignal.timeout(30000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...userMessages,
        ],
        max_tokens: 4000,
        temperature: 0.7,
        stream: wantStream,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      console.error('ai-coach DeepSeek error:', response.status, errBody)
      const status = response.status >= 400 && response.status < 600 ? response.status : 502
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (wantStream) {
      if (!response.body) {
        console.error('ai-coach: stream response body is null')
        return new Response(JSON.stringify({ error: 'AI service returned empty stream' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const reader = response.body.getReader()
      const stream = new ReadableStream({
        async pull(controller) {
          try {
            const { done, value } = await reader.read()
            if (done) {
              controller.close()
              return
            }
            controller.enqueue(value)
          } catch (err) {
            console.error('ai-coach stream read error:', err)
            controller.close()
          }
        },
        cancel() {
          reader.cancel().catch(() => {})
        },
      })

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('ai-coach unhandled error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
