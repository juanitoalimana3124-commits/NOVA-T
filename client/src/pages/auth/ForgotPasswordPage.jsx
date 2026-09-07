import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../../api/axios';
import Spinner from '../../components/ui/Spinner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al enviar correo.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-5">
        <div className="max-w-sm w-full text-center">
          <CheckCircle size={64} className="text-green mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Correo enviado</h2>
          <p className="text-muted mb-6">
            Si el correo <strong className="text-white">{email}</strong> está registrado,
            recibirás un enlace para restablecer tu contraseña.
          </p>
          <Link to="/login" className="btn-primary w-full inline-flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> Volver al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col px-5 pt-16 pb-10">
      <div className="max-w-sm mx-auto w-full">
        <Link to="/login" className="flex items-center gap-2 text-faint hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Volver
        </Link>

        <h2 className="text-2xl font-bold text-white mb-1">Recuperar contraseña</h2>
        <p className="text-muted text-sm mb-6">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted mb-1.5 block font-medium">Correo electrónico</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
              <input type="email" className="input-field pl-10" placeholder="tu@correo.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Spinner size="sm" /> : 'Enviar enlace'}
          </button>
        </form>
      </div>
    </div>
  );
}
