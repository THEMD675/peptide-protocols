import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, BookOpen, Bot, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PEPTIDE_COUNT, SUPPORT_EMAIL } from '@/lib/constants';

export default function PaymentProcessing() {
  const navigate = useNavigate();
  const { subscription } = useAuth();
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('payment') === 'success';
  });
  const [stage, setStage] = useState<'loading' | 'success' | 'timeout'>('loading');
  const [progress, setProgress] = useState(10);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  useEffect(() => {
    if (!visible || stage !== 'loading') return;
    timerRef.current = setInterval(() => {
      setProgress(p => Math.min(p + 3, 90));
    }, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [visible, stage]);

  useEffect(() => {
    if (!visible) return;
    if (subscription?.isProOrTrial) {
      queueMicrotask(() => {
        setStage('success');
        setProgress(100);
        if (timerRef.current) clearInterval(timerRef.current);
        // Clean URL so refresh doesn't re-show overlay
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.has('payment')) {
            url.searchParams.delete('payment');
            const clean = url.pathname + (url.search ? url.search : '');
            window.history.replaceState({}, '', clean);
          }
        } catch { /* ignore */ }
      });
    }
  }, [visible, subscription]);

  useEffect(() => {
    if (!visible || stage !== 'loading') return;
    const timeout = setTimeout(() => setStage('timeout'), 60000);
    return () => clearTimeout(timeout);
  }, [visible, stage]);

  if (!visible) return null;

  const navigateTo = (path: string) => {
    setVisible(false);
    navigate(path, { replace: true }); // replace so back button doesn't re-show overlay
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm text-center animate-fade-in">
        {stage === 'success' ? (
          <>
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
            <h2 className="text-2xl font-bold text-stone-900">مرحبًا بك في pptides!</h2>
            <p className="mt-2 text-sm text-stone-600">اشتراكك مفعّل — ابدأ رحلتك الآن</p>
            <div className="space-y-3 mt-6">
              <button onClick={() => navigateTo('/library')} className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 p-4 text-right font-bold text-emerald-700 hover:bg-emerald-50 transition-colors">
                <BookOpen className="h-5 w-5 shrink-0" />
                <div><p className="text-sm">تصفّح المكتبة</p><p className="text-xs font-normal text-stone-500">اكتشف {PEPTIDE_COUNT}+ ببتيد مع بروتوكولات كاملة</p></div>
              </button>
              <button onClick={() => navigateTo('/coach')} className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 p-4 text-right font-bold text-emerald-700 hover:bg-emerald-50 transition-colors">
                <Bot className="h-5 w-5 shrink-0" />
                <div><p className="text-sm">اسأل المدرب الذكي</p><p className="text-xs font-normal text-stone-500">احصل على بروتوكول مخصّص لأهدافك</p></div>
              </button>
              <button onClick={() => navigateTo('/calculator')} className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 p-4 text-right font-bold text-emerald-700 hover:bg-emerald-50 transition-colors">
                <Calculator className="h-5 w-5 shrink-0" />
                <div><p className="text-sm">حاسبة الجرعات</p><p className="text-xs font-normal text-stone-500">احسب جرعتك بدقة على السيرنج</p></div>
              </button>
            </div>
            <button onClick={() => navigateTo('/dashboard')} className="mt-4 w-full rounded-full bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">
              انتقل للوحة التحكم
            </button>
          </>
        ) : stage === 'timeout' ? (
          <>
            <div className="mx-auto mb-6">
              <div className="text-2xl font-bold tracking-tight text-stone-900">
                <span>pp</span><span className="text-emerald-600">tides</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-stone-900">لم نتمكن من التأكد من الدفع</h2>
            <p className="mt-2 text-sm text-stone-600">إذا تم خصم المبلغ، سيتم تفعيل اشتراكك خلال دقائق. تواصل معنا إذا استمرت المشكلة:</p>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=تفعيل الاشتراك`} className="mt-4 inline-block text-emerald-600 font-bold underline">{SUPPORT_EMAIL}</a>
            <button onClick={() => navigateTo('/dashboard')} className="mt-6 w-full rounded-full bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors">
              العودة للوحة التحكم
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-6">
              <div className="text-2xl font-bold tracking-tight text-stone-900">
                <span>pp</span><span className="text-emerald-600">tides</span>
              </div>
            </div>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-emerald-600" />
            <h2 className="text-xl font-bold text-stone-900">جارٍ إعداد حسابك...</h2>
            <p className="mt-2 text-sm text-stone-500">يرجى الانتظار بضع ثوانٍ</p>
            <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="جاري تحميل..." className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
