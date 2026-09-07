import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { botAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Spinner from './Spinner';

const fmtUSD = (n) => `$${Number(n || 0).toFixed(2)}`;

function NakamuraLogo({ size = 36, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="ng" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path d="M4 8C4 5.79 5.79 4 8 4h24c2.21 0 4 1.79 4 4v20c0 2.21-1.79 4-4 4h-6l-4 6-4-6H8c-2.21 0-4-1.79-4-4V8z"
        fill="url(#ng)" filter={active ? 'url(#glow)' : 'none'} opacity={active ? 1 : 0.65}/>
      <text x="13" y="25" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="15" fill="white">K</text>
      {active && <circle cx="30" cy="8" r="3" fill="#10B981"><animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite"/></circle>}
    </svg>
  );
}

function TradeRow({ trade }) {
  const isBuy = trade.type === 'buy';
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${isBuy ? 'bg-green/15' : 'bg-rose/15'}`}>
        {isBuy ? <TrendingUp size={10} className="text-green"/> : <TrendingDown size={10} className="text-rose"/>}
      </div>
      <span className="text-[11px] text-muted flex-1">{isBuy ? 'Compra' : 'Venta'} {trade.coinSymbol}</span>
      <span className={`text-[11px] font-bold ${isBuy ? 'text-rose' : 'text-green'}`}>
        {isBuy ? '-' : '+'}{fmtUSD(trade.usdAmount)} USD
      </span>
    </div>
  );
}

// Contador que va de $0 a dailyEarning entre activatedAt y cycleEndsAt
function useDailyCounter(activatedAt, cycleEndsAt, dailyEarning) {
  const [earned, setEarned] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (!activatedAt || !cycleEndsAt || !dailyEarning) { setEarned(0); return; }

    const tick = () => {
      const start    = new Date(activatedAt).getTime();
      const end      = new Date(cycleEndsAt).getTime();
      const cycleMs  = end - start;
      const elapsed  = Date.now() - start;
      const pct      = Math.min(elapsed / cycleMs, 1);
      setEarned(parseFloat((dailyEarning * pct).toFixed(2)));
    };

    tick();
    timer.current = setInterval(tick, 15000); // actualiza cada 15s
    return () => clearInterval(timer.current);
  }, [activatedAt, cycleEndsAt, dailyEarning]);

  return earned;
}

export default function NakamuraWidget({ compact = false }) {
  const { user, refreshUser } = useAuth();
  const [status, setStatus]     = useState(null);
  const [trades, setTrades]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toggling, setToggling] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const hasVip       = (user?.vipLevel || 0) > 0;
  const dailyEarning = status?.planDailyEarning || 0;
  // El contador solo corre mientras el bot está activo
  // Cuando completa, botActivatedAt se limpia → muestra total fijo
  const counterBase  = status?.botEnabled && status?.botActivatedAt ? status.botActivatedAt : null;
  const earned       = useDailyCounter(counterBase, status?.botCycleEndsAt, dailyEarning);

  const load = async () => {
    try {
      const [stRes, trRes] = await Promise.all([
        botAPI.status(),
        api.get('/crypto/trades'),
      ]);
      setStatus(stRes.data.data);
      const botTrades = (trRes.data.data || [])
        .filter(t => t.notes === 'Nakamura Bot')
        .slice(0, 4);
      setTrades(botTrades);
    } catch {
      try { const s = await botAPI.status(); setStatus(s.data.data); } catch {}
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const { data } = await botAPI.toggle();
      toast.success(data.message);
      await load();
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar estado del bot.');
    } finally {
      setToggling(false);
    }
  };

  const isActive  = status?.botEnabled;
  const canUse    = hasVip && status?.canReactivate !== false && !isActive;
  const showStats = (isActive || status?.botLastRun) && dailyEarning > 0;

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'linear-gradient(135deg,rgba(168,85,247,0.08) 0%,rgba(99,102,241,0.06) 50%,rgba(6,182,212,0.06) 100%)',
        border: isActive ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(168,85,247,0.2)',
        boxShadow: isActive ? '0 0 24px rgba(168,85,247,0.15)' : 'none',
      }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative flex-shrink-0">
          <NakamuraLogo size={36} active={isActive}/>
          {isActive && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green border-2 border-[#0d0d1a] animate-pulse"/>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-white font-black text-sm">Nakamura Bot</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-green/20 text-green' : 'bg-white/10 text-faint'}`}>
              {isActive ? '● ACTIVO' : '○ OFF'}
            </span>
          </div>
          {isActive
            ? <p className="text-[11px] text-purple-300">Operando · completa: {status?.botCycleEndsAt ? new Date(status.botCycleEndsAt).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '...'}</p>
            : status?.botLastRun
              ? <p className="text-[11px] text-faint">Completado · reactiva para el siguiente ciclo</p>
              : <p className="text-[11px] text-faint">Trading automático con IA</p>
          }
        </div>

        <div className="flex items-center gap-2">
          {!loading && (
            isActive ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-purple-300"
                style={{ background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.3)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse"/>
                Operando
              </div>
            ) : canUse ? (
              <button onClick={handleToggle} disabled={toggling} title="Activar"
                className="relative w-11 h-6 rounded-full transition-all duration-300 disabled:opacity-50 bg-white/10 border border-white/20">
                {toggling
                  ? <span className="absolute inset-0 flex items-center justify-center"><Spinner size="sm"/></span>
                  : <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow bg-muted"/>}
              </button>
            ) : null
          )}
          {compact && (
            <button onClick={() => setExpanded(e => !e)} className="text-faint hover:text-white p-1">
              {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
          )}
        </div>
      </div>

      {/* Cuerpo */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">

          {/* Dos tarjetas de stats */}
          {showStats && (
            <div className="grid grid-cols-2 gap-3">
              {/* Ganancia por ciclo — fija */}
              <div className="rounded-xl p-3" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-faint text-[11px] mb-1">Ganancia por ciclo</p>
                <p className="text-white font-black text-base">{fmtUSD(dailyEarning)} USD</p>
              </div>

              {/* Ganado hoy:
                  - Bot activo → contador en tiempo real (sube de $0 al total)
                  - Bot completado → muestra el total fijo acreditado */}
              <div className="rounded-xl p-3" style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)' }}>
                <p className="text-faint text-[11px] mb-1">Ganado hoy</p>
                <p className="text-green font-black text-base">
                  {isActive ? fmtUSD(earned) : fmtUSD(dailyEarning)} USD
                </p>
                {!isActive && status?.botLastRun && (
                  <p className="text-faint text-[10px] mt-0.5">✓ Acreditado</p>
                )}
              </div>
            </div>
          )}

          {/* Operaciones recientes */}
          {trades.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
                <Zap size={10} className="text-purple-400"/>
                <p className="text-[10px] text-purple-300 font-bold uppercase tracking-wide">Últimas operaciones</p>
              </div>
              <div className="px-3 py-1">
                {trades.map(t => <TradeRow key={t._id} trade={t}/>)}
              </div>
            </div>
          )}

          {/* Sin VIP */}
          {!hasVip && (
            <div className="rounded-xl p-3 flex items-center gap-2"
              style={{ background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.2)' }}>
              <NakamuraLogo size={24} active={false}/>
              <div>
                <p className="text-white text-xs font-bold">Activa VIP para usar Nakamura</p>
                <p className="text-faint text-[10px]">El bot opera solo para miembros VIP</p>
              </div>
            </div>
          )}

          {isActive && trades.length === 0 && (
            <p className="text-center text-faint text-xs py-1">Nakamura está procesando tus operaciones...</p>
          )}
        </div>
      )}
    </div>
  );
}
