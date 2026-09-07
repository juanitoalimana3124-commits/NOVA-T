import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crown, TrendingUp, Users, ArrowUpRight, ArrowDownLeft, Wallet, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, vipAPI } from '../../api/axios';
import { getMarkets, fmtUSD } from '../../api/crypto';
import Spinner from '../../components/ui/Spinner';
import NakamuraWidget from '../../components/ui/NakamuraWidget';

const fmtRD = (n) => `RD$ ${Number(n || 0).toLocaleString('es-DO')}`;

const TX_INFO = {
  deposit:             { label: 'Depósito',   color: 'text-green', sign: '+' },
  withdrawal:          { label: 'Retiro',      color: 'text-rose',  sign: '-' },
  task_reward:         { label: 'Tarea',       color: 'text-cyan',  sign: '+' },
  vip_purchase:        { label: 'Plan VIP',    color: 'text-gold',  sign: '-' },
  roulette_win:        { label: 'Ruleta',      color: 'text-cyan',  sign: '+' },
  referral_commission: { label: 'Referido',    color: 'text-green', sign: '+' },
  admin_credit:        { label: 'Crédito',     color: 'text-green', sign: '+' },
  admin_debit:         { label: 'Débito',      color: 'text-rose',  sign: '-' },
};

export default function HomePage() {
  const { user, refreshUser } = useAuth();
  const [vipStatus, setVipStatus] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [topCoins, setTopCoins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [vipRes, txRes, coins] = await Promise.all([
          vipAPI.getStatus(),
          userAPI.getTransactions({ limit: 4 }),
          getMarkets(['bitcoin','ethereum','solana','binancecoin']),
        ]);
        setVipStatus(vipRes.data.data);
        setTransactions(txRes.data.data || []);
        setTopCoins(coins);
      } catch {}
      setLoading(false);
    };
    load();
    refreshUser();
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  const totalUSD = user?.usdBalance || 0;
  const cryptoValue = Object.entries(user?.cryptoHoldings || {}).reduce((acc, [id, amt]) => {
    const coin = topCoins.find(c => c.id === id);
    return acc + (coin ? coin.current_price * amt : 0);
  }, 0);

  return (
    <div className="animate-fade-in">
      {/* Hero glow */}
      <div className="hero-glow px-4 pt-5 pb-4">
        {/* Greeting */}
        <p className="text-muted text-sm">Bienvenido de vuelta 👋</p>
        <h1 className="text-2xl font-black text-white mt-0.5 mb-5">{user?.name}</h1>

        {/* Balance principal */}
        <div className="card p-5 relative overflow-hidden" style={{background:'linear-gradient(135deg,#1f1200 0%,#1A1A2E 100%)'}}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gold/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={14} className="text-muted" />
              <p className="text-muted text-xs font-medium">Capital disponible para operar</p>
            </div>
            <p className="text-4xl font-black text-white mb-1">{fmtUSD(totalUSD)}</p>
            {cryptoValue > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-cyan text-sm font-semibold">📈 Portafolio crypto: {fmtUSD(cryptoValue)}</span>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <Link to="/vip" className="btn-primary flex-1 text-center py-2.5 text-sm font-black">
                + Agregar fondos
              </Link>
              <Link to="/operar" className="flex-1 text-center py-2.5 text-sm font-black rounded-xl transition-all active:scale-95"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#A78BFA' }}>
                ⚡ Operar
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Nakamura Bot Widget */}
        <NakamuraWidget compact={true} />

        {/* USD Banner si tiene */}
        {totalUSD > 0 && (
          <Link to="/mercado" className="flex items-center gap-3 p-4 rounded-2xl border border-cyan/25 bg-cyan/5 hover:bg-cyan/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-cyan/15 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={18} className="text-cyan" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">{fmtUSD(totalUSD)} disponibles para trading</p>
              <p className="text-muted text-xs">Compra crypto y multiplica tus ganancias</p>
            </div>
            <ChevronRight size={16} className="text-cyan" />
          </Link>
        )}

        {/* Acciones rápidas */}
        <div>
          <h2 className="text-white font-bold mb-3">Acciones rápidas</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link to="/mercado" className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-cyan/25 bg-cyan/5 hover:bg-cyan/10 hover:scale-105 transition-all">
              <TrendingUp size={22} className="text-cyan" />
              <span className="text-xs text-white font-semibold">Mercado</span>
            </Link>
            <Link to="/vip" className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-gold/25 bg-gold/5 hover:bg-gold/10 hover:scale-105 transition-all">
              <Crown size={22} className="text-gold" />
              <span className="text-xs text-white font-semibold">VIP</span>
            </Link>
            <Link to="/referidos" className="flex flex-col items-center gap-2 py-4 rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/10 hover:scale-105 transition-all">
              <Users size={22} className="text-primary" />
              <span className="text-xs text-white font-semibold">Referidos</span>
            </Link>
          </div>
        </div>

        {/* VIP Status */}
        {vipStatus?.isActive ? (
          <div className="card p-4 border-gold/20" style={{background:'linear-gradient(135deg,#1a1500 0%,#1A1A2E 100%)'}}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gold/15 flex items-center justify-center">
                <Crown size={20} className="text-gold" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">{vipStatus.currentPlan?.name} activo</p>
                <p className="text-muted text-xs">Membresía de trading activada</p>
              </div>
              <Link to="/mercado" className="btn-primary text-xs px-3 py-1.5">
                Operar →
              </Link>
            </div>
          </div>
        ) : (
          <Link to="/vip" className="card p-4 flex items-center gap-3 border-gold/20 hover:border-gold/40 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center">
              <Crown size={20} className="text-gold" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Activa una membresía VIP</p>
              <p className="text-muted text-xs">Recibe USD para operar en el mercado</p>
            </div>
            <ChevronRight size={16} className="text-gold" />
          </Link>
        )}

        {/* Mini mercado crypto */}
        {topCoins.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold">Mercado actual</h2>
              <Link to="/mercado" className="text-primary text-xs font-semibold">Ver todo →</Link>
            </div>
            <div className="card divide-y divide-border">
              {topCoins.map(coin => {
                const pct = coin.price_change_percentage_24h || 0;
                const isUp = pct >= 0;
                return (
                  <Link key={coin.id} to="/mercado"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors">
                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{coin.symbol.toUpperCase()}</p>
                      <p className="text-faint text-xs">{coin.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold text-sm">{fmtUSD(coin.current_price)}</p>
                      <p className={`text-xs font-bold ${isUp ? 'text-green' : 'text-rose'}`}>
                        {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Movimientos recientes */}
        {transactions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold">Movimientos</h2>
              <Link to="/perfil" className="text-primary text-xs font-semibold">Ver todos →</Link>
            </div>
            <div className="card divide-y divide-border">
              {transactions.map(tx => {
                const info = TX_INFO[tx.type] || { label: tx.type, color: 'text-muted', sign: '' };
                return (
                  <div key={tx._id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${info.sign === '+' ? 'bg-green/10' : 'bg-rose/10'}`}>
                      {info.sign === '+' ? <ArrowDownLeft size={16} className="text-green" /> : <ArrowUpRight size={16} className="text-rose" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{info.label}</p>
                      <p className="text-faint text-xs">{new Date(tx.createdAt).toLocaleDateString('es-DO', { day:'2-digit', month:'short' })}</p>
                    </div>
                    <p className={`font-bold text-sm ${info.color}`}>
                      {info.sign}{fmtUSD(Math.abs(tx.amount))}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="h-2" />
      </div>
    </div>
  );
}
