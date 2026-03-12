import { useState, useEffect, useCallback, useRef } from 'react';
import { History, ChevronDown, ChevronLeft, Trash2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { renderMarkdown } from '@/lib/markdown';

interface CoachConversation {
  id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  updated_at: string;
}

function extractTopic(messages: Array<{ role: string; content: string }>): string {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return 'محادثة';
  let content = firstUser.content;
  // Strip structured intake prompts
  if (content.startsWith('USER PROFILE')) {
    const goalMatch = content.match(/Goal:\s*(.+)/);
    if (goalMatch) {
      const goalMap: Record<string, string> = {
        'fat loss': 'فقدان دهون',
        'injury recovery': 'تعافي وإصابات',
        'muscle building': 'بناء عضل',
        'brain/focus': 'تركيز ودماغ',
        'longevity': 'طول عمر',
        'hormone optimization': 'تحسين هرمونات',
        'gut/skin': 'بشرة وأمعاء',
      };
      const goal = goalMatch[1].trim().toLowerCase();
      return `بروتوكول: ${goalMap[goal] ?? goal}`;
    }
    return 'بروتوكول مخصّص';
  }
  // Truncate long messages
  if (content.length > 60) content = content.slice(0, 57) + '...';
  return content;
}

export default function CoachHistory({
  onLoadConversation,
}: {
  onLoadConversation: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) => void;
}) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<CoachConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const mountedRef = useRef(true);

  const refreshHistory = useCallback(() => setRefreshSignal(s => s + 1), []);

  useEffect(() => {
    mountedRef.current = true;
    if (!user?.id) return;
    supabase
      .from('coach_conversations')
      .select('id, messages, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!mountedRef.current) return;
        if (data) {
          const valid = (data as CoachConversation[]).filter(
            c => Array.isArray(c.messages) && c.messages.length > 0,
          );
          setConversations(valid);
        }
        setLoading(false);
      });
    return () => { mountedRef.current = false; };
  }, [user, refreshSignal]);

  const deleteConversation = async (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    setConfirmDeleteId(null);
    const { error } = await supabase.from('coach_conversations').delete().eq('id', id).eq('user_id', user?.id ?? '');
    if (error) {
      toast.error('تعذّر حذف المحادثة');
      refreshHistory();
    } else {
      toast.success('تم حذف المحادثة');
    }
  };

  if (!user) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 min-h-[44px] text-start transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-stone-500 dark:text-stone-300" />
          <span className="text-sm font-bold text-stone-700 dark:text-stone-200">المحادثات السابقة</span>
          {conversations.length > 0 && (
            <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[10px] font-bold text-stone-500 dark:text-stone-300">
              {conversations.length}
            </span>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 text-stone-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 overflow-hidden animate-fade-in">
          {loading ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-stone-300" />
              <p className="text-sm text-stone-500 dark:text-stone-300">لا توجد محادثات سابقة</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
              {conversations.map(conv => {
                const topic = extractTopic(conv.messages);
                const msgCount = conv.messages.length;
                const isExpanded = expandedId === conv.id;

                return (
                  <div key={conv.id}>
                    <div className="flex items-center gap-2 px-4 py-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                        className="flex flex-1 items-center gap-3 min-h-[44px] text-start"
                      >
                        <ChevronLeft className={cn('h-4 w-4 shrink-0 text-stone-400 transition-transform', isExpanded && '-rotate-90')} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-stone-800 dark:text-stone-200 truncate">{topic}</p>
                          <p className="text-[10px] text-stone-500 dark:text-stone-300">
                            {msgCount} رسالة · {formatDate(conv.updated_at)}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onLoadConversation(conv.messages)}
                          className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 min-h-[44px] flex items-center"
                        >
                          فتح
                        </button>
                        {confirmDeleteId === conv.id ? (
                          <button
                            onClick={() => deleteConversation(conv.id)}
                            className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 transition-colors hover:bg-red-100 min-h-[44px] flex items-center"
                          >
                            تأكيد
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(conv.id)}
                            className="flex items-center justify-center rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-red-500 dark:text-red-400 min-h-[44px] min-w-[44px]"
                            aria-label="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-stone-100 dark:border-stone-700 bg-stone-50/50 px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
                        {conv.messages.map((msg, i) => (
                          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-start' : 'justify-end')}>
                            <div className={cn(
                              'max-w-[85%] rounded-xl px-4 py-2 text-sm leading-relaxed',
                              msg.role === 'user'
                                ? 'bg-emerald-600 text-white rounded-br-sm'
                                : 'border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 rounded-bl-sm',
                            )}>
                              {msg.role === 'user' ? (
                                <p className="whitespace-pre-wrap">
                                  {msg.content.startsWith('USER PROFILE') ? 'طلب بروتوكول مخصّص' : msg.content}
                                </p>
                              ) : msg.content.startsWith('__ERROR') ? (
                                <p className="text-stone-400 italic">خطأ في الاستجابة</p>
                              ) : (
                                <div className="prose-xs">{renderMarkdown(msg.content.slice(0, 500))}{msg.content.length > 500 && <span className="text-stone-400">... (المزيد عند الفتح)</span>}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  return d.toLocaleDateString('ar-u-nu-latn', { month: 'short', day: 'numeric' });
}
