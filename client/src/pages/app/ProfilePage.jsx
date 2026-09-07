import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Crown, Shield, LogOut, ChevronRight, Eye, EyeOff, Lock, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../api/axios';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';

const fmtUSD = (n) => `$${Number(n || 0).toFixed(2)} USD`;
const MIN_WITHDRAW = 25;

export default function ProfilePage() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showPassModal, setShowPassModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', paypalEmail: '', notes: '' });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Sesión cerrada');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await userAPI.changePassword({
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword
      });
      toast.success('Contraseña actualizada. Por favor inicia sesión.');
      setShowPassModal(false);
      await logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawForm.amount);
    if (!amount || amount < MIN_WITHDRAW) {
      toast.error(`El monto mínimo de retiro es $${MIN_WITHDRAW} USD.`);
      return;
    }
    if (amount > (user?.usdBalance || 0)) {
      toast.error('Saldo USD insuficiente.');
      return;
    }
    if (!withdrawForm.paypalEmail) {
      toast.error('Ingresa tu correo de PayPal.');
      return;
    }
    setLoading(true);
    try {
      const { withdrawalAPI } = await import('../../api/axios');
      await withdrawalAPI.create({ ...withdrawForm, method: 'paypal' });
      toast.success('Solicitud de retiro enviada.');
      setShowWithdrawModal(false);
      setWithdrawForm({ amount: '', paypalEmail: '', notes: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al solicitar retiro.');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      label: 'Solicitar retiro',
      icon: ArrowUpRight,
      color: 'text-gold',
      onClick: () => setShowWithdrawModal(true)
    },
    {
      label: 'Cambiar contraseña',
      icon: Lock,
      color: 'text-muted',
      onClick: () => setShowPassModal(true)
    },
    ...(isAdmin ? [{
      label: 'Panel de Admin',
      icon: Shield,
      color: 'text-primary',
      onClick: () => navigate('/admin')
    }] : [])
  ];

  return (
    <div className="px-4 py-4 space-y-5 animate-fade-in">
      {/* Avatar + Name */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center
                       text-primary font-black text-2xl border border-primary/30">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{user?.name}</h1>
          <p className="text-muted text-sm">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge bg-primary/20 text-primary border border-primary/30 text-xs">
              {user?.role}
            </span>
            {user?.isEmailVerified && (
              <span className="badge bg-green/20 text-green border border-green/30 text-xs">
                ✓ Verificado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-muted text-xs mb-1">Saldo USD</p>
          <p className="text-xl font-black text-cyan">${Number(user?.usdBalance || 0).toFixed(2)} USD</p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs mb-1">Plan VIP</p>
          <p className="text-xl font-black text-white">
            {user?.vipLevel > 0 ? `VIP ${user.vipLevel}` : 'Sin plan'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-muted text-xs mb-1">Código referido</p>
          <p className="text-xl font-black text-primary font-mono">{user?.referralCode}</p>
        </div>
      </div>

      {/* Crypto Holdings */}
      {user?.cryptoHoldings && Object.keys(user.cryptoHoldings).filter(k => user.cryptoHoldings[k] > 0).length > 0 && (
        <div>
          <h2 className="text-white font-bold mb-2 text-sm">Mis cryptos</h2>
          <div className="card divide-y divide-border">
            {Object.entries(user.cryptoHoldings)
              .filter(([, amt]) => amt > 0)
              .map(([coinId, amount]) => (
                <div key={coinId} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-white font-semibold text-sm capitalize">{coinId.replace(/-/g, ' ')}</p>
                    <p className="text-muted text-xs">{Number(amount).toFixed(6)}</p>
                  </div>
                  <span className="text-xs text-cyan font-semibold bg-cyan/10 px-2 py-1 rounded-lg">
                    {Number(amount).toFixed(6)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="card overflow-hidden">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-card transition-colors
                         ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <Icon size={18} className={item.color} />
              <span className="text-white font-medium flex-1 text-left">{item.label}</span>
              <ChevronRight size={16} className="text-faint" />
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                   border border-rose/30 text-rose hover:bg-rose/10 transition-colors font-medium">
        <LogOut size={18} />
        Cerrar sesión
      </button>

      {/* Change Password Modal */}
      <Modal isOpen={showPassModal} onClose={() => !loading && setShowPassModal(false)} title="Cambiar contraseña">
        <form onSubmit={handleChangePassword} className="space-y-4">
          {['currentPassword', 'newPassword', 'confirmPassword'].map((field, i) => (
            <div key={field}>
              <label className="text-sm text-muted mb-1.5 block">
                {field === 'currentPassword' ? 'Contraseña actual' : field === 'newPassword' ? 'Nueva contraseña' : 'Confirmar nueva contraseña'}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <input type={showPass ? 'text' : 'password'} className="input-field pl-10 pr-10"
                  value={passForm[field]}
                  onChange={(e) => setPassForm({ ...passForm, [field]: e.target.value })} required />
                {i === 0 && (
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-faint">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Spinner size="sm" /> : 'Actualizar contraseña'}
          </button>
        </form>
      </Modal>

      {/* Withdrawal Modal */}
      <Modal isOpen={showWithdrawModal} onClose={() => !loading && setShowWithdrawModal(false)} title="Solicitar retiro">
        <form onSubmit={handleWithdraw} className="space-y-4">
          {/* Balance */}
          <div className="bg-card rounded-xl p-3 text-center">
            <p className="text-muted text-xs mb-1">Saldo disponible</p>
            <p className="text-gold font-black text-2xl">{fmtUSD(user?.usdBalance)}</p>
            <p className="text-faint text-xs mt-1">Mínimo de retiro: ${MIN_WITHDRAW} USD</p>
          </div>

          {/* Monto */}
          <div>
            <label className="text-sm text-muted mb-1.5 block">Monto a retirar (USD)</label>
            <input type="number" className="input-field" placeholder={`Mínimo $${MIN_WITHDRAW} USD`}
              value={withdrawForm.amount}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
              min={MIN_WITHDRAW} max={user?.usdBalance} step="0.01" required />
          </div>

          {/* PayPal */}
          <div>
            <label className="text-sm text-muted mb-1.5 block">🔵 Correo de tu cuenta PayPal</label>
            <input type="email" className="input-field" placeholder="tucorreo@paypal.com"
              value={withdrawForm.paypalEmail}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, paypalEmail: e.target.value })}
              required />
            <p className="text-faint text-xs mt-1.5">Enviaremos el pago a este correo de PayPal.</p>
          </div>

          {/* Sin comisión */}
          <div className="rounded-xl p-3 flex items-center gap-2"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <span className="text-green text-xs font-bold">Sin comisión</span>
            <span className="text-green/70 text-xs">— Recibes exactamente lo que solicitas.</span>
          </div>

          <p className="text-faint text-xs text-center">Procesado en 24–48 horas hábiles.</p>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowWithdrawModal(false)}
              className="btn-danger flex-1" disabled={loading}>Cancelar</button>
            <button type="submit" disabled={loading}
              className="btn-success flex-1 flex items-center justify-center gap-2">
              {loading ? <Spinner size="sm" /> : '✓ Solicitar retiro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
