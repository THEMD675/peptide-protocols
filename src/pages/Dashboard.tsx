import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Calculator,
  Bot,
  FlaskConical,
  Layers,
  Table2,
  Crown,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const QUICK_LINKS = [
  { to: '/library', label: 'المكتبة', description: 'تصفّح 41+ ببتيد', Icon: BookOpen },
  { to: '/calculator', label: 'الحاسبة', description: 'احسب جرعتك بدقة', Icon: Calculator },
  { to: '/coach', label: 'المدرب الذكي', description: 'اسأل خبير الببتيدات', Icon: Bot },
  { to: '/lab-guide', label: 'دليل التحاليل', description: '11 تحليل أساسي', Icon: FlaskConical },
  { to: '/stacks', label: 'البروتوكولات', description: 'خلطات مُجرَّبة', Icon: Layers },
  { to: '/table', label: 'الجدول المرجعي', description: 'جميع الببتيدات في جدول', Icon: Table2 },
];

const GETTING_STARTED = [
  { id: 'library', label: 'تصفّح مكتبة الببتيدات', to: '/library' },
  { id: 'calculator', label: 'جرّب حاسبة الجرعات', to: '/calculator' },
  { id: 'coach', label: 'اسأل المدرب الذكي', to: '/coach' },
];

const TIER_LABELS: Record<string, string> = {
  free: 'مجاني',
  essentials: 'Essentials',
  elite: 'Elite',
};

const STATUS_LABELS: Record<string, string> = {
  trial: 'فترة تجريبية',
  active: 'مفعّل',
  expired: 'منتهي',
  none: 'بدون اشتراك',
};

export default function Dashboard() {
  const { user, subscription } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Helmet>
          <title>لوحة التحكم — pptides | Dashboard</title>
          <meta name="description" content="لوحة التحكم الرئيسية لإدارة حسابك في pptides. Your pptides dashboard." />
        </Helmet>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
            <LayoutDashboard className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-stone-900">سجّل الدخول للوصول إلى لوحة التحكم</p>
          <p className="mt-2 text-sm text-stone-600">ابدأ رحلتك مع الببتيدات</p>
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

  const displayName = user.email?.split('@')[0] ?? 'مستخدم';

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-24 md:px-6 md:pt-28">
      <Helmet>
        <title>لوحة التحكم — pptides | Dashboard</title>
        <meta name="description" content="لوحة التحكم الرئيسية لإدارة حسابك في pptides. Your pptides dashboard." />
      </Helmet>

      {/* Welcome Header */}
      <div className="mb-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <LayoutDashboard className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-stone-900 md:text-4xl">
          مرحبًا، {displayName}
        </h1>
        <p className="mt-2 text-lg text-stone-600">ابدأ من هنا — كل أدواتك في مكان واحد</p>
      </div>

      {/* Subscription Status Card */}
      <div className="mb-8 rounded-2xl border border-stone-300 bg-stone-50 p-6">
        <div className="flex items-center gap-3 mb-3">
          <Crown className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-stone-900">اشتراكك</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className={cn(
            'rounded-full px-3 py-1 text-xs font-bold',
            subscription.tier === 'elite'
              ? 'bg-emerald-100 text-emerald-700'
              : subscription.tier === 'essentials'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-stone-200 text-stone-600',
          )}>
            {TIER_LABELS[subscription.tier] ?? subscription.tier}
          </span>
          <span className={cn(
            'rounded-full px-3 py-1 text-xs font-bold',
            subscription.status === 'active'
              ? 'bg-emerald-100 text-emerald-700'
              : subscription.status === 'trial'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-stone-200 text-stone-600',
          )}>
            {STATUS_LABELS[subscription.status] ?? subscription.status}
          </span>
          {subscription.status === 'trial' && subscription.trialDaysLeft > 0 && (
            <span className="text-sm text-amber-600 font-bold">
              {subscription.trialDaysLeft} يوم متبقي
            </span>
          )}
        </div>
        {subscription.tier !== 'elite' && (
          <Link
            to="/pricing"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-700"
          >
            ترقية الاشتراك
          </Link>
        )}
      </div>

      {/* Quick Links Grid */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-stone-900">الأدوات</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 transition-all duration-200 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-600/10 hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 transition-colors group-hover:bg-emerald-100">
                <link.Icon className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-stone-900">{link.label}</p>
                <p className="text-xs text-stone-500">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started Checklist */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="mb-4 text-lg font-bold text-stone-900">ابدأ هنا</h2>
        <p className="mb-4 text-sm text-stone-600">أكمل هذه الخطوات للاستفادة القصوى من pptides</p>
        <div className="space-y-3">
          {GETTING_STARTED.map((step, i) => (
            <Link
              key={step.id}
              to={step.to}
              className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3 transition-all hover:border-emerald-300 hover:shadow-sm"
            >
              <Circle className="h-5 w-5 shrink-0 text-stone-300" />
              <span className="text-sm font-bold text-stone-700">
                {i + 1}. {step.label}
              </span>
              <CheckCircle2 className="mr-auto h-5 w-5 text-emerald-200" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
