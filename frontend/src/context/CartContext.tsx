'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, startTransition, ReactNode } from 'react';
import { SellerOfferItem, SaleType, CartCalculationResult } from '../types';
import { api } from '../services/api';
import { useRealtime } from './RealtimeContext';

export interface CartItemState {
  offerId: string;
  quantity: number;
  saleType: SaleType;
  offer: SellerOfferItem;
}

interface CartContextType {
  items: CartItemState[];
  isCartHydrated: boolean;
  calculation: CartCalculationResult | null;
  isLoadingCalculation: boolean;
  addToCart: (offer: SellerOfferItem, quantity: number, saleType: SaleType) => void;
  updateQuantity: (offerId: string, quantity: number, saleType: SaleType) => void;
  removeFromCart: (offerId: string, saleType: SaleType) => void;
  clearCart: () => void;
  totalItemsCount: number;
  refreshCalculation: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const socket = useRealtime();
  const [items, setItems] = useState<CartItemState[]>([]);
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const [calculation, setCalculation] = useState<CartCalculationResult | null>(null);
  const [isLoadingCalculation, setIsLoadingCalculation] = useState<boolean>(false);

  // Charger le panier stocké en local au montage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('agroconnect_cart') || localStorage.getItem('agroconnect_cart');
      if (stored) {
        startTransition(() => setItems(JSON.parse(stored)));
      }
    } catch (e) {
      console.warn('Impossible de charger le panier de la session :', e);
    } finally {
      setIsCartHydrated(true);
    }
  }, []);

  // Ne pas remplacer le panier enregistré par le tableau vide avant la fin de son chargement.
  useEffect(() => {
    if (!isCartHydrated) return;
    try {
      sessionStorage.setItem('agroconnect_cart', JSON.stringify(items));
      localStorage.removeItem('agroconnect_cart');
    } catch (e) {
      console.warn('Impossible de sauvegarder le panier de la session :', e);
    }
  }, [items, isCartHydrated]);

  useEffect(() => {
    if (!socket) return;
    const handleInventoryUpdate = (event: { offers: Array<{ offerId: string; stockQuantity: number; isAvailable: boolean }> }) => {
      setItems((current) => current.map((item) => {
        const update = event.offers.find((offer) => offer.offerId === item.offerId);
        return update
          ? {
            ...item,
            offer: {
              ...item.offer,
              stockQuantity: update.stockQuantity,
              isAvailable: update.isAvailable,
            },
          }
          : item;
      }));
    };
    socket.on('inventory.updated', handleInventoryUpdate);
    return () => {
      socket.off('inventory.updated', handleInventoryUpdate);
    };
  }, [socket]);

  // Recalculer le panier via le backend (règle : ne pas faire de calcul financier côté client)
  const refreshCalculation = useCallback(async () => {
    if (items.length === 0) {
      setCalculation(null);
      setIsLoadingCalculation(false);
      return;
    }

    setIsLoadingCalculation(true);
    setCalculation(null);
    try {
      const payload = items.map((i) => ({
        offerId: i.offerId,
        quantity: i.quantity,
        saleType: i.saleType,
      }));
      const result = await api.cart.calculate(payload);
      setCalculation(result);
    } catch (err) {
      console.warn('Erreur lors du calcul backend du panier :', err);
    } finally {
      setIsLoadingCalculation(false);
    }
  }, [items]);

  useEffect(() => {
    startTransition(() => {
      void refreshCalculation();
    });
  }, [items, refreshCalculation]);

  const addToCart = useCallback((offer: SellerOfferItem, quantity: number, saleType: SaleType) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.offerId === offer.id && i.saleType === saleType
      );

      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex]!,
          quantity: next[existingIndex]!.quantity + quantity,
        };
        return next;
      }

      return [...prev, { offerId: offer.id, quantity, saleType, offer }];
    });
  }, []);

  const removeFromCart = useCallback((offerId: string, saleType: SaleType) => {
    setItems((prev) =>
      prev.filter((i) => !(i.offerId === offerId && i.saleType === saleType))
    );
  }, []);

  const updateQuantity = useCallback((offerId: string, quantity: number, saleType: SaleType) => {
    if (quantity <= 0) {
      removeFromCart(offerId, saleType);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.offerId === offerId && item.saleType === saleType) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    setCalculation(null);
    sessionStorage.removeItem('agroconnect_cart');
    localStorage.removeItem('agroconnect_cart');
  }, []);

  const totalItemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isCartHydrated,
        calculation,
        isLoadingCalculation,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItemsCount,
        refreshCalculation,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

