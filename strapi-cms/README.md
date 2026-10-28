# TLveta — API Strapi

Backend Strapi 5 de la boutique TLveta, relié à l’application Flutter Web dans
[`../flutter_ecommerce/README.md`](../flutter_ecommerce/README.md). Le catalogue
et les catégories sont consultables publiquement. Un compte client est requis
pour ouvrir la fiche d’un produit dans l’application, utiliser le panier et
passer commande.

## Démarrer en local

Prérequis : Node.js 24 et npm 10 ou plus récent.

Depuis PowerShell :

```powershell
cd .\strapi-cms
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
$env:HOST = "127.0.0.1"
$env:PORT = "1350"
npm run develop
```

Avant le premier démarrage, remplacez dans `.env` chaque valeur `replace-with-*`
par une valeur aléatoire privée. `APP_KEYS` doit contenir quatre clés
différentes, séparées par des virgules. Vous pouvez générer une valeur avec :

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Ne partagez pas le fichier `.env` et ne le commitez pas.

Le serveur et l’administration sont accessibles à :

- API : <http://127.0.0.1:1350/api>
- Interface d’administration : <http://127.0.0.1:1350/admin>
- Santé du serveur : <http://127.0.0.1:1350/_health>

À la première ouverture de `/admin`, créez un compte **administrateur Strapi**
avec votre propre adresse e-mail et un mot de passe local. Ce compte est
distinct du compte client créé dans la boutique. Sur une installation existante,
connectez-vous avec le compte administrateur local déjà créé. Aucun identifiant
ni mot de passe par défaut n’est fourni par ce projet.

La configuration locale lit SQLite dans `.tmp/data.db`. Les fichiers `.env`,
la base locale, les dépendances et les médias téléversés sont exclus de Git.
Après un clone, Strapi crée une base de développement neuve. Pour recréer le
catalogue fourni, arrêtez Strapi, construisez le projet puis exécutez le seed :

```powershell
npm run build
npm run seed
```

Le seed crée les catégories et les 10 produits tarifés, et télécharge les
images depuis Unsplash. Il nécessite une connexion Internet. Redémarrez ensuite
Strapi avec `npm run develop`.

## Changements réalisés

- Reprise du modèle Strapi : produits, catégories, panier, lignes de panier,
  commandes et relation avec les comptes clients.
- Ajout des prix positifs obligatoires en euros aux produits. Le seed complète
  également le tarif d’un produit déjà présent lorsque celui-ci est manquant.
- Catalogue et catégories en lecture publique ; les routes de panier et de
  commande sont réservées au client authentifié. Les permissions sont ajustées
  au démarrage de Strapi.
- Calcul du total côté serveur à partir des prix du catalogue, avec 4,00 €
  fixes de frais de livraison.
- Simulation de paiement **uniquement** : aucune carte bancaire n’est demandée,
  aucun paiement n’est envoyé à Stripe. Le serveur impose un délai de 10
  secondes avant de confirmer la commande et de vider le panier.
- Enregistrement d’une adresse uniquement pour une commande payée appartenant
  au client connecté.
- Les 10 tarifs transmis pour le catalogue local :

| Produit | Prix |
|---|---:|
| Barre de Son Dolby Atmos Cinema Wave | 12,50 € |
| Bracelet d’Activité Pulse Fit Tracker | 200,00 € |
| Casque Sans Fil ANC Studio Pro | 2,54 € |
| Clavier Mécanique Sans Fil Apex Pro 75% | 5,44 € |
| Enceinte Bluetooth Nomade Pulse 360 | 10,55 € |
| Moniteur Incurvé 34" Ultrawide QHD Pro | 2,45 € |
| Montre Connectée Titanium Horizon GPS | 5,66 € |
| Souris Ergonomique Sans Fil ErgoGlide Master | 1,70 € |
| Station de Charge Sans Fil 3-en-1 MagDock | 3,20 € |
| Écouteurs True Wireless Neo ANC | 10,05 € |

