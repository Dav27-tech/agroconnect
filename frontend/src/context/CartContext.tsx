'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SellerOfferItem, SaleType, CartCalculationResult } from '../types';
import { api } from '../services/api';

export interface CartItemState {
  offerId: string;
  quantity: number;
  saleType: SaleType;
  offer: SellerOfferItem;
}

interface CartContextType {
  items: CartItemState[];
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
  const [items, setItems] = useState<CartItemState[]>([]);
  const [calculation, setCalculation] = useState<CartCalculationResult | null>(null);
  const [isLoadingCalculation, setIsLoadingCalculation] = useState<boolean>(false);

  // Charger le panier stocké en local au montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('agroconnect_cart');
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Impossible de charger le panier local :', e);
    }
  }, []);

  // Sauvegarder dans le localStorage à chaque modification
  useEffect(() => {
    try {
      localStorage.setItem('agroconnect_cart', JSON.stringify(items));
    } catch (e) {
      console.warn('Impossible de sauvegarder le panier local :', e);
    }
  }, [items]);

  // Recalculer le panier via le backend (règle : ne pas faire de calcul financier côté client)
  const refreshCalculation = useCallback(async () => {
    if (items.length === 0) {
      setCalculation(null);
      return;
    }

    setIsLoadingCalculation(true);
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
    refreshCalculation();
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
  }, []);

  const removeFromCart = useCallback((offerId: string, saleType: SaleType) => {
    setItems((prev) =>
      prev.filter((i) => !(i.offerId === offerId && i.saleType === saleType))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCalculation(null);
    localStorage.removeItem('agroconnect_cart');
  }, []);

  const totalItemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
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

