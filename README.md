# Roue libre

Une petite app installable pour un groupe d'amis cyclistes : proposer des sorties à court terme, et amorcer l'organisation de séjours, stages ou courses à plus long terme. Pas de notifications : chacun regarde quand il veut.

## Structure

```
roue-libre/
├── index.html          page unique
├── manifest.json       rend l'app installable (nom, couleurs, icônes)
├── sw.js               service worker (ouverture hors ligne)
├── css/style.css       styles (thème clair et sombre automatique)
├── js/
│   ├── config.js       code du groupe, choix du stockage
│   ├── store.js        données (sorties, projets) : seul fichier à changer pour partager
│   └── app.js          interface
└── icons/              icônes de l'app
```

## Tester chez toi

Depuis ce dossier :

```
python3 -m http.server 8000
```

Puis ouvre http://localhost:8000. Le code du groupe en démo est `velo`.

## Mettre en ligne gratuitement (GitHub Pages)

1. Crée un dépôt GitHub (public, c'est ce qui est gratuit avec Pages), par exemple `roue-libre`.
2. Dépose-y tous les fichiers de ce dossier, à la racine du dépôt.
3. Dans le dépôt : Settings → Pages → Source : « Deploy from a branch », branche `main`, dossier `/ (root)`.
4. Après une minute, l'app est disponible sur `https://tonpseudo.github.io/roue-libre/`.

Tous les chemins du projet sont relatifs, donc il fonctionne aussi bien dans un sous-dossier comme celui-ci.

## Installer sur iPhone

Ouvre le lien dans Safari, puis Partager → Sur l'écran d'accueil. L'app s'ouvre ensuite en plein écran, sans barre Safari.

## Mettre à jour l'app

Après une modification, change le numéro de version dans `sw.js` (`roue-libre-v1` → `roue-libre-v2`). Les téléphones récupèrent la nouvelle version à l'ouverture suivante.

## Important : partager les données entre amis

GitHub Pages ne sert que des fichiers. Dans l'état actuel (`BACKEND: "local"`), chaque téléphone garde ses propres données : une sortie proposée par toi n'apparaît pas chez les autres. C'est parfait pour tester l'interface, pas pour l'usage réel.

Pour que tout le groupe voie les mêmes sorties, il faut une petite base de données en ligne, gratuite à cette échelle. Deux pistes :

- **Firebase (Firestore)** : offre gratuite généreuse, sans carte bancaire, mise à jour en direct.
- **Supabase** : offre gratuite aussi, mais les projets inactifs peuvent être mis en pause (à vérifier au moment de se lancer).

Le code est déjà prévu pour ça : `store.js` expose des méthodes simples (`setRide`, `addRide`, `toggleInterest`…). Brancher une base revient à écrire un second adaptateur avec les mêmes méthodes, sans toucher à l'interface.

## Limites à connaître

- Le « code du groupe » est visible dans le code source du site. Il écarte les curieux, il ne protège pas vraiment. Avec une base partagée, on pourra le renforcer.
- L'identité est un simple prénom : deux Julien se confondraient. On peut ajouter l'initiale du nom si besoin.
