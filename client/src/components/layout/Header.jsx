import { Bell, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const fmt = (n) => `RD$ ${Number(n || 0).toLocaleString('es-DO')}`;

export default function Header({ unreadCount = 0 }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg
                         flex items-center justify-center font-black text-sm text-white">
            BC
          </div>
          <span className="font-black text-lg bg-gradient-to-r from-primary to-cyan bg-clip-text text-transparent">
            64
          </span>
        </div>

        {/* Balance */}
        <div className="flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-full">
          <Wallet size={14} className="text-gold" />
          <span className="text-gold font-bold text-sm">{fmt(user?.balance)}</span>
        </div>

        {/* Notifications */}
        <Link to="/notificaciones" className="relative p-2 rounded-xl hover:bg-card transition-colors">
          <Bell size={20} className="text-muted" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose rounded-full
                           text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