Les prix du clone local sont enregistrés dans la base de développement, non
dans un fichier de données partageable. Sur une base neuve, `npm run seed`
recrée les prix et les produits.

## Tester avec Postman

Créez un environnement Postman avec les variables suivantes :

| Variable | Valeur initiale |
|---|---|
| `baseUrl` | `http://127.0.0.1:1350/api` |
| `jwt` | vide |
| `adminApiToken` | vide |
| `productDocumentId` | documentId d’un produit |
| `cartLineDocumentId` | documentId d’une ligne de panier |
| `orderDocumentId` | vide |

Les réponses Strapi v5 retournent un `documentId`. Utilisez-le dans les routes
qui contiennent `:documentId` ou `:lineId`.

### 1. Vérifier le catalogue public

Ces appels ne nécessitent pas d’en-tête `Authorization`.

```http
GET {{baseUrl}}/produits?populate=*&pagination[pageSize]=100
GET {{baseUrl}}/categories?populate=*
GET {{baseUrl}}/produits/{{productDocumentId}}?populate=*
```

Dans les paramètres d’URL Postman, les crochets peuvent être encodés
automatiquement. Les produits retournent notamment `documentId`, `title`,
`price`, `slug`, `description`, `image` et `category`.

### 2. Créer un compte client et obtenir un JWT

```http
POST {{baseUrl}}/auth/local/register
Content-Type: application/json
```

```json
{
  "username": "client-demo",
  "email": "client-demo@example.com",
  "password": "ChangezCeMotDePasse123!"
}
```

Pour un compte existant, utilisez plutôt :

```http
POST {{baseUrl}}/auth/local
Content-Type: application/json
```

```json
{
  "identifier": "client-demo@example.com",
  "password": "ChangezCeMotDePasse123!"
}
```

Dans l’onglet **Scripts > Post-response** de l’une de ces requêtes, stockez le
JWT renvoyé :

```javascript
pm.environment.set("jwt", pm.response.json().jwt);
```

Pour les prochaines requêtes client, ajoutez `Authorization: Bearer {{jwt}}`
(Postman peut aussi appliquer ce réglage au niveau de la collection, type
**Bearer Token**, valeur `{{jwt}}`).

### 3. Parcours panier et commande

Ajouter un produit au panier :

```http
POST {{baseUrl}}/mon-panier/lignes
Authorization: Bearer {{jwt}}
Content-Type: application/json
```

```json
{
  "productDocumentId": "{{productDocumentId}}",
  "quantity": 1
}
```

Lire le panier :

```http
GET {{baseUrl}}/mon-panier
Authorization: Bearer {{jwt}}
```

Modifier ou supprimer une ligne (la quantité doit rester entre 1 et 99) :

```http
PUT {{baseUrl}}/mon-panier/lignes/{{cartLineDocumentId}}
Authorization: Bearer {{jwt}}
Content-Type: application/json
```

```json
{
  "quantity": 2
}
```

```http
DELETE {{baseUrl}}/mon-panier/lignes/{{cartLineDocumentId}}
Authorization: Bearer {{jwt}}
```

Créer une commande à partir du panier. Aucun prix ni total n’est accepté du
client : le serveur relit le catalogue et calcule les montants.

```http
POST {{baseUrl}}/checkout/commandes
Authorization: Bearer {{jwt}}
```

La réponse contient `data.orderId`, `data.total` et `data.status`. Enregistrez
le document ID pour la suite :

```javascript
pm.environment.set("orderDocumentId", pm.response.json().data.orderId);
```

Lire cette commande ou l’historique du client :

```http
GET {{baseUrl}}/mes-commandes/{{orderDocumentId}}
Authorization: Bearer {{jwt}}

GET {{baseUrl}}/commandes/miennes
Authorization: Bearer {{jwt}}
```

### 4. Simuler le paiement puis enregistrer la livraison

Démarrer la simulation :

```http
POST {{baseUrl}}/commandes/{{orderDocumentId}}/simulation
Authorization: Bearer {{jwt}}
```

