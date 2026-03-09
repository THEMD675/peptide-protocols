import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Send, CheckCircle, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SITE_URL } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Contact() {
  const { user, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');

  // Update email when user loads
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user?.email]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      setSubmitted(true);
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
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
          <h1 className="mb-3 text-2xl font-bold text-stone-900">تم إرسال رسالتك بنجاح</h1>
          <p className="text-stone-600">شكرًا لتواصلك معنا. سنرد عليك في أقرب وقت ممكن.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in">
      <Helmet>
        <title>تواصل معنا | pptides</title>
        <meta name="description" content="تواصل مع فريق pptides — نسعد بأسئلتكم واستفساراتكم حول الببتيدات العلاجية والبروتوكولات." />
        <meta property="og:title" content="تواصل معنا | pptides" />
        <meta property="og:description" content="تواصل مع فريق pptides — نسعد بأسئلتكم واستفساراتكم." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/contact`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={`${SITE_URL}/contact`} />
      </Helmet>

      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
            <Mail className="h-7 w-7 text-amber-700" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-stone-900">تواصل معنا</h1>
          <p className="text-stone-600">
            لديك سؤال أو اقتراح؟ نسعد بسماع رأيك. أرسل لنا رسالة وسنرد عليك في أقرب وقت.
          </p>
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
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
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
              placeholder="example@email.com"
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          <div>
            <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium text-stone-700">
              الموضوع <span className="text-stone-400">(اختياري)</span>
            </label>
            <input
              id="contact-subject"
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="موضوع الرسالة"
              className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
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
              className="w-full resize-none rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
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
            نحرص على الرد خلال 24-48 ساعة في أيام العمل. للاستفسارات العاجلة، يمكنك مراسلتنا عبر البريد مباشرة على{' '}
            <a href="mailto:contact@pptides.com" className="font-medium text-amber-700 hover:underline">
              contact@pptides.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
