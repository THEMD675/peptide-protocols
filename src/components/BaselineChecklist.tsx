import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Circle, FlaskConical, Syringe, TestTube, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { labTests } from '@/data/peptides';
import { type PeptidePublic as Peptide } from '@/data/peptides-public';

interface BaselineChecklistProps {
  peptide: Peptide;
  onAllChecked?: () => void;
}

export default function BaselineChecklist({ peptide, onAllChecked }: BaselineChecklistProps) {
  const relatedLabs = labTests.filter(lt => lt.relatedCategories.includes(peptide.category));

  const items = [
    { id: 'supplies', label: 'طلبت المستلزمات (قوارير + ماء + سيرنج)', icon: Syringe },
    { id: 'bloodwork', label: `تحاليل أساسية${relatedLabs.length > 0 ? `: ${relatedLabs.slice(0, 3).map(l => l.nameAr).join('، ')}` : ''}`, icon: TestTube },
    { id: 'guide', label: 'قرأت دليل الحقن والتحضير', icon: BookOpen },
  ];

  const storageKey = `pptides_baseline_${peptide.id}`;
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (next.size === items.length) onAllChecked?.();
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* expected */ }
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="h-4 w-4 text-amber-600" />
        <p className="text-sm font-bold text-amber-900 dark:text-amber-200">قبل بدء البروتوكول</p>
      </div>
      <div className="space-y-2">
        {items.map(item => {
          const done = checked.has(item.id);
          return (
            <button
              key={item.id}
              role="checkbox"
              aria-checked={done}
              onClick={() => toggle(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm transition-all',
                done ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800'
              )}
            >
              {done ? <CheckCircle className="h-4 w-4 text-emerald-700 shrink-0" /> : <Circle className="h-4 w-4 text-stone-300 shrink-0" />}
              <span className={cn('flex-1', done && 'line-through')}>{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/guide" className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline">دليل الحقن ←</Link>
        <Link to="/lab-guide" className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline">دليل التحاليل ←</Link>
        <Link to="/calculator" className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline">حاسبة الجرعات ←</Link>
      </div>
      <p className="mt-3 text-xs text-amber-700/70 dark:text-amber-400/60">هذه القائمة تعليمية ولا تغني عن استشارة طبيبك قبل بدء أي بروتوكول.</p>
    </div>
  );
}
