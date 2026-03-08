import { memo, useRef, useCallback } from 'react';
import { Share2, Copy, Check, MessageCircle, Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { SITE_URL, FREQUENCY_LABELS } from '@/lib/constants';

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

export default memo(function ShareableCard(props: ShareableCardProps) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const shareBody = `بروتوكولي على pptides:\n${props.peptideName} (${props.peptideNameEn})\n${props.dose} ${props.unit} — ${FREQUENCY_LABELS[props.frequency] ?? props.frequency}\nمدة الدورة: ${props.cycleWeeks} أسابيع\nاليوم ${props.daysSinceStart} من ${props.cycleWeeks * 7}\n${props.adherencePercent != null ? `الالتزام: ${props.adherencePercent}%` : ''}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `بروتوكول ${props.peptideName}`, text: `${shareBody}\n\n${SITE_URL}` });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareBody + `\n\n${SITE_URL}`);
      setCopied(true);
      toast.success('تم نسخ البروتوكول');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('تعذّر نسخ النص — حاول مرة أخرى');
    }
  };

  const handleWhatsApp = () => {
    let shareText = shareBody + '\n\n' + SITE_URL;
    try {
      const refCode = localStorage.getItem('pptides_referral_code') ?? localStorage.getItem('pptides_referral');
      if (refCode && /^PP-[A-Z0-9]{6}$/.test(refCode)) {
        shareText += `\nكود إحالة: ${refCode}`;
      }
    } catch { /* expected */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  };

  const handleImageExport = useCallback(async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) { toast.error('تعذّر إنشاء الصورة'); return; }
        const file = new File([blob], `pptides-${props.peptideNameEn}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `بروتوكول ${props.peptideName}` }).catch(() => {});
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pptides-${props.peptideNameEn}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('تم تحميل الصورة');
        }
      }, 'image/png');
    } catch {
      toast.error('تعذّر إنشاء الصورة');
    } finally {
      setExporting(false);
    }
  }, [exporting, props.peptideName, props.peptideNameEn]);

  return (
    <div>
      <div ref={cardRef} className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-6 text-center">
        <p className="text-lg font-bold tracking-tight text-stone-900" dir="ltr" style={{letterSpacing: '-0.03em'}}>
          pp<span className="text-emerald-600">tides</span>
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
            <p className="text-sm font-bold text-stone-900">{FREQUENCY_LABELS[props.frequency] ?? props.frequency}</p>
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
        <p className="mt-3 text-[10px] text-stone-400">pptides.com</p>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleImageExport}
          disabled={exporting}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'جارٍ...' : 'صورة'}
        </button>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); handleWhatsApp(); }}
          aria-label="مشاركة عبر واتساب"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#20bd5a]"
        >
          <MessageCircle className="h-4 w-4" />
          واتساب
        </a>
        <button
          onClick={handleShare}
          aria-label="مشاركة"
          className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-50"
        >
          <Share2 className="h-4 w-4" />
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
