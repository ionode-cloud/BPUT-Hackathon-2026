import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

// Role permission map
const ROLE_PERMISSIONS = {
  'Super Admin': ['all'], // Only Super Admin can see and modify audit logs
  'Group ESG Admin': ['dashboard', 'organizations', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'approvals', 'reports', 'analytics', 'notifications', 'users'],
  'Subsidiary Admin': ['dashboard', 'organizations', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'approvals', 'reports', 'analytics', 'notifications'],
  'Business Unit Manager': ['dashboard', 'esg', 'environmental', 'social', 'governance', 'validation', 'documents', 'approvals', 'reports', 'analytics', 'notifications'],
  'Project/Department User': ['dashboard', 'esg', 'environmental', 'social', 'governance', 'documents', 'notifications'],
  'ESG Manager': ['dashboard', 'organizations', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'approvals', 'reports', 'analytics', 'notifications'],
  'Compliance Officer': ['dashboard', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'approvals', 'reports', 'analytics', 'notifications'],
  'Management': ['dashboard', 'organizations', 'esg', 'environmental', 'social', 'governance', 'brsr', 'reports', 'analytics', 'notifications'],
  'Auditor/Reviewer': ['dashboard', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'approvals', 'reports', 'analytics', 'notifications'],
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('esg360_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('esg360_token');
    if (token) {
      authService.getProfile()
        .then(res => {
          setUser(res.data.data);
          localStorage.setItem('esg360_user', JSON.stringify(res.data.data));
        })
        .catch(() => {
          localStorage.removeItem('esg360_token');
          localStorage.removeItem('esg360_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authService.login({ email, password });
    const { user: userData, token } = res.data.data;
    localStorage.setItem('esg360_token', token);
    localStorage.setItem('esg360_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (formData) => {
    const res = await authService.register(formData);
    const { user: userData, token } = res.data.data;
    localStorage.setItem('esg360_token', token);
    localStorage.setItem('esg360_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('esg360_token');
    localStorage.removeItem('esg360_user');
    setUser(null);
  }, []);

  const hasPermission = useCallback((module) => {
    if (!user) return false;
    const perms = ROLE_PERMISSIONS[user.role] || [];
    return perms.includes('all') || perms.includes(module);
  }, [user]);

  const isAdmin = user && ['Super Admin', 'Group ESG Admin', 'Subsidiary Admin'].includes(user.role);
  const isReviewer = user && ['Super Admin', 'Group ESG Admin', 'ESG Manager', 'Compliance Officer', 'Auditor/Reviewer'].includes(user.role);
  const isSuperAdmin = user?.role === 'Super Admin';

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    hasPermission,
    isAdmin,
    isReviewer,
    isSuperAdmin,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
