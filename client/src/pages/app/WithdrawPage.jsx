import { useState } from 'react';
import { ArrowLeft, Wallet, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { withdrawalAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/ui/Spinner';

const MIN_WITHDRAW = 25; // USD
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

export default function WithdrawPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [method] = useState('paypal');
  const [form, setForm] = useState({ amount: '', paypalEmail: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const balance = user?.usdBalance || 0;
  const amount  = parseFloat(form.amount) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount < MIN_WITHDRAW) {
      toast.error(`El monto mínimo de retiro es $${MIN_WITHDRAW} USD.`);
      return;
    }
    if (amount > balance) {
      toast.error('Saldo USD insuficiente.');
      return;
    }
    if (!form.paypalEmail) {
      toast.error('Ingresa tu correo de PayPal.');
      return;
    }
    setLoading(true);
    try {
      await withdrawalAPI.create({ ...form, method });
      toast.success('¡Solicitud enviada! Será procesada en 24–48 horas.');
      await refreshUser();
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al solicitar retiro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="p-2 rounded-xl hover:bg-card text-muted hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-white">Solicitar retiro</h1>
      </div>

      {/* Balance */}
      <div className="card p-5 bg-gradient-to-br from-gold/10 to-gold/5 border-gold/20 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Wallet size={16} className="text-gold" />
          <p className="text-muted text-sm">Saldo disponible</p>
        </div>
        <p className="text-4xl font-black text-gold">{fmt(balance)}</p>
        <p className="text-faint text-xs mt-1">Mínimo de retiro: ${MIN_WITHDRAW} USD</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Monto */}
        <div>
          <label className="text-sm text-muted mb-1.5 block">Monto a retirar (USD)</label>
          <input
            type="number"
            className="input-field"
            placeholder="Ej: 50"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            min={MIN_WITHDRAW}
            max={balance}
            step="0.01"
            required
          />
        </div>

        {/* PayPal */}
        <div>
          <label className="text-sm text-muted mb-1.5 block">Correo de tu cuenta PayPal</label>
          <input
            type="email"
            className="input-field"
            placeholder="tucorreo@paypal.com"
            value={form.paypalEmail}
            onChange={(e) => setForm({ ...form, paypalEmail: e.target.value })}
            required
          />
          <p className="text-faint text-xs mt-1.5">Enviaremos el pago a este correo de PayPal.</p>
        </div>

        {/* Notas */}
        <div>
          <label className="text-sm text-muted mb-1.5 block">Notas (opcional)</label>
          <textarea
            className="input-field resize-none"
            rows={2}
            placeholder="Información adicional..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {/* Info retiro */}
        <div className="rounded-xl p-3 flex items-start gap-2.5"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <AlertTriangle size={15} className="text-green flex-shrink-0 mt-0.5" />
          <div className="text-xs text-green/80 leading-relaxed">
            <span className="font-bold text-green">Sin comisión</span> — Recibes exactamente lo que solicitas.
            {amount > 0 && (
              <p className="mt-1">
                Recibirás: <span className="font-bold text-white">${amount.toFixed(2)} USD</span>
              </p>
            )}
          </div>
        </div>

        <p className="text-faint text-xs text-center">
          Los retiros son procesados en 24–48 horas hábiles.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {loading ? <Spinner size="sm" /> : '✓ Solicitar retiro'}
        </button>
      </form>
    </div>
  );
}
