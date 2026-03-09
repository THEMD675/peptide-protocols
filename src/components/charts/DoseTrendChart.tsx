import { memo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DosePoint {
  date: string;
  dose: number;
}

interface DoseTrendChartProps {
  data: DosePoint[];
  unit?: string;
}

export default memo(function DoseTrendChart({ data, unit = 'mcg' }: DoseTrendChartProps) {
  if (data.length < 2) return null;

  return (
    <div className="h-48 w-full" dir="ltr" role="img" aria-label={`مخطط اتجاه الجرعات — ${data.length} نقاط بيانات`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#78716c' }}
            tickLine={false}
            axisLine={{ stroke: '#d6d3d1' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#78716c' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid #e7e5e4',
              borderRadius: '12px',
              fontSize: '12px',
              direction: 'rtl',
            }}
            formatter={(value: number) => [`${value} ${unit}`, 'الجرعة']}
            labelFormatter={(label) => `${label}`}
          />
          <Line
            type="monotone"
            dataKey="dose"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3, fill: '#10b981' }}
            activeDot={{ r: 5, fill: '#059669' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
