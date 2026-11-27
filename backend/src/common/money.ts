/**
 * Utilitaire financier pour AgroConnect.
 * RÈGLE FONDAMENTALE : Ne JAMAIS utiliser l'arithmétique à virgule flottante
 * native de JavaScript pour les calculs monétaires.
 * Toutes les valeurs sont manipulées en centimes/centièmes avec BigInt pour
 * garantir une précision absolue sans perte d'arrondi binaire.
 */

import { SupportedCurrency } from '../config/drc.js';

// Facteur d'échelle : 100 (deux décimales).
export const SCALE = 100n;

export interface MoneyValue {
  scaledAmount: bigint; // Montant multiplié par 100
  currency: SupportedCurrency;
}

export class Money {
  /**
   * Convertit un nombre ou chaîne décimale en BigInt mis à l'échelle (x100)
   */
  public static toScaled(amount: number | string): bigint {
    const str = typeof amount === 'number' ? amount.toFixed(2) : amount.trim();
    const [whole = '0', fraction = '00'] = str.split('.');
    const cleanWhole = whole.replace(/,/g, '');
    const cleanFraction = fraction.padEnd(2, '0').slice(0, 2);
    const sign = cleanWhole.startsWith('-') ? -1n : 1n;
    const absWhole = cleanWhole.replace('-', '');
    return sign * (BigInt(absWhole || '0') * SCALE + BigInt(cleanFraction || '0'));
  }

  /**
   * Reconvertit un BigInt mis à l'échelle en nombre décimal à 2 décimales
   */
  public static fromScaled(scaled: bigint): number {
    const isNegative = scaled < 0n;
    const abs = isNegative ? -scaled : scaled;
    const whole = abs / SCALE;
    const fraction = abs % SCALE;
    const num = Number(whole) + Number(fraction) / 100;
    return isNegative ? -num : num;
  }

  /**
   * Additionne deux montants mis à l'échelle
   */
  public static add(a: bigint, b: bigint): bigint {
    return a + b;
  }

  /**
   * Soustrait deux montants mis à l'échelle
   */
  public static subtract(a: bigint, b: bigint): bigint {
    return a - b;
  }

  /**
   * Multiplie un montant mis à l'échelle par une quantité décimale
   */
  public static multiply(scaledAmount: bigint, quantity: number | string): bigint {
    const scaledQty = this.toScaled(quantity);
    // (A * Q) / 100 avec arrondi bancaire au plus proche
    const product = scaledAmount * scaledQty;
    const halfScale = SCALE / 2n;
    const remainder = product % SCALE;
    const base = product / SCALE;
    if (remainder >= halfScale) {
      return base + 1n;
    }
    return base;
  }

  /**
   * Calcule un pourcentage avec précision (ex: 5.0 pour 5%)
   */
  public static calculateCommission(scaledAmount: bigint, percent: number): bigint {
    return this.calculatePercentage(scaledAmount, percent);
  }

  /**
   * Calcule un pourcentage sur un montant mis à l'échelle
   */
  public static calculatePercentage(scaledAmount: bigint, percent: number): bigint {
    const scaledPercent = this.toScaled(percent); // 5.00 -> 500n
    const product = scaledAmount * scaledPercent;
    const divisor = 10000n;
    const halfDivisor = divisor / 2n;
    const remainder = product % divisor;
    const base = product / divisor;
    if (remainder >= halfDivisor) {
      return base + 1n;
    }
    return base;
  }

  /**
   * Formate un montant pour affichage en français
   */
  public static format(amount: number, currency: SupportedCurrency): string {
    return `${Math.round(amount).toLocaleString('fr-FR')} FC`;
  }
}

