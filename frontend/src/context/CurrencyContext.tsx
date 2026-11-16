'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface ExchangeRateContextType {
  exchangeRate: number | null;
  effectiveDate: string | null;
}

const ExchangeRateContext = createContext<ExchangeRateContextType>({
  exchangeRate: null,
  effectiveDate: null,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null);

  useEffect(() => {
    // Tente de récupérer le taux actif configuré depuis le backend
    api.admin
      .getExchangeRate()
      .then((res) => {
        if (res?.activeRate?.rate != null) {
          setExchangeRate(res.activeRate.rate);
          setEffectiveDate(res.activeRate.effectiveFrom);
        }
      })
      .catch((error) => console.error('Erreur de chargement du taux de change:', error));
  }, []);

  return (
    <ExchangeRateContext.Provider
      value={{
        exchangeRate,
        effectiveDate,
      }}
    >
      {children}
    </ExchangeRateContext.Provider>
  );
}

export function useExchangeRate() {
  return useContext(ExchangeRateContext);
}
