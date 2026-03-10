/**
 * Quiz/Onboarding localStorage migration utility.
 *
 * Unifies old keys (`pptides_quiz_v2`, `pptides_quiz_answers`)
 * into a single canonical key: `pptides_quiz_results`.
 *
 * Also maps old onboarding goal IDs to canonical quiz goal IDs.
 */

const CANONICAL_KEY = 'pptides_quiz_results';
const OLD_QUIZ_KEY = 'pptides_quiz_v2';
const OLD_ONBOARDING_KEY = 'pptides_quiz_answers';

/** Map onboarding goal IDs → quiz (canonical) goal IDs */
const ONBOARDING_TO_QUIZ_GOAL: Record<string, string> = {
  'fat-loss': 'weight-loss',
  'recovery': 'recovery',
  'muscle': 'muscle',
  'brain': 'general',
  'hormones': 'general',
  'longevity': 'anti-aging',
  'gut-skin': 'skin',
  'skin-gut-sleep': 'skin',
};

/**
 * Run once on app load. Migrates old localStorage keys to the unified key.
 * Priority: quiz results (richer data) > onboarding answers (goal only).
 */
export function migrateQuizStorage(): void {
  try {
    // If canonical key already exists, just clean up old keys
    if (localStorage.getItem(CANONICAL_KEY)) {
      localStorage.removeItem(OLD_QUIZ_KEY);
      localStorage.removeItem(OLD_ONBOARDING_KEY);
      return;
    }

    // Try quiz data first (has full answers + result)
    const quizRaw = localStorage.getItem(OLD_QUIZ_KEY);
    if (quizRaw) {
      const quizData = JSON.parse(quizRaw);
      // pptides_quiz_v2 stores { answers: QuizAnswers, result: ProtocolResult, ts }
      // Canonical format: { goal, answers, result, ts }
      localStorage.setItem(CANONICAL_KEY, JSON.stringify({
        goal: quizData.answers?.goal ?? null,
        answers: quizData.answers ?? {},
        result: quizData.result ?? null,
        ts: quizData.ts ?? Date.now(),
      }));
      localStorage.removeItem(OLD_QUIZ_KEY);
      localStorage.removeItem(OLD_ONBOARDING_KEY);
      return;
    }

    // Fallback: try onboarding data (goal only)
    const onbRaw = localStorage.getItem(OLD_ONBOARDING_KEY);
    if (onbRaw) {
      const onbData = JSON.parse(onbRaw);
      const oldGoal = onbData.goal;
      const canonicalGoal = oldGoal ? (ONBOARDING_TO_QUIZ_GOAL[oldGoal] ?? oldGoal) : null;
      localStorage.setItem(CANONICAL_KEY, JSON.stringify({
        goal: canonicalGoal,
        answers: canonicalGoal ? { goal: canonicalGoal } : {},
        result: null,
        ts: onbData.ts ?? Date.now(),
      }));
      localStorage.removeItem(OLD_ONBOARDING_KEY);
      return;
    }
  } catch {
    // localStorage unavailable — silently ignore
  }
}
