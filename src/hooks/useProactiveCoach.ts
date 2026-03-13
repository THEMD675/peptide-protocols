import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';

export interface ProactiveInsight {
  id: string;
  icon: 'trending-up' | 'alert-triangle' | 'lightbulb' | 'target' | 'microscope' | 'calendar' | 'heart' | 'zap';
  text: string;
  priority: number; // higher = show first
  actionText?: string; // optional CTA text
}

export interface SmartStarter {
  text: string;
  priority: number;
}

export interface DailyBriefing {
  greeting: string;
  observations: string[];
  mood: 'positive' | 'neutral' | 'alert';
}

interface UserProactiveData {
  lastInjectionDaysAgo: number | null;
  recentPeptides: string[];
  recentSideEffects: { symptom: string; peptide_id: string | null; created_at: string }[];
  hasLabResults: boolean;
  labHighlights: { test_id: string; value: number; unit: string; tested_at: string }[];
  wellnessTrend: { metric: string; direction: 'up' | 'down' | 'stable'; change: number } | null;
  sleepTrend: { direction: 'up' | 'down' | 'stable'; avgRecent: number; avgOlder: number } | null;
  energyTrend: { direction: 'up' | 'down' | 'stable'; avgRecent: number; avgOlder: number } | null;
  painTrend: { direction: 'up' | 'down' | 'stable'; avgRecent: number; avgOlder: number } | null;
  activeProtocols: { peptide_id: string; cycle_weeks: number; started_at: string; status: string; dose: number; dose_unit: string }[];
  accountAgeDays: number;
  todayLogged: boolean;
  totalInjections: number;
  streak: number;
  lastConversation: { topic: string; updatedAt: string; hasActionItems: boolean } | null;
  userGoals: string[] | null;
  wellnessLogs: { energy: number; sleep: number; pain: number; mood: number; logged_at: string }[];
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'أهلاً — متأخر بعد؟';
  if (hour < 12) return 'صباح الخير';
  if (hour < 18) return 'مرحبًا';
  return 'مساء الخير';
}

