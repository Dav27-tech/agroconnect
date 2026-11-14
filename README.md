# 🌾 AgroConnect — Marché Agricole Numérique en RDC

> **Place de marché agricole multi-vendeurs opérant exclusivement en République Démocratique du Congo (RDC).**

---

## 🇨🇩 Vision du Projet

**AgroConnect** est une plateforme intermédiaire de confiance connectant l'écosystème agro-alimentaire congolais à travers ses 26 provinces :
- **Agriculteurs & Producteurs :** Vente directe de leur production sans intermédiaires prédateurs.
- **Revendeurs & Grossistes :** Achat indépendant, redistribution et services à valeur ajoutée (conditionnement, tri, livraison express).
- **Fournisseurs d'Intrants :** Distribution de semences certifiées, engrais, fertilisants et matériel agricole.
- **Acheteurs Particuliers et Professionnels (B2B / B2C) :** Commande multi-vendeurs avec paiement unifié et traçabilité.
- **Transporteurs & Livreurs :** Prise en charge logistique et suivi d'acheminement de fret.

> [!IMPORTANT]
> **Règle commerciale fondamentale :** AgroConnect est **strictement un intermédiaire technique et financier**. AgroConnect n'achète, ne possède, ne stocke ni ne revend aucun produit agricole. Chaque vendeur gère sa propre activité commerciale, ses stocks et ses prix.

---

## 🛠️ Stack Technologique

| Domaine | Technologies |
| :--- | :--- |
| **Frontend** | Next.js (App Router), React, TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express, TypeScript, REST API, Zod Validation |
| **Base de Données** | PostgreSQL, Prisma ORM |
| **Monétaire & Calculs** | Arithmétique d'entiers à échelle fixe (`BigInt`), sans virgule flottante JS |
| **Langue** | Interface et API intégralement en **Français** |
| **Devises** | Franc Congolais (`CDF / FC`) et Dollar Américain (`USD / $`) |

---

## État du Projet

AgroConnect est actuellement un prototype destiné à valider les workflows métier. Les routes utilisent un store en mémoire et des données de démonstration ; le client Prisma et le schéma PostgreSQL ne sont pas connectés au runtime. Les données sont perdues au redémarrage. Le simulateur de paiement reste en attente et ne déclare jamais un paiement réussi.

Ce dépôt n'est pas prêt pour la production. Les bloqueurs de lancement sont récapitulés dans [docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) et [docs/DATABASE.md](docs/DATABASE.md).

## 🚀 Installation et Démarrage

### Prérequis
- **Node.js** >= 20.x
- **npm** >= 10.x
- **PostgreSQL** : non requis pour les scénarios de démonstration en mémoire, mais une implémentation persistante est obligatoire avant toute mise en production.

### Installation

```bash
npm install --prefix backend
npm install --prefix frontend
```

Copiez `backend/.env.example` vers `backend/.env`. Sous PowerShell :

```powershell
Copy-Item backend/.env.example backend/.env
```

### Lancement

```bash
# Terminal 1 : backend (port 5000)
npm run dev:backend

# Terminal 2 : frontend (port 3000)
npm run dev:frontend
```

Ouvrez ensuite votre navigateur sur : [http://localhost:3000](http://localhost:3000)  
Point de terminaison santé API : [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Lancer les Tests de Validation Métier

```bash
npm test
npm run build:backend
npm run build:frontend
npm run lint --prefix frontend
```

---

## 📁 Architecture du Dépôt

```
agroConnect/
├── backend/                  # API REST Express & Prisma
│   ├── prisma/
│   │   └── schema.prisma     # Modèle complet PostgreSQL
│   ├── src/
│   │   ├── config/           # Validation env Zod & Constantes RDC
│   │   ├── common/           # Money (BigInt), Erreurs, Sécurité, Middlewares
│   │   ├── database/         # Client & Gestionnaire Prisma
│   │   ├── integrations/     # Frontières d'intégration (Paiement, SMS, Maps, etc.)
│   │   └── modules/          # 15 Domaines métiers modulaires
│   │       ├── auth/         # Inscription & Connexion sécurisée
│   │       ├── users/        # Gestion profils & rôles
│   │       ├── sellers/      # Agriculteurs, Revendeurs, Fournisseurs
│   │       ├── categories/   # Filières agricoles congolaises
│   │       ├── products/     # Catalogue commun des produits
│   │       ├── offers/       # Offres vendeurs (Prix gros/détail, stock)
│   │       ├── inventory/    # Stock partagé anti-survente
│   │       ├── seller-services/# Conditionnement, tri, express
│   │       ├── cart/         # Panier multi-vendeurs
│   │       ├── orders/       # Commande parent + sous-commandes
│   │       ├── payments/     # Vérification backend stricte
│   │       ├── deliveries/   # Suivi logistique indépendant (8 statuts)
│   │       ├── notifications/# Notifications multi-canaux
│   │       ├── finance/      # Commissions et reversements vendeurs
│   │       └── admin/        # Gestion taux de change et pilotage
│   ├── app.ts                # Application Express
│   └── server.ts             # Démarrage & arrêt gracieux
├── frontend/                 # Application Next.js App Router
│   ├── src/
│   │   ├── app/              # Routes, Layout et Styles Tailwind
│   │   ├── components/       # Composants réutilisables
│   │   │   ├── layout/       # Navbar, Footer avec switcher devise
│   │   │   └── marketplace/  # Hero, Rôles, Catalogue, Offres, Fret
│   │   ├── context/          # Contexte de devise globale (CDF / USD)
│   │   ├── constants/        # Provinces RDC, opérateurs Mobile Money
│   │   ├── types/            # Types TypeScript partagés
│   │   └── utils/            # Formatage monétaire sécurisé
└── docs/                     # Documentation d'architecture complète
    ├── PROJECT_OVERVIEW.md
    ├── BUSINESS_RULES.md
    ├── ARCHITECTURE.md
    ├── EXTERNAL_INTEGRATIONS.md
    └── DEVELOPMENT_GUIDE.md
```

---

## 📚 Documentation Détaillée

- [Aperçu du projet](docs/PROJECT_OVERVIEW.md)
- [Règles métier](docs/BUSINESS_RULES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Base de données](docs/DATABASE.md)
- [Plan d'intégration externe](docs/EXTERNAL_INTEGRATIONS.md)
- [Installation, tests et préproduction](docs/DEVELOPMENT_GUIDE.md)
- [API OpenAPI](http://localhost:5000/api/v1/docs) après démarrage du backend

