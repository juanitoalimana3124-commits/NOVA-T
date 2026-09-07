import { useState } from 'react';
import { X } from 'lucide-react';
import { fmtUSD } from '../../api/crypto';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function TradeModal({ type, coin, price, holding, onClose, onSuccess }) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const isBuy = type === 'buy';
  const symbol = coin?.symbol?.toUpperCase();
  const usdAmount = parseFloat(amount) || 0;
  const cryptoAmount = isBuy ? usdAmount / price : usdAmount;
  const usdCost = isBuy ? usdAmount : usdAmount * price;
  const maxBuy = user?.usdBalance || 0;
  const maxSell = holding * price;

  const handleTrade = async () => {
    if (!usdAmount || usdAmount <= 0) return toast.error('Ingresa un monto válido');
    if (isBuy && usdAmount > maxBuy) return toast.error('Saldo insuficiente');
    if (!isBuy && usdAmount > maxSell) return toast.error('No tienes suficiente ' + symbol);
    setLoading(true);
    try {
      await api.post('/api/crypto/trade', {
        coinId: coin.id,
        coinSymbol: symbol,
        type,
        usdAmount,
        cryptoAmount: isBuy ? cryptoAmount : usdAmount / price,
        pricePerUnit: price,
      });
      toast.success(`${isBuy ? 'Compra' : 'Venta'} exitosa`);
      onSuccess();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error al procesar');
    }
    setLoading(false);
  };

  const setPercent = (pct) => {
    const max = isBuy ? maxBuy : maxSell;
    setAmount(String((max * pct / 100).toFixed(2)));
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end lg:items-center justify-center p-4" onClick={onClose}>
      <div className="cb-card w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src={coin?.image?.large || coin?.image?.small} alt={coin?.name} className="w-8 h-8 rounded-full" />
            <div>
              <h2 className="text-white font-bold">{isBuy ? 'Comprar' : 'Vender'} {symbol}</h2>
              <p className="text-muted text-xs">{fmtUSD(price)} / {symbol}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="text-muted text-xs mb-1.5 block">
            {isBuy ? 'Monto en USD' : `Monto en USD a vender (tienes ${fmtUSD(maxSell)})`}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="cb-input pl-7"
              min="0"
            />
          </div>
        </div>

        {/* Porcentajes rápidos */}
        <div className="flex gap-2 mb-5">
          {[25,50,75,100].map(p => (
            <button key={p} onClick={() => setPercent(p)}
              className="flex-1 py-1.5 bg-surface hover:bg-border rounded-lg text-xs text-muted hover:text-white transition-colors font-medium">
              {p}%
            </button>
          ))}
        </div>

        {/* Resumen */}
        {usdAmount > 0 && (
          <div className="bg-surface rounded-xl p-3.5 mb-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{isBuy ? 'Recibirás' : 'Venderás'}</span>
              <span className="text-white font-semibold">{cryptoAmount.toFixed(8)} {symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{isBuy ? 'Pagarás' : 'Recibirás'}</span>
              <span className="text-white font-semibold">{fmtUSD(usdCost)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted">Precio</span>
              <span className="text-white font-semibold">{fmtUSD(price)}</span>
            </div>
          </div>
        )}

        {/* Saldo disponible */}
        <p className="text-muted text-xs mb-4">
          {isBuy ? `Saldo USD: ${fmtUSD(maxBuy)}` : `Tienes: ${holding.toFixed(8)} ${symbol} (${fmtUSD(maxSell)})`}
        </p>

        <button
          onClick={handleTrade}
          disabled={loading || !usdAmount || usdAmount <= 0}
          className={`w-full py-4 rounded-xl font-bold text-white text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isBuy ? 'bg-primary hover:bg-primary-hover' : 'bg-green hover:bg-green/80'
          }`}
        >
          {loading ? 'Procesando...' : `${isBuy ? 'Comprar' : 'Vender'} ${symbol}`}
        </button>
      </div>
    </div>
  );
}
