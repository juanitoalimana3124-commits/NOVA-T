import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Search, X, Lock } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { getMarkets, getChartData, fmtUSD, fmtPct, TOP_COINS } from '../../api/crypto';
import { useAuth } from '../../context/AuthContext';
import api, { adminAPI } from '../../api/axios';
import { useManualPrices } from '../../hooks/useManualPrices';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

const RANGES = [
  { label: '1H', days: 0.042 },
  { label: '1D', days: 1 },
  { label: '1S', days: 7 },
  { label: '1M', days: 30 },
];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs border-primary/30">
      <p className="text-white font-semibold">{fmtUSD(payload[0].payload.price)}</p>
      <p className="text-muted">
        {new Date(payload[0].payload.time).toLocaleString('es', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })}
      </p>
    </div>
  );
}

function TradeModal({ coin, price, type, holding, onClose, onSuccess }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const isBuy = type === 'buy';
  const symbol = coin?.symbol?.toUpperCase();
  const usdAmount = parseFloat(amount) || 0;
  const cryptoAmount = usdAmount / price;
  const maxBuy = user?.usdBalance || 0;
  const maxSell = (holding || 0) * price;

  const handleTrade = async () => {
    if (!usdAmount || usdAmount <= 0) return toast.error('Ingresa un monto válido');
    if (isBuy && usdAmount > maxBuy) return toast.error('Saldo USD insuficiente');
    if (!isBuy && usdAmount > maxSell) return toast.error('No tienes suficiente ' + symbol);
    setLoading(true);
    try {
      await api.post('/crypto/trade', {
        type, coinId: coin.id, coinSymbol: symbol,
        usdAmount, cryptoAmount, pricePerUnit: price,
      });
      toast.success(isBuy ? `Compraste ${symbol}` : `Vendiste ${symbol}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al procesar');
    } finally {
      setLoading(false);
    }
  };

  const quickPct = (pct) => {
    const max = isBuy ? maxBuy : maxSell;
    setAmount(((max * pct) / 100).toFixed(2));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md card-glass p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src={coin?.image} alt={coin?.name} className="w-9 h-9 rounded-full" />
            <div>
              <p className="text-white font-bold">{symbol}</p>
              <p className="text-muted text-xs">{fmtUSD(price)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${isBuy ? 'text-green bg-green/10' : 'text-rose bg-rose/10'}`}>
              {isBuy ? '▲ COMPRAR' : '▼ VENDER'}
            </span>
            <button onClick={onClose} className="text-muted hover:text-white"><X size={18} /></button>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>Monto USD</span>
            <span>Disponible: {fmtUSD(isBuy ? maxBuy : maxSell)}</span>
          </div>
          <div className="input-field flex items-center gap-2">
            <span className="text-muted">$</span>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" className="flex-1 bg-transparent outline-none text-white"
            />
            <span className="text-faint text-xs">USD</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {[25, 50, 75, 100].map(p => (
            <button key={p} onClick={() => quickPct(p)}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border hover:border-primary text-muted hover:text-primary transition-all">
              {p}%
            </button>
          ))}
        </div>

        {usdAmount > 0 && (
          <div className="bg-surface rounded-xl p-3 mb-4 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted">Recibirás</span>
              <span className="text-white font-semibold">
                {isBuy ? `${cryptoAmount.toFixed(6)} ${symbol}` : fmtUSD(usdAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Pagarás</span>
              <span className="text-white font-semibold">
                {isBuy ? fmtUSD(usdAmount) : `${cryptoAmount.toFixed(6)} ${symbol}`}
              </span>
            </div>
          </div>
        )}

        <button onClick={handleTrade} disabled={loading || !usdAmount}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
            isBuy
              ? 'bg-green text-white hover:opacity-90 active:scale-95'
              : 'bg-rose text-white hover:opacity-90 active:scale-95'
          } disabled:opacity-40 disabled:cursor-not-allowed`}>
          {loading ? 'Procesando...' : (isBuy ? `Comprar ${symbol}` : `Vender ${symbol}`)}
        </button>
      </div>
    </div>
  );
}

function CoinDetail({ coin, holding, onTrade, onBack, mktStatus, livePrice, isManual }) {
  const { marketOpen, buyOpen, sellOpen } = mktStatus || {};
  const displayPrice = livePrice ?? coin.current_price;
  const [chartData, setChartData] = useState([]);
  const [range, setRange] = useState(RANGES[1]);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    setLoadingChart(true);
    getChartData(coin.id, range.days).then(d => { setChartData(d); setLoadingChart(false); });
  }, [coin.id, range.days]);

  const pct = coin.price_change_percentage_24h || 0;
  const isUp = pct >= 0;
  const color = isUp ? '#10B981' : '#F43F5E';

  return (
    <div className="animate-fade-in pb-nav">
      <div className="flex items-center gap-3 px-4 py-4">
        <button onClick={onBack} className="text-muted hover:text-white text-2xl leading-none">←</button>
        <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <p className="text-white font-bold">{coin.name}</p>
          <p className="text-faint text-xs">{coin.symbol.toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-black text-xl">{fmtUSD(displayPrice)}</p>
          {isManual
            ? <p className="text-primary text-xs font-bold">⚡ Precio manual</p>
            : <p className={`text-sm font-bold ${isUp ? 'text-green' : 'text-rose'}`}>{fmtPct(pct)}</p>
          }
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="card p-4">
          <div className="flex gap-1 mb-4">
            {RANGES.map(r => (
              <button key={r.label} onClick={() => setRange(r)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  range.label === r.label ? 'bg-primary text-white' : 'text-faint hover:text-muted'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
          {loadingChart ? (
            <div className="h-40 flex items-center justify-center"><Spinner /></div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="coingrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2}
                  fill="url(#coingrad)" dot={false} activeDot={{ r: 4, fill: color }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {holding > 0 && (
        <div className="px-4 mb-4">
          <div className="card p-4 border-cyan/20">
            <p className="text-muted text-xs mb-1">Tu posición</p>
            <div className="flex justify-between items-center">
              <p className="text-white font-bold">{holding.toFixed(6)} {coin.symbol.toUpperCase()}</p>
              <p className="text-cyan font-semibold">{fmtUSD(holding * coin.current_price)}</p>
            </div>
          </div>
        </div>
      )}

      {!marketOpen ? (
        <div className="px-4 mb-4">
          <div className="rounded-2xl p-4 flex items-center gap-3 border border-rose/30"
            style={{ background: 'rgba(225,29,72,0.08)' }}>
            <Lock size={18} className="text-rose flex-shrink-0" />
            <p className="text-muted text-sm">Mercado cerrado temporalmente. No se pueden realizar operaciones.</p>
          </div>
        </div>
      ) : (
        <div className="px-4 flex gap-3 mb-4">
          <button onClick={() => onTrade('buy')} disabled={!buyOpen}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-green text-white hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            ▲ {buyOpen ? 'Comprar' : 'Compras cerradas'}
          </button>
          <button onClick={() => onTrade('sell')} disabled={!holding || !sellOpen}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-rose text-white hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            ▼ {sellOpen ? 'Vender' : 'Ventas cerradas'}
          </button>
        </div>
      )}

      <div className="px-4">
        <div className="card p-4 grid grid-cols-2 gap-4">
          {[
            { label: 'Capitalización', value: `$${(coin.market_cap / 1e9).toFixed(2)}B` },
            { label: 'Volumen 24h',    value: `$${(coin.total_volume / 1e6).toFixed(0)}M` },
            { label: 'Máximo 24h',     value: fmtUSD(coin.high_24h) },
            { label: 'Mínimo 24h',     value: fmtUSD(coin.low_24h) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-faint text-xs">{label}</p>
              <p className="text-white font-semibold text-sm">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MarketPage() {
  const { user, refreshUser } = useAuth();
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [tradeType, setTradeType] = useState(null);
  const [tab, setTab] = useState('market');
  const [mktStatus, setMktStatus] = useState({ marketOpen: true, buyOpen: true, sellOpen: true });
  const { resolvePrice, manualPrices } = useManualPrices();

  useEffect(() => {
    adminAPI.getMarketStatus().then(({ data }) => setMktStatus(data));
  }, []);

  const loadCoins = useCallback(async () => {
    try {
      const data = await getMarkets(TOP_COINS);
      setCoins(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCoins();
    const id = setInterval(loadCoins, 30000);
    return () => clearInterval(id);
  }, [loadCoins]);

  const holdings = user?.cryptoHoldings || {};
  const portfolio = coins.filter(c => (holdings[c.id] || 0) > 0);
  const portfolioValue = portfolio.reduce(
    (acc, c) => acc + (holdings[c.id] || 0) * c.current_price, 0
  );

  const filtered = coins.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.symbol.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return (
      <>
        <CoinDetail
          coin={selected}
          holding={holdings[selected.id] || 0}
          onBack={() => setSelected(null)}
          onTrade={(type) => setTradeType(type)}
          mktStatus={mktStatus}
          livePrice={resolvePrice(selected.id, selected.current_price)}
          isManual={manualPrices[selected.id] !== undefined}
        />
        {tradeType && (
          <TradeModal
            coin={selected}
            price={selected.current_price}
            type={tradeType}
            holding={holdings[selected.id] || 0}
            onClose={() => setTradeType(null)}
            onSuccess={() => { refreshUser(); loadCoins(); }}
          />
        )}
      </>
    );
  }

  return (
    <div className="page">
      <div>
        <h1 className="text-2xl font-black text-white">Mercado</h1>
        <p className="text-muted text-sm">Crypto en tiempo real · actualiza cada 30s</p>
      </div>

      <div className="card p-4 flex items-center gap-3 border-cyan/20"
        style={{ background: 'linear-gradient(135deg,#001a20 0%,#16163A 100%)' }}>
        <div className="w-10 h-10 rounded-xl bg-cyan/15 flex items-center justify-center">
          <DollarSign size={18} className="text-cyan" />
        </div>
        <div className="flex-1">
          <p className="text-muted text-xs">Disponible para trading</p>
          <p className="text-white font-black text-xl">{fmtUSD(user?.usdBalance || 0)}</p>
        </div>
        {portfolioValue > 0 && (
          <div className="text-right">
            <p className="text-faint text-xs">En crypto</p>
            <p className="text-cyan font-bold text-sm">{fmtUSD(portfolioValue)}</p>
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-surface rounded-xl p-1">
        {['market', 'portfolio'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              tab === t ? 'bg-primary text-white' : 'text-faint hover:text-muted'
            }`}>
            {t === 'market' ? 'Mercado' : 'Mi Portafolio'}
          </button>
        ))}
      </div>

      {tab === 'market' && (
        <>
          <div className="input-field flex items-center gap-2">
            <Search size={16} className="text-faint flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar moneda..."
              className="flex-1 bg-transparent outline-none text-white text-sm" />
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Spinner size="lg" /></div>
          ) : (
            <div className="card divide-y divide-border">
              {filtered.map(coin => {
                const pct = coin.price_change_percentage_24h || 0;
                const isUp = pct >= 0;
                return (
                  <button key={coin.id} onClick={() => setSelected(coin)}
                    className="flex items-center gap-3 px-4 py-3 w-full hover:bg-surface transition-colors text-left">
                    <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white font-bold text-sm">{coin.symbol.toUpperCase()}</p>
                        {(holdings[coin.id] || 0) > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
                        )}
                      </div>
                      <p className="text-faint text-xs truncate">{coin.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold text-sm">{fmtUSD(coin.current_price)}</p>
                      <p className={`text-xs font-bold ${isUp ? 'text-green' : 'text-rose'}`}>
                        {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'portfolio' && (
        <>
          {portfolio.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-white font-semibold mb-1">Portafolio vacío</p>
              <p className="text-muted text-sm">Compra tu primera moneda en la pestaña Mercado</p>
            </div>
          ) : (
            <>
              <div className="card p-4 border-primary/20"
                style={{ background: 'linear-gradient(135deg,#130a30 0%,#16163A 100%)' }}>
                <p className="text-muted text-xs mb-1">Valor total del portafolio</p>
                <p className="text-white font-black text-2xl">{fmtUSD(portfolioValue)}</p>
              </div>
              <div className="card divide-y divide-border">
                {portfolio.map(coin => {
                  const held = holdings[coin.id];
                  const value = held * coin.current_price;
                  const pct = coin.price_change_percentage_24h || 0;
                  const isUp = pct >= 0;
                  return (
                    <button key={coin.id} onClick={() => setSelected(coin)}
                      className="flex items-center gap-3 px-4 py-3 w-full hover:bg-surface transition-colors text-left">
                      <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <p className="text-white font-bold text-sm">{coin.symbol.toUpperCase()}</p>
                        <p className="text-faint text-xs">{held.toFixed(6)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold text-sm">{fmtUSD(value)}</p>
                        <p className={`text-xs font-bold ${isUp ? 'text-green' : 'text-rose'}`}>
                          {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
