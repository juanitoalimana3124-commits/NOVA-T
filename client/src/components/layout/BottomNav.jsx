import { NavLink } from 'react-router-dom';
import { Home, Crown, Bot, User, TrendingUp } from 'lucide-react';

const navItems = [
  { to: '/',       icon: Home,       label: 'Inicio'  },
  { to: '/operar', icon: TrendingUp, label: 'Operar'  },
  { to: '/vip',    icon: Crown,      label: 'VIP'     },
  { to: '/bot',    icon: Bot,        label: 'Bot'     },
  { to: '/perfil', icon: User,       label: 'Cuenta'  },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition-colors duration-150
               ${isActive ? 'text-primary' : 'text-faint hover:text-muted'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-all duration-150
                                ${isActive ? 'bg-primary/15' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
