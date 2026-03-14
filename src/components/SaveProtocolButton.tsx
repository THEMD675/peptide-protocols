import { useState } from 'react';
import { BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';
import { extractProtocolMeta } from '@/lib/coachFollowUps';

interface SaveProtocolButtonProps {
  protocolText: string;
  userId: string;
  conversationId: string | null;
}

export default function SaveProtocolButton({ protocolText, userId, conversationId }: SaveProtocolButtonProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);

    try {
      const { title, peptides } = extractProtocolMeta(protocolText);
      const { error } = await supabase
        .from('saved_protocols')
        .insert({
          user_id: userId,
          title,
          peptides,
          protocol_text: protocolText,
          source_conversation_id: conversationId,
        });

      if (error) throw error;

      setSaved(true);
      toast.success('تم حفظ البروتوكول بنجاح');
    } catch (err) {
      logError('Failed to save protocol:', err);
      toast.error('تعذّر حفظ البروتوكول — حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleSave}
      disabled={saving || saved}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all',
        saved
          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
          : 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:shadow-sm active:scale-[0.97]',
        saving && 'opacity-60 cursor-not-allowed',
      )}
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : saved ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <BookmarkPlus className="h-3.5 w-3.5" />
      )}
      {saved ? 'تم الحفظ' : 'احفظ البروتوكول'}
    </button>
  );
}
