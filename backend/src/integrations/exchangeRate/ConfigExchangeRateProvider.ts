import { SupportedCurrency } from '../../config/drc.js';
import { env } from '../../config/env.js';
import { ExchangeRateSnapshot, IExchangeRateProvider } from './ExchangeRateProvider.interface.js';

/**
 * Fournisseur de taux de change configurable en mémoire/base.
 * Ne présuppose AUCUN taux fixe dans la logique métier.
 * Les commandes enregistrent un instantané (snapshot) figé de ce taux.
 */
export class ConfigExchangeRateProvider implements IExchangeRateProvider {
  public readonly providerName = 'AgroConnect-Config-ExchangeRate';
  private currentRate: number;
  private lastUpdated: Date;
  private currentSource: 'CONFIG' | 'ADMIN_OVERRIDE';

  constructor(initialRate = env.DEFAULT_EXCHANGE_RATE) {
    this.currentRate = initialRate;
    this.lastUpdated = new Date();
    this.currentSource = 'CONFIG';
  }

  public async getCurrentRate(
    base: SupportedCurrency = 'USD',
    target: SupportedCurrency = 'CDF'
  ): Promise<ExchangeRateSnapshot> {
    if (base === target) {
      return {
        baseCurrency: base,
        targetCurrency: target,
        rate: 1.0,
        effectiveDate: new Date(),
        source: this.currentSource,
      };
    }

    const rate = base === 'USD' && target === 'CDF' ? this.currentRate : 1 / this.currentRate;

    return {
      baseCurrency: base,
      targetCurrency: target,
      rate,
      effectiveDate: this.lastUpdated,
      source: this.currentSource,
    };
  }

  public async updateRate(
    newRate: number,
    source: 'ADMIN_OVERRIDE' = 'ADMIN_OVERRIDE'
  ): Promise<ExchangeRateSnapshot> {
    if (newRate <= 0) {
      throw new Error('Le taux de change doit être strictement positif');
    }
    this.currentRate = newRate;
    this.lastUpdated = new Date();
    this.currentSource = source;
    console.log(`💱 [CHANGE] Taux de change actualisé : 1 USD = ${newRate} CDF (Source: ${source})`);

    return this.getCurrentRate('USD', 'CDF');
  }
}

export const exchangeRateService = new ConfigExchangeRateProvider();
