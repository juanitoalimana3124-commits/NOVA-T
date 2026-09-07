import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FullPageSpinner } from '../ui/Spinner';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  return children;
}

export function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!isAdmin) return <Navigate to="/" state={{ from: location }} replace />;

  return children;
}

export function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return children;
}
