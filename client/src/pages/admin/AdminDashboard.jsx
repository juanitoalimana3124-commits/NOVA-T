import { useState, useEffect } from 'react';
import { Users, ArrowDownToLine, ArrowUpFromLine, Crown, TrendingUp, BarChart2, Bot, Play } from 'lucide-react';
import { adminAPI } from '../../api/axios';
import Spinner from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState({ marketOpen: true, buyOpen: true, sellOpen: true });
  const [toggling, setToggling] = useState({});
  const [botGlobal, setBotGlobal] = useState(true);
  const [botToggling, setBotToggling] = useState(false);
  const [botRunning, setBotRunning] = useState(false);
  const [botPlans, setBotPlans] = useState([]);
  const [planInputs, setPlanInputs] = useState({});
  const [savingPlan, setSavingPlan] = useState({});

  useEffect(() => {
    adminAPI.getDashboard()
      .then(({ data: res }) => setData(res.data))
      .catch(() => toast.error('Error al cargar el dashboard'))
      .finally(() => setLoading(false));
    adminAPI.getMarketStatus()
      .then(({ data }) => setControls({ marketOpen: data.marketOpen, buyOpen: data.buyOpen, sellOpen: data.sellOpen }))
      .catch(() => {});
    adminAPI.getBotPlans().then(({ data }) => {
      setBotPlans(data.data || []);
      const inputs = {};
      (data.data || []).forEach(p => { inputs[p.level] = p.botDailyEarning || 0; });
      setPlanInputs(inputs);
    }).catch(() => {});
  }, []);

  const toggleBot = async () => {
    setBotToggling(true);
    try {
      const newVal = !botGlobal;
      await adminAPI.setBotGlobal(newVal);
      setBotGlobal(newVal);
      toast.success(`Nakamura Bot: ${newVal ? 'Activado ✓' : 'Desactivado ✓'}`);
    } catch {
      toast.error('Error al cambiar estado del bot');
    } finally {
      setBotToggling(false);
    }
  };

  const forceRunBot = async () => {
    setBotRunning(true);
    try {
      await adminAPI.runBot();
      toast.success('Ciclo de Nakamura iniciado ✓');
    } catch {
      toast.error('Error al ejecutar el bot');
    } finally {
      setBotRunning(false);
    }
  };

  const savePlanEarning = async (level) => {
    setSavingPlan(s => ({ ...s, [level]: true }));
    try {
      await adminAPI.setPlanEarning(level, planInputs[level]);
      toast.success(`Ganancia del plan VIP ${level} actualizada ✓`);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSavingPlan(s => ({ ...s, [level]: false }));
    }
  };

  const toggle = async (key, label) => {
    setToggling(t => ({ ...t, [key]: true }));
    try {
      const newVal = !controls[key];
      await adminAPI.setMarketStatus(key, newVal);
      setControls(c => ({ ...c, [key]: newVal }));
      toast.success(`${label}: ${newVal ? 'Activado ✓' : 'Desactivado ✓'}`);
    } catch {
      toast.error('Error al cambiar estado');
    } finally {
      setToggling(t => ({ ...t, [key]: false }));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return <div className="text-center py-20 text-muted">No se pudo cargar el dashboard. Recarga la página.</div>;

  const { overview } = data;
  const vipActivos = (data.vipStats || []).filter(v => v._id > 0).reduce((s, v) => s + v.count, 0);

  const statCards = [
    { label: 'Total usuarios',    value: overview.totalUsers,        icon: Users,           color: 'text-cyan',    bg: 'bg-cyan/10'    },
    { label: 'Usuarios activos',  value: overview.activeUsers,       icon: Users,           color: 'text-green',   bg: 'bg-green/10'   },
    { label: 'Nuevos hoy',        value: overview.newUsersToday,     icon: TrendingUp,      color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Depóst. pendientes',value: overview.pendingDeposits,   icon: ArrowDownToLine, color: 'text-gold',    bg: 'bg-gold/10'    },
    { label: 'Retiros pendientes',value: overview.pendingWithdrawals, icon: ArrowUpFromLine, color: 'text-rose',    bg: 'bg-rose/10'    },
    { label: 'Miembros VIP',      value: vipActivos,                 icon: Crown,           color: 'text-gold',    bg: 'bg-gold/10'    },
  ];

  const txTypeLabels = {
    deposit: 'Depósito', withdrawal: 'Retiro', task_reward: 'Tarea',
    vip_purchase: 'Plan VIP', roulette_win: 'Ruleta',
    referral_commission: 'Comisión', admin_credit: 'Crédito Admin', admin_debit: 'Débito Admin'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-muted text-sm">Resumen general de la plataforma</p>
      </div>

      {/* Control de Mercado */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 size={16} className="text-primary" />
          <p className="text-white font-bold text-sm">Control de operaciones</p>
        </div>
        {[
          { key: 'marketOpen', label: 'Mercado general', desc: 'Activa o desactiva todas las operaciones' },
          { key: 'buyOpen',    label: 'Compras',         desc: 'Permite o bloquea que los usuarios compren crypto' },
          { key: 'sellOpen',   label: 'Ventas',          desc: 'Permite o bloquea que los usuarios vendan crypto' },
        ].map(({ key, label, desc }) => {
          const isOn = controls[key];
          return (
            <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all
              ${isOn ? 'border-green/25 bg-green/5' : 'border-rose/25 bg-rose/5'}`}>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-faint text-xs">{desc}</p>
              </div>
              <span className={`text-xs font-bold mr-2 ${isOn ? 'text-green' : 'text-rose'}`}>
                {isOn ? 'ON' : 'OFF'}
              </span>
              <button
                onClick={() => toggle(key, label)}
                disabled={!!toggling[key]}
                className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none disabled:opacity-50
                  ${isOn ? 'bg-green' : 'bg-surface border border-border'}`}>
                <span className={`absolute top-1 w-5 h-5 rounded-full shadow transition-all duration-300
                  ${isOn ? 'left-8 bg-white' : 'left-1 bg-muted'}`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Control Nakamura Bot */}
      <div className="card p-4 space-y-3"
        style={{
          background: botGlobal
            ? 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(99,102,241,0.06) 100%)'
            : undefined,
          border: botGlobal ? '1px solid rgba(168,85,247,0.3)' : undefined,
        }}>
        <div className="flex items-center gap-2 mb-1">
          <Bot size={16} className={botGlobal ? 'text-purple-400' : 'text-muted'} />
          <p className="text-white font-bold text-sm">Nakamura Bot — Control global</p>
          <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full
            ${botGlobal ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-faint'}`}>
            {botGlobal ? '● ACTIVO' : '○ OFF'}
          </span>
        </div>
        <p className="text-faint text-xs">Controla el bot de trading automático para todos los usuarios VIP.</p>
        <div className="flex gap-3">
          <div className={`flex-1 flex items-center justify-between p-3 rounded-xl border transition-all
            ${botGlobal ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/10 bg-white/3'}`}>
            <div>
              <p className="text-white text-sm font-semibold">Estado global</p>
              <p className="text-faint text-xs">Los usuarios VIP pueden activar su bot</p>
            </div>
            <button
              onClick={toggleBot}
              disabled={botToggling}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 disabled:opacity-50
                ${botGlobal ? '' : 'bg-surface border border-border'}`}
              style={botGlobal ? { background: 'linear-gradient(90deg,#A855F7,#6366F1)' } : {}}>
              <span className={`absolute top-1 w-5 h-5 rounded-full shadow transition-all duration-300
                ${botGlobal ? 'left-8 bg-white' : 'left-1 bg-muted'}`} />
            </button>
          </div>
          <button
            onClick={forceRunBot}
            disabled={botRunning || !botGlobal}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40
              border border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
            {botRunning ? <Spinner size="sm" /> : <Play size={14} />}
            Ejecutar ahora
          </button>
        </div>

        {/* Ganancias por plan */}
        {botPlans.length > 0 && (
          <div>
            <p className="text-faint text-xs mb-2 font-semibold uppercase tracking-wide">Ganancia diaria del bot por plan (USD fijo)</p>
            <div className="space-y-2">
              {botPlans.map(plan => (
                <div key={plan.level} className="flex items-center gap-3 p-2 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-white text-sm font-bold w-24 flex-shrink-0">{plan.name}</span>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-faint text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={planInputs[plan.level] ?? 0}
                      onChange={e => setPlanInputs(p => ({ ...p, [plan.level]: e.target.value }))}
                      className="flex-1 bg-transparent text-white text-sm font-bold outline-none border-b border-white/20 pb-0.5 w-20"
                    />
                    <span className="text-faint text-xs">USD/día</span>
                  </div>
                  <button
                    onClick={() => savePlanEarning(plan.level)}
                    disabled={savingPlan[plan.level]}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all disabled:opacity-40
                      bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30">
                    {savingPlan[plan.level] ? '...' : 'Guardar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, link }) => (
          <div key={label} className="card p-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-muted text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Financial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-muted text-xs mb-1 uppercase tracking-wider">Total depositado</p>
          <p className="text-2xl font-black text-green">{fmt(overview.totalDeposited)}</p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs mb-1 uppercase tracking-wider">Total retirado</p>
          <p className="text-2xl font-black text-rose">{fmt(overview.totalWithdrawn)}</p>
        </div>
      </div>

      {/* VIP Distribution */}
      {data.vipStats?.length > 0 && (
        <div className="card p-4">
          <h2 className="text-white font-bold mb-3">Distribución VIP</h2>
          <div className="flex flex-wrap gap-2">
            {data.vipStats.map(({ _id: level, count }) => (
              <div key={level} className="bg-card rounded-xl px-3 py-2 text-center min-w-[60px]">
                <p className="text-white font-bold">{count}</p>
                <p className="text-faint text-xs">{level === 0 ? 'Sin VIP' : `VIP ${level}`}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-white font-bold">Movimientos recientes</h2>
        </div>
        <div className="divide-y divide-border">
          {data.recentTransactions?.map((tx) => (
            <div key={tx._id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-medium truncate">
                    {tx.user?.name || 'Usuario desconocido'}
                  </p>
                  <span className="badge bg-border text-faint text-[10px]">
                    {txTypeLabels[tx.type] || tx.type}
                  </span>
                </div>
                <p className="text-faint text-xs">{new Date(tx.createdAt).toLocaleString('es-DO')}</p>
              </div>
              <p className={`font-bold text-sm flex-shrink-0 ${tx.amount >= 0 ? 'text-green' : 'text-rose'}`}>
                {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
