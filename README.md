# TLveta — Boutique en ligne

Application de boutique en ligne composée d’un frontend Flutter Web et d’une
API Strapi 5.

## Fonctionnalités

- Consultation publique du catalogue et des catégories.
- Compte client requis pour ouvrir les fiches produits, gérer le panier et
  passer commande.
- Prix du catalogue et totaux de commande vérifiés côté serveur.
- Paiement de démonstration de 10 secondes : aucune carte n’est demandée et
  aucune transaction réelle n’est envoyée à Stripe.
- Enregistrement d’une adresse de livraison après confirmation de la commande.

## Prérequis

- Flutter et Dart (voir `flutter --version`).
- Node.js 24 et npm 10 ou plus récent.
- Google Chrome pour exécuter le frontend Web.

## Installation et lancement

Clonez le dépôt :

```powershell
git clone https://github.com/leo2Teuk/tlveta-boutique.git
cd tlveta-boutique
```

Dans un premier terminal, configurez et démarrez Strapi :

```powershell
cd .\strapi-cms
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Avant le premier démarrage, ouvrez `strapi-cms\.env` et remplacez les valeurs
`replace-*` par des valeurs aléatoires privées. Ne partagez jamais ce fichier.
Puis démarrez le serveur :

```powershell
$env:HOST = "127.0.0.1"
$env:PORT = "1350"
npm run develop
```

Dans un second terminal, depuis la racine du dépôt, lancez Flutter :

```powershell
cd .\flutter_ecommerce
flutter pub get
flutter run -d chrome --web-port 5000
```

- Boutique : <http://127.0.0.1:5000>
- API Strapi : <http://127.0.0.1:1350/api>
- Administration Strapi : <http://127.0.0.1:1350/admin>

À la première ouverture de l’administration, créez un compte administrateur
local. Ce compte est distinct du compte client utilisé par la boutique.

## Catalogue et tests API

Sur une base Strapi neuve, consultez le guide
[Strapi et Postman](./strapi-cms/README.md) pour créer le catalogue, configurer
l’administration et tester les requêtes GET/POST ainsi que les routes protégées
avec un JWT client.

Le guide [Flutter](./flutter_ecommerce/README.md) décrit le frontend et ses
routes API.

## Sécurité

Les fichiers `.env`, les bases de données locales, les dépendances et les
fichiers générés ne sont pas inclus dans le dépôt. N’ajoutez jamais de clés,
tokens ou mots de passe au dépôt ou à un partage Postman public.
