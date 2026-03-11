import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ProactiveInsight {
  id: string;
  icon: 'trending-up' | 'alert-triangle' | 'lightbulb' | 'target' | 'microscope';
  text: string;
  priority: number; // higher = show first
}

export interface SmartStarter {
  text: string;
  priority: number;
}

interface UserProactiveData {
  lastInjectionDaysAgo: number | null;
  recentPeptides: string[];
  recentSideEffects: { symptom: string; peptide_id: string | null }[];
  hasLabResults: boolean;
  labHighlights: { test_id: string; value: number; unit: string }[];
  wellnessTrend: { metric: string; direction: 'up' | 'down' | 'stable'; change: number } | null;
  activeProtocols: { peptide_id: string; cycle_weeks: number; started_at: string; status: string }[];
  accountAgeDays: number;
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

async function fetchProactiveData(userId: string): Promise<UserProactiveData> {
  const [injRes, sideRes, labRes, wellRes, protoRes, userRes] = await Promise.all([
    supabase.from('injection_logs').select('peptide_name, logged_at').eq('user_id', userId).order('logged_at', { ascending: false }).limit(5),
    supabase.from('side_effect_logs').select('symptom, peptide_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    supabase.from('lab_results').select('test_id, value, unit, tested_at').eq('user_id', userId).order('tested_at', { ascending: false }).limit(5),
    supabase.from('wellness_logs').select('energy, sleep, pain, mood, logged_at').eq('user_id', userId).order('logged_at', { ascending: false }).limit(10),
    supabase.from('user_protocols').select('peptide_id, cycle_weeks, started_at, status').eq('user_id', userId).order('started_at', { ascending: false }).limit(5),
    supabase.auth.getUser(),
  ]);

  const injLogs = injRes.data ?? [];
  const sideLogs = sideRes.data ?? [];
  const labLogs = labRes.data ?? [];
  const wellLogs = wellRes.data ?? [];
  const protos = protoRes.data ?? [];
  const createdAt = userRes.data?.user?.created_at;

  // Injection recency
  const lastInjectionDaysAgo = injLogs.length > 0 ? daysSince(injLogs[0].logged_at) : null;
  const recentPeptides = [...new Set(injLogs.map(l => l.peptide_name))];

  // Side effects
  const recentSideEffects = sideLogs.map(s => ({ symptom: s.symptom, peptide_id: s.peptide_id }));

  // Lab results
  const hasLabResults = labLogs.length > 0;
  const labHighlights = labLogs.map(l => ({ test_id: l.test_id, value: l.value, unit: l.unit ?? '' }));

  // Wellness trend (compare last 3 vs previous 3)
  let wellnessTrend: UserProactiveData['wellnessTrend'] = null;
  if (wellLogs.length >= 4) {
    const recent = wellLogs.slice(0, 3);
    const older = wellLogs.slice(3, 6);
    if (older.length > 0) {
      const avgRecent = recent.reduce((s, w) => s + (w.energy ?? 3), 0) / recent.length;
      const avgOlder = older.reduce((s, w) => s + (w.energy ?? 3), 0) / older.length;
      const change = Math.round(((avgRecent - avgOlder) / avgOlder) * 100);
      if (Math.abs(change) > 10) {
        wellnessTrend = {
          metric: 'energy',
          direction: change > 0 ? 'up' : 'down',
          change: Math.abs(change),
        };
      }
    }
  }

  // Active protocols
  const activeProtocols = protos.filter(p => p.status === 'active');

  // Account age
  const accountAgeDays = createdAt ? daysSince(createdAt) : 999;

  return {
    lastInjectionDaysAgo,
    recentPeptides,
    recentSideEffects,
    hasLabResults,
    labHighlights,
    wellnessTrend,
    activeProtocols,
    accountAgeDays,
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
    starters.push({ text: `كيف حالك مع بروتوكول ${proto.peptide_id}؟ خلّني أراجع تقدّمك`, priority: 90 });
  }

  // Logged side effects recently
  if (data.recentSideEffects.length > 0) {
    const se = data.recentSideEffects[0];
    starters.push({ text: `شفت أنك سجّلت ${se.symptom} — خلّني أساعدك`, priority: 95 });
  }

  // Has lab results
  if (data.hasLabResults) {
    starters.push({ text: 'نتائج تحاليلك جاهزة — تبي أحللها لك؟', priority: 85 });
  }

  // No injection logs for 3+ days
  if (data.lastInjectionDaysAgo !== null && data.lastInjectionDaysAgo >= 3) {
    starters.push({ text: 'وين اختفيت؟ تبي نراجع بروتوكولك؟', priority: 88 });
  }

  // Has recent injection logs → offer review
  if (data.recentPeptides.length > 0 && (data.lastInjectionDaysAgo ?? 999) < 3) {
    starters.push({ text: `عندك ${data.recentPeptides.length} ببتيدات في سجلّك — تبي أراجع نتائجك؟`, priority: 70 });
  }

  // Wellness improving
  if (data.wellnessTrend?.direction === 'up') {
    starters.push({ text: `طاقتك تحسّنت ${data.wellnessTrend.change}% — تبي تعرف ليش؟`, priority: 75 });
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

  // No recent injection logs (3+ days)
  if (data.lastInjectionDaysAgo !== null && data.lastInjectionDaysAgo >= 3 && data.activeProtocols.length > 0) {
    insights.push({
      id: 'missing-logs',
      icon: 'alert-triangle',
      text: `تنبيه: لم تسجّل حقنتك منذ ${data.lastInjectionDaysAgo} أيام — الالتزام مهم للنتائج`,
      priority: 100,
    });
  }

  // Lab results with notable values
  if (data.labHighlights.length > 0) {
    const igf = data.labHighlights.find(l => l.test_id.toLowerCase().includes('igf'));
    if (igf && igf.value < 150) {
      insights.push({
        id: 'low-igf',
        icon: 'lightbulb',
        text: 'اقتراح: بما أن IGF-1 عندك منخفض، جرّب CJC-1295 + Ipamorelin',
        priority: 85,
      });
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

  insights.sort((a, b) => b.priority - a.priority);
  return insights.slice(0, 3);
}

export function useProactiveCoach(userId: string | undefined) {
  const [smartStarters, setSmartStarters] = useState<SmartStarter[]>([]);
  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    fetchProactiveData(userId)
      .then(data => {
        if (!mounted) return;
        setSmartStarters(generateSmartStarters(data));
        setInsights(generateInsights(data));
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [userId]);

  return { smartStarters, insights, loading };
}
