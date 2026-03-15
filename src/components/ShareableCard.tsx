import { memo, useRef, useCallback, useState, useEffect } from 'react';
import { Share2, Copy, Check, MessageCircle, Download, Send } from 'lucide-react';
import { toast } from 'sonner';
import { SITE_URL, FREQUENCY_LABELS, REFERRAL_CODE_REGEX } from '@/lib/constants';
import { copyToClipboard } from '@/lib/utils';
import { logError } from '@/lib/logger';

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
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => { clearTimeout(copyTimerRef.current); }, []);

  const shareBody = `بروتوكولي على pptides:\n${props.peptideName} (${props.peptideNameEn})\n${props.dose} ${props.unit} — ${FREQUENCY_LABELS[props.frequency] ?? props.frequency}\nمدة الدورة: ${props.cycleWeeks} أسابيع\nاليوم ${props.daysSinceStart} من ${props.cycleWeeks * 7}\n${props.adherencePercent != null ? `الالتزام: ${props.adherencePercent}%` : ''}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `بروتوكول ${props.peptideName}`, text: `${shareBody}\n\n${SITE_URL}` });
        toast.success('تمت المشاركة بنجاح!', { duration: 3000 });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(shareBody + `\n\n${SITE_URL}`);
    if (ok) {
      setCopied(true);
      toast.success('تم نسخ البروتوكول');
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('تعذّر نسخ النص — حاول مرة أخرى');
    }
  };

  const handleTwitter = () => {
    const tweetText = `${shareBody}\n\n${SITE_URL}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsApp = () => {
    let shareText = `شوف تقدّمي في بروتوكول الببتيدات\n\n` + shareBody + '\n\n' + SITE_URL;
    try {
      const refCode = localStorage.getItem('pptides_referral_code') ?? localStorage.getItem('pptides_referral');
      if (refCode && REFERRAL_CODE_REGEX.test(refCode)) {
        shareText += `\nكود إحالة: ${refCode}`;
      }
    } catch { /* expected */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  };

  const handleTelegram = () => {
    const text = shareBody + '\n\n' + SITE_URL;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}&text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleImageExport = useCallback(async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1c1917' : '#ffffff',
        useCORS: true,
      });
      // Promisify toBlob so the finally block waits for the full export to complete.
      // Previously toBlob's callback was not awaited — setExporting(false) fired before
      // the image was actually ready, causing the button to re-enable prematurely.
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) { toast.error('تعذّر إنشاء الصورة'); return; }
      const file = new File([blob], `pptides-${props.peptideNameEn}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `بروتوكول ${props.peptideName}` }).catch((e: unknown) => logError('share failed:', e));
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pptides-${props.peptideNameEn}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('تم تحميل الصورة');
      }
    } catch {
      toast.error('تعذّر إنشاء الصورة');
    } finally {
      setExporting(false);
    }
  }, [exporting, props.peptideName, props.peptideNameEn]);

  return (
    <div>
      <div ref={cardRef} className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-white dark:from-stone-950 to-emerald-50 p-6 text-center">
        <p className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100" dir="ltr" style={{letterSpacing: '-0.03em'}}>
          pp<span className="text-emerald-700">tides</span>
        </p>
        <h3 className="mt-3 text-xl font-black text-stone-900 dark:text-stone-100">{props.peptideName}</h3>
        <p className="text-sm text-stone-500 dark:text-stone-300" dir="ltr">{props.peptideNameEn}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-600 p-3">
            <p className="text-xs text-stone-500 dark:text-stone-300">الجرعة</p>
            <p className="text-lg font-black text-emerald-700" dir="ltr">{props.dose} {props.unit}</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-600 p-3">
            <p className="text-xs text-stone-500 dark:text-stone-300">التكرار</p>
            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{FREQUENCY_LABELS[props.frequency] ?? props.frequency}</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-600 p-3">
            <p className="text-xs text-stone-500 dark:text-stone-300">التقدّم</p>
            <p className="text-lg font-black text-stone-900 dark:text-stone-100">يوم {props.daysSinceStart}/{props.cycleWeeks * 7}</p>
          </div>
          {props.adherencePercent != null && (
            <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-600 p-3">
              <p className="text-xs text-stone-500 dark:text-stone-300">الالتزام</p>
              <p className="text-lg font-black text-emerald-700">{props.adherencePercent}%</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-stone-400">pptides.com</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={handleImageExport}
          disabled={exporting}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'جارٍ...' : 'صورة'}
        </button>
        <button
          type="button"
          onClick={() => handleWhatsApp()}
          aria-label="مشاركة عبر واتساب"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#20bd5a]"
        >
          <MessageCircle className="h-4 w-4" />
          واتساب
        </button>
        <button
          onClick={handleTwitter}
          aria-label="مشاركة عبر إكس"
          className="flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-stone-800"
        >
          <span className="text-base font-bold leading-none">𝕏</span>
        </button>
        <button
          onClick={handleTelegram}
          aria-label="مشاركة عبر تيليجرام"
          className="flex items-center justify-center gap-2 rounded-xl border border-[#0088cc] bg-[#0088cc]/10 px-4 py-2.5 text-sm font-bold text-[#0088cc] transition-colors hover:bg-[#0088cc]/20"
        >
          <Send className="h-4 w-4" />
        </button>
        <button
          onClick={handleShare}
          aria-label="مشاركة"
          className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-600 px-4 py-2.5 text-sm font-bold text-stone-700 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          <Share2 className="h-4 w-4" />
        </button>
        <button
          onClick={handleCopy}
          aria-label="نسخ"
          className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-600 px-4 py-2.5 text-sm font-bold text-stone-700 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
});
