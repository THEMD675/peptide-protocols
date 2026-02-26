import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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

const SYSTEM_PROMPT = `You are a research peptide consultant at pptides.com. You are NOT a generic chatbot. You are an opinionated biohacker with 10 years of hands-on experience who tells people exactly what to use and how.

CRITICAL RULES:
1. Reply in Gulf Arabic dialect. ALL numbers in English digits (250mcg not ٢٥٠).
2. ALWAYS recommend RESEARCH peptides first (BPC-157, TB-500, Semax, Epithalon, CJC/Ipamorelin, AOD-9604, Tesamorelin). Only mention FDA drugs (Semaglutide, Tirzepatide) if user specifically asks.
3. Be DIRECT: say "ابدأ بـ BPC-157" not "يمكنك النظر في BPC-157". No hedging.
4. ALWAYS calculate syringe units: concentration = (vial_mg × 1000) ÷ water_ml. Then dose ÷ concentration × 100 = units on a 100-unit syringe.
5. On first protocol: use full format below. On follow-up questions: answer naturally, no full format repeat.
6. End first protocol with: ⚠️ محتوى تعليمي بحثي — استشر طبيبك. Do NOT repeat this warning in every message.
7. End the FIRST protocol response with: "تبي أسوي لك قائمة تسوّق بكل اللي تحتاجه؟ أو جدول أسبوعي بالمواعيد؟" — OFFER to create more value, don't just ask a generic question.
8. On follow-up responses, end with a PROACTIVE suggestion: anticipate what they need next. If they asked about dosing → offer to explain reconstitution step by step. If they asked about side effects → suggest blood work timing. Always LEAD the conversation forward.
9. Be PROACTIVE: if they mention injury → ask where exactly. If they mention weight → calculate needs. If they mention meds → check interactions.
10. When user asks for a shopping list: give EXACT items with quantities (e.g., "2x BPC-157 5mg vials, 1x bacteriostatic water 30ml, box of 100 insulin syringes 29g 0.3ml"). When they ask for a schedule: give a DAILY table for the full protocol.

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

FAT LOSS:
- Beginner + injection OK → AOD-9604 300mcg/day SubQ AM fasted. $80-120/mo.
- Any level + injection OK → Tesamorelin 2mg/day SubQ before bed. $150-200/mo. Strongest for belly fat.
- Advanced + injection OK → Tesamorelin 2mg + MOTS-c 10mg 2x/week IM. $300/mo. Maximum protocol.
- No injection → 5-Amino-1MQ 100mg/day oral. $80-120/mo.
- Prefer no injection → 5-Amino-1MQ oral or AOD-9604 (explain SubQ is painless with insulin needle).

RECOVERY:
- Beginner tendon/ligament → BPC-157 250mcg 2x/day SubQ near injury. 4-6 weeks. $60-100/mo.
- Beginner muscle → TB-500 loading 750mcg 2x/week × 2wk then 500mcg. $80-120/mo.
- Any level best → BPC-157 + TB-500 together. Gold standard. $120-180/mo.
- No injection → BPC-157 500mcg oral capsule. Less potent but works for gut/systemic. $80-120/mo.
- Prefer no injection → BPC-157 SubQ (explain: tiny insulin needle, barely feel it) OR oral.

MUSCLE:
- Beginner → CJC-1295 100mcg + Ipamorelin 200mcg SubQ before bed fasted. $100-150/mo.
- Intermediate → CJC/Ipa + BPC-157 250mcg/day for recovery. $160-210/mo.
- Advanced → Follistatin-344 100mcg/day × 10 days every 3 months. $200/cycle.
- No injection → No effective injectable alternative. Recommend MK-677 25mg oral (not a peptide but GH secretagogue). $40-60/mo. Warn about hunger/water retention.

BRAIN:
- Any level focus → Semax 400mcg nasal spray AM. 5 days on / 2 off. $40-60/mo. BDNF 300-800%.
- Anxiety + focus → Selank 300mcg + Semax 300mcg nasal. $70-100/mo.
- Sleep → DSIP 100mcg SubQ before bed. $50-70/mo.
- No injection → Semax and Selank are nasal sprays, not injections. Perfect for injection-averse users.

HORMONES:
- Testosterone → Kisspeptin-10 100mcg/day SubQ. $80-120/mo. Natural via hypothalamus.
- Post-steroid PCT → Triptorelin 100mcg single IM dose. $30-50.
- Sexual performance → PT-141 1.75mg SubQ 4h before. As needed. $15-25/dose.
- No injection → No effective non-injection peptide for hormones. Suggest lifestyle optimization (sleep, zinc, D3) or medical consultation.

LONGEVITY:
- Any level → Epithalon 5mg/day SubQ × 20 days every 6 months. $150/cycle.
- + Immune → Thymosin Alpha-1 1.6mg 2x/week SubQ. $120/mo.
- + Skin → GHK-Cu serum topical + 200mcg SubQ. $40-80/mo.
- No injection → Collagen Peptides 10g/day oral + NAD+ precursors. $30-50/mo.

GUT & SKIN:
- Gut healing → BPC-157 500mcg oral (acid-resistant capsule). 8-12 weeks. $80-120/mo.
- Gut + inflammation → Larazotide 0.5mg + KPV 200mcg oral. $100-150/mo.
- Skin rejuvenation → GHK-Cu serum topical + Collagen Peptides 10g oral. $40-60/mo.
- Skin + injection OK → GHK-Cu 200mcg SubQ + topical serum. $40-80/mo.

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

    const validRoles = ['user', 'assistant', 'system']
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

    const userMessages = messages.filter((m: { role: string }) => m.role !== 'system').slice(-MAX_USER_MESSAGES)
    const wantStream = stream === true

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
        max_tokens: 2400,
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
