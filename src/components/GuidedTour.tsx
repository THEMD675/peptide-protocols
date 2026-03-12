import { useCallback, useMemo } from 'react';
import Joyride, { type CallBackProps, type Step, STATUS, EVENTS } from 'react-joyride';
import { useTheme } from '@/hooks/useTheme';
import { type TourId, markTourDone } from '@/components/tour-utils';

/* ─── Types ─────────────────────────────────────────────────── */

interface GuidedTourProps {
  tourId: TourId;
  run: boolean;
  onFinish: () => void;
}

/* ─── Tour Step Definitions ──────────────────────────────────── */
const DASHBOARD_STEPS: Step[] = [
  {
    target: 'body',
    placement: 'center',
    content: 'مرحبًا بك في pptides! دعنا نعرّفك على المنصة',
    disableBeacon: true,
  },
  {
    target: '[data-tour="dash-library"]',
    placement: 'top',
    content: 'المكتبة تحتوي على 47 ببتيد مع بروتوكولات كاملة',
    disableBeacon: true,
  },
  {
    target: '[data-tour="dash-calculator"]',
    placement: 'top',
    content: 'حاسبة الجرعات تحسب لك الجرعة المناسبة',
    disableBeacon: true,
  },
  {
    target: '[data-tour="dash-coach"]',
    placement: 'top',
    content: 'المدرب الذكي يجيب على أسئلتك حول الببتيدات',
    disableBeacon: true,
  },
  {
    target: '[data-tour="dash-tracker"]',
    placement: 'top',
    content: 'سجّل حقنك وتابع تقدمك هنا',
    disableBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    content: 'أنت جاهز! استكشف المكتبة أو اسأل المدرب الذكي',
    disableBeacon: true,
  },
];

const LIBRARY_STEPS: Step[] = [
  {
    target: '[data-tour="library-search"]',
    placement: 'bottom',
    content: 'ابحث عن أي ببتيد بالاسم أو الهدف',
    disableBeacon: true,
  },
  {
    target: '[data-tour="library-filters"]',
    placement: 'bottom',
    content: 'فلتر حسب الفئة: حرق دهون، بناء عضلات، تعافي...',
    disableBeacon: true,
  },
  {
    target: '[data-tour="library-first-card"]',
    placement: 'top',
    content: 'اضغط على أي ببتيد لرؤية البروتوكول الكامل',
    disableBeacon: true,
  },
];

/* ─── Custom Tooltip ─────────────────────────────────────────── */
function TourTooltip({
  step,
  index,
  size,
  backProps,
  closeProps: _closeProps,
  primaryProps,
  skipProps,
  isLastStep,
  isDark,
}: {
  step: Step;
  index: number;
  size: number;
  backProps: React.HTMLProps<HTMLButtonElement>;
  closeProps: React.HTMLProps<HTMLButtonElement>;
  primaryProps: React.HTMLProps<HTMLButtonElement>;
  skipProps: React.HTMLProps<HTMLButtonElement>;
  isLastStep: boolean;
  isDark: boolean;
}) {
  return (
    <div
      dir="rtl"
      className={[
        'rounded-2xl border px-6 py-5 font-[inherit]',
        'max-w-[320px] min-w-[260px]',
        '[animation:tour-in_0.22s_cubic-bezier(0.34,1.56,0.64,1)]',
        isDark
          ? 'bg-stone-950 text-stone-200 border-stone-700 shadow-[0_20px_40px_rgba(0,0,0,0.5)]'
          : 'bg-white text-stone-900 border-stone-200 shadow-[0_20px_40px_rgba(0,0,0,0.12)]',
      ].join(' ')}
    >
      {/* Step counter */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[0.7rem] font-bold tracking-[0.05em] text-emerald-500">
          {index + 1} / {size}
        </span>
        <button
          {...(skipProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          className={[
            'cursor-pointer rounded p-1 text-xs font-[inherit]',
            isDark ? 'text-stone-400 hover:text-stone-300' : 'text-stone-500 hover:text-stone-700',
          ].join(' ')}
        >
          تخطي
        </button>
      </div>

      {/* Progress bar */}
      <div className={['mb-4 h-[3px] overflow-hidden rounded-sm', isDark ? 'bg-stone-700' : 'bg-stone-100'].join(' ')}>
        <div
          className="h-full rounded-sm bg-gradient-to-r from-emerald-500 to-emerald-600 transition-[width] duration-400 ease-in-out"
          style={{ width: `${((index + 1) / size) * 100}%` }}
        />
      </div>

      {/* Content */}
      <p className={['m-0 text-[0.9rem] font-medium leading-relaxed', isDark ? 'text-stone-200' : 'text-stone-900'].join(' ')}>
        {step.content as string}
      </p>

      {/* Actions */}
      <div className="mt-5 flex gap-2">
        {index > 0 && (
          <button
            {...(backProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            className={[
              'cursor-pointer rounded-full px-4 py-2 text-[0.8rem] font-semibold font-[inherit] transition-colors duration-150',
              isDark
                ? 'border border-stone-700 bg-transparent text-stone-200 hover:bg-stone-800'
                : 'border border-stone-200 bg-transparent text-stone-900 hover:bg-stone-50',
            ].join(' ')}
          >
            السابق
          </button>
        )}
        <button
          {...(primaryProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          className="cursor-pointer rounded-full border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-2 text-[0.8rem] font-bold font-[inherit] text-white shadow-[0_4px_12px_rgba(16,185,129,0.35)] transition-[transform,box-shadow] duration-150 hover:scale-[1.02] hover:shadow-[0_6px_16px_rgba(16,185,129,0.45)]"
        >
          {isLastStep ? 'ابدأ الآن!' : 'التالي'}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function GuidedTour({ tourId, run, onFinish }: GuidedTourProps) {
  const { isDark } = useTheme();
  const steps = tourId === 'dashboard' ? DASHBOARD_STEPS : LIBRARY_STEPS;

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, type } = data;
      if (
        status === STATUS.FINISHED ||
        status === STATUS.SKIPPED ||
        type === EVENTS.TOUR_END
      ) {
        markTourDone(tourId);
        onFinish();
      }
    },
    [tourId, onFinish],
  );

  const styles = useMemo(
    () => ({
      options: {
        arrowColor: isDark ? '#1c1917' : '#ffffff',
        overlayColor: 'rgba(0,0,0,0.55)',
        zIndex: 10000,
      },
      spotlight: {
        borderRadius: '12px',
      },
    }),
    [isDark],
  );

  return (
    <>
      <style>{`
        @keyframes tour-in {
          from { opacity: 0; transform: scale(0.92) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <Joyride
        steps={steps}
        run={run}
        continuous
        showSkipButton
        disableOverlayClose
        disableScrollParentFix
        scrollToFirstStep
        scrollOffset={80}
        styles={styles}
        tooltipComponent={(props) => (
          <TourTooltip
            {...props}
            isDark={isDark}
          />
        )}
        callback={handleCallback}
        locale={{
          back: 'السابق',
          close: 'إغلاق',
          last: 'ابدأ الآن!',
          next: 'التالي',
          skip: 'تخطي',
          open: 'فتح',
        }}
      />
    </>
  );
}
