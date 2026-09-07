import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, ArrowDownToLine,
  ArrowUpFromLine, BarChart3, LogOut, Menu, X, Shield, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/admin',                  icon: LayoutDashboard,    label: 'Dashboard',     exact: true },
  { to: '/admin/usuarios',         icon: Users,              label: 'Usuarios'       },
  { to: '/admin/depositos',        icon: ArrowDownToLine,    label: 'Depósitos'      },
  { to: '/admin/retiros',          icon: ArrowUpFromLine,    label: 'Retiros'        },
  { to: '/admin/transacciones',    icon: CreditCard,         label: 'Transacciones'  },
  { to: '/admin/estadisticas',     icon: BarChart3,          label: 'Estadísticas'   },
  { to: '/admin/precios',          icon: Zap,                label: 'Control Precios'},
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Sesión cerrada');
  };

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-40 w-64 bg-surface border-r border-border
                        flex flex-col transition-transform duration-300 ease-in-out
                        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <img src="/logo.svg" alt="Nova Trade" className="w-9 h-9" />
          <div>
            <p className="font-black text-white text-lg leading-none">NOVA <span className="text-primary">TRADE</span></p>
            <p className="text-faint text-xs flex items-center gap-1">
              <Shield size={10} /> Admin Panel
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors
                 ${isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-faint hover:text-white hover:bg-card'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center
                           text-primary font-bold text-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-faint text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-rose
                       hover:bg-rose/10 transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b border-border px-4 py-3
                          flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl hover:bg-card"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="text-sm text-faint">
            Panel de Administración
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
