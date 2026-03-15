import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkCheck, Trash2, ChevronDown, ChevronUp, FlaskConical, ArrowLeft } from 'lucide-react';
import { cn as _cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

interface SavedProtocol {
  id: string;
  title: string;
  peptides: string[];
  protocol_text: string;
  created_at: string;
}

interface SavedProtocolsProps {
  userId: string;
}

export default function SavedProtocols({ userId }: SavedProtocolsProps) {
  const [protocols, setProtocols] = useState<SavedProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('saved_protocols')
      .select('id, title, peptides, protocol_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (error) { logError('Failed to load saved protocols', error); return; }
        if (data) setProtocols(data);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('saved_protocols').delete().eq('id', id);
    if (error) {
      toast.error('تعذّر حذف البروتوكول');
      return;
    }
    setProtocols(prev => prev.filter(p => p.id !== id));
    toast.success('تم حذف البروتوكول');
  };

  if (loading || protocols.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <BookmarkCheck className="h-5 w-5 text-amber-700 dark:text-amber-400" />
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">بروتوكولاتي المحفوظة</h2>
      </div>
      <div className="grid gap-3">
        {protocols.map(protocol => {
          const isExpanded = expandedId === protocol.id;
          return (
            <div
              key={protocol.id}
              className="rounded-2xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 overflow-hidden transition-all hover:shadow-sm"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : protocol.id)}
                className="w-full flex items-center justify-between p-4 text-start"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
                    <FlaskConical className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">{protocol.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {protocol.peptides.slice(0, 3).map(p => (
                        <span key={p} className="text-xs rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-stone-600 dark:text-stone-300 font-medium">{p}</span>
                      ))}
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        {new Date(protocol.created_at).toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-stone-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />}
              </button>
              {isExpanded && (
                <div className="border-t border-stone-200 dark:border-stone-600 p-4 animate-fade-in">
                  <div
                    className="text-sm leading-relaxed text-stone-700 dark:text-stone-200 whitespace-pre-wrap max-h-60 overflow-y-auto mb-3"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {protocol.protocol_text.length > 1000
                      ? protocol.protocol_text.slice(0, 1000) + '...'
                      : protocol.protocol_text}
                  </div>
                  <div className="flex items-center justify-between">
                    <Link
                      to="/coach"
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      اسأل المدرب عنه
                      <ArrowLeft className="h-3 w-3" />
                    </Link>
                    <button
                      onClick={() => handleDelete(protocol.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-stone-500 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      حذف
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
