import { useState, useEffect } from 'react';
import { Search, Ban, CheckCircle, DollarSign, Crown, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../api/axios';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selected, setSelected] = useState(null);
  const [balanceForm, setBalanceForm] = useState({ amount: '', description: '' });
  const [vipForm, setVipForm] = useState({ vipLevel: '1' });
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // info | balance | vip

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getUsers({ search, page, limit: 20 });
      setUsers(data.data);
      setPagination(data.pagination);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, page]);

  const handleBan = async (user, ban) => {
    const reason = ban ? prompt('Motivo de suspensión (opcional):') : undefined;
    if (ban && reason === null) return; // Cancelado
    setActionLoading(true);
    try {
      await adminAPI.banUser(user._id, { ban, reason: reason || undefined });
      toast.success(`Usuario ${ban ? 'suspendido' : 'reactivado'}.`);
      load();
      if (selected?._id === user._id) {
        setSelected({ ...selected, isBanned: ban, banReason: reason });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBalance = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await adminAPI.adjustBalance(selected._id, balanceForm);
      toast.success('Balance ajustado.');
      setBalanceForm({ amount: '', description: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVip = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await adminAPI.activateVip(selected._id, vipForm);
      toast.success('Plan VIP activado.');
      setVipForm({ vipLevel: '1' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Usuarios</h1>
        <p className="text-muted text-sm">{pagination.total || 0} usuarios registrados</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input type="text" className="input-field pl-10" placeholder="Buscar por nombre, email o código..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-2">
          {users.length === 0 && <div className="card p-10 text-center text-muted">No hay usuarios.</div>}
          {users.map((user) => (
            <div key={user._id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center
                               text-primary font-bold flex-shrink-0">
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium">{user.name}</p>
                    {user.vipLevel > 0 && <Badge variant="warning">VIP {user.vipLevel}</Badge>}
                    {user.isBanned && <Badge variant="danger">Baneado</Badge>}
                    {!user.isActive && <Badge variant="default">Inactivo</Badge>}
                  </div>
                  <p className="text-faint text-xs truncate">{user.email}</p>
                  <p className="text-muted text-xs">${Number(user.usdBalance || 0).toFixed(2)} USD</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => { setSelected(user); setActiveTab('info'); }}
                    className="p-2 bg-card rounded-xl text-muted hover:text-white">
                    <Eye size={14} />
                  </button>
                  {!user.isBanned ? (
                    <button onClick={() => handleBan(user, true)} disabled={actionLoading}
                      className="p-2 bg-rose/10 rounded-xl text-rose hover:bg-rose/20">
                      <Ban size={14} />
                    </button>
                  ) : (
                    <button onClick={() => handleBan(user, false)} disabled={actionLoading}
                      className="p-2 bg-green/10 rounded-xl text-green hover:bg-green/20">
                      <CheckCircle size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 flex-wrap">
          {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors
                         ${page === p ? 'bg-primary text-white' : 'bg-card text-muted hover:text-white'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* User Modal */}
      <Modal isOpen={!!selected} onClose={() => !actionLoading && setSelected(null)} title={selected?.name} size="lg">
        {selected && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-border pb-3">
              {['info', 'balance', 'vip'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize
                             ${activeTab === tab ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>
                  {tab === 'balance' ? 'Balance' : tab === 'vip' ? 'Plan VIP' : 'Info'}
                </button>
              ))}
            </div>

            {activeTab === 'info' && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Email',          value: selected.email },
                  { label: 'Balance trading', value: `$${Number(selected.usdBalance || 0).toFixed(2)} USD` },
                  { label: 'VIP',            value: selected.vipLevel > 0 ? `VIP ${selected.vipLevel}` : 'Sin VIP' },
                  { label: 'Rol',            value: selected.role },
                  { label: 'Código referido',value: selected.referralCode },
                  { label: 'Registrado',     value: new Date(selected.createdAt).toLocaleDateString('es-DO') },
                  { label: 'Estado',         value: selected.isBanned ? '🔴 Baneado' : selected.isActive ? '🟢 Activo' : '⚫ Inactivo' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-faint text-xs">{label}</p>
                    <p className="text-white font-medium">{value}</p>
                  </div>
                ))}
                {selected.banReason && (
                  <div className="col-span-2 bg-rose/10 border border-rose/30 rounded-xl p-2">
                    <p className="text-rose text-xs"><strong>Motivo ban:</strong> {selected.banReason}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'balance' && (
              <form onSubmit={handleBalance} className="space-y-3">
                <p className="text-muted text-sm">
                  Balance actual: <span className="text-gold font-bold">{fmt(selected.usdBalance)}</span>
                </p>
                <div>
                  <label className="text-sm text-muted mb-1.5 block">
                    Monto (positivo para acreditar, negativo para debitar)
                  </label>
                  <input type="number" className="input-field"
                    placeholder="Ej: 500 o -200"
                    value={balanceForm.amount}
                    onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })}
                    required />
                </div>
                <div>
                  <label className="text-sm text-muted mb-1.5 block">Descripción</label>
                  <input type="text" className="input-field"
                    placeholder="Motivo del ajuste"
                    value={balanceForm.description}
                    onChange={(e) => setBalanceForm({ ...balanceForm, description: e.target.value })} />
                </div>
                <button type="submit" disabled={actionLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {actionLoading ? <Spinner size="sm" /> : <><DollarSign size={14} /> Ajustar balance</>}
                </button>
              </form>
            )}

            {activeTab === 'vip' && (
              <form onSubmit={handleVip} className="space-y-3">
                <p className="text-muted text-sm">
                  VIP actual: <span className="text-gold font-bold">{selected.vipLevel > 0 ? `VIP ${selected.vipLevel}` : 'Sin VIP'}</span>
                </p>
                <div>
                  <label className="text-sm text-muted mb-1.5 block">Nivel VIP a activar</label>
                  <select className="input-field" value={vipForm.vipLevel}
                    onChange={(e) => setVipForm({ ...vipForm, vipLevel: e.target.value })}>
                    {[1, 2, 3, 4].map((l) => (
                      <option key={l} value={l}>VIP {l}</option>
                    ))}
                  </select>
                </div>
                <p className="text-faint text-xs">El plan VIP es permanente y acredita el bono USD al usuario automáticamente.</p>
                <button type="submit" disabled={actionLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {actionLoading ? <Spinner size="sm" /> : <><Crown size={14} /> Activar plan VIP</>}
                </button>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
