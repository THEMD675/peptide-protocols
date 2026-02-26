import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Star, Send, MessageSquare, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Review {
  id: string;
  rating: number;
  text: string;
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
    <div className="flex gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={cn(
            'transition-transform',
            interactive && 'cursor-pointer hover:scale-110',
            !interactive && 'cursor-default',
          )}
        >
          <span className="sr-only">{star} نجمة</span>
          <Star
            className={cn(
              sizeClass,
              'transition-colors',
              (hover || rating) >= star
                ? 'fill-emerald-500 text-emerald-500'
                : 'fill-transparent text-stone-500',
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function Reviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, text, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to load reviews:', error.message);
    }
    if (data) setReviews(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rating === 0 || !text.trim() || submitting) return;

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    if (existing && existing.length > 0) {
      import('sonner').then(m => m.toast.error('لديك تقييم مسبق بالفعل'));
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('reviews').insert({
      user_id: user.id,
      rating,
      text: text.trim(),
    });

    setSubmitting(false);

    if (error) {
      import('sonner').then(m => m.toast.error('حدث خطأ أثناء النشر. حاول مرة أخرى.'));
      return;
    }
    setSubmitted(true);
    setRating(0);
    setText('');
    fetchReviews();
    setTimeout(() => setSubmitted(false), 4000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-u-nu-latn', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen" >
      <Helmet>
        <title>آراء المستخدمين — دليل البيبتايدات | Peptide Guide Reviews</title>
        <meta name="description" content="اقرأ آراء وتقييمات المستخدمين عن دليل البيبتايدات. شارك تجربتك وساعد الآخرين." />
      </Helmet>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
        <div
          className="mb-10 text-center"
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(16, 185, 129, 0.1)' }}
          >
            <MessageSquare className="h-7 w-7"  />
          </div>
          <h1
            className="text-3xl font-bold md:text-4xl"
            
          >
            آراء المستخدمين
          </h1>

          {reviews.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <StarRating rating={Math.round(averageRating)} />
              <span className="text-lg font-bold text-stone-900">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-sm text-stone-800">
                ({reviews.length} تقييم)
              </span>
            </div>
          )}
        </div>

        {/* Submit Review */}
        <div
          className="mb-10 rounded-2xl border border-stone-300 bg-stone-50 p-6 md:p-8"
        >
          <h2
            className="mb-5 text-lg font-bold"
            
          >
            أضف تقييمك
          </h2>

          {!user ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <p className="text-sm text-stone-800">سجّل الدخول لإضافة تقييمك</p>
              <Link
                to="/login"
                className="rounded-xl px-8 py-3 text-sm font-bold transition-all hover:brightness-110"
                style={{ background: 'var(--gold, #10b981)', color: 'white' }}
              >
                تسجيل الدخول
              </Link>
            </div>
          ) : submitted ? (
            <div
              className="flex flex-col items-center gap-3 py-6 text-center"
            >
              <CheckCircle className="h-10 w-10"  />
              <p className="text-base font-bold text-stone-900">
                شكرًا لتقييمك!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-800">
                  التقييم
                </label>
                <StarRating rating={rating} onRate={setRating} interactive />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-stone-800">
                  رأيك
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="شاركنا تجربتك..."
                  rows={4}
                  maxLength={1000}
                  className={cn(
                    'w-full resize-none rounded-xl border border-stone-300 bg-stone-50 px-4 py-3',
                    'text-sm text-stone-900 placeholder:text-stone-700',
                    'transition-colors focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-200',
                  )}
                />
                {text.length > 0 && (
                  <p className="mt-1 text-left text-xs text-stone-400">{text.length}/1000</p>
                )}
              </div>

              <button
                type="submit"
                disabled={rating === 0 || !text.trim() || submitting}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl px-8 py-3',
                  'text-sm font-bold transition-all',
                  rating > 0 && text.trim()
                    ? 'hover:brightness-110'
                    : 'cursor-not-allowed opacity-40',
                )}
                style={{ background: 'var(--gold, #10b981)', color: 'white' }}
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
            className="mb-6 text-lg font-bold"
            
          >
            التقييمات
          </h2>

          {loading ? (
            <div className="py-12 text-center">
              <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-stone-200 border-t-emerald-600" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-stone-300 bg-stone-50 py-16 text-center">
              <Star className="mx-auto mb-3 h-10 w-10 text-stone-500" />
              <p className="text-base text-stone-800">كن أول من يقيّم</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review, i) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-stone-300 bg-stone-50 p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-xs text-stone-700">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-stone-800">
                    {review.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-stone-500">
          جميع التقييمات من مستخدمين حقيقيين
        </p>

        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="font-bold text-stone-900">جرّب بنفسك</p>
          <p className="mt-1 text-sm text-stone-600">3 أيام تجربة مجانية — كل البروتوكولات والأدوات</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/signup" className="rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">ابدأ تجربتك المجانية</Link>
            <Link to="/library" className="rounded-full border border-emerald-300 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100">تصفّح المكتبة</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
