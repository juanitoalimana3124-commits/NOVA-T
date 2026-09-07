import { useState, useEffect } from 'react';
import { Check, X, Eye, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { withdrawalAPI } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

export default function AdminWithdrawals() {
  const { user: adminUser } = useAuth();
  const isSuperAdmin = adminUser?.role === 'superadmin';

  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reverseReason, setReverseReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(null); // withdrawal a confirmar

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await withdrawalAPI.getAll({ status: statusFilter || undefined, page, limit: 20 });
      setWithdrawals(data.data);
      setPagination(data.pagination);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, page]);

  const handleComplete = async (id) => {
    setActionLoading(true);
    try {
      await withdrawalAPI.complete(id);
      toast.success('Retiro marcado como completado.');
      setConfirmComplete(null);
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) { toast.error('Indica el motivo del rechazo.'); return; }
    setActionLoading(true);
    try {
      await withdrawalAPI.reject(id, { rejectReason });
      toast.success('Retiro rechazado y balance devuelto al usuario.');
      setSelected(null);
      setRejectReason('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async (id) => {
    if (!reverseReason.trim()) { toast.error('Indica el motivo de la reversión.'); return; }
    setActionLoading(true);
    try {
      await withdrawalAPI.reverse(id, { reverseReason });
      toast.success('Retiro revertido. Balance devuelto al usuario.');
      setSelected(null);
      setReverseReason('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error.');
    } finally {
      setActionLoading(false);
    }
  };

  const FILTERS = ['pending', 'processing', 'completed', 'rejected', 'reversed', ''];
  const FILTER_LABELS = {
    pending: 'Pendientes', processing: 'Procesando', completed: 'Completados',
    rejected: 'Rechazados', reversed: 'Revertidos', '': 'Todos'
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Retiros</h1>
        <p className="text-muted text-sm">{pagination.total || 0} registros</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors
                       ${statusFilter === s ? 'bg-primary text-white' : 'bg-card text-muted hover:text-white'}`}>
            {FILTER_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-2">
          {withdrawals.length === 0 && <div className="card p-10 text-center text-muted">No hay retiros.</div>}
          {withdrawals.map((w) => (
            <div key={w._id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">{w.user?.name}</p>
                    <StatusBadge status={w.status} />
                  </div>
                  <p className="text-faint text-xs">{w.user?.email}</p>
                  <p className="text-muted text-xs mt-1">
                    {w.method === 'paypal' ? `🔵 PayPal: ${w.paypalEmail}` : `🏦 ${w.bankName}`}
                    {' · '}{new Date(w.createdAt).toLocaleString('es-DO')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-rose font-black text-lg">{fmt(w.amount)}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { setSelected(w); setRejectReason(''); setReverseReason(''); }}
                      className="p-2 bg-card rounded-xl text-muted hover:text-white">
                      <Eye size={14} />
                    </button>
                    {['pending', 'processing'].includes(w.status) && (
                      <>
                        {/* Completar abre confirmación primero */}
                        <button onClick={() => setConfirmComplete(w)} disabled={actionLoading}
                          className="p-2 bg-green/15 rounded-xl text-green hover:bg-green/25">
                          <Check size={14} />
                        </button>
                        <button onClick={() => { setSelected(w); setRejectReason(''); }}
                          className="p-2 bg-rose/15 rounded-xl text-rose hover:bg-rose/25">
                          <X size={14} />
                        </button>
                      </>
                    )}
                    {w.status === 'completed' && isSuperAdmin && (
                      <button onClick={() => { setSelected(w); setReverseReason(''); }}
                        className="p-2 bg-amber-500/15 rounded-xl text-amber-400 hover:bg-amber-500/25"
                        title="Revertir retiro">
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Modal confirmación de completar */}
      <Modal isOpen={!!confirmComplete} onClose={() => !actionLoading && setConfirmComplete(null)}
        title="Confirmar pago de retiro">
        {confirmComplete && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300">
              ⚠️ Asegúrate de haber enviado el pago antes de marcar como completado. Esta acción
              descuenta el balance del usuario permanentemente.
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-faint">Usuario</p><p className="text-white font-medium">{confirmComplete.user?.name}</p></div>
              <div><p className="text-faint">Monto</p><p className="text-rose font-bold">{fmt(confirmComplete.amount)}</p></div>
              <div className="col-span-2">
                <p className="text-faint">PayPal</p>
                <p className="text-white font-mono">{confirmComplete.paypalEmail}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmComplete(null)} disabled={actionLoading}
                className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleComplete(confirmComplete._id)} disabled={actionLoading}
                className="btn-success flex-1 flex items-center justify-center gap-2">
                {actionLoading ? <Spinner size="sm" /> : <><Check size={14} /> Sí, marcar completado</>}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal detalle / rechazar / revertir */}
      <Modal isOpen={!!selected} onClose={() => !actionLoading && setSelected(null)} title="Detalle del retiro">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-faint">Usuario</p><p className="text-white font-medium">{selected.user?.name}</p></div>
              <div><p className="text-faint">Monto</p><p className="text-rose font-bold">{fmt(selected.amount)}</p></div>
              <div><p className="text-faint">Método</p>
                <p className="text-white">{selected.method === 'paypal' ? '🔵 PayPal' : '🏦 Banco'}</p>
              </div>
              <div><p className="text-faint">Estado</p><StatusBadge status={selected.status} /></div>
              {selected.method === 'paypal' ? (
                <div className="col-span-2">
                  <p className="text-faint">Correo PayPal</p>
                  <p className="text-white font-mono">{selected.paypalEmail}</p>
                </div>
              ) : (
                <>
                  <div><p className="text-faint">Banco</p><p className="text-white">{selected.bankName}</p></div>
                  <div><p className="text-faint">N° Cuenta</p><p className="text-white font-mono">{selected.bankAccount}</p></div>
                  <div className="col-span-2"><p className="text-faint">Titular</p><p className="text-white">{selected.accountHolder}</p></div>
                </>
              )}
            </div>

            {/* Rechazar — solo para pendientes */}
            {['pending', 'processing'].includes(selected.status) && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted mb-1.5 block">Motivo de rechazo <span className="text-rose">*</span></label>
                  <textarea className="input-field resize-none" rows={2}
                    value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Describe el motivo..." />
                </div>
                <button onClick={() => handleReject(selected._id)} disabled={actionLoading}
                  className="btn-danger w-full flex items-center justify-center gap-2">
                  {actionLoading ? <Spinner size="sm" /> : <><X size={14} /> Rechazar y devolver balance</>}
                </button>
              </div>
            )}

            {/* Revertir — solo para completados, solo superadmin */}
            {selected.status === 'completed' && isSuperAdmin && (
              <div className="space-y-3">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
                  ↩️ Revertir devolverá ${selected.amount?.toFixed(2)} USD al balance del usuario y
                  cambiará el estado a "revertido".
                </div>
                <div>
                  <label className="text-sm text-muted mb-1.5 block">Motivo de reversión <span className="text-rose">*</span></label>
                  <textarea className="input-field resize-none" rows={2}
                    value={reverseReason} onChange={(e) => setReverseReason(e.target.value)}
                    placeholder="Ej: Error de admin, retiro no enviado..." />
                </div>
                <button onClick={() => handleReverse(selected._id)} disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-sm
                             bg-amber-500/20 text-amber-300 hover:bg-amber-500/30
                             flex items-center justify-center gap-2 transition-colors">
                  {actionLoading ? <Spinner size="sm" /> : <><RotateCcw size={14} /> Revertir retiro</>}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
