import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Send,
  CheckCircle,
  Mail,
  MessageSquare,
  Clock,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SITE_URL, SUPPORT_EMAIL } from '@/lib/constants';
import { TRIAL_DAYS } from '@/config/trial';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeInput } from '@/lib/utils';

const SUBJECTS = [
  { value: '', label: 'اختر الموضوع...' },
  { value: 'استفسار عام', label: 'استفسار عام' },
  { value: 'مشكلة تقنية', label: 'مشكلة تقنية' },
  { value: 'اقتراح', label: 'اقتراح' },
  { value: 'شراكة', label: 'شراكة' },
  { value: 'سؤال عن ببتيد', label: 'سؤال عن ببتيد معين' },
  { value: 'استفسار عن الاشتراك', label: 'استفسار عن الاشتراك' },
  { value: 'أخرى', label: 'أخرى' },
];

const MINI_FAQ = [
  {
    q: 'كيف ألغي اشتراكي؟',
    a: 'من صفحة الحساب → إدارة الاشتراك → إلغاء. أو تواصل معنا وسنتولى الأمر.',
  },
  {
    q: 'هل يمكنني استرداد أموالي؟',
    a: `نعم، لديك ضمان ${TRIAL_DAYS} أيام. تواصل معنا واسترد أموالك بالكامل.`,
  },
  {
    q: 'نسيت كلمة المرور',
    a: 'اضغط "نسيت كلمة المرور" في صفحة تسجيل الدخول وسنرسل لك رابط إعادة التعيين.',
  },
];

