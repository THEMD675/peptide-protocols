import { useCallback } from 'react';
import { toast } from 'sonner';

const CELEBRATION_KEY = 'pptides_celebrations';

function getCelebrations(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(CELEBRATION_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function markCelebration(key: string) {
  try {
    const celebrations = getCelebrations();
    celebrations[key] = true;
    localStorage.setItem(CELEBRATION_KEY, JSON.stringify(celebrations));
  } catch { /* expected */ }
}

export function useCelebrations() {
  const celebrate = useCallback((totalInjections: number, streak: number) => {
    const celebrated = getCelebrations();

    if (totalInjections === 1 && !celebrated['first_injection']) {
      markCelebration('first_injection');
      setTimeout(() => {
        toast.success('🎉 مبروك! سجّلت أول حقنة لك', {
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
          7: { title: '🔥 أسبوع كامل بدون انقطاع!', desc: `${streak} أيام متتالية — التزامك ممتاز` },
          14: { title: '🔥 أسبوعان من الالتزام!', desc: 'نتائجك تتراكم — استمر بنفس الوتيرة' },
          21: { title: '🔥 ٣ أسابيع متواصلة!', desc: 'عادتك تتشكّل — لا تتوقف الآن' },
          30: { title: '🏆 شهر كامل من الالتزام!', desc: 'إنجاز استثنائي — شارك تجربتك مع المجتمع' },
        };
        const msg = msgs[streak] || {
          title: `🔥 ${streak} يوم متتالي! استمر!`,
          desc: 'التزامك مثال يُحتذى',
        };
        setTimeout(() => {
          toast.success(msg.title, { duration: 5000, description: msg.desc });
        }, 300);
        return;
      }
    }

    if (totalInjections >= 10 && !celebrated['ten_injections']) {
      markCelebration('ten_injections');
      setTimeout(() => {
        toast.success('10 حقنات مسجّلة!', {
          duration: 4000,
          description: 'أنت على الطريق الصحيح',
        });
      }, 300);
      return;
    }

    if (totalInjections >= 25 && !celebrated['milestone_25']) {
      markCelebration('milestone_25');
      setTimeout(() => {
        toast.success('25 حقنة! أنت ملتزم بشكل رائع', {
          duration: 5000,
        });
      }, 300);
      return;
    }

    if (totalInjections >= 50 && !celebrated['fifty_injections']) {
      markCelebration('fifty_injections');
      setTimeout(() => {
        toast.success('50 حقنة! مستخدم متقدّم', {
          duration: 4000,
          description: 'خبرتك تتزايد — شارك تجربتك لمساعدة الآخرين',
        });
      }, 300);
      return;
    }

    if (totalInjections >= 100 && !celebrated['milestone_100']) {
      markCelebration('milestone_100');
      setTimeout(() => {
        toast.success('100 حقنة! إنجاز استثنائي', {
          duration: 5000,
        });
      }, 300);
    }
  }, []);

  return { celebrate };
}
