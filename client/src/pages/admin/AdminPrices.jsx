import { useState, useEffect } from 'react';
import { TrendingUp, Edit3, Check, X, Zap, ZapOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { getMarkets, fmtUSD, TOP_COINS } from '../../api/crypto';
import Spinner from '../../components/ui/Spinner';

export default function AdminPrices() {
  const [coins, setCoins] = useState([]);
  const [manualPrices, setManualPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // coinId
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [coinData, { data: mpData }] = await Promise.all([
          getMarkets(TOP_COINS),
          api.get('/prices/all'),
        ]);
        setCoins(coinData);
        setManualPrices(mpData.data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const getManual = (coinId) => manualPrices.find(m => m.coinId === coinId);

  const startEdit = (coin) => {
    const manual = getManual(coin.id);
    setEditing(coin.id);
    setEditVal(manual?.price?.toString() || coin.current_price.toString());
  };

  const savePrice = async (coin, enable = true) => {
    const price = parseFloat(editVal);
    if (!price || price <= 0) { toast.error('Precio inválido'); return; }
    setSaving(true);
    try {
      const { data } = await api.put(`/prices/${coin.id}`, {
        price, enabled: enable,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
      });
      setManualPrices(prev => {
        const idx = prev.findIndex(m => m.coinId === coin.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = data.data; return n; }
        return [...prev, data.data];
      });
      toast.success(enable ? `Precio manual activado: ${fmtUSD(price)}` : 'Precio guardado');
      setEditing(null);
    } catch {
      toast.error('Error al guardar precio');
    } finally {
      setSaving(false);
    }
  };

  const toggleManual = async (coin, enable) => {
    setSaving(true);
    try {
      const manual = getManual(coin.id);
      const price = manual?.price || coin.current_price;
      const { data } = await api.put(`/prices/${coin.id}`, {
        price, enabled: enable,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
      });
      setManualPrices(prev => {
        const idx = prev.findIndex(m => m.coinId === coin.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = data.data; return n; }
        return [...prev, data.data];
      });
      toast.success(enable ? '✓ Precio manual activado' : '✓ Volviendo al precio real');
    } catch {
      toast.error('Error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const activeCount = manualPrices.filter(m => m.enabled).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Control de Precios</h1>
          <p className="text-muted text-sm">Establece precios manuales que reemplazan los precios reales del mercado.</p>
        </div>
        {activeCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/30">
            <Zap size={14} className="text-primary" />
            <span className="text-primary text-sm font-bold">{activeCount} activos</span>
          </div>
        )}
      </div>

      {/* Aviso */}
      <div className="rounded-xl p-3 flex items-start gap-2.5 border border-gold/25"
        style={{ background: 'rgba(217,119,6,0.08)' }}>
        <TrendingUp size={15} className="text-gold flex-shrink-0 mt-0.5" />
        <p className="text-gold/80 text-xs leading-relaxed">
          Cuando activas un precio manual, los usuarios ven ese precio en tiempo real y sus operaciones se ejecutan a ese valor. Desactívalo para volver al precio real de mercado.
        </p>
      </div>

      {/* Lista de monedas */}
      <div className="space-y-2">
        {coins.map(coin => {
          const manual = getManual(coin.id);
          const isManualOn = manual?.enabled === true;
          const isEditing = editing === coin.id;

          return (
            <div key={coin.id}
              className={`card p-4 transition-all ${isManualOn ? 'border-primary/40' : 'border-border'}`}>
              <div className="flex items-center gap-3">
                <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-sm">{coin.symbol.toUpperCase()}</p>
                    {isManualOn && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold">
                        MANUAL
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-faint text-xs">Real: {fmtUSD(coin.current_price)}</p>
                    {isManualOn && manual?.price && (
                      <p className="text-primary text-xs font-semibold">→ Manual: {fmtUSD(manual.price)}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <input
                        type="number"
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        className="w-32 bg-surface border border-primary/40 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-primary"
                        placeholder="0.00"
                        autoFocus
                        step="any"
                      />
                      <button onClick={() => savePrice(coin, true)} disabled={saving}
                        className="p-2 bg-green/15 text-green rounded-lg hover:bg-green/25 transition-colors">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="p-2 bg-rose/15 text-rose rounded-lg hover:bg-rose/25 transition-colors">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(coin)}
                        className="p-2 bg-surface rounded-lg text-muted hover:text-white transition-colors"
                        title="Editar precio">
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => toggleManual(coin, !isManualOn)}
                        disabled={saving || (!manual?.price && !isManualOn)}
                        title={isManualOn ? 'Desactivar precio manual' : 'Activar precio manual'}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-40
                          ${isManualOn
                            ? 'bg-primary/20 text-primary hover:bg-primary/30'
                            : 'bg-surface text-faint hover:text-white'}`}>
                        {isManualOn ? <Zap size={14} /> : <ZapOff size={14} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
