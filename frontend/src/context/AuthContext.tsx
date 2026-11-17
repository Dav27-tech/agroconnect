'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (data: {
    phoneNumber: string;
    fullName: string;
    password: string;
    email: string;
    role: 'BUYER' | 'SELLER';
    province?: string;
    city?: string;
  }) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hydratation de la session au démarrage
  useEffect(() => {
    async function hydrate() {
      const storedToken = localStorage.getItem('agroconnect_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      try {
        const currentUser = await api.auth.me();
        setUser(currentUser);
      } catch (err) {
        console.warn('Session expirée ou invalide :', err);
        localStorage.removeItem('agroconnect_token');
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    hydrate();
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(email, pass);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('agroconnect_token', res.token);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: {
    phoneNumber: string;
    fullName: string;
    password: string;
    email: string;
    role: 'BUYER' | 'SELLER';
    province?: string;
    city?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(data);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('agroconnect_token', res.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('agroconnect_token');
    router.replace('/');
  }, [router]);

  useEffect(() => {
    if (!token) return;

    try {
      const encodedPayload = token.split('.')[1];
      if (!encodedPayload) throw new Error('Jeton invalide');
      const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '='))) as { exp?: number };
      if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
        throw new Error('Expiration de session invalide');
      }

      const remainingTime = payload.exp * 1000 - Date.now();
      if (remainingTime <= 0) {
        logout();
        return;
      }

      const timeoutId = window.setTimeout(logout, remainingTime);
      return () => window.clearTimeout(timeoutId);
    } catch (error) {
      console.warn('Impossible de vérifier l’expiration de la session :', error);
      logout();
    }
  }, [token, logout]);

  const hasRole = useCallback(
    (role: UserRole): boolean => {
      if (!user) return false;
      return user.roles?.includes(role) || false;
    },
    [user]
  );

  const isSeller = Boolean(user && (user.roles?.includes('SELLER') || user.sellerId));
  const isAdmin = Boolean(user && user.roles?.includes('ADMIN'));

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(user),
        isSeller,
        isAdmin,
        login,
        register,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

