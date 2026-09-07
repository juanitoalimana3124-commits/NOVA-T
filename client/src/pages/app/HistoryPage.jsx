import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '../../api/axios';
import { fmtUSD } from '../../api/crypto';
import Spinner from '../../components/ui/Spinner';

export default function HistoryPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/crypto/history').then(r => setTrades(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-white">Historial</h1>

      {trades.length === 0 ? (
        <div className="cb-card p-10 text-center text-muted">No has realizado operaciones aún.</div>
      ) : (
        <div className="cb-card divide-y divide-border">
          {trades.map(t => {
            const isBuy = t.type === 'buy';
            return (
              <div key={t._id} className="flex items-center gap-3 px-4 py-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBuy ? 'bg-primary/10' : 'bg-green/10'}`}>
                  {isBuy ? <ArrowDownLeft size={18} className="text-primary" /> : <ArrowUpRight size={18} className="text-green" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{isBuy ? 'Compra' : 'Venta'} {t.coinSymbol}</p>
                  <p className="text-muted text-xs">{new Date(t.createdAt).toLocaleString('es', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${isBuy ? 'text-red' : 'text-green'}`}>
                    {isBuy ? '-' : '+'}{fmtUSD(t.usdAmount)}
                  </p>
                  <p className="text-muted text-xs">{t.cryptoAmount.toFixed(6)} {t.coinSymbol}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
