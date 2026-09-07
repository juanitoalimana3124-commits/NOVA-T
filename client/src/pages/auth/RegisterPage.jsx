import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/ui/Spinner';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    referralCode: searchParams.get('ref') || ''
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error('Las contraseñas no coinciden.');
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(form.password)) return toast.error('Mínimo 8 caracteres, una mayúscula y un número.');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.referralCode || undefined);
      toast.success('¡Cuenta creada! Bienvenido a Nova Trade 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrarse.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(249,115,22,0.2)',
    color: '#fff',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden py-8"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 40%, #1a0a00 100%)' }}>

      {/* Glow orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #0052cc 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-0 w-60 h-60 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-sm mx-auto px-5">

        {/* Logo */}
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="Nova Trade" className="w-16 h-16 mx-auto mb-3 drop-shadow-2xl" />
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="font-black text-2xl text-white tracking-widest">NOVA</span>
            <span className="font-black text-2xl text-primary tracking-widest">TRADE</span>
          </div>
          <p className="text-blue-300/70 text-xs tracking-widest uppercase mt-1">Plataforma de inversión</p>
        </div>


        {/* Form box */}
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(249,115,22,0.25)', backdropFilter: 'blur(12px)' }}>

          <div>
            <label className="text-xs text-blue-200/70 mb-1.5 block font-medium">Nombre completo</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60" />
              <input type="text" style={inputStyle}
                className="w-full rounded-xl px-4 py-3 pl-10 text-sm outline-none placeholder-blue-200/30 focus:border-primary transition-all"
                placeholder="Tu nombre" value={form.name} onChange={set('name')} required minLength={2} maxLength={50} />
            </div>
          </div>

          <div>
            <label className="text-xs text-blue-200/70 mb-1.5 block font-medium">Correo electrónico</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60" />
              <input type="email" style={inputStyle}
                className="w-full rounded-xl px-4 py-3 pl-10 text-sm outline-none placeholder-blue-200/30 focus:border-primary transition-all"
                placeholder="tu@correo.com" value={form.email} onChange={set('email')} required autoComplete="email" />
            </div>
          </div>

          <div>
            <label className="text-xs text-blue-200/70 mb-1.5 block font-medium">Contraseña</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60" />
              <input type={showPass ? 'text' : 'password'} style={inputStyle}
                className="w-full rounded-xl px-4 py-3 pl-10 pr-10 text-sm outline-none placeholder-blue-200/30 focus:border-primary transition-all"
                placeholder="Mín. 8 chars, mayúscula y número"
                value={form.password} onChange={set('password')} required />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary/50 hover:text-primary">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-blue-200/70 mb-1.5 block font-medium">Confirmar contraseña</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60" />
              <input type={showPass ? 'text' : 'password'} style={inputStyle}
                className="w-full rounded-xl px-4 py-3 pl-10 text-sm outline-none placeholder-blue-200/30 focus:border-primary transition-all"
                placeholder="Repite tu contraseña"
                value={form.confirmPassword} onChange={set('confirmPassword')} required />
            </div>
          </div>

          <div>
            <label className="text-xs text-blue-200/70 mb-1.5 block font-medium">
              Código de referido <span className="opacity-50">(opcional)</span>
            </label>
            <div className="relative">
              <Gift size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60" />
              <input type="text" style={inputStyle}
                className="w-full rounded-xl px-4 py-3 pl-10 text-sm outline-none placeholder-blue-200/30 focus:border-primary transition-all uppercase"
                placeholder="Ej: ABC123" value={form.referralCode} onChange={set('referralCode')} maxLength={10} />
            </div>
          </div>

          <button type="button" onClick={handleSubmit} disabled={loading}
            className="w-full py-3.5 rounded-xl font-black text-white text-sm tracking-wide transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', boxShadow: '0 0 24px rgba(249,115,22,0.4)' }}>
            {loading ? <Spinner size="sm" /> : 'CREAR CUENTA GRATIS'}
          </button>
        </div>

        <p className="text-center text-blue-200/50 text-sm mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
