import { memo, useRef } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { SITE_URL } from '@/lib/constants';

interface ShareableCardProps {
  peptideName: string;
  peptideNameEn: string;
  dose: number;
  unit: string;
  frequency: string;
  cycleWeeks: number;
  daysSinceStart: number;
  adherencePercent?: number;
}

const FREQ_LABELS: Record<string, string> = {
  od: 'يوميًا',
  bid: 'مرتين يوميًا',
  weekly: 'أسبوعيًا',
  biweekly: 'مرتين أسبوعيًا',
  prn: 'عند الحاجة',
};

export default memo(function ShareableCard(props: ShareableCardProps) {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const shareText = `بروتوكولي على pptides:\n${props.peptideName} (${props.peptideNameEn})\n${props.dose} ${props.unit} — ${FREQ_LABELS[props.frequency] ?? props.frequency}\nمدة الدورة: ${props.cycleWeeks} أسابيع\nاليوم ${props.daysSinceStart} من ${props.cycleWeeks * 7}\n${props.adherencePercent != null ? `الالتزام: ${props.adherencePercent}%` : ''}\n\n${SITE_URL}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `بروتوكول ${props.peptideName}`, text: shareText, url: SITE_URL });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success('تم نسخ البروتوكول');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('فشل النسخ');
    }
  };

  return (
    <div>
      <div ref={cardRef} className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-6 text-center">
        <p className="text-lg font-bold tracking-tight text-stone-900">
          <span>pp</span><span className="text-emerald-600">tides</span>
        </p>
        <h3 className="mt-3 text-xl font-black text-stone-900">{props.peptideName}</h3>
        <p className="text-sm text-stone-500" dir="ltr">{props.peptideNameEn}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white border border-stone-200 p-3">
            <p className="text-xs text-stone-500">الجرعة</p>
            <p className="text-lg font-black text-emerald-600" dir="ltr">{props.dose} {props.unit}</p>
          </div>
          <div className="rounded-xl bg-white border border-stone-200 p-3">
            <p className="text-xs text-stone-500">التكرار</p>
            <p className="text-sm font-bold text-stone-900">{FREQ_LABELS[props.frequency] ?? props.frequency}</p>
          </div>
          <div className="rounded-xl bg-white border border-stone-200 p-3">
            <p className="text-xs text-stone-500">التقدّم</p>
            <p className="text-lg font-black text-stone-900">يوم {props.daysSinceStart}/{props.cycleWeeks * 7}</p>
          </div>
          {props.adherencePercent != null && (
            <div className="rounded-xl bg-white border border-stone-200 p-3">
              <p className="text-xs text-stone-500">الالتزام</p>
              <p className="text-lg font-black text-emerald-600">{props.adherencePercent}%</p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
        >
          <Share2 className="h-4 w-4" />
          مشاركة
        </button>
        <button
          onClick={handleCopy}
          aria-label="نسخ"
          className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
});
