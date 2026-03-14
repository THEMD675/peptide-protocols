import { memo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useTheme } from '@/hooks/useTheme';

interface DosePoint {
  date: string;
  dose: number;
}

interface DoseTrendChartProps {
  data: DosePoint[];
  unit?: string;
}

export default memo(function DoseTrendChart({ data, unit = 'mcg' }: DoseTrendChartProps) {
  const { isDark } = useTheme();
  if (data.length < 2) return <p className="text-center text-xs text-stone-500 dark:text-stone-400 py-4">سجّل جرعتين على الأقل لعرض الرسم البياني</p>;

  const tickColor = isDark ? '#d6d3d1' : '#78716c';
  const gridColor = isDark ? '#44403c' : '#e7e5e4';
  const axisColor = isDark ? '#57534e' : '#d6d3d1';

  return (
    <div className="h-48 w-full" dir="ltr" role="img" aria-label={`مخطط اتجاه الجرعات — ${data.length} نقاط بيانات`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            reversed
            tick={{ fontSize: 11, fill: tickColor }}
            tickLine={false}
            axisLine={{ stroke: axisColor }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: tickColor }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: isDark ? '#1c1917' : '#fff',
              border: `1px solid ${isDark ? '#57534e' : '#e7e5e4'}`,
              borderRadius: '12px',
              fontSize: '12px',
              direction: 'rtl',
              color: isDark ? '#e7e5e4' : '#1c1917',
            }}
            formatter={(value: number) => [`${value} ${unit}`, 'الجرعة']}
            labelFormatter={(label) => `${label}`}
          />
          <Line
            type="monotone"
            dataKey="dose"
            stroke={isDark ? '#34d399' : '#10b981'}
            strokeWidth={2}
            dot={{ r: 3, fill: isDark ? '#34d399' : '#10b981' }}
            activeDot={{ r: 5, fill: isDark ? '#6ee7b7' : '#059669' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
