import { cn } from '@/lib/utils';

interface AnimatedCheckProps {
  size?: number;
  className?: string;
  /** Delay before animation starts (ms) */
  delay?: number;
}

/**
 * Animated SVG checkmark that pops in with a satisfying animation.
 * Used for success states throughout the app.
 */
export default function AnimatedCheck({ size = 48, className, delay = 0 }: AnimatedCheckProps) {
  return (
    <div
      className={cn('animate-success-check inline-flex', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="تم بنجاح"
      >
        <circle
          cx="26"
          cy="26"
          r="25"
          fill="none"
          stroke="#059669"
          strokeWidth="2"
          className="animate-[draw-circle_0.5s_ease-out_forwards]"
          style={{
            strokeDasharray: 157,
            strokeDashoffset: 157,
            animation: `draw-circle 0.5s ease-out ${delay}ms forwards`,
          }}
        />
        <path
          d="M14 27l8 8 16-16"
          fill="none"
          stroke="#059669"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 40,
            strokeDashoffset: 40,
            animation: `draw-check 0.3s ease-out ${delay + 400}ms forwards`,
          }}
        />
        <style>{`
          @keyframes draw-circle {
            to { stroke-dashoffset: 0; }
          }
          @keyframes draw-check {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </svg>
    </div>
  );
}
