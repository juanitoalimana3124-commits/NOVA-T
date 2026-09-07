import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getMarkets, fmtUSD, fmtPct } from '../../api/crypto';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/ui/Spinner';

export default function PortfolioPage() {
  const { user } = useAuth();
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);

  const holdings = user?.cryptoHoldings || {};
  const heldIds = Object.keys(holdings).filter(id => holdings[id] > 0);

  useEffect(() => {
    if (heldIds.length === 0) { setLoading(false); return; }
    getMarkets(heldIds).then(setCoins).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const totalCrypto = coins.reduce((acc, c) => acc + (c.current_price * (holdings[c.id] || 0)), 0);
  const totalBalance = (user?.usdBalance || 0) + totalCrypto;

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-white">Mi Portfolio</h1>

      {/* Total */}
      <div className="cb-card p-6">
        <p className="text-muted text-sm mb-1">Valor total</p>
        <p className="text-4xl font-black text-white">{fmtUSD(totalBalance)}</p>
        <div className="mt-4 flex gap-6">
          <div>
            <p className="text-muted text-xs">Saldo USD</p>
            <p className="text-white font-bold">{fmtUSD(user?.usdBalance || 0)}</p>
          </div>
          <div>
            <p className="text-muted text-xs">En crypto</p>
            <p className="text-white font-bold">{fmtUSD(totalCrypto)}</p>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div>
        <h2 className="text-white font-bold mb-3">Mis activos</h2>
        {heldIds.length === 0 ? (
          <div className="cb-card p-8 text-center">
            <p className="text-muted mb-4">No tienes cryptos aún</p>
            <Link to="/mercado" className="cb-btn-primary inline-block">Comprar crypto</Link>
          </div>
        ) : (
          <div className="cb-card divide-y divide-border">
            {coins.map(coin => {
              const amount = holdings[coin.id] || 0;
              const value = amount * coin.current_price;
              const pct = coin.price_change_percentage_24h;
              const isUp = pct >= 0;
              const alloc = totalCrypto > 0 ? (value / totalCrypto * 100).toFixed(1) : 0;
              return (
                <Link key={coin.id} to={`/crypto/${coin.id}`}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-surface transition-colors">
                  <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{coin.name}</p>
                    <p className="text-muted text-xs">{amount.toFixed(6)} {coin.symbol.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">{fmtUSD(value)}</p>
                    <p className={`text-xs font-semibold ${isUp ? 'text-green' : 'text-red'}`}>{fmtPct(pct)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
