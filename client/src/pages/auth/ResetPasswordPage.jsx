import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../api/axios';
import Spinner from '../../components/ui/Spinner';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(form.password)) {
      toast.error('La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(token, { password: form.password });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Token inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-5">
      <p className="text-rose">Enlace inválido. <Link to="/recuperar-contrasena" className="text-primary underline">Solicitar nuevo</Link></p>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-5">
      <div className="max-w-sm w-full text-center">
        <CheckCircle size={64} className="text-green mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">¡Contraseña actualizada!</h2>
        <p className="text-muted mb-6">Ya puedes iniciar sesión con tu nueva contraseña.</p>
        <Link to="/login" className="btn-primary w-full inline-flex items-center justify-center">Ir al login</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg flex flex-col px-5 pt-16 pb-10">
      <div className="max-w-sm mx-auto w-full">
        <h2 className="text-2xl font-bold text-white mb-1">Nueva contraseña</h2>
        <p className="text-muted text-sm mb-6">Ingresa y confirma tu nueva contraseña.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted mb-1.5 block font-medium">Nueva contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input type={showPass ? 'text' : 'password'} className="input-field pl-10 pr-10"
                placeholder="Mín. 8 chars, mayúscula y número"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-faint">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted mb-1.5 block font-medium">Confirmar contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input type={showPass ? 'text' : 'password'} className="input-field pl-10"
                placeholder="Repite tu contraseña"
                value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Spinner size="sm" /> : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
