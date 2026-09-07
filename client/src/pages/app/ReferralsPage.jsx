import { useState, useEffect } from 'react';
import { Users, Copy, Share2, CheckCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { referralAPI } from '../../api/axios';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

const fmt = (n) => `$${Number(n || 0).toFixed(2)} USD`;

export default function ReferralsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    referralAPI.getMy().then(({ data: res }) => {
      setData(res.data);
    }).finally(() => setLoading(false));
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(data.referralCode);
    toast.success('¡Código copiado!');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data.referralLink);
    toast.success('¡Enlace copiado!');
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Únete a Nova Trade',
          text: `Usa mi código ${data.referralCode} al registrarte en Nova Trade y empieza a ganar dinero real.`,
          url: data.referralLink
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="px-4 py-4 space-y-5 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users size={22} className="text-cyan" />
          <h1 className="text-2xl font-bold text-white">Programa de referidos</h1>
        </div>
        <p className="text-muted text-sm">
          Gana el {data?.commissionRate}% de comisión por cada depósito de tus referidos.
        </p>
      </div>

      {/* Referral code */}
      <div className="card p-4">
        <p className="text-muted text-xs mb-2 font-medium uppercase tracking-wider">Tu código de referido</p>
        <div className="flex items-center gap-3 bg-card rounded-xl p-3">
          <span className="text-2xl font-black text-primary tracking-widest flex-1">
            {data?.referralCode}
          </span>
          <button onClick={copyCode}
            className="p-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors">
            <Copy size={16} />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={copyLink} className="btn-secondary flex-1 text-sm py-2 flex items-center justify-center gap-1.5">
            <Copy size={14} /> Copiar enlace
          </button>
          <button onClick={shareLink} className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-1.5">
            <Share2 size={14} /> Compartir
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <p className="text-3xl font-black text-cyan">{data?.totalReferrals || 0}</p>
          <p className="text-muted text-xs mt-1">Total referidos</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-black text-green">{data?.activeReferrals || 0}</p>
          <p className="text-muted text-xs mt-1">Con plan activo</p>
        </div>
        <div className="card p-4 text-center col-span-2">
          <p className="text-3xl font-black text-gold">{fmt(data?.totalCommissionsEarned)}</p>
          <p className="text-muted text-xs mt-1">Total comisiones ganadas</p>
        </div>
      </div>

      {/* How it works */}
      <div className="card p-4">
        <h2 className="text-white font-bold mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" /> ¿Cómo funciona?
        </h2>
        <div className="space-y-2">
          {[
            { step: 1, text: 'Comparte tu código o enlace con amigos.' },
            { step: 2, text: 'Tu amigo se registra usando tu código.' },
            { step: 3, text: `Cuando haga un depósito, ganas el ${data?.commissionRate}% automáticamente.` },
            { step: 4, text: 'Sin límite de referidos. ¡Gana más invitando más!' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold
                             flex items-center justify-center flex-shrink-0 mt-0.5">
                {step}
              </div>
              <p className="text-muted text-sm">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referrals list */}
      {data?.referrals?.length > 0 && (
        <div>
          <h2 className="text-white font-bold mb-3">Mis referidos ({data.referrals.length})</h2>
          <div className="space-y-2">
            {data.referrals.map((ref, i) => (
              <div key={i} className="card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center
                               text-primary font-bold">
                  {ref.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{ref.name}</p>
                  <p className="text-faint text-xs truncate">{ref.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {ref.vipLevel > 0 ? (
                    <Badge variant="success">VIP {ref.vipLevel}</Badge>
                  ) : (
                    <Badge variant="default">Sin VIP</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
