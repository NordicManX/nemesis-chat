// app/components/metrics-chart.tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function MetricsChart({ data }: { data: any[] }) {
  return (
    <div className="h-[300px] w-full bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg">
      <h3 className="text-gray-400 text-sm font-bold mb-4">📊 Volume de Mensagens (Últimos 7 dias)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#9CA3AF" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
          />
          <YAxis 
            stroke="#9CA3AF" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
            cursor={{ fill: '#374151', opacity: 0.4 }}
          />
          <Bar 
            dataKey="count" 
            fill="#10B981" 
            radius={[4, 4, 0, 0]} 
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}