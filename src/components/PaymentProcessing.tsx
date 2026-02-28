import { useState, useEffect } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';

export default function PaymentProcessing() {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const check = setInterval(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') !== 'success') {
        setDone(true);
        setTimeout(() => setVisible(false), 1500);
        clearInterval(check);
      }
    }, 500);
    const timeout = setTimeout(() => {
      setVisible(false);
      clearInterval(check);
    }, 45000);
    return () => { clearInterval(check); clearTimeout(timeout); };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="text-center animate-fade-in">
        {done ? (
          <>
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
            <h2 className="text-2xl font-bold text-stone-900">تم تفعيل اشتراكك!</h2>
            <p className="mt-2 text-stone-600">مرحبًا بك في pptides</p>
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
            <div className="mx-auto mt-6 h-1 w-48 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full animate-pulse rounded-full bg-emerald-500" style={{ width: '60%' }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
