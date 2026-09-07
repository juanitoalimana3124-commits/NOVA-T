import axios from 'axios';

// Token en memoria de módulo — no expuesto en window (protección XSS)
let _accessToken = null;
export const setAccessToken = (t) => { _accessToken = t; };
export const clearAccessToken = () => { _accessToken = null; };

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: attach token from module memory
api.interceptors.request.use(
  (config) => {
    if (_accessToken) {
      config.headers.Authorization = `Bearer ${_accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto-refresh on 401 TOKEN_EXPIRED
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Helpers
export const authAPI = {
  register:       (data) => api.post('/auth/register', data),
  login:          (data) => api.post('/auth/login', data),
  logout:         ()     => api.post('/auth/logout'),
  refresh:        ()     => api.post('/auth/refresh'),
  getMe:          ()     => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword:  (token, data) => api.post(`/auth/reset-password/${token}`, data),
  verifyEmail:    (email, code) => api.post('/auth/verify-email-code', { email, code })
};

export const userAPI = {
  getProfile:      () => api.get('/users/profile'),
  updateProfile:   (data) => api.put('/users/profile', data),
  changePassword:  (data) => api.put('/users/change-password', data),
  updateAvatar:    (formData) => api.put('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getTransactions: (params) => api.get('/users/transactions', { params })
};

export const vipAPI = {
  getPlans:    () => api.get('/vip/plans'),
  getPlan:     (id) => api.get(`/vip/plans/${id}`),
  getStatus:   () => api.get('/vip/status')
};

export const depositAPI = {
  create:    (formData) => api.post('/deposits', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMy:     (params) => api.get('/deposits/my', { params }),
  getAll:    (params) => api.get('/deposits', { params }),
  approve:   (id) => api.put(`/deposits/${id}/approve`),
  reject:    (id, data) => api.put(`/deposits/${id}/reject`, data)
};

export const withdrawalAPI = {
  create:    (data) => api.post('/withdrawals', data),
  getMy:     (params) => api.get('/withdrawals/my', { params }),
  getAll:    (params) => api.get('/withdrawals', { params }),
  complete:  (id) => api.put(`/withdrawals/${id}/complete`),
  reject:    (id, data) => api.put(`/withdrawals/${id}/reject`, data),
  reverse:   (id, data) => api.put(`/withdrawals/${id}/reverse`, data)
};



export const referralAPI = {
  getMy:     () => api.get('/referrals/my'),
  validate:  (code) => api.get(`/referrals/validate/${code}`)
};

export const notificationAPI = {
  getAll:      (params) => api.get('/notifications', { params }),
  markRead:    (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete:      (id) => api.delete(`/notifications/${id}`)
};

export const adminAPI = {
  getDashboard:      () => api.get('/admin/dashboard'),
  getStats:          () => api.get('/admin/stats'),
  getUsers:          (params) => api.get('/admin/users', { params }),
  getUserById:       (id) => api.get(`/admin/users/${id}`),
  banUser:           (id, data) => api.put(`/admin/users/${id}/ban`, data),
  adjustBalance:     (id, data) => api.post(`/admin/users/${id}/balance`, data),
  activateVip:       (id, data) => api.post(`/admin/users/${id}/activate-vip`, data),
  getTransactions:   (params) => api.get('/admin/transactions', { params }),
  getMarketStatus:   () => api.get('/admin/market-status'),
  setMarketStatus:   (key, open) => api.put('/admin/market-status', { key, open }),
  setBotGlobal:      (enabled) => api.post('/bot/admin/toggle', { enabled }),
  runBot:            () => api.post('/bot/admin/run'),
  getBotPlans:       () => api.get('/bot/admin/plans'),
  setPlanEarning:    (level, botDailyEarning) => api.put('/bot/admin/plan-earning', { level, botDailyEarning }),
};

export const botAPI = {
  toggle: () => api.post('/bot/toggle'),
  status: () => api.get('/bot/status'),
};
