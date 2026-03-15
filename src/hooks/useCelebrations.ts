import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

const CELEBRATION_KEY = 'pptides_celebrations';

function getCelebrations(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(CELEBRATION_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    logError('celebrations read failed:', e);
    return {};
  }
}

function markCelebration(key: string) {
  try {
    const celebrations = getCelebrations();
    celebrations[key] = true;
    localStorage.setItem(CELEBRATION_KEY, JSON.stringify(celebrations));
  } catch (e) { logError('celebrations write failed:', e); }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function getConfetti() {
  return (await import('canvas-confetti')).default;
}

/** Big burst — first injection, major milestones */
async function fireConfetti() {
  if (prefersReducedMotion()) return;
  const confetti = await getConfetti();
  const duration = 2500;
  const end = Date.now() + duration;
  const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
      zIndex: 9999,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
      zIndex: 9999,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/** Quick burst — streak milestones, 10/25/50 injections */
async function fireStreakCelebration() {
  if (prefersReducedMotion()) return;
  const confetti = await getConfetti();
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#f97316', '#ef4444', '#eab308'],
    zIndex: 9999,
  });
}

/** Grand finale — 100+ injections */
async function fireGrandCelebration() {
  if (prefersReducedMotion()) return;
  const confetti = await getConfetti();
  const defaults = { startVelocity: 30, spread: 360, ticks: 80, zIndex: 9999 };
  function shoot() {
    confetti({ ...defaults, particleCount: 40, origin: { x: Math.random() * 0.4 + 0.1, y: Math.random() * 0.3 } });
    confetti({ ...defaults, particleCount: 40, origin: { x: Math.random() * 0.4 + 0.5, y: Math.random() * 0.3 } });
  }
  shoot();
  setTimeout(shoot, 250);
  setTimeout(shoot, 500);
}

export function useCelebrations() {
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup all pending timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current = timersRef.current.filter(t => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
  }, []);

  const celebrate = useCallback((totalInjections: number, streak: number) => {
    const celebrated = getCelebrations();

    if (totalInjections === 1 && !celebrated['first_injection']) {
      markCelebration('first_injection');
      safeTimeout(() => {
        toast.dismiss('quick-log-result');
        fireConfetti();
        toast.success('مبروك! سجّلت أول حقنة لك', {
          id: 'injection-celebration',
          duration: 5000,
          description: 'بداية رحلتك مع الببتيدات — سجّل كل حقنة لمتابعة تقدّمك',
        });
      }, 300);
      return;
    }

    // Recurring streak celebrations every 7 days
    if (streak >= 7 && streak % 7 === 0) {
      const streakKey = `streak_${streak}`;
      if (!celebrated[streakKey]) {
        markCelebration(streakKey);
        const msgs: Record<number, { title: string; desc: string }> = {
          7: { title: 'أسبوع كامل بدون انقطاع!', desc: `${streak} أيام متتالية — التزامك ممتاز` },
          14: { title: 'أسبوعان من الالتزام!', desc: 'نتائجك تتراكم — استمر بنفس الوتيرة' },
          21: { title: '٣ أسابيع متواصلة!', desc: 'عادتك تتشكّل — لا تتوقف الآن' },
          30: { title: 'شهر كامل من الالتزام!', desc: 'إنجاز استثنائي — شارك تجربتك مع المجتمع' },
        };
        const msg = msgs[streak] || {
          title: `${streak} يوم متتالي! استمر!`,
          desc: 'التزامك مثال يُحتذى',
        };
        safeTimeout(() => {
          toast.dismiss('quick-log-result');
          fireStreakCelebration();
          toast.success(msg.title, { id: 'injection-celebration', duration: 5000, description: msg.desc });
        }, 300);
        return;
      }
    }

    if (totalInjections >= 10 && !celebrated['ten_injections']) {
      markCelebration('ten_injections');
      safeTimeout(() => {
        toast.dismiss('quick-log-result');
        fireStreakCelebration();
        toast.success('10 حقنات مسجّلة!', {
          id: 'injection-celebration',
          duration: 4000,
          description: 'أنت على الطريق الصحيح',
        });
      }, 300);
      return;
    }

    if (totalInjections >= 25 && !celebrated['milestone_25']) {
      markCelebration('milestone_25');
      safeTimeout(() => {
        toast.dismiss('quick-log-result');
        fireStreakCelebration();
        toast.success('25 حقنة! أنت ملتزم بشكل رائع', {
          id: 'injection-celebration',
          duration: 5000,
        });
      }, 300);
      return;
    }

    if (totalInjections >= 50 && !celebrated['fifty_injections']) {
      markCelebration('fifty_injections');
      safeTimeout(() => {
        toast.dismiss('quick-log-result');
        fireConfetti();
        toast.success('50 حقنة! مستخدم متقدّم', {
          id: 'injection-celebration',
          duration: 4000,
          description: 'خبرتك تتزايد — شارك تجربتك لمساعدة الآخرين',
        });
      }, 300);
      return;
    }

    if (totalInjections >= 100 && !celebrated['milestone_100']) {
      markCelebration('milestone_100');
      safeTimeout(() => {
        toast.dismiss('quick-log-result');
        fireGrandCelebration();
        toast.success('100 حقنة! إنجاز استثنائي', {
          id: 'injection-celebration',
          duration: 6000,
          description: 'أنت من النخبة — شارك قصتك مع المجتمع',
        });
      }, 300);
    }
  }, [safeTimeout]);

  return { celebrate };
}
