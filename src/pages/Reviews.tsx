import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Star, Send, MessageSquare, MessageCircle, CheckCircle, AlertCircle, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SITE_URL, TRIAL_DAYS } from '@/lib/constants';

interface Review {
  id: string;
  rating: number;
  content: string;
  text?: string;
  user_id?: string;
  is_subscriber?: boolean;
  created_at: string;
}


function StarRating({
  rating,
  onRate,
  interactive = false,
  size = 'md',
}: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md';
}) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';

  return (
    <div className="flex gap-1" dir="ltr" aria-label={interactive ? 'التقييم' : undefined}>
      {[1, 2, 3, 4, 5].map((star) =>
        interactive ? (
          <button
            key={star}
            type="button"
            aria-label={`${star} نجوم`}
            aria-pressed={rating >= star}
            onClick={() => onRate?.(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="cursor-pointer transition-transform hover:scale-110 active:scale-125"
          >
            <Star
              className={cn(
                sizeClass,
                'transition-colors',
                (hover || rating) >= star
                  ? 'fill-emerald-500 text-emerald-500'
                  : 'fill-transparent text-stone-500',
              )}
              aria-hidden
            />
          </button>
        ) : (
          <span key={star} className="cursor-default" aria-hidden="true">
            <Star
              className={cn(
                sizeClass,
                'transition-colors',
                rating >= star
                  ? 'fill-emerald-500 text-emerald-500'
                  : 'fill-transparent text-stone-500',
              )}
            />
          </span>
        ),
      )}
    </div>
  );
}

export default function Reviews() {
  const { user, subscription } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  const fetchReviews = useCallback(async (signal?: { cancelled: boolean }) => {
    setFetchError(null);
    try {
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, content, name, user_id, created_at')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (signal?.cancelled) return;
      const reviewsWithSub = data ?? [];
      if (reviewsWithSub.length > 0) {
        const userIds = [...new Set(reviewsWithSub.map(r => r.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: subs } = await supabase.from('subscriptions').select('user_id, status').in('user_id', userIds);
          const activeUserIds = new Set((subs ?? []).filter(s => ['active', 'trial'].includes(s.status)).map(s => s.user_id));
          reviewsWithSub.forEach(r => { r.is_subscriber = r.user_id ? activeUserIds.has(r.user_id) : false; });
        }
      }
      setReviews(reviewsWithSub);
    } catch {
      if (signal?.cancelled) return;
      setFetchError('تعذّر تحميل التقييمات. تحقق من اتصالك بالإنترنت.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void fetchReviews(signal);
    return () => { signal.cancelled = true; };
  }, [fetchReviews]);

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rating === 0 || !text.trim() || submitting) return;
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      if (existing && existing.length > 0) {
        toast.error('لديك تقييم مسبق بالفعل');
        submittingRef.current = false;
        return;
      }

      setSubmitting(true);
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        name: user.email?.split('@')[0] ?? 'مستخدم',
        email: user.email,
        rating,
        content: text.trim(),
        is_approved: false,
      });

      setSubmitting(false);

      if (error) {
        toast.error('تعذّر نشر تقييمك — تحقق من البيانات وحاول مرة أخرى');
        return;
      }
      setSubmitted(true);
      setRating(0);
      setText('');
      fetchReviews();
      setTimeout(() => setSubmitted(false), 4000);
    } catch {
      setSubmitting(false);
      toast.error('فشل الاتصال بالخادم — تحقق من اتصالك بالإنترنت');
    } finally {
      submittingRef.current = false;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-u-nu-latn', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen animate-fade-in" >
      {reviews.length > 0 && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "pptides",
            "description": "أشمل دليل عربي للببتيدات العلاجية",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1),
              "reviewCount": reviews.length,
              "bestRating": 5,
              "worstRating": 1
            }
          })}</script>
        </Helmet>
      )}
      <Helmet>
        <title>تقييمات المستخدمين | pptides</title>
        <meta name="description" content="اقرأ آراء وتقييمات المستخدمين عن دليل الببتيدات. شارك تجربتك وساعد الآخرين." />
        <meta property="og:title" content="آراء المستخدمين | pptides" />
        <meta property="og:description" content="تقييمات حقيقية من مستخدمي pptides" />
        <meta property="og:url" content={`${SITE_URL}/reviews`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_SA" />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
      </Helmet>
      <div className="mx-auto max-w-4xl px-4 pt-8 pb-24 md:px-6 md:pt-12">
        <div
          className="mb-10 text-center"
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10"
          >
            <MessageSquare className="h-7 w-7 text-emerald-600"  />
          </div>
          <h1
            className="text-3xl font-bold md:text-4xl"
            
          >
            آراء المستخدمين
          </h1>

          {reviews.length > 0 && (
            <div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-emerald-700">{averageRating.toFixed(1)}</span>
                <span className="text-lg font-bold text-stone-500">/5</span>
              </div>
              <StarRating rating={Math.round(averageRating)} />
              <span className="text-sm font-medium text-stone-600">
                ({reviews.length} تقييم)
              </span>
            </div>
          )}
        </div>

        {/* Submit Review */}
        <div
          className="mb-10 rounded-2xl border border-stone-200 bg-stone-50 p-6 md:p-8"
        >
          <h2
            className="mb-5 text-lg font-bold text-stone-900"
            
          >
            أضف تقييمك
          </h2>

          {!user ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <p className="text-sm text-stone-800">سجّل الدخول لإضافة تقييمك</p>
              <Link
                to="/login"
                className="rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
              >
                تسجيل الدخول
              </Link>
            </div>
          ) : !subscription?.isProOrTrial ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <p className="text-sm text-stone-800">يجب أن تكون مشتركًا لإضافة تقييم</p>
              <Link
                to="/pricing"
                className="rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700"
              >
                اشترك الآن
              </Link>
            </div>
          ) : submitted ? (
            <div
              className="flex flex-col items-center gap-3 py-6 text-center"
            >
              <CheckCircle className="h-10 w-10 text-emerald-600" />
              <p className="text-base font-bold text-stone-900">
                شكرًا! سيتم مراجعة تقييمك قبل النشر.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="review-rating" className="mb-2 block text-sm font-medium text-stone-800">
                  التقييم <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <div id="review-rating">
                  <StarRating rating={rating} onRate={setRating} interactive />
                </div>
              </div>

              <div>
                <label htmlFor="review-text" className="mb-2 block text-sm font-medium text-stone-800">
                  رأيك <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="review-text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="شاركنا تجربتك..."
                  rows={4}
                  maxLength={1000}
                  className={cn(
                    'w-full resize-none rounded-xl border border-stone-300 bg-stone-50 px-4 py-3',
                    'text-sm text-stone-900 placeholder:text-stone-500',
                    'transition-colors focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100',
                  )}
                  style={{ overflow: 'hidden' }}
                />
                {text.length > 0 && (
                  <p className="mt-1 text-start text-xs text-stone-500">{text.length}/1000</p>
                )}
              </div>

              <button
                type="submit"
                disabled={rating === 0 || !text.trim() || submitting}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3',
                  'text-sm font-bold text-white transition-all',
                  rating > 0 && text.trim()
                    ? 'hover:bg-emerald-700'
                    : 'cursor-not-allowed opacity-40',
                )}
              >
                {submitting ? (
                  <span className="">جارٍ الإرسال...</span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>إرسال التقييم</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Reviews List */}
        <div
        >
          <h2
            className="mb-6 text-lg font-bold text-stone-900"
            
          >
            التقييمات
          </h2>

          {reviews.length > 0 && (
            <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-stone-900">
                    {averageRating.toFixed(1)}
                  </span>
                  <StarRating rating={Math.round(averageRating)} size="sm" />
                </div>
                <span className="text-xs text-stone-600">
                  {reviews.length.toLocaleString('ar-u-nu-latn')} تقييم
                </span>
                <div className="flex-1 min-w-0 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviews.filter((r) => r.rating === star).length;
                    const total = reviews.length;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-stone-600 w-6" dir="ltr">
                          {star}
                        </span>
                        <div className="flex-1 h-2 min-w-0 overflow-hidden rounded-full bg-stone-200">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-stone-600 w-5 tabular-nums">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-4 py-4" role="status" aria-label="جارٍ تحميل التقييمات">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-stone-200 p-5 space-y-3">
                  <div className="flex items-center gap-3"><div className="h-5 w-28 rounded bg-stone-200" /><div className="h-4 w-16 rounded bg-stone-100" /></div>
                  <div className="h-4 w-full rounded bg-stone-100" />
                  <div className="h-4 w-2/3 rounded bg-stone-100" />
                </div>
              ))}
            </div>
          ) : fetchError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 py-10 text-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
              <p className="text-base text-red-700">{fetchError}</p>
              <button
                onClick={() => { setLoading(true); fetchReviews(); }}
                className="mt-4 rounded-xl bg-red-100 px-6 py-2 text-sm font-bold text-red-700 hover:bg-red-200 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-gradient-to-b from-emerald-50 to-white py-20 px-8 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100">
                <MessageCircle className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900">كن أول من يشارك تجربته</h3>
              <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-stone-600">
                تقييمك يساعد الآخرين على اتخاذ قرارهم بثقة. شارك تجربتك مع pptides وكن مرجعًا للمجتمع.
              </p>
              <button
                onClick={() => document.getElementById('review-rating')?.scrollIntoView({ behavior: 'smooth' })}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-emerald-600/30"
              >
                <Send className="h-5 w-5" />
                اكتب تقييمك الآن
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-stone-200 bg-stone-50 p-5 transition-all hover:border-emerald-200 hover:shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} size="sm" />
                      {review.is_subscriber && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <BadgeCheck className="h-3 w-3" />
                          مشترك
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-stone-700">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-stone-800">
                    {review.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-stone-500">
          التقييمات من مشتركين مسجّلين
        </p>

        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="font-bold text-stone-900">جرّب بنفسك</p>
          <p className="mt-1 text-sm text-stone-600">{TRIAL_DAYS} أيام تجربة مجانية — كل البروتوكولات والأدوات</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/signup?redirect=/pricing" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700">ابدأ تجربتك المجانية</Link>
            <Link to="/library" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">تصفّح المكتبة</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
