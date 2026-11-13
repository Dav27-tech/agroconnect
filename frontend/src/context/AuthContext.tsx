'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  login: (phoneNumber: string, pass: string) => Promise<void>;
  register: (data: {
    phoneNumber: string;
    fullName: string;
    password: string;
    email?: string;
    roles?: string[];
    role?: string;
  }) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
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

  const login = useCallback(async (phoneNumber: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(phoneNumber, pass);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('agroconnect_token', res.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: {
    phoneNumber: string;
    fullName: string;
    password: string;
    email?: string;
    roles?: string[];
    role?: string;
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
  }, []);

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

