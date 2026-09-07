import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/axios';
import Spinner from '../../components/ui/Spinner';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

// Simple bar chart component
function MiniChart({ data, valueKey, labelKey, color = '#7C3AED', label }) {
  if (!data?.length) return <p className="text-faint text-sm text-center py-8">Sin datos</p>;

  const maxVal = Math.max(...data.map(d => d[valueKey] || 0));

  return (
    <div>
      {label && <p className="text-muted text-sm font-medium mb-3">{label}</p>}
      <div className="flex items-end gap-1 h-24">
        {data.map((item, i) => {
          const height = maxVal > 0 ? ((item[valueKey] || 0) / maxVal) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className="w-full rounded-t-sm transition-all duration-300 relative"
                style={{ height: `${Math.max(height, 4)}%`, backgroundColor: color, opacity: 0.8 }}
                title={`${item[labelKey]}: ${item[valueKey]}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-faint text-[10px]">{data[0]?.[labelKey]?.slice(5)}</span>
        <span className="text-faint text-[10px]">{data[data.length - 1]?.[labelKey]?.slice(5)}</span>
      </div>
    </div>
  );
}

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getStats().then(({ data }) => {
      setStats(data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Estadísticas</h1>
        <p className="text-muted text-sm">Últimos 30 días</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <MiniChart data={stats?.userGrowth} valueKey="count" labelKey="_id"
            color="#7C3AED" label="Nuevos usuarios por día" />
        </div>
        <div className="card p-4">
          <MiniChart data={stats?.depositTrend} valueKey="total" labelKey="_id"
            color="#10B981" label="Depósitos aprobados por día (RD$)" />
        </div>
        <div className="card p-4">
          <MiniChart data={stats?.withdrawalTrend} valueKey="total" labelKey="_id"
            color="#F43F5E" label="Retiros completados por día (RD$)" />
        </div>
        <div className="card p-4">
          <MiniChart data={stats?.userGrowth} valueKey="count" labelKey="_id"
            color="#F97316" label="Actividad de usuarios por día" />
        </div>
      </div>

      {/* Resumen depósitos/retiros */}
      <div className="card p-4">
        <p className="text-white font-bold mb-3">Resumen financiero (30 días)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-faint text-xs">Total depósitos</p>
            <p className="text-green font-black text-xl">
              {fmt(stats.depositTrend?.reduce((s, d) => s + (d.total || 0), 0))}
            </p>
          </div>
          <div>
            <p className="text-faint text-xs">Total retiros</p>
            <p className="text-rose font-black text-xl">
              {fmt(stats.withdrawalTrend?.reduce((s, d) => s + (d.total || 0), 0))}
            </p>
          </div>
          <div>
            <p className="text-faint text-xs">Nuevos usuarios</p>
            <p className="text-cyan font-black text-xl">
              {stats.userGrowth?.reduce((s, d) => s + (d.count || 0), 0) || 0}
            </p>
          </div>
          <div>
            <p className="text-faint text-xs">Días con depósitos</p>
            <p className="text-primary font-black text-xl">
              {stats.depositTrend?.length || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
