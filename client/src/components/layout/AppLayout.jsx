import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, TrendingUp, Crown, Users, BarChart2, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationAPI } from '../../api/axios';

const NAV = [
  { to: '/',          icon: Home,       label: 'Inicio'   },
  { to: '/mercado',   icon: TrendingUp, label: 'Mercado'  },
  { to: '/operar',    icon: BarChart2,  label: 'Operar'   },
  { to: '/vip',       icon: Crown,      label: 'VIP'      },
  { to: '/referidos', icon: Users,      label: 'Referidos'},
];

export default function AppLayout() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await notificationAPI.getAll({ limit: 1 });
        setUnread(data.unreadCount || 0);
      } catch {}
    };
    fetch();
    const id = setInterval(fetch, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col min-h-dvh bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border"
        style={{ background: 'rgba(10,10,15,0.88)', backdropFilter: 'blur(16px)' }}>
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Nova Trade" className="w-9 h-9" />
          <div className="flex items-baseline gap-1">
            <span className="text-white font-black text-base tracking-wide">NOVA</span>
            <span className="text-primary font-black text-base tracking-wide">TRADE</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/notificaciones" className="relative">
            <Bell size={20} className="text-muted hover:text-white transition-colors" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </NavLink>
          <NavLink to="/perfil">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-primary text-xs font-black">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
          </NavLink>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-nav">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border"
        style={{ background: 'rgba(10,10,15,0.96)', backdropFilter: 'blur(16px)' }}>
        <div className="flex">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all ${
                  isActive ? 'text-primary' : 'text-faint hover:text-muted'
                }`
              }>
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-primary/15' : ''}`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
