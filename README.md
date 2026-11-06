# Roue libre

L'app de l'**Alps Bike Society** : proposer des sorties vélo à court terme, et amorcer l'organisation de séjours, stages ou courses à plus long terme. Pas de notifications : chacun regarde quand il veut.

Trois onglets : **Sorties**, **Projets**, **Rejoindre** (présentation de l'association, aussi visible avant connexion).

## Structure

```
.
├── index.html            page unique
├── manifest.json         rend l'app installable (nom, couleurs, icônes)
├── sw.js                 service worker (ouverture hors ligne)
├── firestore.rules       règles de sécurité à coller dans Firebase
├── FIREBASE.md           guide pas à pas pour partager les données
├── css/style.css         styles (thème clair et sombre automatique)
├── js/
│   ├── config.js         association, mode de stockage, réglages Firebase
│   ├── store.js          données en mode démo (dans le téléphone)
│   ├── store-firebase.js données partagées (Firestore)
│   └── app.js            interface
└── icons/                icônes de l'app
```

## Deux modes

- `BACKEND: "local"` (par défaut) : démo. Chaque téléphone garde ses propres données, le code est `velo`.
- `BACKEND: "firebase"` : base partagée entre tous les membres. Suis **FIREBASE.md**.

Le choix se fait dans `js/config.js`.

## Tester chez soi

Depuis ce dossier :

```
python3 -m http.server 8000
```

Puis ouvre http://localhost:8000.

## Mettre en ligne gratuitement (GitHub Pages)

Settings → Pages → Source : « Deploy from a branch », branche au choix, dossier `/ (root)`. Tous les chemins sont relatifs : l'app fonctionne dans un sous-dossier comme `…github.io/Roue-Libre/`.

## Installer sur iPhone

Ouvre le lien dans Safari, puis Partager → Sur l'écran d'accueil.

## Mettre à jour l'app

Après une modification, change le numéro de version dans `sw.js` (`roue-libre-v2` → `v3`) pour que les téléphones récupèrent la nouvelle version.

## Limites à connaître

- L'identité est un simple prénom : deux Julien se confondraient.
- En mode Firebase, la protection repose sur le code du groupe (long et secret) et sur les règles Firestore. Voir FIREBASE.md.
