import { SupportedCurrency } from '../../config/drc.js';

export interface ExchangeRateSnapshot {
  baseCurrency: SupportedCurrency;
  targetCurrency: SupportedCurrency;
  rate: number; // 1 base = X target (ex: 1 USD = 2850 CDF)
  effectiveDate: Date;
  source: 'CONFIG' | 'ADMIN_OVERRIDE' | 'EXTERNAL_PROVIDER';
}

export interface IExchangeRateProvider {
  readonly providerName: string;
  getCurrentRate(base: SupportedCurrency, target: SupportedCurrency): Promise<ExchangeRateSnapshot>;
  updateRate(rate: number, source?: 'ADMIN_OVERRIDE'): Promise<ExchangeRateSnapshot>;
}
