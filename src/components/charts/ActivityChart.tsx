import { memo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useTheme } from '@/hooks/useTheme';

interface ActivityData {
  day: string;
  count: number;
  isToday: boolean;
}

interface ActivityChartProps {
  data: ActivityData[];
}

export default memo(function ActivityChart({ data }: ActivityChartProps) {
  const { isDark } = useTheme();
  if (data.length === 0) return <p className="text-center text-xs text-stone-500 dark:text-stone-400 py-4">لا توجد بيانات نشاط بعد</p>;

  const tickColor = isDark ? '#d6d3d1' : '#78716c';
  const emptyBarColor = isDark ? '#44403c' : '#e7e5e4';

  return (
    <div className="h-32 w-full" dir="ltr" role="img" aria-label="مخطط النشاط الأسبوعي">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="day"
            reversed
            tick={{ fontSize: 10, fill: tickColor }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: isDark ? '#1c1917' : '#fff',
              border: `1px solid ${isDark ? '#57534e' : '#e7e5e4'}`,
              borderRadius: '12px',
              fontSize: '12px',
              direction: 'rtl',
              color: isDark ? '#e7e5e4' : '#1c1917',
            }}
            formatter={(value: number) => [`${value} حقنة`, 'العدد']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={24}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isToday ? (isDark ? '#34d399' : '#10b981') : entry.count > 0 ? (isDark ? '#6ee7b7' : '#6ee7b7') : emptyBarColor}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