export default function Contact() {
  const { user, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user?.email, email]);

  if (isLoading) {
    // Show a layout-matching skeleton instead of a bare spinner to avoid flash
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16 animate-fade-in">
        {/* Header skeleton */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl animate-pulse bg-stone-200 dark:bg-stone-700 skeleton-shimmer" />
          <div className="mx-auto h-8 w-40 rounded-lg animate-pulse bg-stone-200 dark:bg-stone-700 skeleton-shimmer" />
          <div className="mx-auto mt-2 h-5 w-64 rounded-lg animate-pulse bg-stone-100 dark:bg-stone-800 skeleton-shimmer" />
        </div>
        {/* Badges skeleton */}
        <div className="mb-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <div className="h-10 w-36 rounded-full animate-pulse bg-stone-100 dark:bg-stone-800 skeleton-shimmer" />
          <div className="h-10 w-48 rounded-full animate-pulse bg-stone-100 dark:bg-stone-800 skeleton-shimmer" />
        </div>
        {/* Form card skeleton */}
        <div className="space-y-5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6 sm:p-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 w-24 rounded animate-pulse bg-stone-200 dark:bg-stone-700 skeleton-shimmer" />
              <div className="h-12 w-full rounded-xl animate-pulse bg-stone-100 dark:bg-stone-800 skeleton-shimmer" />
            </div>
          ))}
          <div className="h-12 w-full rounded-xl animate-pulse bg-emerald-100 dark:bg-emerald-900/20 skeleton-shimmer" />
        </div>
      </div>
    );
  }

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'name':
        return !value.trim() ? 'الاسم مطلوب' : '';
      case 'email':
        if (!value.trim()) return 'البريد الإلكتروني مطلوب';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'البريد الإلكتروني غير صحيح';
        return '';
      case 'subject':
        return !value ? 'يرجى اختيار الموضوع' : '';
      case 'message':
        return !value.trim() ? 'الرسالة مطلوبة' : '';
      default:
        return '';
    }
  };

  const handleBlur = (field: string, value: string) => {
    const err = validateField(field, value);
    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {
      name: validateField('name', name),
      email: validateField('email', email),
      subject: validateField('subject', subject),
      message: validateField('message', message),
    };
    setFieldErrors(errors);
    const firstError = Object.values(errors).find(Boolean);
    if (firstError) {
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('enquiries').insert({
        user_id: user?.id ?? null,
        email: email.trim().slice(0, 320),
        subject: sanitizeInput(subject, 200),
        message: sanitizeInput(`${name.trim() ? `الاسم: ${name.trim()}\n\n` : ''}${message}`, 5000),
      });
      if (error) throw error;
      setTimeout(() => setSubmitted(true), 600);
      toast.success('تم إرسال رسالتك بنجاح');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('P0429') || msg.includes('Rate limit')) {
        toast.error('لقد أرسلت رسائل كثيرة — حاول مرة أخرى لاحقاً');
      } else {
        toast.error('تعذّر إرسال الرسالة — حاول مرة أخرى');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white dark:bg-stone-950 animate-fade-in">
        <Helmet>
          <title>تواصل معنا | pptides</title>
        </Helmet>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          {/* Success animation */}
          <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-200 dark:bg-emerald-800 opacity-30" />
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-emerald-900">
              <CheckCircle className="h-10 w-10 text-white" />
            </span>
          </div>
          <h1 className="mb-3 text-3xl font-bold text-stone-900 dark:text-stone-100">
            تم إرسال رسالتك بنجاح
          </h1>
          <p className="text-lg text-stone-600 dark:text-stone-300">شكرًا لتواصلك معنا</p>
          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-5 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            <Clock className="h-4 w-4" />
            نرد خلال 24 ساعة
          </div>
          <p className="mt-6 text-sm text-stone-500 dark:text-stone-300">
            للاستفسارات العاجلة:{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 animate-fade-in">
      <Helmet>
        <title>تواصل معنا | pptides</title>
        <meta
          name="description"
          content="تواصل مع فريق pptides — نسعد بأسئلتكم واستفساراتكم حول الببتيدات العلاجية والبروتوكولات."
        />
        <meta property="og:title" content="تواصل معنا | pptides" />
        <meta
          property="og:description"
          content="تواصل مع فريق pptides — نسعد بأسئلتكم واستفساراتكم."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/contact`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:locale" content="ar_SA" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`${SITE_URL}/contact`} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: 'تواصل معنا',
            url: `${SITE_URL}/contact`,
            mainEntity: {
              '@type': 'Organization',
              name: 'pptides',
              email: SUPPORT_EMAIL,
            },
          })}
        </script>
      </Helmet>

      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <Mail className="h-7 w-7 text-emerald-700" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-stone-900 dark:text-stone-100">
            تواصل معنا
          </h1>
          <p className="text-stone-600 dark:text-stone-300">
            لديك سؤال أو اقتراح؟ نسعد بسماع رأيك
          </p>
        </div>

        {/* Response time badge + email */}
        <div className="mb-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-5 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <Clock className="h-4 w-4" />
            نرد خلال 24 ساعة
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-200 transition-colors hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            <Mail className="h-4 w-4" />
            {SUPPORT_EMAIL}
          </a>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6 shadow-md dark:shadow-stone-900/50 sm:p-8"
        >
          {/* Name */}
          <div>
            <label
              htmlFor="contact-name"
              className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-200"
            >
              الاسم <span className="text-red-500">*</span>
            </label>
            <input
              id="contact-name"
              type="text"
              required
              value={name}
              onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
              onBlur={() => handleBlur('name', name)}
              placeholder="اسمك الكريم"
              className={`w-full rounded-xl border bg-stone-50 dark:bg-stone-800 px-4 py-3 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 dark:text-stone-300 focus:outline-none focus:ring-2 transition-colors min-h-[44px] ${fieldErrors.name ? 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-800' : 'border-stone-300 dark:border-stone-600 focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-800'}`}
            />
            {fieldErrors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="contact-email"
              className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-200"
            >
              البريد الإلكتروني <span className="text-red-500">*</span>
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
              onBlur={() => handleBlur('email', email)}
              placeholder="name@example.com"
              className={`w-full rounded-xl border bg-stone-50 dark:bg-stone-800 px-4 py-3 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 dark:text-stone-300 focus:outline-none focus:ring-2 transition-colors min-h-[44px] ${fieldErrors.email ? 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-800' : 'border-stone-300 dark:border-stone-600 focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-800'}`}
            />
            {fieldErrors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.email}</p>}
          </div>

          {/* Subject dropdown */}
          <div>
            <label
              htmlFor="contact-subject"
              className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-200"
            >
              الموضوع <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="contact-subject"
                required
                value={subject}
                onChange={(e) => { setSubject(e.target.value); clearFieldError('subject'); }}
                onBlur={() => handleBlur('subject', subject)}
                className={`w-full appearance-none rounded-xl border bg-stone-50 dark:bg-stone-800 px-4 py-3 pe-10 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 transition-colors min-h-[44px] ${fieldErrors.subject ? 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-800' : 'border-stone-300 dark:border-stone-600 focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-800'}`}
              >
                {SUBJECTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400 dark:text-stone-300" />
            </div>
            {fieldErrors.subject && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.subject}</p>}
          </div>

          {/* Message */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="contact-message"
                className="text-sm font-medium text-stone-700 dark:text-stone-200"
              >
                الرسالة <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs tabular-nums ${message.length > 4500 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500'}`}>
                {message.length}/5000
              </span>
            </div>
            <textarea
              id="contact-message"
              required
              rows={5}
              maxLength={5000}
              value={message}
              onChange={(e) => { setMessage(e.target.value); clearFieldError('message'); }}
              onBlur={() => handleBlur('message', message)}
              placeholder="اكتب رسالتك هنا..."
              className={`w-full resize-none rounded-xl border bg-stone-50 dark:bg-stone-800 px-4 py-3 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 transition-colors ${fieldErrors.message ? 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-800' : 'border-stone-300 dark:border-stone-600 focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-800'}`}
            />
            {fieldErrors.message && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.message}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
          >
            {submitting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
          </button>
        </form>

        {/* Info note */}
        <div className="mt-8 flex items-start gap-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 p-4 text-sm text-stone-600 dark:text-stone-300">
          <MessageSquare className="mt-0.5 h-5 w-5 flex-shrink-0 text-stone-400 dark:text-stone-300" />
          <p>
            نحرص على الرد خلال 24 ساعة في أيام العمل. للاستفسارات العاجلة، يمكنك مراسلتنا
            عبر البريد مباشرة على{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        {/* Mini FAQ section */}
        <div className="mt-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <HelpCircle className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                قبل أن تتواصل معنا
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-300">
                ربما تجد إجابتك هنا
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {MINI_FAQ.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 transition-all hover:border-emerald-300 dark:hover:border-emerald-700 dark:shadow-stone-900/30"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 text-sm font-semibold text-stone-900 dark:text-stone-100 min-h-[44px] select-none">
                  <span>{faq.q}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-300 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/faq"
              className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              عرض جميع الأسئلة الشائعة ←
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
