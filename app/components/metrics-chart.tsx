// app/components/metrics-chart.tsx
'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function MetricsChart({ data }: { data: any[] }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Pequeno delay para garantir que o layout pai já calculou o tamanho
    const timer = setTimeout(() => setIsClient(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-[300px] bg-gray-800/50 rounded-xl border border-gray-700 text-gray-500 text-sm">
      Sem dados para exibir
    </div>
  );

  return (
    <div className="w-full bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg flex flex-col h-[300px]">
      <h3 className="text-gray-400 text-sm font-bold mb-4">📊 Volume de Mensagens</h3>
      
      {/* IMPORTANTE: style={{ height: '100%', minHeight: '200px' }} 
         Isso garante que a div tenha tamanho físico antes do Recharts tentar medir.
      */}
      <div className="flex-1 w-full min-h-0 relative" style={{ minHeight: '200px' }}>
        {isClient ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => value ? value.slice(0, 5) : ''} 
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                allowDecimals={false}
                width={30}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                cursor={{ fill: '#374151', opacity: 0.4 }}
              />
              <Bar 
                dataKey="count" 
                fill="#10B981" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs animate-pulse">
            Carregando gráfico...
          </div>
        )}
      </div>
    </div>
  );
}