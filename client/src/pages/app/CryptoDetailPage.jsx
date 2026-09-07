import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { getChartData, getCoinDetail, fmtUSD, fmtPct } from '../../api/crypto';
import Spinner from '../../components/ui/Spinner';
import TradeModal from '../../components/ui/TradeModal';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const RANGES = [
  { label: '1H', days: 0.042 },
  { label: '1D', days: 1 },
  { label: '1S', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs">
      <p className="text-white font-semibold">{fmtUSD(d.price)}</p>
      <p className="text-muted">{new Date(d.time).toLocaleString('es', { day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit' })}</p>
    </div>
  );
}

export default function CryptoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [coin, setCoin] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [range, setRange] = useState(RANGES[1]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [tradeModal, setTradeModal] = useState(null); // 'buy' | 'sell'

  useEffect(() => {
    const load = async () => {
      try {
        const [detail, chart] = await Promise.all([
          getCoinDetail(id),
          getChartData(id, range.days)
        ]);
        setCoin(detail);
        setChartData(chart);
      } catch { toast.error('Error cargando crypto'); }
      setLoading(false);
    };
    load();
  }, [id]);

  const loadChart = useCallback(async (r) => {
    setChartLoading(true);
    try {
      const data = await getChartData(id, r.days);
      setChartData(data);
    } catch {}
    setChartLoading(false);
  }, [id]);

  const handleRangeChange = (r) => { setRange(r); loadChart(r); };

  const price = coin?.market_data?.current_price?.usd;
  const pct24h = coin?.market_data?.price_change_percentage_24h;
  const isUp = (pct24h || 0) >= 0;

  const firstPrice = chartData[0]?.price;
  const lastPrice = chartData[chartData.length - 1]?.price;
  const chartIsUp = lastPrice >= firstPrice;

  const userHolding = user?.cryptoHoldings?.[id] || 0;

  if (loading) return (
    <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted hover:text-white transition-colors mb-6 text-sm">
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <img src={coin?.image?.large} alt={coin?.name} className="w-12 h-12 rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-white">{coin?.name}</h1>
          <p className="text-muted text-sm">{coin?.symbol?.toUpperCase()}</p>
        </div>
      </div>

      {/* Precio actual */}
      <div className="mb-6">
        <p className="text-4xl font-black text-white">{fmtUSD(price)}</p>
        <div className={`flex items-center gap-1 mt-1 ${isUp ? 'text-green' : 'text-red'}`}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span className="font-semibold text-sm">{fmtPct(pct24h)} hoy</span>
        </div>
      </div>

      {/* Chart */}
      <div className="cb-card p-4 mb-4">
        {/* Range selector */}
        <div className="flex gap-1 mb-4">
          {RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => handleRangeChange(r)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                range.label === r.label ? 'bg-primary text-white' : 'text-muted hover:bg-surface'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {chartLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartIsUp ? '#05B169' : '#E3291C'} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={chartIsUp ? '#05B169' : '#E3291C'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto','auto']} hide />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={chartIsUp ? '#05B169' : '#E3291C'}
                  strokeWidth={2}
                  fill="url(#colorPrice)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Mi posición */}
      {userHolding > 0 && (
        <div className="cb-card p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-muted text-xs">Mi posición</p>
            <p className="text-white font-bold">{userHolding.toFixed(8)} {coin?.symbol?.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-muted text-xs">Valor</p>
            <p className="text-white font-bold">{fmtUSD((userHolding * price) || 0)}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="cb-card p-4 mb-6 grid grid-cols-2 gap-4">
        {[
          ['Cap. mercado', fmtUSD(coin?.market_data?.market_cap?.usd)],
          ['Volumen 24h', fmtUSD(coin?.market_data?.total_volume?.usd)],
          ['Máx. 24h', fmtUSD(coin?.market_data?.high_24h?.usd)],
          ['Mín. 24h', fmtUSD(coin?.market_data?.low_24h?.usd)],
          ['Máx. histórico', fmtUSD(coin?.market_data?.ath?.usd)],
          ['Supply circ.', `${Number(coin?.market_data?.circulating_supply || 0).toLocaleString('en')}`],
        ].map(([label, val]) => (
          <div key={label}>
            <p className="text-muted text-xs mb-0.5">{label}</p>
            <p className="text-white font-semibold text-sm">{val}</p>
          </div>
        ))}
      </div>

      {/* Botones comprar/vender */}
      <div className="flex gap-3 sticky bottom-20 lg:bottom-6">
        <button onClick={() => setTradeModal('buy')} className="cb-btn-primary flex-1 py-4 text-base">
          Comprar
        </button>
        <button
          onClick={() => setTradeModal('sell')}
          disabled={userHolding <= 0}
          className="cb-btn-secondary flex-1 py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Vender
        </button>
      </div>

      {tradeModal && (
        <TradeModal
          type={tradeModal}
          coin={coin}
          price={price}
          holding={userHolding}
          onClose={() => setTradeModal(null)}
          onSuccess={() => { setTradeModal(null); refreshUser(); }}
        />
      )}
    </div>
  );
}
