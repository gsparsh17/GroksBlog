'use client';
import { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [admin, setAdmin] = useState(null);

  const verify = useCallback(async () => {
    const token = Cookies.get('admin_token');
    if (!token) { setIsLoading(false); return; }
    try {
      const res = await authApi.verify();
      setIsAuthenticated(true);
      setAdmin(res.data.admin);
    } catch {
      Cookies.remove('admin_token');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { verify(); }, [verify]);

  const logout = () => {
    Cookies.remove('admin_token');
    setIsAuthenticated(false);
    setAdmin(null);
    window.location.href = '/admin/login';
  };

  return { isAuthenticated, isLoading, admin, logout };
}
