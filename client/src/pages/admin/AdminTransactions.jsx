import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/axios';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

const TYPE_LABELS = {
  deposit: 'Depósito', withdrawal: 'Retiro', task_reward: 'Tarea',
  vip_purchase: 'Plan VIP', roulette_win: 'Ruleta',
  referral_commission: 'Comisión Ref.', admin_credit: 'Crédito Admin', admin_debit: 'Débito Admin'
};

const TYPE_VARIANTS = {
  deposit: 'success', withdrawal: 'danger', task_reward: 'warning',
  roulette_win: 'cyan', referral_commission: 'success',
  admin_credit: 'success', admin_debit: 'danger', vip_purchase: 'primary'
};

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [totals, setTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getTransactions({ type: typeFilter || undefined, page, limit: 30 });
      setTransactions(data.data);
      setTotals(data.totals || []);
      setPagination(data.pagination);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [typeFilter, page]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Transacciones</h1>
        <p className="text-muted text-sm">Todos los movimientos de la plataforma</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {totals.map(({ _id: type, total, count }) => (
          <div key={type} className="card p-3">
            <Badge variant={TYPE_VARIANTS[type] || 'default'}>{TYPE_LABELS[type] || type}</Badge>
            <p className={`font-black text-lg mt-2 ${total >= 0 ? 'text-green' : 'text-rose'}`}>
              {total >= 0 ? '+' : ''}{fmt(total)}
            </p>
            <p className="text-faint text-xs">{count} operaciones</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => { setTypeFilter(''); setPage(1); }}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors
                     ${typeFilter === '' ? 'bg-primary text-white' : 'bg-card text-muted hover:text-white'}`}>
          Todos
        </button>
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => { setTypeFilter(key); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors
                       ${typeFilter === key ? 'bg-primary text-white' : 'bg-card text-muted hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-border">
            {transactions.length === 0 && (
              <p className="text-center text-muted p-10">No hay transacciones.</p>
            )}
            {transactions.map((tx) => (
              <div key={tx._id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-sm font-medium">{tx.user?.name || 'Admin'}</p>
                    <Badge variant={TYPE_VARIANTS[tx.type] || 'default'}>
                      {TYPE_LABELS[tx.type] || tx.type}
                    </Badge>
                  </div>
                  <p className="text-faint text-xs truncate">{tx.description}</p>
                  <p className="text-faint text-xs">{new Date(tx.createdAt).toLocaleString('es-DO')}</p>
                </div>
                <p className={`font-bold text-sm flex-shrink-0 ${tx.amount >= 0 ? 'text-green' : 'text-rose'}`}>
                  {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 flex-wrap">
          {Array.from({ length: Math.min(pagination.pages, 8) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors
                         ${page === p ? 'bg-primary text-white' : 'bg-card text-muted hover:text-white'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
