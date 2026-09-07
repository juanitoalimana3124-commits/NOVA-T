import { useState, useEffect } from 'react';
import { Crown, CheckCircle, Upload, X, TrendingUp, ShieldCheck, Headphones, BarChart2, Star, Rocket, Lock, PlusCircle, ChevronDown, ChevronUp, Calendar, CalendarDays, Percent } from 'lucide-react';
import toast from 'react-hot-toast';
import { vipAPI, depositAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';

const fmtUSD  = (n) => `$${Number(n || 0).toFixed(0)} USD`;
const fmtUSD2 = (n) => `$${Number(n || 0).toFixed(2)} USD`;

const PAYPAL_ACCOUNT = 'novatrade861@gmail.com';

// Tasa de retorno diario estimada por nivel (%)
const DAILY_RATE = { 1: 1.5, 2: 2.0, 3: 2.8, 4: 3.5 };

const PlanProjection = ({ plan, colors }) => {
  const daily   = parseFloat((plan.botDailyEarning || 0).toFixed(2));
  const rate    = plan.usdBonus > 0 ? parseFloat(((daily / plan.usdBonus) * 100).toFixed(2)) : DAILY_RATE[plan.level] || 0;
  const monthly = parseFloat((daily * 30).toFixed(2));
  const yearly  = parseFloat((daily * 365).toFixed(2));

  const rows = [
    { icon: Percent,      label: 'Retorno diario',        value: `${rate}%`,       accent: colors.icon  },
    { icon: TrendingUp,   label: 'Ganancia diaria est.',  value: fmtUSD2(daily),   accent: 'text-green' },
    { icon: Calendar,     label: 'Ganancia mensual est.', value: fmtUSD2(monthly), accent: 'text-green' },
    { icon: CalendarDays, label: 'Ganancia anual est.',   value: fmtUSD2(yearly),  accent: 'text-gold'  },
  ];

  return (
    <div className={`mt-3 rounded-xl overflow-hidden border ${colors.border}`}
      style={{ background: 'rgba(0,0,0,0.25)' }}>
      <div className="grid grid-cols-2 divide-x divide-y divide-white/5">
        {rows.map(({ icon: Icon, label, value, accent }, i) => (
          <div key={i} className="px-3 py-2.5 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Icon size={11} className={accent} />
              <p className="text-faint text-[10px] uppercase tracking-wide">{label}</p>
            </div>
            <p className={`font-black text-sm ${accent}`}>{value}</p>
          </div>
        ))}
      </div>
      <p className="text-faint text-[9px] px-3 py-1.5 border-t border-white/5">
        * Proyección estimada. Los resultados reales dependen del mercado.
      </p>
    </div>
  );
};

const BENEFITS_BASE = [
  { icon: Rocket,    text: 'Acceso anticipado a nuevas coins' },
  { icon: Star,      text: 'Señales de trading exclusivas'    },
  { icon: Headphones,text: 'Soporte VIP 24/7'                },
];

const PLAN_BENEFITS = {
  1: BENEFITS_BASE,
  2: BENEFITS_BASE,
  3: [
    { icon: Rocket,    text: 'Acceso anticipado a nuevas coins' },
    { icon: Star,      text: 'Señales de trading exclusivas'    },
    { icon: Headphones,text: 'Soporte VIP 24/7'                },
    { icon: BarChart2, text: 'Análisis técnico en tiempo real'  },
    { icon: ShieldCheck, text: 'Cuenta con protección avanzada' },
  ],
  4: [
    { icon: Rocket,    text: 'Acceso anticipado a nuevas coins' },
    { icon: Star,      text: 'Señales de trading exclusivas'    },
    { icon: Headphones,text: 'Soporte VIP 24/7'                },
    { icon: BarChart2, text: 'Análisis técnico en tiempo real'  },
    { icon: ShieldCheck, text: 'Cuenta con protección avanzada' },
    { icon: Crown,     text: 'Gestor personal dedicado'         },
    { icon: Lock,      text: 'Acceso elite sin restricciones'   },
  ],
};

const LEVEL_COLORS = {
  1: { border: 'border-cyan/30',    bg: 'bg-cyan/5',    badge: 'bg-cyan/20 text-cyan border-cyan/30',       icon: 'text-cyan'    },
  2: { border: 'border-primary/30', bg: 'bg-primary/5', badge: 'bg-primary/20 text-primary border-primary/30', icon: 'text-primary' },
  3: { border: 'border-gold/30',    bg: 'bg-gold/5',    badge: 'bg-gold/20 text-gold border-gold/30',       icon: 'text-gold'    },
  4: { border: 'border-rose/30',    bg: 'bg-rose/5',    badge: 'bg-rose/20 text-rose border-rose/30',       icon: 'text-rose'    },
};

export default function VipPage() {
  const { user } = useAuth();
  const [plans, setPlans]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [openProjection, setOpenProjection] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [depositForm, setDepositForm] = useState({ notes: '', paypalTransactionId: '' });
  const [voucher, setVoucher]       = useState(null);
  const [voucherPreview, setVoucherPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRecharge, setShowRecharge]   = useState(false);
  const [rechargeForm, setRechargeForm]   = useState({ amount: '', paypalTransactionId: '', notes: '' });
  const [rechargeVoucher, setRechargeVoucher]         = useState(null);
  const [rechargeVoucherPreview, setRechargeVoucherPreview] = useState(null);
  const [rechargeSubmitting, setRechargeSubmitting]   = useState(false);

  const hasVip = (user?.vipLevel || 0) > 0;

  const handleRechargeVoucher = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5MB.'); return; }
    setRechargeVoucher(file);
    setRechargeVoucherPreview(URL.createObjectURL(file));
  };

  const handleRechargeSubmit = async () => {
    const amt = parseFloat(rechargeForm.amount);
    if (!amt || amt <= 0) { toast.error('Ingresa un monto válido.'); return; }
    if (!rechargeVoucher) { toast.error('Debes subir el comprobante de pago.'); return; }
    setRechargeSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('amount', amt);
      fd.append('bank', 'paypal');
      fd.append('notes', rechargeForm.notes || 'Recarga adicional');
      fd.append('voucher', rechargeVoucher);
      if (rechargeForm.paypalTransactionId) fd.append('paypalTransactionId', rechargeForm.paypalTransactionId);
      await depositAPI.create(fd);
      toast.success('¡Recarga enviada! Será revisada y acreditada pronto.');
      setShowRecharge(false);
      setRechargeForm({ amount: '', paypalTransactionId: '', notes: '' });
      setRechargeVoucher(null);
      setRechargeVoucherPreview(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al enviar recarga.');
    } finally {
      setRechargeSubmitting(false);
    }
  };

  useEffect(() => {
    vipAPI.getPlans().then(({ data }) => setPlans(data.data || [])).finally(() => setLoading(false));
  }, []);

  const openDeposit = (plan) => {
    setSelectedPlan(plan);
    setDepositForm({ notes: '', paypalTransactionId: '' });
    setVoucher(null);
    setVoucherPreview(null);
  };

  const handleVoucherChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5MB.'); return; }
    setVoucher(file);
    setVoucherPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!voucher) { toast.error('Debes subir el comprobante de pago.'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('amount', selectedPlan.price);
      fd.append('bank', 'paypal');
      fd.append('vipPlanId', selectedPlan._id);
      fd.append('notes', depositForm.notes);
      fd.append('voucher', voucher);
      if (depositForm.paypalTransactionId) {
        fd.append('paypalTransactionId', depositForm.paypalTransactionId);
      }
      await depositAPI.create(fd);
      toast.success('¡Pago enviado! Será revisado pronto y recibirás tu bono USD.');
      setSelectedPlan(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al enviar pago.');
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="px-4 py-4 space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Crown size={22} className="text-gold" />
          <h1 className="text-2xl font-bold text-white">Membresías VIP</h1>
        </div>
        <p className="text-muted text-sm">Compra una membresía y recibe USD para operar en el mercado crypto.</p>
      </div>

      {/* Banner explicativo */}
      <div className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(217,119,6,0.08) 100%)', border: '1px solid rgba(249,115,22,0.25)' }}>
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <TrendingUp size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm mb-0.5">¿Cómo funciona?</p>
          <p className="text-muted text-xs leading-relaxed">
            Elige un plan, realiza el pago en USD por PayPal y recibe capital directamente en tu cuenta.
            Usa ese capital para comprar y vender crypto en el mercado.
          </p>
        </div>
      </div>

      {/* Recarga adicional — solo para VIP activos */}
      {hasVip ? (
        <button
          onClick={() => setShowRecharge(true)}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border border-green/30 bg-green/5 hover:bg-green/10 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-green/15 flex items-center justify-center flex-shrink-0">
            <PlusCircle size={20} className="text-green" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-bold text-sm">Agregar monto adicional</p>
            <p className="text-muted text-xs">Recarga saldo USD extra a tu cuenta sin cambiar tu plan</p>
          </div>
          <span className="text-green text-xs font-bold bg-green/15 px-2 py-1 rounded-lg">VIP</span>
        </button>
      ) : (
        <div className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-surface opacity-60 cursor-not-allowed">
          <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
            <Lock size={20} className="text-faint" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-faint font-bold text-sm">Agregar monto adicional</p>
            <p className="text-faint text-xs">Requiere tener un plan VIP activo</p>
          </div>
          <span className="text-faint text-xs bg-card px-2 py-1 rounded-lg border border-border">Bloqueado</span>
        </div>
      )}

      {/* Plans */}
      <div className="space-y-3">
        {plans.map((plan) => {
          const c = LEVEL_COLORS[plan.level] || LEVEL_COLORS[1];
          const isCurrent  = user?.vipLevel === plan.level;
          const isLower    = user?.vipLevel > plan.level;
          const isUpgrade  = user?.vipLevel > 0 && plan.level > user?.vipLevel;
          const isLocked   = !isCurrent && !isLower && !isUpgrade;

          return (
            <div key={plan._id}
              className={`rounded-2xl p-4 border transition-all ${c.border} ${c.bg}
                ${isCurrent ? 'ring-1 ring-green/40' : ''}
                ${isLower ? 'opacity-50 cursor-default' : ''}
                ${(isUpgrade || isLocked) ? 'hover:scale-[1.01] cursor-pointer' : ''}`}
              onClick={() => (isUpgrade || isLocked) && openDeposit(plan)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.border} bg-black/20`}>
                    <Crown size={18} className={c.icon} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-black text-base">{plan.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold bg-green/20 text-green border-green/30">
                          Activo
                        </span>
                      )}
                    </div>
                    <p className="text-faint text-xs">{plan.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-black text-lg">{fmtUSD(plan.price)}</p>
                  <p className="text-faint text-[11px]">pago único</p>
                </div>
              </div>

              {/* Benefits list */}
              <div className="space-y-2 mb-3">
                {(PLAN_BENEFITS[plan.level] || []).map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-1">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg} border ${c.border}`}>
                      <Icon size={13} className={c.icon} />
                    </div>
                    <span className="text-white text-xs font-medium">{text}</span>
                  </div>
                ))}
              </div>

              {/* Toggle proyección — visible para todos */}
              <button
                onClick={(e) => { e.stopPropagation(); setOpenProjection(openProjection === plan._id ? null : plan._id); }}
                className={`w-full flex items-center justify-center gap-1.5 py-2 mb-3 rounded-xl text-xs font-semibold transition-colors
                  ${openProjection === plan._id ? `${c.bg} ${c.icon} border ${c.border}` : 'bg-black/20 text-faint hover:text-white border border-white/10'}`}
              >
                {openProjection === plan._id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {openProjection === plan._id ? 'Ocultar proyección' : 'Ver proyección de ganancias'}
              </button>

              {openProjection === plan._id && (
                <PlanProjection plan={plan} colors={c} />
              )}

              <div className="mt-3" />

              {isCurrent ? (
                <div className="w-full py-2.5 text-sm flex items-center justify-center gap-2
                                bg-green/10 text-green rounded-xl font-semibold border border-green/25">
                  <CheckCircle size={14} /> Tu membresía actual
                </div>
              ) : isLower ? (
                <div className="w-full py-2.5 text-sm flex items-center justify-center gap-2
                                bg-surface text-faint rounded-xl border border-border">
                  Plan anterior
                </div>
              ) : isUpgrade ? (
                <button className="w-full py-2.5 text-sm flex items-center justify-center gap-2 rounded-xl font-bold transition-all
                                   border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20">
                  <Crown size={14} /> Upgrade a {plan.name}
                </button>
              ) : (
                <button className="btn-primary w-full flex items-center justify-center gap-2">
                  <Crown size={14} /> Activar {plan.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal recarga adicional */}
      <Modal
        isOpen={showRecharge}
        onClose={() => !rechargeSubmitting && setShowRecharge(false)}
        title="Agregar monto adicional"
      >
        <div className="space-y-4">
          <div className="rounded-xl p-3 flex items-start gap-2"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle size={15} className="text-green flex-shrink-0 mt-0.5" />
            <p className="text-green/80 text-xs">El monto que envíes será acreditado en USD a tu cuenta después de verificar el comprobante.</p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
            <p className="text-blue-400 font-semibold text-sm mb-1">🔵 Pago por PayPal</p>
            <p className="text-white text-sm">Envía el pago a:</p>
            <p className="text-white font-mono font-bold text-base mt-0.5">{PAYPAL_ACCOUNT}</p>
          </div>

          <div>
            <label className="text-sm text-muted mb-1.5 block">Monto a recargar (USD)</label>
            <input type="number" className="input-field" placeholder="Ej: 100"
              value={rechargeForm.amount} min="1" step="0.01"
              onChange={(e) => setRechargeForm({ ...rechargeForm, amount: e.target.value })} />
          </div>

          <div>
            <label className="text-sm text-muted mb-1.5 block">ID de transacción PayPal (opcional)</label>
            <input type="text" className="input-field" placeholder="Ej: 1AB23456CD789012E"
              value={rechargeForm.paypalTransactionId}
              onChange={(e) => setRechargeForm({ ...rechargeForm, paypalTransactionId: e.target.value })} />
          </div>

          <div>
            <p className="text-white font-semibold text-sm mb-2">Comprobante de pago</p>
            {!rechargeVoucherPreview ? (
              <label className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-border
                               rounded-xl cursor-pointer hover:border-green/50 transition-colors">
                <Upload size={24} className="text-faint" />
                <p className="text-muted text-sm text-center">Toca para subir el comprobante</p>
                <p className="text-faint text-xs">JPG, PNG, WEBP · Máx. 5MB</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleRechargeVoucher} />
              </label>
            ) : (
              <div className="relative">
                <img src={rechargeVoucherPreview} alt="Voucher" className="w-full rounded-xl object-cover max-h-40" />
                <button onClick={() => { setRechargeVoucher(null); setRechargeVoucherPreview(null); }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => !rechargeSubmitting && setShowRecharge(false)}
              className="btn-danger flex-1" disabled={rechargeSubmitting}>Cancelar</button>
            <button onClick={handleRechargeSubmit}
              disabled={rechargeSubmitting || !rechargeVoucher || !rechargeForm.amount}
              className="btn-success flex-1 flex items-center justify-center gap-2">
              {rechargeSubmitting ? <Spinner size="sm" /> : '✓ Enviar recarga'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de pago */}
      <Modal
        isOpen={!!selectedPlan}
        onClose={() => !submitting && setSelectedPlan(null)}
        title={selectedPlan ? `Activar ${selectedPlan.name}` : ''}
        size="md"
      >
        {selectedPlan && (
          <div className="space-y-4">
            {/* Resumen del plan */}
            <div className="rounded-xl p-3 flex justify-between items-center"
              style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
              <div>
                <p className="text-white font-bold">{selectedPlan.name}</p>
                <p className="text-green font-semibold text-sm">Recibes {fmtUSD(selectedPlan.usdBonus)} para trading</p>
              </div>
              <p className="text-gold font-black text-lg">{fmtUSD(selectedPlan.price)}</p>
            </div>

            {/* Instrucciones PayPal */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
              <p className="text-blue-400 font-semibold text-sm mb-1">🔵 Pago por PayPal</p>
              <p className="text-white text-sm">Envía el pago a:</p>
              <p className="text-white font-mono font-bold text-base mt-0.5">{PAYPAL_ACCOUNT}</p>
              <p className="text-gold font-bold mt-2">Monto exacto: {fmtUSD(selectedPlan.price)}</p>
            </div>

            {/* ID transacción */}
            <div>
              <label className="text-sm text-muted mb-1.5 block">ID de transacción PayPal (opcional)</label>
              <input type="text" className="input-field" placeholder="Ej: 1AB23456CD789012E"
                value={depositForm.paypalTransactionId}
                onChange={(e) => setDepositForm({ ...depositForm, paypalTransactionId: e.target.value })} />
            </div>

            {/* Voucher */}
            <div>
              <p className="text-white font-semibold text-sm mb-2">Captura de pantalla del pago</p>
              {!voucherPreview ? (
                <label className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-border
                                 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload size={24} className="text-faint" />
                  <p className="text-muted text-sm text-center">Toca para subir el comprobante</p>
                  <p className="text-faint text-xs">JPG, PNG, WEBP · Máx. 5MB</p>
                  <input type="file" accept="image/*" className="hidden" onChange={handleVoucherChange} />
                </label>
              ) : (
                <div className="relative">
                  <img src={voucherPreview} alt="Voucher" className="w-full rounded-xl object-cover max-h-40" />
                  <button onClick={() => { setVoucher(null); setVoucherPreview(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => !submitting && setSelectedPlan(null)} className="btn-danger flex-1" disabled={submitting}>
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={submitting || !voucher}
                className="btn-success flex-1 flex items-center justify-center gap-2">
                {submitting ? <Spinner size="sm" /> : '✓ Enviar pago'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
