import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';

export default function EmailCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMsg('');

    const { error } = await supabase.from('email_list').insert({ email });

    if (error) {
      setStatus('error');
      setErrorMsg(
        error.code === '23505'
          ? 'هذا البريد مسجّل مسبقًا'
          : 'حدث خطأ، حاول مرة أخرى'
      );
      return;
    }

    setStatus('success');
    setEmail('');
  };

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center">
        <p className="text-lg font-semibold text-emerald-700">
          ✓ تم التسجيل بنجاح
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-300 bg-white/5 p-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-lg mx-auto"
      >
        <div className="relative flex-1 w-full">
          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="أدخل بريدك الإلكتروني"
            required
            className="w-full rounded-full bg-white/10 border border-white/20 py-3.5 pr-11 pl-4 text-white placeholder:text-white/40 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 transition-all dark:bg-white/10 dark:text-white dark:border-white/20"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="gold-gradient flex items-center justify-center gap-2 rounded-full px-8 py-3.5 font-bold text-stone-900 transition-transform hover:scale-105 active:scale-[0.98] disabled:opacity-60 whitespace-nowrap min-w-[120px]"
        >
          {status === 'loading' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
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
    </div>
  );
}
