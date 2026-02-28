import { memo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface ActivityData {
  day: string;
  count: number;
  isToday: boolean;
}

interface ActivityChartProps {
  data: ActivityData[];
}

export default memo(function ActivityChart({ data }: ActivityChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="h-32 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: '#78716c' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid #e7e5e4',
              borderRadius: '12px',
              fontSize: '12px',
              direction: 'rtl',
            }}
            formatter={(value: number) => [`${value} حقنة`, 'العدد']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={24}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isToday ? '#10b981' : entry.count > 0 ? '#6ee7b7' : '#e7e5e4'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
