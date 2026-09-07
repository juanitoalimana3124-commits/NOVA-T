import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, X, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import NakamuraWidget from '../../components/ui/NakamuraWidget';
import { getMarkets, getOHLCData, fmtUSD, fmtPct, TOP_COINS } from '../../api/crypto';
import CandlestickChart from '../../components/ui/CandlestickChart';
import { useAuth } from '../../context/AuthContext';
import api, { adminAPI } from '../../api/axios';
import { useManualPrices } from '../../hooks/useManualPrices';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';

const RANGES = [
  { label: '1H', days: 0.042 },
  { label: '1D', days: 1 },
  { label: '1S', days: 7 },
  { label: '1M', days: 30 },
];


export default function TradePage() {
  const { user, refreshUser } = useAuth();
  const { resolvePrice, manualPrices } = useManualPrices();
  const [coins, setCoins]           = useState([]);
  const [selected, setSelected]     = useState(null);
  const [chartData, setChartData]   = useState([]);
  const [range, setRange]           = useState(RANGES[1]);
  const [loading, setLoading]       = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [chartMode, setChartMode]   = useState('candles'); // 'candles' | 'area'
  const [showPicker, setShowPicker] = useState(false);
  const [tradeType, setTradeType]   = useState(null); // 'buy' | 'sell'
  const [amount, setAmount]         = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [mktStatus, setMktStatus] = useState({ marketOpen: true, buyOpen: true, sellOpen: true });

  const loadCoins = useCallback(async () => {
    try {
      const data = await getMarkets(TOP_COINS);
      setCoins(data);
      setSelected(prev => prev ? (data.find(c => c.id === prev.id) || prev) : data[0]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCoins();
    const id = setInterval(loadCoins, 30000);
    return () => clearInterval(id);
  }, [loadCoins]);

  useEffect(() => {
    adminAPI.getMarketStatus().then(({ data }) => setMktStatus(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingChart(true);
    setChartData([]);
    getOHLCData(selected.id, range.days === 0.042 ? 1 : range.days)
      .then(d => setChartData(d))
      .finally(() => setLoadingChart(false));
  }, [selected?.id, range.days]);

  const holdings = user?.cryptoHoldings || {};
  const holding  = selected ? (holdings[selected.id] || 0) : 0;
  const pct      = selected?.price_change_percentage_24h || 0;
  const isUp     = pct >= 0;
  const color    = isUp ? '#10B981' : '#F43F5E';
  const maxBuy   = user?.usdBalance || 0;
  const livePrice = selected ? resolvePrice(selected.id, selected.current_price) : 0;
  const isManual  = selected ? manualPrices[selected.id] !== undefined : false;
  const maxSell  = holding * livePrice;

  const quickPct = (p) => {
    const max = tradeType === 'buy' ? maxBuy : maxSell;
    setAmount(((max * p) / 100).toFixed(2));
  };

  const handleTrade = async () => {
    const usdAmt = parseFloat(amount);
    if (!usdAmt || usdAmt <= 0) return toast.error('Ingresa un monto válido');
    if (tradeType === 'buy'  && usdAmt > maxBuy)  return toast.error('Saldo USD insuficiente');
    if (tradeType === 'sell' && usdAmt > maxSell) return toast.error(`No tienes suficiente ${selected.symbol.toUpperCase()}`);
    setTradeLoading(true);
    try {
      const cryptoAmt = parseFloat((usdAmt / livePrice).toFixed(8));
      await api.post('/crypto/trade', {
        type: tradeType,
        coinId: selected.id,
        coinSymbol: selected.symbol.toUpperCase(),
        usdAmount: usdAmt,
        cryptoAmount: cryptoAmt,
        pricePerUnit: livePrice,
      });
      toast.success(tradeType === 'buy'
        ? `Compraste ${selected.symbol.toUpperCase()}`
        : `Vendiste ${selected.symbol.toUpperCase()}`);
      setAmount('');
      setTradeType(null);
      refreshUser();
      loadCoins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al procesar');
    } finally {
      setTradeLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="flex flex-col h-full animate-fade-in pb-nav">

      {/* Top bar: moneda + precio */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Selector de moneda */}
        <button onClick={() => setShowPicker(true)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border bg-surface hover:border-primary/40 transition-all">
          {selected && <img src={selected.image} alt={selected.name} className="w-7 h-7 rounded-full" />}
          <div className="text-left">
            <p className="text-white font-black text-sm leading-none">{selected?.symbol?.toUpperCase()}</p>
            <p className="text-faint text-[10px]">{selected?.name}</p>
          </div>
          <ChevronDown size={14} className="text-muted" />
        </button>

        {/* Precio + cambio */}
        <div className="text-right">
          <p className="text-white font-black text-xl leading-none">{fmtUSD(livePrice)}</p>
          <p className={`text-sm font-bold mt-0.5 ${isUp ? 'text-green' : 'text-rose'}`}>
            {isUp ? <span className="inline">▲</span> : <span className="inline">▼</span>} {fmtPct(pct)}
          </p>
        </div>

        {/* Balance USD */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan/10 border border-cyan/20">
          <DollarSign size={13} className="text-cyan" />
          <div>
            <p className="text-[10px] text-faint leading-none">Disponible</p>
            <p className="text-cyan font-bold text-sm leading-none mt-0.5">{fmtUSD(maxBuy)}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pt-3">
        {/* Range selector + modo */}
        <div className="flex gap-1 mb-3">
          {RANGES.map(r => (
            <button key={r.label} onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                range.label === r.label ? 'bg-primary text-white' : 'text-faint hover:text-white bg-surface'
              }`}>
              {r.label}
            </button>
          ))}
          <button onClick={() => { if (!selected) return; setLoadingChart(true); getOHLCData(selected.id, range.days === 0.042 ? 1 : range.days).then(d => setChartData(d)).finally(() => setLoadingChart(false)); }}
            className="p-1.5 text-faint hover:text-primary transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Chart */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {loadingChart ? (
            <div className="h-48 flex items-center justify-center"><Spinner /></div>
          ) : (
            <CandlestickChart data={chartData} height={250} livePrice={livePrice} />
          )}
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { label: 'Máx 24h', value: fmtUSD(selected?.high_24h) },
            { label: 'Mín 24h', value: fmtUSD(selected?.low_24h) },
            { label: 'Vol 24h',  value: `$${((selected?.total_volume || 0) / 1e6).toFixed(0)}M` },
            { label: 'Cap',     value: `$${((selected?.market_cap || 0) / 1e9).toFixed(1)}B` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-faint text-[10px]">{label}</p>
              <p className="text-white text-xs font-bold mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Posición actual */}
      {holding > 0 && (
        <div className="px-4 mt-3">
          <div className="rounded-xl p-3 flex items-center gap-3 border border-cyan/20 bg-cyan/5">
            <TrendingUp size={15} className="text-cyan" />
            <div className="flex-1">
              <p className="text-faint text-[11px]">Tu posición en {selected?.symbol?.toUpperCase()}</p>
              <p className="text-white font-bold text-sm">{holding.toFixed(6)} = {fmtUSD(holding * livePrice)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Panel de operación */}
      <div className="px-4 mt-3">
        {!mktStatus.marketOpen ? (
          <div className="rounded-2xl p-5 flex flex-col items-center gap-3 text-center border border-rose/30"
            style={{ background: 'rgba(225,29,72,0.08)' }}>
            <div className="w-12 h-12 rounded-full bg-rose/15 flex items-center justify-center">
              <Lock size={22} className="text-rose" />
            </div>
            <p className="text-white font-black text-base">Mercado cerrado</p>
            <p className="text-muted text-sm">Las operaciones están suspendidas temporalmente. Vuelve más tarde.</p>
          </div>
        ) : !tradeType ? (
          <div className="flex gap-3">
            <button onClick={() => { setTradeType('buy'); setAmount(''); }}
              disabled={!mktStatus.buyOpen}
              className="flex-1 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: mktStatus.buyOpen ? '0 0 20px rgba(5,150,105,0.3)' : 'none' }}>
              <TrendingUp size={18} /> {mktStatus.buyOpen ? 'Comprar' : 'Compras cerradas'}
            </button>
            <button onClick={() => { setTradeType('sell'); setAmount(''); }} disabled={!holding || !mktStatus.sellOpen}
              className="flex-1 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)', boxShadow: (holding && mktStatus.sellOpen) ? '0 0 20px rgba(225,29,72,0.3)' : 'none' }}>
              <TrendingDown size={18} /> {mktStatus.sellOpen ? 'Vender' : 'Ventas cerradas'}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl p-4 space-y-3 border"
            style={{
              background: tradeType === 'buy' ? 'rgba(5,150,105,0.08)' : 'rgba(225,29,72,0.08)',
              borderColor: tradeType === 'buy' ? 'rgba(5,150,105,0.3)' : 'rgba(225,29,72,0.3)',
            }}>
            <div className="flex items-center justify-between">
              <p className={`font-black text-base ${tradeType === 'buy' ? 'text-green' : 'text-rose'}`}>
                {tradeType === 'buy' ? '▲ Comprando' : '▼ Vendiendo'} {selected?.symbol?.toUpperCase()}
              </p>
              <button onClick={() => { setTradeType(null); setAmount(''); }} className="text-faint hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* Input monto */}
            <div className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-3 border border-white/10">
              <span className="text-muted font-bold">$</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" autoFocus
                className="flex-1 bg-transparent outline-none text-white font-bold text-lg" />
              <span className="text-faint text-sm">USD</span>
            </div>

            {/* % rápidos */}
            <div className="flex gap-2">
              {[25, 50, 75, 100].map(p => (
                <button key={p} onClick={() => quickPct(p)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all
                    ${tradeType === 'buy'
                      ? 'border-green/30 text-green hover:bg-green/10'
                      : 'border-rose/30 text-rose hover:bg-rose/10'}`}>
                  {p}%
                </button>
              ))}
            </div>

            {/* Resumen */}
            {parseFloat(amount) > 0 && (
              <div className="bg-black/20 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted">Recibirás</span>
                  <span className="text-white font-semibold">
                    {tradeType === 'buy'
                      ? `${(parseFloat(amount) / livePrice).toFixed(6)} ${selected.symbol.toUpperCase()}`
                      : fmtUSD(parseFloat(amount))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Precio actual</span>
                  <span className="text-white font-semibold">{fmtUSD(livePrice)}</span>
                </div>
              </div>
            )}

            <button onClick={handleTrade} disabled={tradeLoading || !parseFloat(amount)}
              className={`w-full py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-40
                ${tradeType === 'buy' ? 'bg-green text-white' : 'bg-rose text-white'}`}>
              {tradeLoading ? 'Procesando...' : tradeType === 'buy'
                ? `Comprar ${selected?.symbol?.toUpperCase()}`
                : `Vender ${selected?.symbol?.toUpperCase()}`}
            </button>
          </div>
        )}
      </div>

      {/* Nakamura Bot Widget */}
      <div className="px-4 mt-3">
        <NakamuraWidget compact={true} />
      </div>

      {/* Coin Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowPicker(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto"
            style={{ background: '#13131F', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-black text-lg">Seleccionar moneda</p>
              <button onClick={() => setShowPicker(false)} className="text-faint hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-1">
              {coins.map(coin => {
                const cp = coin.price_change_percentage_24h || 0;
                const up = cp >= 0;
                const isSelected = selected?.id === coin.id;
                return (
                  <button key={coin.id}
                    onClick={() => { setSelected(coin); setShowPicker(false); setTradeType(null); setAmount(''); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left
                      ${isSelected ? 'bg-primary/15 border border-primary/30' : 'hover:bg-white/5'}`}>
                    <img src={coin.image} alt={coin.name} className="w-9 h-9 rounded-full" />
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{coin.symbol.toUpperCase()}</p>
                      <p className="text-faint text-xs">{coin.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold text-sm">{fmtUSD(coin.current_price)}</p>
                      <p className={`text-xs font-bold ${up ? 'text-green' : 'text-rose'}`}>
                        {up ? '▲' : '▼'} {Math.abs(cp).toFixed(2)}%
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
