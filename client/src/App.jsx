import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute, GuestRoute } from './components/guards/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import AdminLayout from './components/layout/AdminLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

// App pages
import HomePage from './pages/app/HomePage';
import VipPage from './pages/app/VipPage';
import ReferralsPage from './pages/app/ReferralsPage';

import ProfilePage from './pages/app/ProfilePage';
import NotificationsPage from './pages/app/NotificationsPage';
import WithdrawPage from './pages/app/WithdrawPage';
import MarketPage from './pages/app/MarketPage';
import TradePage from './pages/app/TradePage';
import BotPage from './pages/app/BotPage';
import PortfolioPage from './pages/app/PortfolioPage';
import HistoryPage from './pages/app/HistoryPage';
import CryptoDetailPage from './pages/app/CryptoDetailPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDeposits from './pages/admin/AdminDeposits';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminStats from './pages/admin/AdminStats';
import AdminPrices from './pages/admin/AdminPrices';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#13132A',
              color: '#fff',
              border: '1px solid #2A2A4A',
              borderRadius: '12px',
              fontSize: '14px'
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#F43F5E', secondary: '#fff' } }
          }}
        />
        <Routes>
          {/* Auth */}
          <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/registro" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/recuperar-contrasena" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          <Route path="/nueva-contrasena" element={<ResetPasswordPage />} />
          <Route path="/verificar-email" element={<VerifyEmailPage />} />

          {/* App */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index              element={<HomePage />} />
            <Route path="mercado"     element={<MarketPage />} />
            <Route path="operar"      element={<TradePage />} />
            <Route path="vip"         element={<VipPage />} />
            <Route path="referidos"   element={<ReferralsPage />} />
            <Route path="perfil"      element={<ProfilePage />} />
            <Route path="notificaciones" element={<NotificationsPage />} />
            <Route path="retiro"      element={<WithdrawPage />} />
            <Route path="bot"         element={<BotPage />} />
            <Route path="portafolio"  element={<PortfolioPage />} />
            <Route path="historial"   element={<HistoryPage />} />
            <Route path="crypto/:id"  element={<CryptoDetailPage />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index                element={<AdminDashboard />} />
            <Route path="usuarios"      element={<AdminUsers />} />
            <Route path="depositos"     element={<AdminDeposits />} />
            <Route path="retiros"       element={<AdminWithdrawals />} />
            <Route path="transacciones" element={<AdminTransactions />} />
            <Route path="estadisticas"  element={<AdminStats />} />
            <Route path="precios"       element={<AdminPrices />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