async function fetchProactiveData(userId: string): Promise<UserProactiveData> {
  const today = new Date().toDateString();

  const [injRes, sideRes, labRes, wellRes, protoRes, userRes, convRes, profileRes, injCountRes] = await Promise.all([
    supabase.from('injection_logs').select('peptide_name, logged_at').eq('user_id', userId).order('logged_at', { ascending: false }).limit(30),
    supabase.from('side_effect_logs').select('symptom, peptide_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    supabase.from('lab_results').select('test_id, value, unit, tested_at').eq('user_id', userId).order('tested_at', { ascending: false }).limit(10),
    supabase.from('wellness_logs').select('energy, sleep, pain, mood, logged_at').eq('user_id', userId).order('logged_at', { ascending: false }).limit(14),
    supabase.from('user_protocols').select('peptide_id, cycle_weeks, started_at, status, dose, dose_unit').eq('user_id', userId).order('started_at', { ascending: false }).limit(10),
    supabase.auth.getUser(),
    supabase.from('coach_conversations').select('messages, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('user_profiles').select('goals, onboarding_goals').eq('user_id', userId).maybeSingle(),
    supabase.from('injection_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  const injLogs = injRes.data ?? [];
  const sideLogs = sideRes.data ?? [];
  const labLogs = labRes.data ?? [];
  const wellLogs = wellRes.data ?? [];
  const protos = protoRes.data ?? [];
  const createdAt = userRes.data?.user?.created_at;
  const convData = convRes.data;
  const profileData = profileRes.data;

  // Injection recency
  const lastInjectionDaysAgo = injLogs.length > 0 ? daysSince(injLogs[0].logged_at) : null;
  const recentPeptides = [...new Set(injLogs.map(l => l.peptide_name))];
  const todayLogged = injLogs.some(l => new Date(l.logged_at).toDateString() === today);

  // Streak
  let streak = 0;
  if (injLogs.length > 0) {
    const daySet = new Set(injLogs.map(l => new Date(l.logged_at).toDateString()));
    const d = new Date();
    if (!daySet.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
  }

  // Side effects
  const recentSideEffects = sideLogs.map(s => ({ symptom: s.symptom, peptide_id: s.peptide_id, created_at: s.created_at }));

  // Lab results
  const hasLabResults = labLogs.length > 0;
  const labHighlights = labLogs.map(l => ({ test_id: l.test_id, value: l.value, unit: l.unit ?? '', tested_at: l.tested_at }));

  // Compute wellness trends for each metric
  function computeTrend(logs: typeof wellLogs, key: 'energy' | 'sleep' | 'pain' | 'mood') {
    if (logs.length < 4) return null;
    const recent = logs.slice(0, 3);
    const older = logs.slice(3, 7);
    if (older.length === 0) return null;
    const avgRecent = recent.reduce((s, w) => s + (w[key] ?? 3), 0) / recent.length;
    const avgOlder = older.reduce((s, w) => s + (w[key] ?? 3), 0) / older.length;
    const change = Math.round(((avgRecent - avgOlder) / Math.max(avgOlder, 0.1)) * 100);
    const direction = Math.abs(change) <= 10 ? 'stable' as const : change > 0 ? 'up' as const : 'down' as const;
    return { direction, avgRecent: Math.round(avgRecent * 10) / 10, avgOlder: Math.round(avgOlder * 10) / 10 };
  }

  const energyTrend = computeTrend(wellLogs, 'energy');
  const sleepTrend = computeTrend(wellLogs, 'sleep');
  const painTrend = computeTrend(wellLogs, 'pain');

  // Legacy wellnessTrend (energy-based) for backwards compat
  let wellnessTrend: UserProactiveData['wellnessTrend'] = null;
  if (energyTrend && energyTrend.direction !== 'stable') {
    wellnessTrend = {
      metric: 'energy',
      direction: energyTrend.direction,
      change: Math.abs(Math.round(((energyTrend.avgRecent - energyTrend.avgOlder) / Math.max(energyTrend.avgOlder, 0.1)) * 100)),
    };
  }

  // Active protocols
  const activeProtocols = protos.filter(p => p.status === 'active').map(p => ({
    peptide_id: p.peptide_id,
    cycle_weeks: p.cycle_weeks,
    started_at: p.started_at,
    status: p.status,
    dose: p.dose,
    dose_unit: p.dose_unit,
  }));

  // Account age
  const accountAgeDays = createdAt ? daysSince(createdAt) : 999;

  // Last conversation
  let lastConversation: UserProactiveData['lastConversation'] = null;
  if (convData?.messages && Array.isArray(convData.messages) && convData.messages.length > 0) {
    const msgs = convData.messages as Array<{ role: string; content: string }>;
    const firstUser = msgs.find(m => m.role === 'user');
    let topic = 'استشارة سابقة';
    if (firstUser) {
      const content = firstUser.content;
      if (content.startsWith('USER PROFILE')) {
        topic = 'بروتوكول مخصص';
      } else {
        topic = content.length > 60 ? content.slice(0, 60) + '...' : content;
      }
    }
    // Check if last assistant message had action items (contains numbered list or "خطوتك")
    const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
    const hasActionItems = lastAssistant ? /خطوتك|1\.|الخطوة التالية/.test(lastAssistant.content) : false;

    lastConversation = {
      topic,
      updatedAt: convData.updated_at,
      hasActionItems,
    };
  }

  // User goals
  let userGoals: string[] | null = null;
  if (profileData?.goals) {
    userGoals = Array.isArray(profileData.goals) ? profileData.goals : [profileData.goals];
  } else if (profileData?.onboarding_goals) {
    const og = profileData.onboarding_goals as { goal?: string };
    if (og.goal) userGoals = [og.goal];
  }

  return {
    lastInjectionDaysAgo,
    recentPeptides,
    recentSideEffects,
    hasLabResults,
    labHighlights,
    wellnessTrend,
    sleepTrend,
    energyTrend,
    painTrend,
    activeProtocols,
    accountAgeDays,
    todayLogged,
    totalInjections: injCountRes.count ?? injLogs.length,
    streak,
    lastConversation,
    userGoals,
    wellnessLogs: wellLogs,
  };
}

function generateDailyBriefing(data: UserProactiveData): DailyBriefing | null {
  const observations: string[] = [];
  let mood: DailyBriefing['mood'] = 'neutral';

  // Time-of-day greeting
  const greeting = getTimeOfDayGreeting();

  // Active protocol status
  for (const proto of data.activeProtocols) {
    if (proto.started_at) {
      const daysIn = daysSince(proto.started_at);
      const totalDays = proto.cycle_weeks * 7;
      const remaining = totalDays - daysIn;

      if (remaining > 0 && remaining <= 3) {
        observations.push(`بروتوكول ${proto.peptide_id} ينتهي خلال ${remaining} أيام. هل تريد مناقشة الخطوة التالية؟`);
        mood = 'alert';
      } else if (daysIn > 0 && daysIn % 7 === 0) {
        observations.push(`أنت في الأسبوع ${Math.ceil(daysIn / 7)} من بروتوكول ${proto.peptide_id}. كيف تشعر بالنتائج حتى الآن؟`);
      } else if (daysIn === 14) {
        observations.push(`أنت في اليوم 14 من بروتوكول ${proto.peptide_id}. هذا وقت مثالي لتقييم النتائج الأولية.`);
      }
    }
  }

  // Today's dose status
  if (data.activeProtocols.length > 0 && !data.todayLogged) {
    observations.push('لم تسجّل جرعتك اليوم. هل تحتاج تذكير بالتوقيت المناسب؟');
    if (mood === 'neutral') mood = 'alert';
  }

  // Sleep trend
  if (data.sleepTrend?.direction === 'down') {
    const protoPeptides = data.activeProtocols.map(p => p.peptide_id).join(' و ');
    if (protoPeptides) {
      observations.push(`لاحظت أن نومك انخفض في آخر 3 أيام. هل تريد مناقشة تعديل بروتوكول ${protoPeptides}؟`);
    } else {
      observations.push('نومك انخفض مؤخرًا. هل تريد استشارة حول ببتيدات تحسين النوم مثل DSIP؟');
    }
    mood = 'alert';
  }

  // Energy trend
  if (data.energyTrend?.direction === 'down' && data.sleepTrend?.direction !== 'down') {
    observations.push(`مستوى طاقتك انخفض من ${data.energyTrend.avgOlder} إلى ${data.energyTrend.avgRecent}. خلّنا نراجع البروتوكول.`);
    mood = 'alert';
  } else if (data.energyTrend?.direction === 'up') {
    observations.push(`طاقتك تحسّنت إلى ${data.energyTrend.avgRecent}/5 — البروتوكول يعمل!`);
    mood = 'positive';
  }

  // Pain trend
  if (data.painTrend?.direction === 'up') {
    observations.push('مستوى الألم عندك ارتفع مؤخرًا. هل تريد نصيحة حول BPC-157 أو TB-500 للتعافي؟');
    mood = 'alert';
  }

  // Missed doses
  if (data.lastInjectionDaysAgo !== null && data.lastInjectionDaysAgo >= 3 && data.activeProtocols.length > 0) {
    observations.push(`لم تسجّل حقنة منذ ${data.lastInjectionDaysAgo} أيام. الانقطاع يقلل فعالية البروتوكول.`);
    mood = 'alert';
  }

  // Lab results
  if (data.labHighlights.length > 0) {
    const latestLab = data.labHighlights[0];
    const daysSinceLab = daysSince(latestLab.tested_at);
    if (daysSinceLab <= 7) {
      observations.push(`نتائج تحاليلك الأخيرة جاهزة — تبي أحللها لك وأقترح تعديلات؟`);
    }

    // Check for notable values
    const igf = data.labHighlights.find(l => l.test_id.toLowerCase().includes('igf'));
    if (igf && igf.value < 150) {
      observations.push(`بناءً على نتائجك: IGF-1 عند ${igf.value} ${igf.unit} — منخفض. اقتراح تعليمي: CJC-1295 + Ipamorelin. ⚠️ استشر طبيبك قبل البدء.`);
    }
    const testosterone = data.labHighlights.find(l => l.test_id.toLowerCase().includes('test'));
    if (testosterone && testosterone.value < 400) {
      observations.push(`بناءً على نتائج مختبرك: التستوستيرون عند ${testosterone.value} ${testosterone.unit}. ⚠️ هذا اقتراح تعليمي — استشر طبيبك قبل أي قرار علاجي.`);
    }
  }

  // Lab test reminder for protocol users
  for (const proto of data.activeProtocols) {
    if (proto.started_at) {
      const weeksIn = Math.floor(daysSince(proto.started_at) / 7);
      if (weeksIn >= 4 && !data.hasLabResults) {
        observations.push(`أنت في الأسبوع ${weeksIn} من ${proto.peptide_id}. حان وقت عمل تحاليل لقياس التقدم.`);
      }
    }
  }

  // Side effects
  if (data.recentSideEffects.length > 0) {
    const recent = data.recentSideEffects[0];
    const daysSinceSE = daysSince(recent.created_at);
    if (daysSinceSE <= 3) {
      observations.push(`سجّلت "${recent.symptom}" مؤخرًا — هل تحسّن الوضع أم تحتاج تعديل الجرعة؟`);
      mood = 'alert';
    }
  }

  // Streak celebration
  if (data.streak >= 7 && data.streak % 7 === 0) {
    observations.push(`${data.streak} يوم متتالي من الالتزام — أداء ممتاز! هكذا تحقق النتائج.`);
    mood = 'positive';
  }

  // Last conversation follow-up
  if (data.lastConversation) {
    const daysSinceConv = daysSince(data.lastConversation.updatedAt);
    if (daysSinceConv >= 1 && daysSinceConv <= 7 && data.lastConversation.hasActionItems) {
      observations.push(`في محادثتنا الأخيرة تحدثنا عن "${data.lastConversation.topic}". هل طبّقت النصائح؟`);
    }
  }

  // New user
  if (data.accountAgeDays <= 3 && data.activeProtocols.length === 0) {
    observations.push('مرحبًا بك! خلّني أساعدك تصمّم أول بروتوكول مخصّص لهدفك.');
    mood = 'positive';
  }

  if (observations.length === 0) return null;

  // Limit to top 3 most relevant
  return {
    greeting,
    observations: observations.slice(0, 4),
    mood,
  };
}

function generateSmartStarters(data: UserProactiveData): SmartStarter[] {
  const starters: SmartStarter[] = [];

  // New user (< 3 days)
  if (data.accountAgeDays <= 3) {
    starters.push({ text: 'مرحبًا! خلّني أساعدك تبدأ — وش هدفك الأول؟', priority: 100 });
  }

  // Has active protocols → check on progress
  if (data.activeProtocols.length > 0) {
    const proto = data.activeProtocols[0];
    const daysIn = proto.started_at ? daysSince(proto.started_at) : 0;
    if (daysIn >= 14) {
      starters.push({ text: `أنا في اليوم ${daysIn} من ${proto.peptide_id} — قيّم نتائجي`, priority: 92 });
    } else {
      starters.push({ text: `كيف حالي مع بروتوكول ${proto.peptide_id}؟ راجع تقدّمي`, priority: 90 });
    }
  }

  // Follow up on last conversation
  if (data.lastConversation && daysSince(data.lastConversation.updatedAt) <= 7) {
    starters.push({ text: `تابع محادثتنا السابقة عن "${data.lastConversation.topic}"`, priority: 93 });
  }

  // Logged side effects recently
  if (data.recentSideEffects.length > 0) {
    const se = data.recentSideEffects[0];
    starters.push({ text: `سجّلت ${se.symptom} — هل هذا طبيعي وماذا أفعل؟`, priority: 95 });
  }

  // Has lab results
  if (data.hasLabResults) {
    const latestLab = data.labHighlights[0];
    if (daysSince(latestLab.tested_at) <= 14) {
      starters.push({ text: 'حلّل نتائج تحاليلي واقترح تعديلات على البروتوكول', priority: 88 });
    }
  }

  // No injection logs for 3+ days
  if (data.lastInjectionDaysAgo !== null && data.lastInjectionDaysAgo >= 3) {
    starters.push({ text: 'ما سجّلت حقنتي من فترة — كيف أرجع للبروتوكول؟', priority: 88 });
  }

  // Sleep declining
  if (data.sleepTrend?.direction === 'down') {
    starters.push({ text: 'نومي صار سيء مؤخرًا — وش تنصحني؟', priority: 86 });
  }

  // Has recent injection logs → offer review
  if (data.recentPeptides.length > 0 && (data.lastInjectionDaysAgo ?? 999) < 3) {
    starters.push({ text: `عندي ${data.recentPeptides.length} ببتيدات — راجع نتائجي واقترح تحسينات`, priority: 70 });
  }

  // Wellness improving
  if (data.wellnessTrend?.direction === 'up') {
    starters.push({ text: `طاقتي تحسّنت ${data.wellnessTrend.change}% — ليش وكيف أحافظ عليها؟`, priority: 75 });
  }

  // Goal-based
  if (data.userGoals && data.userGoals.length > 0) {
    const goalMap: Record<string, string> = {
      'weight-loss': 'وش أفضل ببتيد لهدفي في إنقاص الوزن؟',
      'fat-loss': 'وش أفضل ببتيد لهدفي في حرق الدهون؟',
      recovery: 'كيف أسرّع التعافي من الإصابة؟',
      muscle: 'وش أحسن ستاك لبناء العضل؟',
      brain: 'أبي ببتيدات للتركيز الذهني',
      longevity: 'وش أفضل بروتوكول لمقاومة الشيخوخة؟',
      hormones: 'كيف أحسّن هرموناتي بالببتيدات؟',
    };
    const goal = data.userGoals[0];
    if (goalMap[goal]) {
      starters.push({ text: goalMap[goal], priority: 65 });
    }
  }

  // Sort by priority, take top 3
  starters.sort((a, b) => b.priority - a.priority);
  return starters.slice(0, 3);
}

function generateInsights(data: UserProactiveData): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];

  // Wellness improving
  if (data.wellnessTrend?.direction === 'up' && data.activeProtocols.length > 0) {
    const proto = data.activeProtocols[0];
    insights.push({
      id: 'wellness-up',
      icon: 'trending-up',
      text: `بناءً على بياناتك: طاقتك تحسّنت ${data.wellnessTrend.change}% منذ بدأت ${proto.peptide_id}`,
      priority: 90,
    });
  }

  // Wellness declining
  if (data.wellnessTrend?.direction === 'down') {
    insights.push({
      id: 'wellness-down',
      icon: 'alert-triangle',
      text: `انتبه: مستوى طاقتك انخفض ${data.wellnessTrend.change}% — خلّنا نراجع بروتوكولك`,
      priority: 95,
    });
  }

  // Sleep declining
  if (data.sleepTrend?.direction === 'down') {
    insights.push({
      id: 'sleep-down',
      icon: 'alert-triangle',
      text: `نومك انخفض من ${data.sleepTrend.avgOlder} إلى ${data.sleepTrend.avgRecent}/5 — DSIP أو تعديل التوقيت ممكن يساعد`,
      priority: 96,
    });
  }

  // Pain increasing
  if (data.painTrend?.direction === 'up') {
    insights.push({
      id: 'pain-up',
      icon: 'alert-triangle',
      text: `الألم ارتفع من ${data.painTrend.avgOlder} إلى ${data.painTrend.avgRecent}/5 — BPC-157 أو TB-500 ممكن يساعد`,
      priority: 94,
    });
  }

  // No recent injection logs (3+ days)
  if (data.lastInjectionDaysAgo !== null && data.lastInjectionDaysAgo >= 3 && data.activeProtocols.length > 0) {
    insights.push({
      id: 'missing-logs',
      icon: 'alert-triangle',
      text: `تنبيه: لم تسجّل حقنتك منذ ${data.lastInjectionDaysAgo} أيام — الالتزام مهم للنتائج`,
      priority: 100,
    });
  }

  // Didn't log today
  if (data.activeProtocols.length > 0 && !data.todayLogged && data.lastInjectionDaysAgo !== null && data.lastInjectionDaysAgo < 3) {
    insights.push({
      id: 'no-log-today',
      icon: 'calendar',
      text: 'لم تسجّل جرعة اليوم — سجّلها للحفاظ على سلسلتك',
      priority: 85,
      actionText: 'سجّل الآن',
    });
  }

  // Streak milestone
  if (data.streak >= 7) {
    insights.push({
      id: 'streak-milestone',
      icon: 'zap',
      text: `${data.streak} يوم التزام متتالي — أداء ممتاز! استمر وستلاحظ الفرق`,
      priority: 60,
    });
  }

  // Lab results with notable values
  if (data.labHighlights.length > 0) {
    const igf = data.labHighlights.find(l => l.test_id.toLowerCase().includes('igf'));
    if (igf && igf.value < 150) {
      insights.push({
        id: 'low-igf',
        icon: 'lightbulb',
        text: `IGF-1 عندك ${igf.value} ${igf.unit} — منخفض. اقتراح تعليمي: CJC-1295 + Ipamorelin ⚠️ استشر طبيبك`,
        priority: 85,
      });
    }
    const testosterone = data.labHighlights.find(l => l.test_id.toLowerCase().includes('test'));
    if (testosterone && testosterone.value < 400) {
      insights.push({
        id: 'low-test',
        icon: 'lightbulb',
        text: `التستوستيرون عند ${testosterone.value} ${testosterone.unit} — ممكن نحسّنه. خلّنا نناقش`,
        priority: 86,
      });
    }
  }

  // Lab test reminder for protocol users
  for (const proto of data.activeProtocols) {
    if (proto.started_at && proto.cycle_weeks) {
      const weeksIn = Math.floor(daysSince(proto.started_at) / 7);
      if (weeksIn >= 4 && !data.hasLabResults) {
        insights.push({
          id: `lab-reminder-${proto.peptide_id}`,
          icon: 'microscope',
          text: `أنت في الأسبوع ${weeksIn} من ${proto.peptide_id} — حان وقت التحاليل لقياس التقدم`,
          priority: 87,
        });
      }
    }
  }

  // Protocol cycle ending soon
  for (const proto of data.activeProtocols) {
    if (proto.started_at && proto.cycle_weeks) {
      const weeksIn = daysSince(proto.started_at) / 7;
      const remaining = proto.cycle_weeks - weeksIn;
      if (remaining > 0 && remaining <= 1) {
        insights.push({
          id: `cycle-end-${proto.peptide_id}`,
          icon: 'target',
          text: `دورة ${proto.peptide_id} توشك على الانتهاء — خلّني أقترح الخطوة التالية`,
          priority: 92,
        });
      }
    }
  }

  // Recent side effects
  if (data.recentSideEffects.length > 0) {
    const se = data.recentSideEffects[0];
    insights.push({
      id: 'side-effect',
      icon: 'microscope',
      text: `سجّلت عرض "${se.symptom}" مؤخرًا — تبي نناقش حلول أو تعديل الجرعة؟`,
      priority: 88,
    });
  }

  // Conversation follow-up
  if (data.lastConversation && data.lastConversation.hasActionItems) {
    const daysSinceConv = daysSince(data.lastConversation.updatedAt);
    if (daysSinceConv >= 1 && daysSinceConv <= 5) {
      insights.push({
        id: 'follow-up',
        icon: 'heart',
        text: `تحدثنا عن "${data.lastConversation.topic}" — هل طبّقت النصائح؟`,
        priority: 80,
      });
    }
  }

  insights.sort((a, b) => b.priority - a.priority);
  return insights.slice(0, 4);
}

/** Generate coaching cards for the Dashboard (1-2 max) */
export function generateDashboardCoachingCards(data: UserProactiveData): ProactiveInsight[] {
  const cards: ProactiveInsight[] = [];

  // Consistency celebration
  if (data.streak >= 7) {
    const proto = data.activeProtocols[0];
    cards.push({
      id: 'consistency',
      icon: 'zap',
      text: proto
        ? `${data.streak} يوم التزام مع ${proto.peptide_id} — توقّع تحسّن ملحوظ في الأسبوع القادم`
        : `${data.streak} يوم متتالي — أداء ممتاز! الالتزام هو المفتاح`,
      priority: 80,
    });
  }

  // Protocol optimization
  for (const proto of data.activeProtocols) {
    if (proto.started_at) {
      const weeksIn = Math.floor(daysSince(proto.started_at) / 7);
      if (weeksIn >= 2 && weeksIn <= 4) {
        cards.push({
          id: `optimize-${proto.peptide_id}`,
          icon: 'lightbulb',
          text: `أنت في الأسبوع ${weeksIn} من ${proto.peptide_id} — اسأل المدرب الذكي عن تحسينات`,
          priority: 85,
          actionText: 'اسأل المدرب',
        });
      }
    }
  }

  // Stack suggestion for single-protocol users
  if (data.activeProtocols.length === 1) {
    const proto = data.activeProtocols[0];
    const stackSuggestions: Record<string, string> = {
      'bpc-157': 'أضف TB-500 لتعزيز التعافي — "المزيج الذهبي"',
      'tb-500': 'أضف BPC-157 للتعافي الموضعي — ستاك قوي جدًا',
      'cjc-1295': 'أضف Ipamorelin لتعزيز هرمون النمو طبيعيًا',
      'semaglutide': 'أضف BPC-157 لحماية الأمعاء أثناء Semaglutide',
    };
    const suggestion = stackSuggestions[proto.peptide_id];
    if (suggestion) {
      cards.push({
        id: 'stack-suggestion',
        icon: 'lightbulb',
        text: suggestion,
        priority: 75,
        actionText: 'استشر المدرب',
      });
    }
  }

  // Lab test reminder
  for (const proto of data.activeProtocols) {
    if (proto.started_at) {
      const weeksIn = Math.floor(daysSince(proto.started_at) / 7);
      if (weeksIn >= 4 && !data.hasLabResults) {
        cards.push({
          id: 'dashboard-lab-reminder',
          icon: 'microscope',
          text: `${weeksIn} أسابيع على ${proto.peptide_id} — حان وقت التحاليل لقياس النتائج`,
          priority: 90,
          actionText: 'دليل التحاليل',
        });
      }
    }
  }

  // Sleep/energy declining
  if (data.sleepTrend?.direction === 'down') {
    cards.push({
      id: 'dashboard-sleep',
      icon: 'alert-triangle',
      text: 'نومك انخفض مؤخرًا — المدرب الذكي عنده نصائح مخصصة لحالتك',
      priority: 92,
      actionText: 'استشر المدرب',
    });
  }

  // Missed dose reminder
  if (data.activeProtocols.length > 0 && !data.todayLogged && new Date().getHours() >= 14) {
    cards.push({
      id: 'dashboard-dose',
      icon: 'calendar',
      text: 'لم تسجّل جرعتك اليوم — لا تنسَ الالتزام بالبروتوكول',
      priority: 95,
      actionText: 'سجّل الآن',
    });
  }

  cards.sort((a, b) => b.priority - a.priority);
  return cards.slice(0, 2);
}

export function useProactiveCoach(userId: string | undefined) {
  const [smartStarters, setSmartStarters] = useState<SmartStarter[]>([]);
  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  const [dailyBriefing, setDailyBriefing] = useState<DailyBriefing | null>(null);
  const [dashboardCards, setDashboardCards] = useState<ProactiveInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- early-return guard
      setLoading(false);
      return;
    }

    let mounted = true;
    fetchProactiveData(userId)
      .then(data => {
        if (!mounted) return;
        setSmartStarters(generateSmartStarters(data));
        setInsights(generateInsights(data));
        setDailyBriefing(generateDailyBriefing(data));
        setDashboardCards(generateDashboardCoachingCards(data));
        setLoading(false);
      })
      .catch((e) => {
        logError('proactive coach failed:', e);
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [userId]);

  return { smartStarters, insights, dailyBriefing, dashboardCards, loading };
}
