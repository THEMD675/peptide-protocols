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
    content: 'المكتبة تحتوي على 48+ ببتيد مع بروتوكولات كاملة',
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
  const bg = isDark ? '#1c1917' : '#ffffff';
  const text = isDark ? '#e7e5e4' : '#1c1917';
  const subText = isDark ? '#a8a29e' : '#78716c';
  const border = isDark ? '#44403c' : '#e7e5e4';

  return (
    <div
      dir="rtl"
      style={{
        background: bg,
        color: text,
        borderRadius: '1rem',
        border: `1px solid ${border}`,
        boxShadow: isDark
          ? '0 20px 40px rgba(0,0,0,0.5)'
          : '0 20px 40px rgba(0,0,0,0.12)',
        padding: '1.25rem 1.5rem',
        maxWidth: '320px',
        minWidth: '260px',
        animation: 'tour-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        fontFamily: 'inherit',
      }}
    >
      {/* Step counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', letterSpacing: '0.05em' }}>
          {index + 1} / {size}
        </span>
        <button
          {...(skipProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            color: subText,
            fontSize: '0.75rem',
            fontFamily: 'inherit',
          }}
        >
          تخطي
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: isDark ? '#44403c' : '#f5f5f4', borderRadius: '2px', marginBottom: '1rem', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${((index + 1) / size) * 100}%`,
            background: 'linear-gradient(90deg, #10b981, #059669)',
            borderRadius: '2px',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Content */}
      <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: text, margin: 0, fontWeight: 500 }}>
        {step.content as string}
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'flex-start' }}>
        {index > 0 && (
          <button
            {...(backProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '999px',
              border: `1px solid ${border}`,
              background: 'transparent',
              color: text,
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            السابق
          </button>
        )}
        <button
          {...(primaryProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '999px',
            border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
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
