'use client';

import React, { createContext, useContext, useEffect, useSyncExternalStore, ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

class RealtimeStore {
  private socket: Socket | null = null;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.socket;

  setSocket = (socket: Socket | null) => {
    this.socket = socket;
    this.listeners.forEach((listener) => listener());
  };
}

const RealtimeContext = createContext<RealtimeStore | null>(null);
const subscribeToNothing = () => () => {};
const getNoSocket = () => null;

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token, isLoading } = useAuth();
  const [store] = React.useState(() => new RealtimeStore());

  useEffect(() => {
    if (isLoading) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const socketUrl = apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    const connection = io(socketUrl, {
      autoConnect: false,
      auth: token ? { token } : {},
    });
    connection.on('connect_error', (error) => {
      console.error('Connexion temps réel impossible :', error.message);
    });
    connection.connect();
    store.setSocket(connection);

    return () => {
      connection.disconnect();
      if (store.getSnapshot() === connection) store.setSocket(null);
    };
  }, [isLoading, store, token]);

  return (
    <RealtimeContext.Provider value={store}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): Socket | null {
  const store = useContext(RealtimeContext);
  const socket = useSyncExternalStore(
    store?.subscribe ?? subscribeToNothing,
    store?.getSnapshot ?? getNoSocket,
    getNoSocket,
  );
  if (!store) throw new Error('useRealtime must be used within a RealtimeProvider');
  return socket;
}
