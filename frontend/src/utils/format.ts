export function formatCdfPrice(amountCdf: number): string {
  return `${Math.round(amountCdf).toLocaleString('fr-FR')} FC`;
}

export function translateSellerType(type: 'FARMER' | 'RESELLER' | 'SUPPLIER'): {
  label: string;
  badgeClass: string;
} {
  switch (type) {
    case 'FARMER':
      return {
        label: 'Producteur Agricole',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    case 'RESELLER':
      return {
        label: 'Revendeur Agréé',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
      };
    case 'SUPPLIER':
      return {
        label: 'Fournisseur d\'Intrants',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
      };
  }
}

