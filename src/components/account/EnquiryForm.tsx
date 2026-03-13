import { useState, useEffect } from 'react';
import { Check, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn, sanitizeInput } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';

interface EnquiryFormProps {
  userEmail?: string;
  userId?: string;
}

export default function EnquiryForm({ userEmail, userId }: EnquiryFormProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [peptide, setPeptide] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; subject: string; status: string; created_at: string; peptide_name: string | null }>>([]);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    supabase.from('enquiries').select('id, subject, status, created_at, peptide_name').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
      .then(({ data, error }) => { if (error) logError('enquiries history query failed:', error); if (mounted && data) setHistory(data); })
      .catch(e => logError('enquiries fetch failed:', e));
    return () => { mounted = false; };
  }, [userId, sent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !userId) return;
    if (sending) return;
    setSending(true);
    (document.activeElement as HTMLElement)?.blur();

    try {
      const subjectText = subject.trim() || 'استفسار عام';
      const { error } = await supabase.from('enquiries').insert({
        user_id: userId,
        email: userEmail?.slice(0, 320),
        subject: sanitizeInput(subjectText, 200),
        peptide_name: peptide.trim().slice(0, 200) || null,
        message: sanitizeInput(message, 5000),
      });

      if (error) {
        toast.error('تعذّر إرسال الاستفسار. حاول مرة أخرى.');
        return;
      }

      toast.success('تم إرسال استفسارك بنجاح — سنرد عليك قريبًا');
      setSent(true);
      setSubject('');
      setMessage('');
      setPeptide('');
      setTimeout(() => setSent(false), 5000);
    } catch {
      toast.error('فشل الاتصال بالخادم — تحقق من اتصالك بالإنترنت');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 p-6">
      <div className="flex items-center gap-3 mb-1">
        <MessageSquare className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">استفسار خاص</h2>
      </div>
      <p className="text-sm text-stone-600 dark:text-stone-300 mb-4">هل لديك سؤال عن ببتيد معيّن أو بروتوكول؟ أرسل لنا وسنرد بأسرع وقت.</p>

      {sent ? (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
          <Check className="mx-auto h-8 w-8 text-emerald-700 mb-2" />
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">تم إرسال استفسارك</p>
          <p className="text-xs text-emerald-700 mt-1">سنرد عليك على {userEmail} في أقرب وقت</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="enquiry-peptide" className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-300">الببتيد (اختياري)</label>
            <input
              id="enquiry-peptide"
              type="text"
              value={peptide}
              onChange={e => setPeptide(e.target.value)}
              placeholder="مثال: BPC-157"
              dir="ltr"
              maxLength={100}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 outline-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            />
          </div>
          <div>
            <label htmlFor="enquiry-subject" className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-300">الموضوع</label>
            <input
              id="enquiry-subject"
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="جرعة، تعارض، بروتوكول..."
              maxLength={200}
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 outline-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            />
          </div>
          <div>
            <label htmlFor="enquiry-message" className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-300">رسالتك <span className="text-red-500 dark:text-red-400">*</span></label>
            <textarea
              id="enquiry-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="اكتب استفسارك هنا..."
              rows={4}
              maxLength={2000}
              required
              className="w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:text-stone-300 outline-none resize-none focus:border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
            />
            <p className="text-[10px] text-stone-500 dark:text-stone-300 mt-1 text-left" dir="ltr">{message.length}/2000</p>
          </div>
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            {sending ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                جارٍ الإرسال...
              </span>
            ) : (
              <>
                <Send className="h-4 w-4" />
                إرسال الاستفسار
              </>
            )}
          </button>
        </form>
      )}

      {history.length > 0 && (
        <div className="mt-4 border-t border-stone-100 dark:border-stone-700 pt-4">
          <p className="text-xs font-bold text-stone-600 dark:text-stone-300 mb-2">استفساراتك السابقة</p>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">{h.subject}</p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-300">{new Date(h.created_at).toLocaleDateString('ar-u-nu-latn')}</p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', h.status === 'replied' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : h.status === 'closed' ? 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300' : 'bg-amber-100 text-amber-700 dark:text-amber-400')}>{h.status === 'replied' ? 'تم الرد' : h.status === 'closed' ? 'مغلق' : 'قيد المراجعة'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
