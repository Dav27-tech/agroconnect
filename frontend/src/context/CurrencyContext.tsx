'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedCurrency } from '../types';
import { DEFAULT_EXCHANGE_RATE } from '../constants/drc';
import { api } from '../services/api';

interface CurrencyContextType {
  currency: SupportedCurrency;
  exchangeRate: number; // 1 USD = X CDF
  effectiveDate: string;
  setCurrency: (c: SupportedCurrency) => void;
  toggleCurrency: () => void;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'CDF',
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  effectiveDate: new Date().toISOString(),
  setCurrency: () => {},
  toggleCurrency: () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<SupportedCurrency>('CDF');
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATE);
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString());

  useEffect(() => {
    // Tente de récupérer le taux actif configuré depuis le backend
    api.admin
      .getExchangeRate()
      .then((res) => {
        if (res?.activeRate?.rate) {
          setExchangeRate(res.activeRate.rate);
          setEffectiveDate(res.activeRate.effectiveFrom || new Date().toISOString());
        }
      })
      .catch(() => {
        // En cas d'indisponibilité temporaire, conserve 2850 CDF
      });
  }, []);

  const toggleCurrency = () => {
    setCurrency((prev) => (prev === 'CDF' ? 'USD' : 'CDF'));
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        exchangeRate,
        effectiveDate,
        setCurrency,
        toggleCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