La réponse contient `data.readyAt`, date calculée par le serveur. Attendez que
10 secondes se soient écoulées depuis le premier appel avant de confirmer. Un
appel trop tôt retourne une erreur `400`, et peut être retenté une fois le délai
écoulé.

```http
POST {{baseUrl}}/commandes/{{orderDocumentId}}/confirmer-paiement
Authorization: Bearer {{jwt}}
```

Une fois la commande payée, enregistrez l’adresse :

```http
PUT {{baseUrl}}/commandes/{{orderDocumentId}}/adresse-livraison
Authorization: Bearer {{jwt}}
Content-Type: application/json
```

```json
{
  "fullName": "Client Démo",
  "line1": "10 rue de la Paix",
  "line2": "",
  "postalCode": "75002",
  "city": "Paris",
  "country": "France",
  "phone": ""
}
```

La confirmation de paiement vide les lignes du panier. Les commandes et les
adresses ne sont accessibles qu’à leur propriétaire authentifié.

### 5. Ajouter un produit ou une catégorie depuis Postman

Pour créer du contenu dans Strapi, générez dans l’administration une clé
**API Token** à privilèges adaptés, puis utilisez
`Authorization: Bearer {{adminApiToken}}`. Ne mettez jamais cette clé dans
Flutter, un dépôt public ou un partage Postman public.

Créer un produit (prix obligatoire, strictement positif) :

```http
POST {{baseUrl}}/produits
Authorization: Bearer {{adminApiToken}}
Content-Type: application/json
```

```json
{
  "data": {
    "title": "Produit de démonstration",
    "slug": "produit-de-demonstration",
    "description": "Description du produit.",
    "price": 19.99
  }
}
```

Créer une catégorie :

```http
POST {{baseUrl}}/categories
Authorization: Bearer {{adminApiToken}}
Content-Type: application/json
```

```json
{
  "data": {
    "name": "Démonstration",
    "slug": "demonstration",
    "description": "Catégorie de test."
  }
}
```

Pour publier un brouillon, utilisez l’action **Publish** dans l’administration
ou l’option de publication Strapi correspondante. Seuls les produits publiés
apparaissent dans le catalogue public.

## Routes disponibles

| Méthode | Route | Accès | Usage |
|---|---|---|---|
| `GET` | `/api/produits` | Public | Liste des produits publiés |
| `GET` | `/api/produits/:documentId` | Public | Détail produit |
| `GET` | `/api/categories` | Public | Liste des catégories publiées |
| `GET` | `/api/categories/:documentId` | Public | Détail catégorie |
| `POST` | `/api/auth/local/register` | Public | Créer un compte client |
| `POST` | `/api/auth/local` | Public | Connexion client et JWT |
| `GET` | `/api/mon-panier` | Client connecté | Lire son panier |
| `POST` | `/api/mon-panier/lignes` | Client connecté | Ajouter une ligne |
| `PUT` | `/api/mon-panier/lignes/:lineId` | Client connecté | Modifier une quantité |
| `DELETE` | `/api/mon-panier/lignes/:lineId` | Client connecté | Supprimer une ligne |
| `POST` | `/api/checkout/commandes` | Client connecté | Créer une commande calculée côté serveur |
| `GET` | `/api/mes-commandes/:documentId` | Propriétaire | Lire une commande |
| `GET` | `/api/commandes/miennes` | Client connecté | Historique client |
| `POST` | `/api/commandes/:documentId/simulation` | Propriétaire | Démarrer le délai de paiement |
| `POST` | `/api/commandes/:documentId/confirmer-paiement` | Propriétaire | Confirmer après 10 secondes |
| `PUT` | `/api/commandes/:documentId/adresse-livraison` | Propriétaire | Enregistrer une adresse après paiement |
| `POST` | `/api/produits` | API Token Strapi | Créer un produit |
| `POST` | `/api/categories` | API Token Strapi | Créer une catégorie |

## Vérifications développeur

```powershell
npm ci
npm run build
```

Le projet utilise Strapi `5.53.0`. Les valeurs `.env` et les comptes
d’administration doivent être propres à chaque installation locale.
