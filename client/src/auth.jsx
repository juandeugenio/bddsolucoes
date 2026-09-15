import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bdd.user'));
    } catch {
      return null;
    }
  });
  // Não há token no localStorage: sessão vive no cookie HttpOnly.
  // Sempre que a página carrega, pergunta ao servidor quem é o usuário.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/auth/me')
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        localStorage.setItem('bdd.user', JSON.stringify(data.user));
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        localStorage.removeItem('bdd.user');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('bdd.user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (userName, email, password) => {
    const data = await api.post('/auth/register', { userName, email, password });
    localStorage.setItem('bdd.user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignora */ }
    localStorage.removeItem('bdd.user');
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('bdd.user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}