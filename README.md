# 🌾 AgroConnect — Marché Agricole Numérique en RDC

> **Place de marché agricole multi-vendeurs opérant exclusivement en République Démocratique du Congo (RDC).**

---

## 🇨🇩 Vision du Projet

**AgroConnect** connecte les agriculteurs vendeurs et les acheteurs à travers les 26 provinces de la RDC. La plateforme propose des espaces acheteur, vendeur-agriculteur, livreur, administrateur et super administrateur. L'inscription acheteur/vendeur et la connexion utilisent une adresse e-mail obligatoire.

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
| **Devise** | Franc Congolais uniquement (`CDF / FC`), sans taux de change |
| **TVA** | 16 % ajoutés au sous-total des articles et affichés avant validation de la commande |

---

## État du Projet

AgroConnect utilise PostgreSQL pour ses données métier. Les paiements en ligne ne sont pas traités sur la plateforme : le client règle le livreur, puis les opérations de collecte et de reversement sont suivies par l'administration.

Les rôles de compte comprennent acheteur, vendeur-agriculteur, livreur, administrateur et super administrateur. Les acheteurs et vendeurs s'inscrivent publiquement avec une adresse e-mail. Les comptes administrateur créés par un super administrateur et les comptes livreur créés par un administrateur doivent remplacer leur mot de passe provisoire lors de leur première connexion. Tous les utilisateurs peuvent modifier leur mot de passe depuis leur compte.

Ce dépôt n'est pas prêt pour la production. Avant de déployer, appliquer les migrations PostgreSQL et examiner la configuration de sécurité et d'exploitation de l'environnement.

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

Configurez `DATABASE_URL` pour PostgreSQL, puis appliquez les migrations avant de démarrer l'API :

```bash
npm run db:migrate --prefix backend
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

### Comptes et mots de passe

- La connexion se fait avec l'adresse e-mail.
- Un administrateur créé par un super administrateur ou un livreur créé par un administrateur doit changer son mot de passe provisoire après sa première connexion. L'accès aux routes protégées reste bloqué jusqu'à ce changement.
- Tous les rôles peuvent changer leur mot de passe à tout moment depuis **Modifier le mot de passe** dans le menu du compte. Le mot de passe actuel est requis et le nouveau doit comporter au moins 10 caractères.

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
│   │       ├── auth/         # Inscription, connexion et changement sécurisé du mot de passe
│   │       ├── users/        # Gestion profils & rôles
│   │       ├── sellers/      # Profils vendeurs-agriculteurs
│   │       ├── categories/   # Filières agricoles congolaises
│   │       ├── products/     # Catalogue commun des produits
│   │       ├── offers/       # Offres vendeurs (prix unitaires et par quantité, stock)
│   │       ├── inventory/    # Stock partagé anti-survente
│   │       ├── seller-services/# Conditionnement, tri, express
│   │       ├── cart/         # Panier multi-vendeurs
│   │       ├── orders/       # Commande parent + sous-commandes
│   │       ├── deliveries/   # Opérations logistiques internes (pas de suivi public)
│   │       ├── notifications/# Notifications multi-canaux
│   │       ├── finance/      # Commissions et reversements vendeurs
│   │       └── admin/        # Pilotage et gouvernance
│   ├── app.ts                # Application Express
│   └── server.ts             # Démarrage & arrêt gracieux
├── frontend/                 # Application Next.js App Router
│   ├── src/
│   │   ├── app/              # Routes, Layout et Styles Tailwind
│   │   ├── components/       # Composants réutilisables
│   │   │   ├── layout/       # Navbar, Footer
│   │   │   └── marketplace/  # Hero, Rôles, Catalogue, Offres, Fret
│   │   ├── context/          # Authentification et panier de session
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

