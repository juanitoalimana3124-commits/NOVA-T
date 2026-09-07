import { useState, useEffect } from 'react';
import { Check, X, Eye, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { depositAPI } from '../../api/axios';
import Spinner from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await depositAPI.getAll({ status: statusFilter || undefined, page, limit: 20 });
      setDeposits(data.data);
      setPagination(data.pagination);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, page]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await depositAPI.approve(id);
      toast.success('Depósito aprobado.');
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al aprobar.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) { toast.error('Indica el motivo del rechazo.'); return; }
    setActionLoading(true);
    try {
      await depositAPI.reject(id, { rejectReason });
      toast.success('Depósito rechazado.');
      setSelected(null);
      setRejectReason('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al rechazar.');
    } finally {
      setActionLoading(false);
    }
  };

  const BANK_NAMES = { paypal: '🔵 PayPal', popular: 'Banco Popular', reservas: 'Banreservas', bhd: 'BHD León', scotiabank: 'Scotiabank', otra: 'Otro' };
  const fmtDep = (dep) => `$${Number(dep.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Depósitos</h1>
          <p className="text-muted text-sm">{pagination.total || 0} registros</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['pending', 'approved', 'rejected', ''].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors
                       ${statusFilter === s ? 'bg-primary text-white' : 'bg-card text-muted hover:text-white'}`}>
            {s === '' ? 'Todos' : s === 'pending' ? 'Pendientes' : s === 'approved' ? 'Aprobados' : 'Rechazados'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-2">
          {deposits.length === 0 && (
            <div className="card p-10 text-center text-muted">No hay depósitos.</div>
          )}
          {deposits.map((dep) => (
            <div key={dep._id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold">{dep.user?.name}</p>
                    <StatusBadge status={dep.status} />
                  </div>
                  <p className="text-faint text-xs">{dep.user?.email}</p>
                  <p className="text-muted text-xs mt-1">
                    {BANK_NAMES[dep.bank] || dep.bank} · {new Date(dep.createdAt).toLocaleString('es-DO')}
                  </p>
                  {dep.vipPlan && (
                    <p className="text-primary text-xs">Plan: {dep.vipPlan.name}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gold font-black text-lg">{fmtDep(dep)}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setSelected(dep)}
                      className="p-2 bg-card rounded-xl text-muted hover:text-white transition-colors">
                      <Eye size={14} />
                    </button>
                    {dep.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(dep._id)} disabled={actionLoading}
                          className="p-2 bg-green/15 rounded-xl text-green hover:bg-green/25 transition-colors">
                          <Check size={14} />
                        </button>
                        <button onClick={() => { setSelected(dep); setRejectReason(''); }}
                          className="p-2 bg-rose/15 rounded-xl text-rose hover:bg-rose/25 transition-colors">
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors
                         ${page === p ? 'bg-primary text-white' : 'bg-card text-muted hover:text-white'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => !actionLoading && setSelected(null)} title="Detalle del depósito">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-faint">Usuario</p><p className="text-white font-medium">{selected.user?.name}</p></div>
              <div><p className="text-faint">Monto</p><p className="text-gold font-bold">{fmtDep(selected)}</p></div>
              <div><p className="text-faint">Banco</p><p className="text-white">{BANK_NAMES[selected.bank] || selected.bank}</p></div>
              <div><p className="text-faint">Estado</p><StatusBadge status={selected.status} /></div>
              <div><p className="text-faint">Plan VIP</p><p className="text-primary">{selected.vipPlan?.name || 'N/A'}</p></div>
              <div><p className="text-faint">Fecha</p><p className="text-white text-xs">{new Date(selected.createdAt).toLocaleString('es-DO')}</p></div>
            </div>

            {selected.notes && (
              <div className="bg-card rounded-xl p-3">
                <p className="text-faint text-xs mb-1">Notas</p>
                <p className="text-muted text-sm">{selected.notes}</p>
              </div>
            )}

            {selected.voucherUrl && (
              <div>
                <p className="text-faint text-xs mb-2">Voucher</p>
                <img src={selected.voucherUrl} alt="Voucher"
                  className="w-full rounded-xl object-contain max-h-60 bg-card cursor-pointer"
                  onClick={() => window.open(selected.voucherUrl, '_blank')} />
              </div>
            )}

            {selected.status === 'pending' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted mb-1.5 block">Motivo de rechazo (requerido para rechazar)</label>
                  <textarea className="input-field resize-none" rows={2}
                    value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ej: Voucher ilegible, monto incorrecto..." />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleReject(selected._id)} disabled={actionLoading}
                    className="btn-danger flex-1 flex items-center justify-center gap-2">
                    {actionLoading ? <Spinner size="sm" /> : <><X size={14} /> Rechazar</>}
                  </button>
                  <button onClick={() => handleApprove(selected._id)} disabled={actionLoading}
                    className="btn-success flex-1 flex items-center justify-center gap-2">
                    {actionLoading ? <Spinner size="sm" /> : <><Check size={14} /> Aprobar</>}
                  </button>
                </div>
              </div>
            )}

            {selected.rejectReason && (
              <div className="bg-rose/10 border border-rose/30 rounded-xl p-3">
                <p className="text-rose text-sm"><strong>Motivo rechazo:</strong> {selected.rejectReason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
