import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Gift,
  Copy,
  Check,
  Lock,
  Users,
  Trophy,
  Share2,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

function generateReferralCode(userId: string): string {
  const hash = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `PPT-${hash}`;
}

export default function Referral() {
  const { user } = useAuth();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const referralCode = useMemo(
    () => (user ? generateReferralCode(user.id) : ''),
    [user],
  );

  const referralLink = useMemo(
    () => `https://pptides.com/?ref=${referralCode}`,
    [referralCode],
  );

  const shareText = `جرّب pptides — أفضل مرجع عربي للببتيدات 🧬\nاستخدم كود الإحالة: ${referralCode}\n${referralLink}`;

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Helmet>
          <title>برنامج الإحالة — شارك واحصل على مكافآت | Referral Program</title>
          <meta name="description" content="شارك pptides مع أصدقائك واحصل على شهر مجاني لكل إحالة ناجحة. Refer friends and earn free months." />
        </Helmet>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
            <Lock className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-stone-900">سجّل الدخول للوصول إلى برنامج الإحالة</p>
          <p className="mt-2 text-sm text-stone-600">شارك واحصل على شهر مجاني لكل إحالة</p>
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

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-24 md:px-6 md:pt-28">
      <Helmet>
        <title>برنامج الإحالة — شارك واحصل على مكافآت | Referral Program</title>
        <meta name="description" content="شارك pptides مع أصدقائك واحصل على شهر مجاني لكل إحالة ناجحة. Refer friends and earn free months." />
      </Helmet>

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <Gift className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-emerald-600 md:text-4xl">برنامج الإحالة</h1>
        <p className="mt-2 text-lg text-stone-600">
          شارك pptides مع أصدقائك واحصل على شهر مجاني لكل إحالة
        </p>
      </div>

      {/* How it works */}
      <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="mb-4 text-lg font-bold text-stone-900">كيف يعمل البرنامج؟</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { step: '1', text: 'شارك كود الإحالة مع صديقك' },
            { step: '2', text: 'صديقك يشترك باستخدام الكود' },
            { step: '3', text: 'تحصل على شهر مجاني تلقائيًا' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {item.step}
              </span>
              <p className="text-sm font-medium text-stone-700">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Code */}
      <div className="mb-6 rounded-2xl border border-stone-300 bg-stone-50 p-6">
        <h2 className="mb-4 text-lg font-bold text-stone-900">كود الإحالة الخاص بك</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl border border-stone-300 bg-white px-5 py-3">
            <p className="text-lg font-bold tracking-wider text-emerald-600" dir="ltr">
              {referralCode}
            </p>
          </div>
          <button
            onClick={() => copyToClipboard(referralCode, 'code')}
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all',
              copied === 'code'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700',
            )}
          >
            {copied === 'code' ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="mb-8 rounded-2xl border border-stone-300 bg-stone-50 p-6">
        <h2 className="mb-4 text-lg font-bold text-stone-900">شارك مع أصدقائك</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition-all hover:brightness-110"
          >
            <MessageCircle className="h-4 w-4" />
            واتساب
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-stone-800"
          >
            <Share2 className="h-4 w-4" />
            تويتر / X
          </a>
          <button
            onClick={() => copyToClipboard(referralLink, 'link')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all',
              copied === 'link'
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50',
            )}
          >
            {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === 'link' ? 'تم النسخ!' : 'نسخ الرابط'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <Users className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-stone-900">0</p>
          <p className="mt-1 text-sm text-stone-500">إحالات ناجحة</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <Trophy className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-stone-900">0</p>
          <p className="mt-1 text-sm text-stone-500">أشهر مجانية مكتسبة</p>
        </div>
      </div>
    </main>
  );
}
