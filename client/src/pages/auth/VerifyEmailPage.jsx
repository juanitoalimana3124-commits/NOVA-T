import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Spinner from '../../components/ui/Spinner';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  // El email viene del state de navegación (desde registro o login bloqueado)
  const email = location.state?.email || '';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  // Cuenta regresiva para reenviar
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
    // Auto-submit cuando los 6 están llenos
    if (val && i === 5 && next.every(d => d)) {
      submitCode(next.join(''));
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setDigits(next);
      inputs.current[5]?.focus();
      setTimeout(() => submitCode(pasted), 100);
    }
  };

  const submitCode = async (code) => {
    if (!email) return toast.error('No se encontró el email. Vuelve al registro.');
    setLoading(true);
    try {
      await api.post('/auth/verify-email-code', { email, code });
      toast.success('¡Correo verificado! Bienvenido a Nova Trade 🎉');
      await refreshUser();
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Código incorrecto');
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    const code = digits.join('');
    if (code.length < 6) return toast.error('Ingresa los 6 dígitos del código');
    submitCode(code);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      toast.success('Código reenviado. Revisa tu correo.');
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch {
      toast.error('No se pudo reenviar. Intenta de nuevo.');
    } finally {
      setResending(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '2px solid rgba(249,115,22,0.25)',
    color: '#fff',
  };
  const inputFocusStyle = {
    border: '2px solid #F97316',
    boxShadow: '0 0 0 3px rgba(249,115,22,0.2)',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 40%, #1a0a00 100%)' }}>

      {/* Glow orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #0052cc 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-sm mx-auto px-5">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Nova Trade" className="w-16 h-16 mx-auto mb-3 drop-shadow-2xl" />
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="font-black text-2xl text-white tracking-widest">NOVA</span>
            <span className="font-black text-2xl text-primary tracking-widest">TRADE</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(249,115,22,0.25)', backdropFilter: 'blur(12px)' }}>

          {/* Icono email */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}>
              <Mail size={28} className="text-primary" />
            </div>
          </div>

          <h2 className="text-white font-black text-xl text-center mb-1">Verifica tu correo</h2>
          <p className="text-center text-sm mb-1" style={{ color: '#94a3b8' }}>
            Enviamos un código de 6 dígitos a
          </p>
          <p className="text-center font-bold text-sm mb-6" style={{ color: '#F97316' }}>
            {email || 'tu correo'}
          </p>

          {/* Cajas del código */}
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
                type="text" inputMode="numeric" maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={e => Object.assign(e.target.style, inputStyle)}
                style={{ ...inputStyle, width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 900, borderRadius: 12, outline: 'none', transition: 'all 0.15s' }}
              />
            ))}
          </div>

          {/* Botón verificar */}
          <button onClick={handleSubmit} disabled={loading || digits.some(d => !d)}
            className="w-full py-3.5 rounded-xl font-black text-white text-sm tracking-wide transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', boxShadow: '0 0 24px rgba(249,115,22,0.35)' }}>
            {loading ? <span className="flex justify-center"><Spinner size="sm" /></span> : 'VERIFICAR CORREO'}
          </button>

          {/* Reenviar */}
          <div className="text-center mt-4">
            {countdown > 0 ? (
              <p className="text-xs" style={{ color: '#64748b' }}>
                Reenviar código en <span style={{ color: '#F97316' }}>{countdown}s</span>
              </p>
            ) : (
              <button onClick={handleResend} disabled={resending}
                className="flex items-center gap-1.5 mx-auto text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ color: '#F97316' }}>
                <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Reenviando...' : 'Reenviar código'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#475569' }}>
          ¿Correo equivocado?{' '}
          <button onClick={() => navigate('/registro')} className="underline" style={{ color: '#F97316' }}>
            Vuelve al registro
          </button>
        </p>
      </div>
    </div>
  );
}
