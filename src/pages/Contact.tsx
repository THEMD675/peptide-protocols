import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Send, CheckCircle, Mail, MessageSquare, Loader2, Clock, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SITE_URL, SUPPORT_EMAIL } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const SUBJECTS = [
  { value: '', label: 'اختر الموضوع...' },
  { value: 'سؤال عن ببتيد', label: 'سؤال عن ببتيد معين' },
  { value: 'استفسار عن الاشتراك', label: 'استفسار عن الاشتراك' },
  { value: 'مشكلة تقنية', label: 'مشكلة تقنية' },
  { value: 'اقتراح تحسين', label: 'اقتراح تحسين' },
  { value: 'طلب تعاون', label: 'طلب تعاون أو شراكة' },
  { value: 'تواصل عام', label: 'تواصل عام' },
];

export default function Contact() {
  const { user, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user?.email, email]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('يرجى إدخال بريدك الإلكتروني'); return; }
    if (!message.trim()) { toast.error('يرجى كتابة رسالتك'); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('enquiries').insert({
        user_id: user?.id ?? null,
        email: email.trim(),
        subject: subject.trim() || 'تواصل عام',
        message: `الاسم: ${name || 'لم يُذكر'}\n\n${message}`,
      });
      if (error) throw error;
      setShowConfetti(true);
      setTimeout(() => setSubmitted(true), 600);
      toast.success('تم إرسال رسالتك بنجاح');
    } catch {
      toast.error('تعذّر إرسال الرسالة — حاول مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen animate-fade-in">
        <Helmet>
          <title>تواصل معنا | pptides</title>
        </Helmet>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          {/* Success animation */}
          <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            {/* Outer ring pulse */}
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-30" />
            {/* Inner circle */}
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200">
              <CheckCircle className="h-10 w-10 text-white" />
            </span>
          </div>
          <h1 className="mb-3 text-2xl font-bold text-stone-900">تم إرسال رسالتك بنجاح ✨</h1>
          <p className="text-lg text-stone-600">شكرًا لتواصلك معنا</p>
          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700">
            <Clock className="h-4 w-4" />
            نرد خلال 24 ساعة
          </div>
          <p className="mt-6 text-sm text-stone-500">
            للاستفسارات العاجلة:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-emerald-600 hover:underline">{SUPPORT_EMAIL}</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen animate-fade-in ${showConfetti ? 'pointer-events-none' : ''}`}>
      <Helmet>
        <title>تواصل معنا | pptides</title>
        <meta name="description" content="تواصل مع فريق pptides — نسعد بأسئلتكم واستفساراتكم حول الببتيدات العلاجية والبروتوكولات." />
        <meta property="og:title" content="تواصل معنا | pptides" />
        <meta property="og:description" content="تواصل مع فريق pptides — نسعد بأسئلتكم واستفساراتكم." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/contact`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content="ar_SA" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`${SITE_URL}/contact`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "تواصل معنا",
          "url": `${SITE_URL}/contact`,
          "mainEntity": {
            "@type": "Organization",
            "name": "pptides",
            "email": SUPPORT_EMAIL
          }
        })}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <Mail className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-stone-900">تواصل معنا</h1>
          <p className="text-stone-600">
            لديك سؤال أو اقتراح؟ نسعد بسماع رأيك
          </p>
        </div>

        {/* Response time badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-700">
            <Clock className="h-4 w-4" />
            نرد خلال 24 ساعة
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-stone-700">
              الاسم <span className="text-stone-400">(اختياري)</span>
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="اسمك الكريم"
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-stone-700">
              البريد الإلكتروني <span className="text-red-500">*</span>
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium text-stone-700">
              الموضوع
            </label>
            <div className="relative">
              <select
                id="contact-subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full appearance-none rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 pe-10 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
              >
                {SUBJECTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            </div>
          </div>

          <div>
            <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-stone-700">
              الرسالة <span className="text-red-500">*</span>
            </label>
            <textarea
              id="contact-message"
              required
              rows={5}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              className="w-full resize-none rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
          >
            {submitting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
          </button>
        </form>

        {/* Info */}
        <div className="mt-8 flex items-start gap-3 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">
          <MessageSquare className="mt-0.5 h-5 w-5 flex-shrink-0 text-stone-400" />
          <p>
            نحرص على الرد خلال 24 ساعة في أيام العمل. للاستفسارات العاجلة، يمكنك مراسلتنا عبر البريد مباشرة على{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-emerald-600 hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
