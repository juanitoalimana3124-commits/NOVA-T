import { useState, useEffect } from 'react';
import { Bot, Power, TrendingUp, DollarSign, Clock, ShieldCheck, Zap, Lock, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { botAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/ui/Spinner';

const DAILY_RATE = { 1: 1.5, 2: 2.0, 3: 2.8, 4: 3.5 };

const fmtUSD = (n) => `$${Number(n || 0).toFixed(2)} USD`;

export default function BotPage() {
  const { user, refreshUser } = useAuth();
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const hasVip    = (user?.vipLevel || 0) > 0;
  const hasFunds  = (user?.usdBalance || 0) > 0;
  const canUseBot = hasVip && hasFunds;
  const rate      = DAILY_RATE[user?.vipLevel] || 0;
  const dailyEst  = parseFloat(((user?.usdBalance || 0) * rate / 100).toFixed(2));
  const monthlyEst= parseFloat((dailyEst * 30).toFixed(2));

  const loadStatus = async () => {
    try {
      const { data } = await botAPI.status();
      setStatus(data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadStatus(); }, []);

  const handleToggle = async () => {
    if (!canUseBot) return;
    setToggling(true);
    try {
      const { data } = await botAPI.toggle();
      toast.success(data.message);
      await loadStatus();
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar estado del bot.');
    } finally {
      setToggling(false);
    }
  };

  const isActive = status?.botEnabled;

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="px-4 py-4 space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', border: `1px solid ${isActive ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.4)'}` }}>
          <Bot size={24} className={isActive ? 'text-green' : 'text-primary'} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Nakamura Bot</h1>
          <p className="text-muted text-sm">Trading automático 24/7 con IA</p>
        </div>
      </div>

      {/* Estado del bot */}
      <div className="card p-5 text-center relative overflow-hidden"
        style={{ background: isActive
          ? 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.06) 100%)'
          : 'linear-gradient(135deg, rgba(30,27,75,0.8) 0%, rgba(17,24,39,0.8) 100%)',
          border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.2)'}` }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: isActive ? '#10B981' : '#6366f1', transform: 'translate(30%, -30%)' }} />

        {/* Indicador pulsante */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green animate-pulse' : 'bg-faint'}`} />
          <span className={`text-sm font-bold ${isActive ? 'text-green' : 'text-faint'}`}>
            {isActive ? 'ACTIVO — Operando ahora' : 'INACTIVO'}
          </span>
        </div>

        <p className="text-white text-xs mb-4 text-muted">
          {isActive
            ? 'Nakamura está operando con tu capital automáticamente cada 24 horas.'
            : 'Activa Nakamura y deja que opere por ti mientras duermes.'}
        </p>

        {/* Botón toggle */}
        {isActive ? (
          <div className="w-full py-3.5 rounded-xl flex flex-col items-center gap-1 border border-purple-500/40"
            style={{ background: 'rgba(168,85,247,0.1)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
              <span className="text-purple-300 font-black text-sm">Nakamura está operando</span>
            </div>
            <p className="text-faint text-xs">Se completará automáticamente al generar tus ganancias</p>
          </div>
        ) : canUseBot ? (
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 border border-green/40 text-green hover:bg-green/10"
            style={{ background: 'rgba(16,185,129,0.1)' }}
          >
            {toggling ? <Spinner size="sm" /> : <><Power size={16} /> Activar Nakamura Bot</>}
          </button>
        ) : (
          <div className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 bg-card border border-border text-faint text-sm">
            <Lock size={15} />
            {!hasVip ? 'Requiere plan VIP activo' : 'Espera 24h para reactivar'}
          </div>
        )}
      </div>

      {/* Bloqueo si no tiene VIP */}
      {!hasVip && (
        <div className="card p-4 flex items-center gap-3 border-gold/20">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
            <Crown size={18} className="text-gold" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Activa un plan VIP para usar Nakamura</p>
            <p className="text-muted text-xs">El bot solo opera para miembros VIP activos.</p>
          </div>
        </div>
      )}

      {/* Proyección de ganancias */}
      {canUseBot && (
        <div>
          <h2 className="text-white font-bold mb-3">Proyección con tu capital actual</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Retorno diario',    value: `${rate}%`,          icon: Zap,        color: 'text-cyan'    },
              { label: 'Capital operando',  value: fmtUSD(user?.usdBalance), icon: DollarSign, color: 'text-white'   },
              { label: 'Ganancia diaria',   value: fmtUSD(dailyEst),    icon: TrendingUp, color: 'text-green'   },
              { label: 'Ganancia mensual',  value: fmtUSD(monthlyEst),  icon: TrendingUp, color: 'text-gold'    },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className={color} />
                  <p className="text-faint text-xs">{label}</p>
                </div>
                <p className={`font-black text-base ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <p className="text-faint text-[10px] text-center mt-2">* Proyección estimada. Resultados reales pueden variar.</p>
        </div>
      )}

      {/* Última ejecución */}
      {status?.botLastRun && (
        <div className="card p-4 flex items-center gap-3">
          <Clock size={16} className="text-muted flex-shrink-0" />
          <div>
            <p className="text-white text-sm font-semibold">Última operación</p>
            <p className="text-muted text-xs">{new Date(status.botLastRun).toLocaleString('es-DO')}</p>
          </div>
          {status.botTotalEarned > 0 && (
            <div className="ml-auto text-right">
              <p className="text-faint text-xs">Total ganado</p>
              <p className="text-green font-black text-sm">{fmtUSD(status.botTotalEarned)}</p>
            </div>
          )}
        </div>
      )}

      {/* Cómo funciona */}
      <div className="card p-4 space-y-3">
        <h2 className="text-white font-bold flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" /> ¿Cómo funciona Nakamura?
        </h2>
        {[
          { step: '01', text: 'Nakamura analiza el mercado crypto en tiempo real cada 24 horas.' },
          { step: '02', text: 'Ejecuta operaciones de compra y venta automáticamente con tu capital.' },
          { step: '03', text: `Genera un retorno del ${rate || '1.5–3.5'}% diario según tu nivel VIP.` },
          { step: '04', text: 'Las ganancias se acreditan directamente en tu saldo USD.' },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-start gap-3">
            <span className="text-xs font-black text-primary bg-primary/15 px-2 py-1 rounded-lg flex-shrink-0">{step}</span>
            <p className="text-muted text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
