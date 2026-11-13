'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedCurrency } from '../types';
import { DEFAULT_EXCHANGE_RATE } from '../constants/drc';

interface CurrencyContextType {
  currency: SupportedCurrency;
  exchangeRate: number; // 1 USD = X CDF
  setCurrency: (c: SupportedCurrency) => void;
  toggleCurrency: () => void;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'CDF',
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  setCurrency: () => {},
  toggleCurrency: () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<SupportedCurrency>('CDF');
  const [exchangeRate, setExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATE);

  useEffect(() => {
    // Tente de récupérer le taux configuré depuis l'API backend si disponible
    fetch('http://localhost:5000/api/health')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.exchangeRateSnapshot?.rate) {
          setExchangeRate(json.data.exchangeRateSnapshot.rate);
        }
      })
      .catch(() => {
        // En cas d'indisponibilité temporaire, garde le taux par défaut (2850 CDF)
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
