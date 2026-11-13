# 🛠️ AgroConnect — Guide du Développeur & Exploitation

Ce guide fournit toutes les instructions opérationnelles nécessaires pour installer, exécuter, tester et faire évoluer le projet **AgroConnect**.

---

## 1. Prérequis Système

- **Système d'exploitation :** Windows, macOS ou Linux.
- **Node.js :** Version 20.x ou supérieure (testé avec Node v24).
- **Gestionnaire de paquets :** `npm` (version 10+) ou `pnpm`.
- **PostgreSQL (Optionnel pour l'initialisation) :** Version 15 ou 16.

---

## 2. Configuration des Environnements

Le projet contient un fichier d'exemple pour le backend :
- `backend/.env.example`

Copiez ce fichier pour créer votre fichier `.env` local :
```bash
cp backend/.env.example backend/.env
```

### Variables clés du Backend (`backend/.env`) :
```env
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agroconnect?schema=public
JWT_SECRET=super-secret-agroconnect-jwt-key-for-development-2026-drcongo
DEFAULT_EXCHANGE_RATE=2850
BASE_CURRENCY=USD
TARGET_CURRENCY=CDF
DEFAULT_COMMISSION_RATE_PERCENT=5.0
```

---

## 3. Commandes Utiles

### A. Depuis la racine du projet (`agroConnect/`)

| Commande | Action |
| :--- | :--- |
| `npm run dev:backend` | Démarre le backend en mode développement avec rechargement automatique (`tsx watch`) |
| `npm run dev:frontend` | Démarre le frontend Next.js sur [http://localhost:3000](http://localhost:3000) |
| `npm run build:backend` | Compile le code TypeScript du backend dans `backend/dist/` |
| `npm run build:frontend` | Compile l'application Next.js pour la production |
| `npm run build` | Compile à la fois le backend et le frontend |
| `npm run test:backend` | Exécute la suite de tests fonctionnels de validation des routes métier |

### B. Commandes Spécifiques au Backend (`cd backend`)

```bash
# Lancement en développement
npm run dev

# Compilation TypeScript
npm run build

# Démarrage de la version compilée
npm start

# Exécution des tests de validation métier
npm test
```

### C. Commandes Spécifiques au Frontend (`cd frontend`)

```bash
# Lancement en développement (Port 3000)
npm run dev

# Compilation de production
npm run build

# Démarrage du serveur de production
npm start

# Analyse du code avec ESLint
npm run lint
```

---

## 4. Base de Données & Prisma

Le schéma relationnel PostgreSQL complet est disponible à l'emplacement :
`backend/prisma/schema.prisma`

### Commandes Prisma :
```bash
cd backend

# Générer les types du client Prisma
npx prisma generate

# Créer et appliquer une migration de développement
npx prisma migrate dev --name init_agroconnect

# Ouvrir l'explorateur visuel de données (Prisma Studio)
npx prisma studio
```

---

## 5. Conventions de Code et Bonnes Pratiques

1. **Calculs Monétaires :**
   - N'utilisez JAMAIS l'addition ou la multiplication décimale native (`price * qty`).
   - Utilisez systématiquement la classe `Money` (`backend/src/common/money.ts`).
2. **Langue :**
   - Toutes les interfaces, messages d'erreurs, notifications et libellés d'affichage doivent être rédigés en **Français**.
3. **Validation :**
   - Toute entrée de contrôleur Express doit obligatoirement être filtrée et validée par un schéma **Zod** via le middleware `validate()`.
4. **Frontières Externes :**
   - Ne couplez jamais la logique d'un contrôleur ou service à une bibliothèque tierce propriétaire. Utilisez toujours les interfaces définies dans `backend/src/integrations/`.

