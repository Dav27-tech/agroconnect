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

export const DRC_MOBILE_MONEY_PROVIDERS = [
  { id: 'M_PESA', name: 'Vodacom M-Pesa', prefix: ['081', '082', '083'], badge: 'M-Pesa' },
  { id: 'ORANGE_MONEY', name: 'Orange Money', prefix: ['084', '085', '089'], badge: 'Orange Money' },
  { id: 'AIRTEL_MONEY', name: 'Airtel Money', prefix: ['097', '098', '099'], badge: 'Airtel Money' },
] as const;

export const PAYMENT_METHODS = DRC_MOBILE_MONEY_PROVIDERS;

