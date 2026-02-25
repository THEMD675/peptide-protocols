import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, Clock, FlaskConical, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  user_id: string;
  peptide_name: string;
  goal: string;
  protocol: string;
  duration_weeks: number;
  results: string;
  rating: number;
  created_at: string;
}

const GOALS = [
  'فقدان دهون',
  'تعافي وإصابات',
  'بناء عضل',
  'تحسين النوم',
  'تركيز ودماغ',
  'هرمونات',
  'طول عمر',
  'بشرة وأمعاء',
];

export default function Community() {
  const { user, subscription } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [peptideName, setPeptideName] = useState('');
  const [goal, setGoal] = useState('');
  const [protocol, setProtocol] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [results, setResults] = useState('');
  const [rating, setRating] = useState(4);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('community_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (mounted && !error && data) setLogs(data);
      } catch {
        // query failed
      }
      if (mounted) setLoading(false);
    };

    load();
    const fallback = setTimeout(() => { if (mounted) setLoading(false); }, 8000);

    return () => { mounted = false; clearTimeout(fallback); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !peptideName.trim() || !results.trim() || submitting) return;

    setSubmitting(true);
    const { error } = await supabase.from('community_logs').insert({
      user_id: user.id,
      peptide_name: peptideName.trim(),
      goal,
      protocol: protocol.trim(),
      duration_weeks: durationWeeks,
      results: results.trim(),
      rating,
    });
    setSubmitting(false);

    if (error) {
      import('sonner').then(m => m.toast.error('حدث خطأ أثناء النشر. حاول مرة أخرى.'));
      return;
    }

    setSubmitted(true);
      setPeptideName('');
      setGoal('');
      setProtocol('');
      setResults('');
      setRating(4);
      setShowForm(false);

      const { data } = await supabase
        .from('community_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setLogs(data);
      setTimeout(() => setSubmitted(false), 3000);
  };

  const isPaid = subscription?.isProOrTrial ?? false;

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>تجارب المستخدمين — بروتوكولات حقيقية ونتائج فعلية | pptides Community</title>
        <meta name="description" content="اقرأ تجارب حقيقية من مستخدمي الببتيدات. بروتوكولات مُجرَّبة، نتائج فعلية، وتقييمات صادقة." />
      </Helmet>

      <div className="mx-auto max-w-4xl px-6 pb-20 pt-20 md:pt-28">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <MessageSquare className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-stone-900 md:text-4xl">
            تجارب <span className="text-emerald-600">المستخدمين</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-stone-800">
            بروتوكولات حقيقية. نتائج فعلية. من مستخدمين مثلك.
          </p>
        </div>

        {submitted && (
          <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center text-sm font-bold text-emerald-800">
            تم نشر تجربتك بنجاح — شكرًا لمشاركتك!
          </div>
        )}

        {user && isPaid && (
          <div className="mb-8">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-6 text-center transition-all hover:border-emerald-400 hover:bg-emerald-100"
              >
                <Send className="mx-auto mb-2 h-6 w-6 text-emerald-600" />
                <p className="font-bold text-stone-900">شارك تجربتك مع الببتيدات</p>
                <p className="mt-1 text-sm text-stone-800">ساعد غيرك — شارك البروتوكول والنتائج</p>
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-300 bg-white p-6 md:p-8">
                <h3 className="mb-6 text-lg font-bold text-stone-900">شارك تجربتك</h3>

                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-bold text-stone-900">اسم الببتيد</label>
                  <input
                    type="text"
                    value={peptideName}
                    onChange={(e) => setPeptideName(e.target.value)}
                    placeholder="مثال: BPC-157, Semaglutide, Semax..."
                    required
                    dir="ltr"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                  />
                </div>

                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-bold text-stone-900">الهدف</label>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGoal(g)}
                        className={cn(
                          'rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
                          goal === g
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                            : 'border-stone-300 bg-white text-stone-800 hover:border-emerald-200'
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-bold text-stone-900">البروتوكول (الجرعة، التوقيت، المدة)</label>
                  <textarea
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    placeholder="مثال: 250mcg مرتين يوميًا، حقن تحت الجلد في البطن، لمدة 6 أسابيع..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                  />
                </div>

                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-stone-900">المدة (أسابيع)</label>
                    <input
                      type="number"
                      min={1}
                      max={52}
                      value={durationWeeks}
                      onChange={(e) => setDurationWeeks(Number(e.target.value))}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-stone-900">التقييم (1-5)</label>
                    <div className="flex gap-1 pt-2">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRating(r)}
                          className={cn(
                            'h-10 w-10 rounded-lg text-sm font-bold transition-all',
                            rating >= r
                              ? 'bg-emerald-600 text-white'
                              : 'border border-stone-300 bg-white text-stone-800'
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="mb-1.5 block text-sm font-bold text-stone-900">النتائج — وش لاحظت؟</label>
                  <textarea
                    value={results}
                    onChange={(e) => setResults(e.target.value)}
                    placeholder="وصف النتائج: تحسّن، أعراض جانبية، تغييرات في التحاليل..."
                    rows={4}
                    required
                    className="w-full resize-none rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting || !peptideName.trim() || !results.trim()}
                    className="flex-1 rounded-full bg-emerald-600 py-3 font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {submitting ? '...' : 'نشر التجربة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-full border border-stone-300 px-6 py-3 font-bold text-stone-800 hover:bg-stone-50"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {!user && (
          <div className="mb-8 rounded-2xl border border-stone-300 bg-stone-50 p-6 text-center">
            <p className="font-bold text-stone-900">سجّل الدخول لمشاركة تجربتك</p>
            <Link to="/login" className="mt-3 inline-block rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
              تسجيل الدخول
            </Link>
          </div>
        )}

        {user && !isPaid && (
          <div className="mb-8 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="font-bold text-stone-900">اشترك لمشاركة تجربتك مع المجتمع</p>
            <p className="mt-1 text-sm text-stone-800">المشتركون فقط يمكنهم نشر تجاربهم</p>
            <Link to="/pricing" className="mt-3 inline-block rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
              اشترك — $9/شهريًا
            </Link>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center">
            <p className="text-stone-800">جارٍ التحميل...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-stone-300 bg-stone-50 py-16 text-center">
            <FlaskConical className="mx-auto mb-3 h-12 w-12 text-stone-400" />
            <p className="text-lg font-bold text-stone-800">لا توجد تجارب بعد</p>
            <p className="mt-2 text-sm text-stone-700">كن أول من يشارك تجربته!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-stone-300 bg-white p-6">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <User className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800" dir="ltr">
                        {log.peptide_name}
                      </span>
                      {log.goal && (
                        <span className="mr-2 text-sm text-stone-700">— {log.goal}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-2 w-2 rounded-full',
                          i < log.rating ? 'bg-emerald-500' : 'bg-stone-200'
                        )}
                      />
                    ))}
                  </div>
                </div>

                {log.protocol && (
                  <div className="mb-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-800">
                    <span className="font-bold text-stone-900">البروتوكول: </span>
                    {log.protocol}
                  </div>
                )}

                <p className="text-base leading-relaxed text-stone-900">{log.results}</p>

                <div className="mt-3 flex items-center gap-4 text-xs text-stone-700">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {log.duration_weeks} أسابيع
                  </span>
                  <span>
                    {new Date(log.created_at).toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
