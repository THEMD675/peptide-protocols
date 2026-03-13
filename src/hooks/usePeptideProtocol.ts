import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { peptides as fullPeptides } from '@/data/peptides';

export interface PeptideProtocol {
  dosage_ar: string;
  timing_ar: string;
  cycle_ar: string;
  administration_ar: string;
  side_effects_ar: string;
  contraindications_ar: string;
  stack_ar: string;
  storage_ar: string;
  mechanism_ar: string;
  evidence_ar: string;
  dose_mcg: number | null;
  dose_max_mcg: number | null;
  frequency: string | null;
  cycle_duration_weeks: number | null;
  rest_period_weeks: number | null;
  route: string | null;
  weekly_schedule: { week: number; doseMcg: number }[] | null;
  pubmed_ids: string[] | null;
  cost_estimate: string | null;
  difficulty: string | null;
  warning_ar: string | null;
}

interface UsePeptideProtocolResult {
  protocol: PeptideProtocol | null;
  loading: boolean;
  error: string | null;
}

export function usePeptideProtocol(peptideId: string | undefined, isFree: boolean): UsePeptideProtocolResult {
  const { subscription } = useAuth();
  const [protocol, setProtocol] = useState<PeptideProtocol | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!peptideId) return;

    if (isFree) {
      const full = fullPeptides.find(p => p.id === peptideId);
      if (full) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync init from static data
        setProtocol({
          dosage_ar: full.dosageAr,
          timing_ar: full.timingAr,
          cycle_ar: full.cycleAr,
          administration_ar: full.administrationAr,
          side_effects_ar: full.sideEffectsAr,
          contraindications_ar: full.contraindicationsAr,
          stack_ar: full.stackAr,
          storage_ar: full.storageAr,
          mechanism_ar: full.mechanismAr,
          evidence_ar: full.evidenceAr,
          dose_mcg: full.doseMcg ?? null,
          dose_max_mcg: full.doseMaxMcg ?? null,
          frequency: full.frequency ?? null,
          cycle_duration_weeks: full.cycleDurationWeeks ?? null,
          rest_period_weeks: full.restPeriodWeeks ?? null,
          route: full.route ?? null,
          weekly_schedule: full.weeklySchedule ?? null,
          pubmed_ids: full.pubmedIds ?? null,
          cost_estimate: full.costEstimate ?? null,
          difficulty: full.difficulty ?? null,
          warning_ar: full.warningAr ?? null,
        });
      }
      return;
    }

    if (!subscription?.isProOrTrial) {
      setProtocol(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    supabase.rpc('get_peptide_protocol', { p_peptide_id: peptideId })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          console.error('get_peptide_protocol error:', rpcError);
          setError('تعذّر تحميل البروتوكول — حاول مرة أخرى');
          setProtocol(null);
        } else {
          setProtocol(data as PeptideProtocol);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [peptideId, isFree, subscription?.isProOrTrial]);

  return { protocol, loading, error };
}
