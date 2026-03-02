# pptides

**Live site:** [https://pptides.com](https://pptides.com) · **Repo:** [github.com/THEMD675/peptide-protocols](https://github.com/THEMD675/peptide-protocols)

The most comprehensive Arabic reference for therapeutic peptides — protocols, dose calculators, AI coach, and lab guides.

---

## English

### About

pptides is a bilingual (Arabic-first) web app for therapeutic peptide protocols. It provides:

- 41+ peptides with full protocols (dosing, cycles, side effects, evidence levels)
- Dose calculator with syringe units
- AI coach for personalized protocol guidance
- Lab guide for pre/during/post blood work
- Injection tracker and community logs

### Tech stack

- React 18, TypeScript, Vite
- Supabase (Auth, DB, Edge Functions)
- Stripe (subscriptions)
- Resend (emails)
- DeepSeek (AI coach)
- Vercel (hosting)

### Development

```bash
npm install
npm run dev
```

### Build & deploy

```bash
npm run predeploy        # type-check + build
npm run deploy           # deploy to production (Vercel)
npm run deploy:preview   # preview deploy
```

See [FOUNDER_RUNBOOK.md](./FOUNDER_RUNBOOK.md) for operational procedures and [OPERATIONS.md](./OPERATIONS.md) for deployment details.

---

## العربية

### حول المشروع

**الموقع الحيّ:** [https://pptides.com](https://pptides.com)

pptides أشمل مرجع عربي للببتيدات العلاجية — بروتوكولات، حاسبة جرعات، مدرب ذكي، ودليل تحاليل مخبرية.

### المميّزات

- أكثر من 41 ببتيد مع بروتوكولات كاملة (الجرعة، الدورة، الأعراض، مستوى الأدلة)
- حاسبة جرعات دقيقة مع وحدات السيرنج
- مدرب ذكي بالذكاء الاصطناعي لإرشادات مخصّصة
- دليل تحاليل مخبرية قبل وأثناء وبعد الاستخدام
- متتبّع حقن وسجل مجتمعي

### التقنيات

- React 18, TypeScript, Vite
- Supabase (مصادقة، قاعدة بيانات، دوال Edge)
- Stripe (اشتراكات)
- Resend (بريد إلكتروني)
- DeepSeek (المدرب الذكي)
- Vercel (استضافة)

### التطوير

```bash
npm install
npm run dev
```

### البناء والنشر

```bash
npm run predeploy        # فحص الأنواع + بناء
npm run deploy           # النشر للإنتاج (Vercel)
npm run deploy:preview   # نشر معاينة
```

راجع [FOUNDER_RUNBOOK.md](./FOUNDER_RUNBOOK.md) للإجراءات التشغيلية و[OPERATIONS.md](./OPERATIONS.md) لتفاصيل النشر.
