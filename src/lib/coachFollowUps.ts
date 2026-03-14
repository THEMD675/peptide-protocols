import { peptidesLite } from '@/data/peptides-lite';

/**
 * Generate contextual Arabic follow-up suggestions based on the AI response content.
 * Uses simple heuristic detection — no API calls needed.
 */
export function generateFollowUps(responseText: string): string[] {
  const lower = responseText.toLowerCase();
  const suggestions: string[] = [];

  // Detect mentioned peptides
  const mentionedPeptides: { nameAr: string; nameEn: string }[] = [];
  for (const p of peptidesLite) {
    if (lower.includes(p.nameEn.toLowerCase()) || responseText.includes(p.nameAr)) {
      mentionedPeptides.push({ nameAr: p.nameAr, nameEn: p.nameEn });
    }
  }

  // Dosing keywords
  const hasDosing = /جرعة|dose|mcg|mg|ملغ|ميكروغرام|وحدة|iu|unit/i.test(responseText);
  // Protocol/stack keywords
  const hasProtocol = /بروتوكول|protocol|ستاك|stack|توليفة|دورة|cycle|مرحلة/i.test(responseText);
  // Side effects keywords
  const hasSideEffects = /أعراض جانبية|آثار جانبية|side effect|احمرار|غثيان|صداع/i.test(responseText);
  // Timing keywords
  const hasTiming = /توقيت|وقت الحقن|قبل النوم|صباح|مساء|على معدة فارغة/i.test(responseText);
  // Cost keywords
  const hasCost = /تكلفة|سعر|cost|price|ريال|دولار/i.test(responseText);

  // Priority 1: If specific peptide mentioned, suggest dose and side effects
  if (mentionedPeptides.length > 0 && !hasDosing) {
    const pep = mentionedPeptides[0];
    suggestions.push(`ما الجرعة المناسبة لـ ${pep.nameAr}؟`);
    suggestions.push('ما الأعراض الجانبية المحتملة؟');
  }

  // Priority 2: If dosing discussed, suggest timing and combination
  if (hasDosing && suggestions.length < 2) {
    if (!hasTiming) suggestions.push('ما أفضل وقت للحقن؟');
    suggestions.push('هل يمكن دمجه مع ببتيد آخر؟');
  }

  // Priority 3: If protocol/stack discussed, suggest full protocol and cost
  if (hasProtocol && suggestions.length < 2) {
    if (!hasCost) suggestions.push('كم تكلفة هذا البروتوكول؟');
    suggestions.push('اعطني البروتوكول كامل بالتفصيل');
  }

  // Priority 4: If side effects discussed, suggest alternatives
  if (hasSideEffects && suggestions.length < 2) {
    suggestions.push('هل هناك بديل بأعراض جانبية أقل؟');
    suggestions.push('كيف أقلّل الأعراض الجانبية؟');
  }

  // Fill remaining with contextual fallbacks
  if (mentionedPeptides.length > 0 && suggestions.length < 3) {
    const pep = mentionedPeptides[0];
    if (!suggestions.some(s => s.includes('تخزين'))) {
      suggestions.push(`كيف أخزّن ${pep.nameAr} بشكل صحيح؟`);
    }
  }

  // Fallback set if nothing matched
  if (suggestions.length === 0) {
    return ['اقترح لي بروتوكول', 'ما أفضل ببتيد لهدفي؟', 'شرح أكثر'];
  }

  // Ensure max 3
  return suggestions.slice(0, 3);
}

/**
 * Detect if the AI response contains a protocol/dosing plan worth saving.
 */
export function hasProtocolContent(text: string): boolean {
  const lower = text.toLowerCase();
  // Must have dosing info AND some structure
  const hasDosing = /جرعة|dose|mcg|mg|ملغ|ميكروغرام|وحدة|iu/i.test(text);
  const hasStructure = /بروتوكول|protocol|المرحلة|الأسبوع|يومي|أسبوعي|دورة|cycle/i.test(text);
  const hasMinLength = text.length > 300; // Protocols tend to be detailed
  return hasDosing && hasStructure && hasMinLength;
}

/**
 * Extract a title and peptide list from protocol text.
 */
export function extractProtocolMeta(text: string): { title: string; peptides: string[] } {
  const peptides: string[] = [];
  for (const p of peptidesLite) {
    if (text.toLowerCase().includes(p.nameEn.toLowerCase()) || text.includes(p.nameAr)) {
      peptides.push(p.nameEn);
    }
  }

  // Generate title from peptides or fallback
  let title: string;
  if (peptides.length > 0) {
    title = `بروتوكول ${peptides.slice(0, 3).join(' + ')}`;
  } else {
    title = 'بروتوكول مخصّص';
  }

  return { title, peptides: peptides.slice(0, 10) };
}
