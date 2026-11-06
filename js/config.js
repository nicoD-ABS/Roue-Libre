// Réglages de l'app. À adapter avant de publier.
window.RL_CONFIG = {

  // Contenu de l'onglet « Rejoindre » (et de la page visible avant connexion).
  // Laisse contactEmail et joinUrl vides tant que tu n'as rien à y mettre :
  // les boutons correspondants n'apparaissent pas.
  ASSOCIATION: {
    name: "Alps Bike Society",
    pitch: "Une association de cyclistes des Alpes : on se retrouve pour rouler, et on prépare ensemble des séjours, des stages et des courses.",
    points: [
      "Des sorties proposées par les membres, simples à rejoindre",
      "Des séjours, stages et courses préparés ensemble",
      "Pas de groupe qui sonne toute la journée : tu regardes quand tu veux"
    ],
    contactEmail: "",              // ex. "contact@alpsbikesociety.fr"
    joinUrl: "",                   // ex. lien HelloAsso ou formulaire d'adhésion (https://…)
    joinLabel: "Adhérer"
  },

  // "local"    : données gardées dans le téléphone (démo, chacun voit ses données)
  // "firebase" : base partagée entre tous les membres (voir README)
  BACKEND: "firebase",

  // Mode "local" uniquement : code d'entrée de la démo.
  // En mode "firebase", ce champ n'est PAS utilisé : le code est choisi à la
  // création du groupe et ne figure nulle part dans les fichiers.
  GROUP_CODE: "velo",

  // Mode "firebase" uniquement : colle ici les réglages de ton projet Firebase
  // (Paramètres du projet → Général → Vos applications → Configuration du SDK).
  // Ces valeurs ne sont pas secrètes : la protection vient des règles Firestore.
  FIREBASE: {
    apiKey: "AIzaSyBfAHWNBoUStpzEweyXddlOatq0vmrP4Ro",
    authDomain: "roue-libre-69409.firebaseapp.com",
    projectId: "roue-libre-69409",
    appId: "1:284863937287:web:1053b01c5317f9ceeea3a2"
  }
};
