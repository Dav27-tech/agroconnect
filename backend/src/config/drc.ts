/**
 * Configuration géographique et opérationnelle spécifique à la
 * République Démocratique du Congo (RDC).
 * AgroConnect opère exclusivement dans ce périmètre.
 */

export const DRC_COUNTRY_CODE = 'CD';
export const DRC_PHONE_PREFIX = '+243';

// Les 26 provinces constitutionnelles de la République Démocratique du Congo
export const DRC_PROVINCES = [
  'Kinshasa',
  'Kongo-Central',
  'Kwango',
  'Kwilu',
  'Mai-Ndombe',
  'Kasaï',
  'Kasaï-Central',
  'Kasaï-Oriental',
  'Lomami',
  'Sankuru',
  'Haut-Katanga',
  'Haut-Lomami',
  'Lualaba',
  'Tanganyika',
  'Maniema',
  'Nord-Kivu',
  'Sud-Kivu',
  'Ituri',
  'Haut-Uele',
  'Bas-Uele',
  'Tshopo',
  'Équateur',
  'Mongala',
  'Nord-Ubangi',
  'Sud-Ubangi',
  'Tshuapa',
] as const;

export type DRCProvince = typeof DRC_PROVINCES[number];

export function isValidDRCProvince(province: string): province is DRCProvince {
  return (DRC_PROVINCES as readonly string[]).includes(province);
}

// Principaux pôles agricoles et urbains de la RDC
export const DRC_MAJOR_CITIES: Record<DRCProvince, string[]> = {
  'Kinshasa': ['Kinshasa', 'Gombe', 'Limete', 'Kalamu', 'Masina', 'Nsele', 'Mont-Ngafula', 'Kimbanseke'],
  'Kongo-Central': ['Matadi', 'Boma', 'Mbanza-Ngungu', 'Kimpese', 'Kasangulu', 'Tshela', 'Moanda'],
  'Kwilu': ['Kikwit', 'Bandundu-Ville', 'Bulungu', 'Gungu', 'Idiofa', 'Bagata'],
  'Kwango': ['Kenge', 'Popokabaka', 'Kasongo-Lunda', 'Feshi', 'Kahemba'],
  'Mai-Ndombe': ['Inongo', 'Kutu', 'Nioki', 'Bolobo', 'Mushie'],
  'Haut-Katanga': ['Lubumbashi', 'Likasi', 'Kasumbalesa', 'Kipushi', 'Kambove'],
  'Lualaba': ['Kolwezi', 'Kasaji', 'Mutshatsha', 'Dilolo'],
  'Nord-Kivu': ['Goma', 'Beni', 'Butembo', 'Rutshuru', 'Masisi', 'Lubero'],
  'Sud-Kivu': ['Bukavu', 'Uvira', 'Kamituga', 'Baraka', 'Walungu', 'Kabare'],
  'Tshopo': ['Kisangani', 'Banalia', 'Basoko', 'Opala', 'Ubundu', 'Yahuma'],
  'Kasaï-Oriental': ['Mbuji-Mayi', 'Miabi', 'Tshilenge', 'Kabeya-Kamwanga'],
  'Kasaï-Central': ['Kananga', 'Demba', 'Dibaya', 'Dimbelenge', 'Luiza'],
  'Kasaï': ['Tshikapa', 'Ilebo', 'Luebo', 'Mweka', 'Dekese'],
  'Équateur': ['Mbandaka', 'Bikoro', 'Lukolela', 'Basankusu', 'Bolomba'],
  'Ituri': ['Bunia', 'Aru', 'Mahagi', 'Djugu', 'Irumu', 'Mambasa'],
  'Maniema': ['Kindu', 'Kasongo', 'Kibombo', 'Puninia', 'Lubutu'],
  'Tanganyika': ['Kalemie', 'Kongolo', 'Manono', 'Moba', 'Nyunzu'],
  'Haut-Lomami': ['Kamina', 'Bukama', 'Kaniama', 'Kabongo', 'Malemba-Nkulu'],
  'Lomami': ['Kabinda', 'Mwene-Ditu', 'Lubao', 'Luputa', 'Ngandajika'],
  'Sankuru': ['Lusambo', 'Lodja', 'Katako-Kombe', 'Tshumbe', 'Kole'],
  'Haut-Uele': ['Isiro', 'Dungu', 'Faradje', 'Wamba', 'Watsa'],
  'Bas-Uele': ['Buta', 'Aketi', 'Bambesa', 'Bondo'],
  'Mongala': ['Lisala', 'Bumba', 'Bongandanga'],
  'Nord-Ubangi': ['Gbadolite', 'Mobayi-Mbongo', 'Businga', 'Bosobolo'],
  'Sud-Ubangi': ['Gemena', 'Zongo', 'Budjala', 'Kungu', 'Libenge'],
  'Tshuapa': ['Boende', 'Bokungu', 'Ikela', 'Monkoto'],
};

// La plateforme utilise uniquement le franc congolais.
export const SUPPORTED_CURRENCIES = ['CDF'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const VAT_RATE_PERCENT = 16;

// Opérateurs Mobile Money en RDC
export const DRC_MOBILE_MONEY_PROVIDERS = [
  { id: 'M_PESA', name: 'Vodacom M-Pesa', prefix: ['081', '082', '083'] },
  { id: 'ORANGE_MONEY', name: 'Orange Money', prefix: ['084', '085', '089'] },
  { id: 'AIRTEL_MONEY', name: 'Airtel Money', prefix: ['097', '098', '099'] },
  { id: 'AFRIMONEY', name: 'Africell Afrimoney', prefix: ['090', '091'] },
] as const;

export type MobileMoneyProviderId = typeof DRC_MOBILE_MONEY_PROVIDERS[number]['id'];


