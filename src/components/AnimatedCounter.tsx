import { useState, useEffect, useRef } from 'react';

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  className?: string;
}

export default function AnimatedCounter({ end, duration = 1500, className }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || end <= 0) return;
    const steps = Math.min(end, 40);
    const stepDuration = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current++;
      const progress = current / steps;
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (current >= steps) {
        setCount(end);
        clearInterval(timer);
      }
    }, stepDuration);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return <span ref={ref} className={className}>{count}</span>;
}
