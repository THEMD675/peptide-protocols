import { useState, useRef, useEffect } from 'react';
import { Copy, Check, Send, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { events } from '@/lib/analytics';
import { copyToClipboard } from '@/lib/utils';

interface ShareButtonsProps {
  /** Page URL to share */
  url: string;
  /** Title for share (Arabic) */
  title: string;
  /** Short description for share text */
  description?: string;
  /** Show Telegram button (default: true) */
  showTelegram?: boolean;
  /** Layout: 'row' for inline, 'row-label' for labeled buttons */
  layout?: 'row' | 'row-label';
}

export default function ShareButtons({
  url,
  title,
  description,
  showTelegram = true,
  layout = 'row-label',
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => { clearTimeout(copyTimerRef.current); }, []);

  const waUrl = `${url}${url.includes('?') ? '&' : '?'}utm_source=whatsapp&utm_medium=share`;
  const twUrl = `${url}${url.includes('?') ? '&' : '?'}utm_source=twitter&utm_medium=share`;
  const tgUrl = `${url}${url.includes('?') ? '&' : '?'}utm_source=telegram&utm_medium=share`;
  const whatsappText = `🧬 ${title}\n\n${waUrl}`;
  const tweetText = `${title}`;

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast.success('تم نسخ الرابط');
      events.shareClick('copy_link');
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('تعذّر نسخ الرابط');
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title,
      text: description || title,
      url,
    };
    if (navigator.share) {
      try {
        events.shareClick('native');
        await navigator.share(shareData);
        toast.success('تمت المشاركة!', { duration: 3000 });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopyLink();
    }
  };

  const btnBase =
    'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95 min-h-[44px]';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* WhatsApp — PRIORITY #1 */}
      <a
        href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => events.shareClick('whatsapp')}
        className={`${btnBase} bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-sm`}
        aria-label="مشاركة عبر واتساب"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        {layout === 'row-label' && 'واتساب'}
      </a>

      {/* X / Twitter */}
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(twUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => events.shareClick('twitter')}
        className={`${btnBase} border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:border-stone-400 dark:hover:border-stone-500`}
        aria-label="مشاركة عبر إكس"
      >
        <span className="text-base font-bold leading-none">𝕏</span>
        {layout === 'row-label' && 'إكس'}
      </a>

      {/* Telegram */}
      {showTelegram && (
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(tgUrl)}&text=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => events.shareClick('telegram')}
          className={`${btnBase} border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:border-[#0088cc] hover:text-[#0088cc]`}
          aria-label="مشاركة عبر تيليجرام"
        >
          <Send className="h-4 w-4" />
          {layout === 'row-label' && 'تيليجرام'}
        </a>
      )}

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className={`${btnBase} border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700`}
        aria-label="نسخ الرابط"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-700" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {layout === 'row-label' && (copied ? 'تم النسخ!' : 'نسخ الرابط')}
      </button>

      {/* Native Share (mobile) */}
      {'share' in navigator && (
        <button
          onClick={handleNativeShare}
          className={`${btnBase} border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:border-emerald-300 dark:hover:border-emerald-700`}
          aria-label="مشاركة"
        >
          <Share2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
