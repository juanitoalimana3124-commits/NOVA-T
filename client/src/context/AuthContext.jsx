import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI, setAccessToken, clearAccessToken } from '../api/axios';
import usePushNotifications from '../hooks/usePushNotifications';

const AuthContext = createContext(null);

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutos en ms
const LAST_ACTIVITY_KEY = 'nova_last_activity';
const SESSION_ALIVE_KEY = 'nova_session_alive'; // sessionStorage — se borra al cerrar

// Registra actividad del usuario
const recordActivity = () => {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
};

// Marca que la sesión está viva en esta pestaña
const markSessionAlive = () => {
  sessionStorage.setItem(SESSION_ALIVE_KEY, '1');
};

// Verifica si la sesión expiró por inactividad al cerrar el navegador
const isSessionExpired = () => {
  const sessionAlive = sessionStorage.getItem(SESSION_ALIVE_KEY);
  if (sessionAlive) return false; // la pestaña nunca se cerró, sigue activa

  // La pestaña/navegador fue cerrado — verificar cuánto tiempo pasó
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) return false; // primer uso, no hay historial

  const elapsed = Date.now() - parseInt(lastActivity, 10);
  return elapsed > INACTIVITY_LIMIT;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef(null);

  // Reinicia el timer de inactividad mientras la pestaña está abierta
  const resetInactivityTimer = useCallback(() => {
    recordActivity();
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(async () => {
      // 30 min sin actividad con la pestaña abierta → logout automático
      try { await authAPI.logout(); } catch {}
      clearAccessToken();
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      sessionStorage.removeItem(SESSION_ALIVE_KEY);
      setUser(null);
      window.location.href = '/login?reason=inactivity';
    }, INACTIVITY_LIMIT);
  }, []);

  // Escuchar eventos de actividad del usuario
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handler = () => resetInactivityTimer();

    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetInactivityTimer(); // iniciar el timer al montar

    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearTimeout(inactivityTimer.current);
    };
  }, [user, resetInactivityTimer]);

  // Cargar usuario al iniciar
  useEffect(() => {
    const initAuth = async () => {
      // Si el navegador estuvo cerrado más de 30 min → forzar logout
      if (isSessionExpired()) {
        try { await authAPI.logout(); } catch {}
        clearAccessToken();
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const refreshRes = await authAPI.refresh();
        setAccessToken(refreshRes.data.accessToken);
        const meRes = await authAPI.getMe();
        setUser(meRes.data.user);
        markSessionAlive();
        recordActivity();
      } catch {
        setUser(null);
        clearAccessToken();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    markSessionAlive();
    recordActivity();
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password, referralCode) => {
    const { data } = await authAPI.register({ name, email, password, referralCode });
    setAccessToken(data.accessToken);
    setUser(data.user);
    markSessionAlive();
    recordActivity();
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    clearAccessToken();
    clearTimeout(inactivityTimer.current);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    sessionStorage.removeItem(SESSION_ALIVE_KEY);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authAPI.getMe();
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  }, []);

  usePushNotifications(!!user);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isSuperAdmin: user?.role === 'superadmin',
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
