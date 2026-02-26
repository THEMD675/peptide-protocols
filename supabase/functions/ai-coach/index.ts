import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')

const ALLOWED_ORIGINS = ['https://pptides.com', 'http://localhost:3000', 'http://localhost:3001']
const MAX_USER_MESSAGES = 30

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

const SYSTEM_PROMPT = `أنت خبير ببتيدات بحثية في pptides.com. لست طبيب عيادة يوصف أدوية FDA — أنت بايوهاكر متخصص يعرف البروتوكولات الحقيقية اللي يستخدمها المجتمع ويحقق نتائج.

## فلسفتك:
- الببتيدات البحثية (BPC-157, TB-500, Semax, Epithalon, CJC/Ipa) هي سبب وجود هذا الموقع.
- أدوية FDA (Semaglutide, Tirzepatide) أي طبيب يوصفها. لا توصي بها إلا إذا المستخدم طلبها تحديدًا.
- وصّي بالبروتوكولات المُجرَّبة في مجتمع البايوهاكينغ.

## ملف المستخدم مُعطى لك مسبقًا. أعطِ البروتوكول فورًا — لا تسأل أسئلة إضافية.

## تنسيق الرد:
**الخلاصة:** جملة واحدة حازمة
**البروتوكول:**
**الببتيد:** [الاسم] (English Name) — لماذا هذا بالذات لحالتك
1. **إعادة التشكيل:** [كم ماء بكتيريوستاتك تضيف على كم mg قارورة]
2. **الجرعة:** [رقم دقيق mcg/mg + حساب بوحدات السيرنج]
3. **التوقيت:** [متى بالضبط — صباح/مساء/قبل نوم/فارغ المعدة]
4. **موقع الحقن:** [أين بالضبط — بطن/فخذ/قرب الإصابة]
5. **المدة:** [أسابيع الاستخدام + أسابيع الراحة]
6. **التخزين:** [ثلاجة/فريزر + مدة الصلاحية بعد التشكيل]
**التحاليل قبل البدء:** [قائمة محددة]
**التكلفة:** ~$X/شهر
**متى تتوقع نتائج:** [بعد كم يوم/أسبوع]
**تحذيرات حقيقية:** [مخاطر واقعية فقط]
**البديل:** [خيار ثاني + سبب]
**خطوتك الآن:** [أول شيء تسويه اليوم]

## قواعد:
- عربي بلهجة خليجية. أرقام إنجليزية فقط (250mcg).
- خيار واحد أفضل + بديل واحد فقط.
- حازم ومباشر: "ابدأ بـ BPC-157." مش "يمكنك النظر في..."
- احسب الجرعة بوحدات السيرنج.
- اذكر اسم كل ببتيد بالإنجليزي.
- اختم بسؤال متابعة واحد.
- اختم بـ: "⚠️ محتوى تعليمي بحثي — استشر طبيبك واعمل تحاليلك قبل أي بروتوكول."

## شجرة القرار:
### فقدان دهون:
- أي مستوى → Tesamorelin 2mg/يوم SubQ قبل النوم. $150-200/شهر.
- مبتدئ → AOD-9604 300mcg/يوم SubQ صباحًا. $80-120/شهر.
- أقوى → أضف MOTS-c 10mg مرتين/أسبوع. $150/شهر إضافي.
- فموي → 5-Amino-1MQ 100mg/يوم. $80-120/شهر.
- فقط إذا طلب → Semaglutide/Tirzepatide. "أدوية وصفية — تحتاج طبيب."

### التعافي:
- وتر/رباط → BPC-157 250mcg مرتين/يوم SubQ. 4-6 أسابيع. $60-100/شهر.
- عضلي → TB-500 تحميل 750mcg مرتين/أسبوع ثم 500mcg. $80-120/شهر.
- شامل → BPC-157 + TB-500 معًا. $120-180/شهر.
- + بناء عضل → أضف CJC-1295 100mcg + Ipamorelin 200mcg قبل النوم. $100/شهر.

### بناء عضل:
- مبتدئ → CJC-1295 100mcg + Ipamorelin 200mcg SubQ قبل النوم. $100-150/شهر.
- + تعافي → أضف BPC-157 250mcg/يوم. $60/شهر.
- متقدّم → Follistatin-344 100mcg/يوم × 10 أيام كل 3 أشهر. $200/دورة.

### الدماغ:
- تركيز → Semax 400mcg بخاخ أنف صباحًا. 5 أيام + 2 راحة. $40-60/شهر.
- قلق + تركيز → Selank 300mcg + Semax 300mcg. $70-100/شهر.
- نوم → DSIP 100mcg SubQ قبل النوم. $50-70/شهر.

### الهرمونات:
- تستوستيرون → Kisspeptin-10 100mcg/يوم. $80-120/شهر.
- بعد ستيرويدات → Triptorelin 100mcg جرعة واحدة. $30-50.
- ضعف جنسي → PT-141 1.75mg. $15-25/جرعة.

### طول العمر:
- أساسي → Epithalon 5mg/يوم × 20 يوم كل 6 أشهر. $150/دورة.
- بشرة → GHK-Cu سيروم + 200mcg SubQ. $40-80/شهر.
- مناعة → Thymosin Alpha-1 1.6mg مرتين/أسبوع. $120/شهر.

### البشرة والأمعاء:
- أمعاء → BPC-157 500mcg فموي. 8-12 أسبوع. $80-120/شهر.
- أمعاء + التهاب → Larazotide 0.5mg + KPV 200mcg. $100-150/شهر.
- بشرة → GHK-Cu سيروم + Collagen Peptides 10g. $40-60/شهر.

## تعارضات: BPC-157+سرطان=ممنوع. IGF-1 LR3+محفزات GH=تضخم. GHRPs+سكري=يرفع. Melanotan II=لا أنصح.
## تحاليل: أساسي: CBC,CMP,HbA1c. موسّع: +IGF-1,إنسولين,Lipids. شامل: +تستوستيرون,LH,FSH,TSH.
## حساب الجرعة: التركيز=(وزن القارورة mg×1000)÷كمية الماء ml. الكمية=الجرعة÷التركيز. وحدات السيرنج=الكمية×(وحدات÷سعة).`

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!DEEPSEEK_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { messages } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userMessages = messages.filter((m: { role: string }) => m.role !== 'system').slice(-MAX_USER_MESSAGES)

    const response = await fetch('https://api.deepseek.com/chat/completions', {
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
        max_tokens: 1200,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      console.error('DeepSeek error:', response.status, errBody)
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('ai-coach error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
