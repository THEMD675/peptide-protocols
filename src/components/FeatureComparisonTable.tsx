import { Check, X, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PEPTIDE_COUNT } from '@/lib/constants';

interface FeatureRow {
  feature: string;
  free: string | boolean;
  essentials: string | boolean;
  elite: string | boolean;
}

const FEATURES: FeatureRow[] = [
  { feature: 'المكتبة', free: '6 ببتيدات فقط', essentials: `${PEPTIDE_COUNT} ببتيد كاملة`, elite: `${PEPTIDE_COUNT} ببتيد كاملة` },
  { feature: 'المدرب الذكي (AI Coach)', free: false, essentials: '5 رسائل/يوم', elite: 'بلا حدود' },
  { feature: 'حاسبة الجرعات', free: true, essentials: true, elite: true },
  { feature: 'سجل الحقن والتتبّع', free: false, essentials: true, elite: true },
  { feature: 'المقالات والمدوّنة', free: true, essentials: true, elite: true },
  { feature: 'البروتوكولات المُجمَّعة', free: false, essentials: true, elite: true },
  { feature: 'دليل التحاليل المخبرية', free: false, essentials: true, elite: true },
  { feature: 'بروتوكولات مخصّصة', free: false, essentials: false, elite: true },
  { feature: 'دعم مخصّص عبر البريد', free: false, essentials: false, elite: true },
];

function CellContent({ value }: { value: string | boolean }) {
  if (typeof value === 'string') {
    return <span className="text-xs font-medium text-stone-700 dark:text-stone-200">{value}</span>;
  }
  return value ? (
    <Check className="mx-auto h-5 w-5 text-emerald-500" />
  ) : (
    <X className="mx-auto h-5 w-5 text-stone-300 dark:text-stone-300" />
  );
}

export default function FeatureComparisonTable() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <div className="mb-4 text-center">
        <span className="inline-block rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-4 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          قارن الخطط
        </span>
      </div>
      <h2 className="mb-4 text-center text-3xl font-bold text-stone-900 dark:text-stone-100 md:text-4xl">
        ماذا تحصل في <span className="text-emerald-700">كل خطة؟</span>
      </h2>
      <p className="mx-auto mb-10 max-w-xl text-center text-stone-600 dark:text-stone-300">
        اختر الخطة المناسبة لاحتياجاتك — وابدأ بتجربة مجانية
      </p>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-600/60 bg-white dark:bg-stone-950 shadow-lg dark:shadow-stone-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-900">
              <th className="px-5 py-4 text-start font-semibold text-stone-700 dark:text-stone-200 min-w-[140px]">الميزة</th>
              <th className="px-4 py-4 text-center font-semibold text-stone-500 dark:text-stone-300 min-w-[100px]">
                مجاني
              </th>
              <th className="px-4 py-4 text-center font-semibold text-stone-700 dark:text-stone-200 min-w-[120px]">
                <span className="block">الأساسية</span>
                <span className="text-xs font-normal text-stone-500 dark:text-stone-300">Essentials</span>
              </th>
              <th className="px-4 py-4 text-center min-w-[120px]">
                <div className="flex items-center justify-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                  <Crown className="h-4 w-4" />
                  <span>المتقدّمة</span>
                </div>
                <span className="text-xs font-normal text-emerald-500">Elite</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((row, i) => (
              <tr
                key={row.feature}
                className={cn(
                  'border-b border-stone-100 dark:border-stone-800 last:border-b-0 transition-colors',
                  i % 2 === 0 ? 'bg-white dark:bg-stone-950' : 'bg-stone-50/50 dark:bg-stone-900/30'
                )}
              >
                <td className="px-5 py-3.5 font-medium text-stone-800 dark:text-stone-200">{row.feature}</td>
                <td className="px-4 py-3.5 text-center"><CellContent value={row.free} /></td>
                <td className="px-4 py-3.5 text-center"><CellContent value={row.essentials} /></td>
                <td className="px-4 py-3.5 text-center bg-emerald-50/30 dark:bg-emerald-900/10"><CellContent value={row.elite} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
