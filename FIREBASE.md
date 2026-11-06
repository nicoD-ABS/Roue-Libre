# Brancher Firebase (partage des données entre membres)

Sans Firebase, chaque téléphone garde ses propres données. Avec Firebase, tout le groupe voit les mêmes sorties et les mêmes projets. L'offre gratuite (Spark) ne demande pas de carte bancaire : d'après la page officielle des offres Firebase, elle donne par exemple 50 000 lectures et 20 000 écritures de documents par jour, largement assez pour un club. Si un quota est dépassé, le produit est coupé jusqu'à la fin du mois, sans facturation.

Les noms de boutons de la console Firebase changent de temps en temps : si un intitulé diffère légèrement, cherche son équivalent.

## 1. Créer le projet

1. Va sur https://console.firebase.google.com et connecte-toi avec ton compte Google.
2. « Ajouter un projet », nom : `alps-bike-society` (ou ce que tu veux).
3. Google Analytics : tu peux le désactiver, l'app n'en a pas besoin.

## 2. Créer la base de données

1. Menu de gauche : Build → Firestore Database → « Créer une base de données ».
2. Emplacement : choisis un lieu en Europe. Il ne pourra plus être changé ensuite.
3. Mode : **production** (les règles qu'on colle juste après remplacent le mode par défaut).

## 3. Coller les règles de sécurité

1. Dans Firestore, onglet « Règles ».
2. Efface tout, colle le contenu du fichier `firestore.rules` de ce dépôt, puis « Publier ».

Ces règles font deux choses : on ne peut pas lister les groupes, et sorties/projets ne sont accessibles que si on connaît le code du groupe.

## 4. Récupérer les réglages de l'app web

1. Roue dentée → « Paramètres du projet » → onglet Général.
2. « Vos applications » → icône web `</>` → surnom : `Roue libre`. Ne coche pas Firebase Hosting.
3. Firebase affiche un bloc `firebaseConfig`. Copie `apiKey`, `authDomain`, `projectId` et `appId`.

Ces valeurs ne sont pas secrètes (elles sont visibles par n'importe quel visiteur du site). La protection, ce sont les règles de l'étape 3 et la longueur du code du groupe.

## 5. Les mettre dans l'app

Dans `js/config.js` :

- passe `BACKEND` de `"local"` à `"firebase"` ;
- colle les quatre valeurs dans `FIREBASE`.

Complète aussi `ASSOCIATION` (texte de présentation, e-mail de contact, lien d'adhésion) : c'est le contenu de l'onglet « Rejoindre ».

## 6. Mettre en ligne (GitHub Pages)

1. Dans le dépôt : Settings → Pages → Source : « Deploy from a branch ».
2. Choisis la branche à publier (`dev-firebase` pour tester, puis `main` une fois fusionnée) et le dossier `/ (root)`.
3. Après une minute, l'app est sur une adresse du type `https://nicod-abs.github.io/Roue-Libre/`.

Après chaque changement de fichier, change le numéro de version dans `sw.js` (`roue-libre-v2` → `v3`), sinon les téléphones gardent l'ancienne version en cache.

## 7. Créer le groupe (une seule fois)

1. Ouvre l'app avec `#creer` à la fin de l'adresse, par exemple `https://nicod-abs.github.io/Roue-Libre/#creer`.
2. Choisis un code long et difficile à deviner (par exemple trois mots et un nombre : `col-croix-fry-2027`). Il protège vos données : ne le publie pas dans un groupe ouvert ni sur un réseau social.
3. Note-le, puis donne-le à tes amis de vive voix ou en message privé.

## 8. Inviter les membres

Envoie le lien de l'app et le code. Chacun ouvre le lien dans Safari, saisit son prénom et le code, puis Partager → Sur l'écran d'accueil.

## Bon à savoir

- **Sécurité du code :** quelqu'un qui connaît le code a accès aux données du groupe. Pour changer de code, il faut créer un nouveau groupe (`#creer`) : les données de l'ancien ne sont pas reprises.
- **Création de groupes :** la page `#creer` est accessible à tous. Quelqu'un pourrait créer un groupe à lui sans effet sur le vôtre, seulement du bruit dans la base.
- **Facultatif, pour renforcer :** dans Google Cloud Console → API et services → Identifiants, restreins la clé API aux adresses web (`https://nicod-abs.github.io/*`).
- **Hors ligne :** l'app s'ouvre sans réseau mais les sorties demandent une connexion pour s'afficher et se mettre à jour.
