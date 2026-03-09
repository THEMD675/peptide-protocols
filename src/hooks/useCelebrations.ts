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
        toast.success('حقنتك الأولى! بداية رحلتك مع الببتيدات', {
          duration: 5000,
          description: 'سجّل كل حقنة لمتابعة تقدّمك والتزامك بالبروتوكول',
        });
      }, 300);
      return;
    }

    if (streak === 7 && !celebrated['streak_7']) {
      markCelebration('streak_7');
      setTimeout(() => {
        toast.success('أسبوع كامل بدون انقطاع!', {
          duration: 5000,
          description: `${streak} أيام متتالية — التزامك ممتاز`,
        });
      }, 300);
      return;
    }

    if (streak === 14 && !celebrated['streak_14']) {
      markCelebration('streak_14');
      setTimeout(() => {
        toast.success('أسبوعان من الالتزام!', {
          duration: 5000,
          description: 'نتائجك تتراكم — استمر بنفس الوتيرة',
        });
      }, 300);
      return;
    }

    if (streak === 30 && !celebrated['streak_30']) {
      markCelebration('streak_30');
      setTimeout(() => {
        toast.success('شهر كامل من الالتزام!', {
          duration: 5000,
          description: 'إنجاز استثنائي — شارك تجربتك مع المجتمع',
        });
      }, 300);
      return;
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
