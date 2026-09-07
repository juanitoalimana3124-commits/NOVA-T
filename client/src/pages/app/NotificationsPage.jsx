import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { notificationAPI } from '../../api/axios';
import Spinner from '../../components/ui/Spinner';

const TYPE_ICONS = {
  system:     '🔔',
  task:       '✅',
  deposit:    '💰',
  withdrawal: '💸',
  vip:        '👑',
  referral:   '👥',
  roulette:   '🎰',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = async () => {
    try {
      const { data } = await notificationAPI.getAll({ limit: 50 });
      setNotifications(data.data || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Todas marcadas como leídas.');
    } catch {}
  };

  const handleMarkRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationAPI.delete(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('Notificación eliminada.');
    } catch {}
  };

  return (
    <div className="px-4 py-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-xl hover:bg-card text-muted hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Notificaciones</h1>
            {unreadCount > 0 && (
              <p className="text-muted text-xs">{unreadCount} sin leer</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <CheckCheck size={14} />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : notifications.length === 0 ? (
        <div className="card p-10 text-center">
          <Bell size={40} className="text-faint mx-auto mb-3" />
          <p className="text-white font-medium">Sin notificaciones</p>
          <p className="text-muted text-sm mt-1">Aquí aparecerán tus alertas y mensajes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => handleMarkRead(notif._id, notif.isRead)}
              className={`card p-4 cursor-pointer transition-all
                         ${!notif.isRead
                           ? 'border-primary/40 bg-primary/5 hover:border-primary/60'
                           : 'opacity-60 hover:opacity-80'}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">
                  {TYPE_ICONS[notif.type] || '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${!notif.isRead ? 'text-white' : 'text-muted'}`}>
                      {notif.title}
                    </p>
                    <button
                      onClick={(e) => handleDelete(e, notif._id)}
                      className="text-faint hover:text-rose transition-colors flex-shrink-0 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-faint text-xs mt-0.5 leading-relaxed">{notif.message}</p>
                  <p className="text-faint text-[10px] mt-1.5">
                    {new Date(notif.createdAt).toLocaleDateString('es-DO', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2 animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
