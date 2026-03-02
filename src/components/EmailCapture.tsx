import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

const RATE_LIMIT_MS = 60_000;

export default function EmailCapture() {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const lastSubmitRef = useRef(0);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lastSubmitRef.current + RATE_LIMIT_MS - Date.now()) / 1000));
      setCooldownRemaining(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setErrorMsg('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    if (honeypot) return;

    if (Date.now() - lastSubmitRef.current < RATE_LIMIT_MS) {
      setStatus('error');
      setErrorMsg('انتظر قليلاً قبل المحاولة مرة أخرى');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      const { error } = await supabase.from('email_list').insert({ email });

      if (error) {
        setStatus('error');
        setErrorMsg(
          error.code === '23505'
            ? 'هذا البريد مسجّل مسبقًا'
            : 'تعذّر تسجيل بريدك. حاول مرة أخرى.'
        );
        return;
      }

      setStatus('success');
      setEmail('');
      lastSubmitRef.current = Date.now();
      setCooldownRemaining(RATE_LIMIT_MS / 1000);
    } catch {
      setStatus('error');
      setErrorMsg('فشل الاتصال بالخادم — تحقق من اتصالك بالإنترنت وحاول مرة أخرى.');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-8 text-center">
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
        <p className="text-lg font-bold text-emerald-700">
          شكرًا! تم تسجيل بريدك بنجاح
        </p>
        <p className="mt-2 text-sm text-emerald-600">شكرًا! سنرسل لك آخر التحديثات</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-300 bg-white/5 p-6">
      <form
        onSubmit={handleSubmit}
        aria-label="الاشتراك في القائمة البريدية"
        className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-lg mx-auto"
      >
        <div className="relative flex-1 w-full">
          <Mail className="absolute end-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            aria-label="البريد الإلكتروني"
            required
            className="w-full rounded-full bg-white/10 border border-white/20 py-3.5 ps-11 pe-4 text-white placeholder:text-white/40 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
          />
          <input
            type="text"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -start-[9999px] h-0 w-0 opacity-0 overflow-hidden"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading' || cooldownRemaining > 0}
          className="primary-gradient flex items-center justify-center gap-2 rounded-full px-8 py-3.5 font-bold text-white transition-transform hover:scale-105 active:scale-[0.98] disabled:opacity-60 whitespace-nowrap min-w-[120px]"
        >
          {status === 'loading' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : cooldownRemaining > 0 ? (
            <span>انتظر {cooldownRemaining}s</span>
          ) : (
            <>
              <span>اشترك</span>
              <ArrowLeft className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
      {status === 'error' && errorMsg && (
        <p className="mt-3 text-center text-sm text-red-400">{errorMsg}</p>
      )}
      <p className="mt-2 text-center text-xs text-white/50">
        بالاشتراك، أنت توافق على <Link to="/privacy" className="underline transition-colors hover:text-white/80">سياسة الخصوصية</Link>
      </p>
    </div>
  );
}
