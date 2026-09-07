import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/ui/Spinner';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('reason') === 'inactivity') {
      toast('Tu sesión expiró por inactividad. Inicia sesión de nuevo.', { icon: '🔒', duration: 5000 });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`¡Bienvenido, ${user.name}!`);
      navigate(user.role === 'admin' || user.role === 'superadmin' ? '/admin' : from, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.emailNotVerified) {
        toast('Verifica tu correo para continuar 📧', { icon: '📧' });
        navigate('/verificar-email', { state: { email: data.email || form.email } });
      } else {
        toast.error(data?.message || 'Error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 40%, #1a0a00 100%)' }}>

      {/* Glow orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #0052cc 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-0 w-60 h-60 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 70%)' }} />

      {/* Card central */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-5 py-10">

        {/* Logo y nombre */}
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Nova Trade" className="w-20 h-20 mx-auto mb-4 drop-shadow-2xl" />
          <div className="flex items-baseline justify-center gap-1.5 mb-1">
            <span className="font-black text-3xl text-white tracking-widest">NOVA</span>
            <span className="font-black text-3xl text-primary tracking-widest">TRADE</span>
          </div>
          <p className="text-blue-300/70 text-xs tracking-widest uppercase">Plataforma de inversión</p>
        </div>

        {/* Form box */}
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(249,115,22,0.25)', backdropFilter: 'blur(12px)' }}>

          <div>
            <label className="text-sm text-blue-200/70 mb-1.5 block font-medium">Correo electrónico</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60" />
              <input type="email"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#fff' }}
                className="w-full rounded-xl px-4 py-3 pl-10 text-sm outline-none placeholder-blue-200/30 focus:border-primary transition-all"
                placeholder="tu@correo.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                required autoComplete="email" />
            </div>
          </div>

          <div>
            <label className="text-sm text-blue-200/70 mb-1.5 block font-medium">Contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary/60" />
              <input type={showPass ? 'text' : 'password'}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#fff' }}
                className="w-full rounded-xl px-4 py-3 pl-10 pr-10 text-sm outline-none placeholder-blue-200/30 focus:border-primary transition-all"
                placeholder="Tu contraseña"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                required autoComplete="current-password" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary/50 hover:text-primary">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <Link to="/recuperar-contrasena" className="text-primary text-xs hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="button" onClick={handleSubmit} disabled={loading}
            className="w-full py-3.5 rounded-xl font-black text-white text-sm tracking-wide transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', boxShadow: '0 0 24px rgba(249,115,22,0.4)' }}>
            {loading ? <Spinner size="sm" /> : 'INICIAR SESIÓN'}
          </button>
        </div>

        <p className="text-center text-blue-200/50 text-sm mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="text-primary font-bold hover:underline">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}
