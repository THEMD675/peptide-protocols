import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';

export default function PaymentProcessing() {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    return () => { if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current); };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const check = setInterval(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') !== 'success') {
        setDone(true);
        hideTimeoutRef.current = setTimeout(() => setVisible(false), 1500);
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
            <div className="space-y-3 mt-4">
              <Link to="/library" className="block rounded-xl border border-emerald-200 p-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50">تصفّح المكتبة</Link>
              <Link to="/coach" className="block rounded-xl border border-emerald-200 p-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50">اسأل المدرب الذكي</Link>
              <Link to="/calculator" className="block rounded-xl border border-emerald-200 p-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50">جرّب حاسبة الجرعات</Link>
            </div>
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
