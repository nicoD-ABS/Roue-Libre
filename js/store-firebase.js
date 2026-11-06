// Adaptateur Firebase (Firestore) : mêmes méthodes que LocalStore dans store.js.
// Chargé uniquement si BACKEND vaut "firebase" (voir app.js).
//
// Organisation des données :
//   groups/{code}/meta/info          → existe si le groupe a été créé
//   groups/{code}/rides/{id}         → une sortie
//   groups/{code}/projects/{id}      → un projet
// Le code du groupe fait partie du chemin : sans le connaître, on ne peut
// ni lire ni deviner les données (les règles interdisent de lister "groups").

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  deleteDoc, arrayUnion, arrayRemove, query, where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

var db = getFirestore(initializeApp(window.RL_CONFIG.FIREBASE));
var group = "";

function pad(n) { return n < 10 ? "0" + n : "" + n; }
function todayISO() {
  var d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function normalize(code) { return String(code).toLowerCase().replace(/[^a-z0-9_-]/g, ""); }
function col(name) { return collection(db, "groups", group, name); }
function ref(name, id) { return doc(db, "groups", group, name, String(id)); }
function metaRef() { return doc(db, "groups", group, "meta", "info"); }

function toRide(snap) {
  var r = snap.data();
  return {
    id: snap.id, date: r.date, time: r.time, place: r.place,
    km: r.km == null ? null : r.km, dp: r.dp == null ? null : r.dp,
    pace: r.pace || "", by: r.by, go: r.go || [], maybe: r.maybe || [], created: r.created || 0
  };
}
function toProject(snap) {
  var p = snap.data();
  var votes = p.votes || {};
  return {
    id: snap.id, title: p.title, where: p.where || "", when: p.when || "", pitch: p.pitch || "",
    by: p.by, interested: p.interested || [], created: p.created || 0,
    dates: (p.dates || []).map(function (l, i) { return { l: l, v: votes[i] || [] }; })
  };
}

var store = {
  // Sélectionne le groupe (à appeler avant tout le reste).
  setGroup: function (code) { group = normalize(code); },

  // Le groupe existe-t-il ? (c'est ce qui valide le code saisi)
  checkCode: function (code) {
    group = normalize(code);
    if (group.length < 6) return Promise.resolve(false);
    return getDoc(metaRef()).then(function (s) { return s.exists(); });
  },

  // Crée le groupe (première fois, par l'organisateur).
  createGroup: function (code) {
    group = normalize(code);
    if (group.length < 6) return Promise.reject(new Error("Code trop court"));
    return setDoc(metaRef(), { created: Date.now() }, { merge: true });
  },

  load: function () {
    return Promise.all([
      getDocs(query(col("rides"), where("date", ">=", todayISO()))),
      getDocs(col("projects"))
    ]).then(function (res) {
      var rides = [], projects = [];
      res[0].forEach(function (s) { rides.push(toRide(s)); });
      res[1].forEach(function (s) { projects.push(toProject(s)); });
      projects.sort(function (a, b) { return a.created - b.created; });
      return { rides: rides, projects: projects };
    });
  },

  // kind : "go" ou "maybe". Re-cliquer retire la réponse.
  setRide: function (id, name, kind) {
    var other = kind === "go" ? "maybe" : "go";
    var r = ref("rides", id);
    return getDoc(r).then(function (s) {
      if (!s.exists()) return;
      var already = (s.data()[kind] || []).indexOf(name) > -1;
      var patch = {};
      patch[kind] = already ? arrayRemove(name) : arrayUnion(name);
      patch[other] = arrayRemove(name);
      return updateDoc(r, patch);
    }).then(store.load);
  },
  addRide: function (ride) {
    var data = Object.assign({}, ride, { created: Date.now() });
    delete data.id;
    return addDoc(col("rides"), data).then(store.load);
  },
  removeRide: function (id) {
    return deleteDoc(ref("rides", id)).then(store.load);
  },

  toggleInterest: function (id, name) {
    var r = ref("projects", id);
    return getDoc(r).then(function (s) {
      if (!s.exists()) return;
      var p = s.data();
      var already = (p.interested || []).indexOf(name) > -1;
      var patch = { interested: already ? arrayRemove(name) : arrayUnion(name) };
      if (already) {
        // En se retirant du projet, on retire aussi ses votes de dates.
        (p.dates || []).forEach(function (_, i) { patch["votes." + i] = arrayRemove(name); });
      }
      return updateDoc(r, patch);
    }).then(store.load);
  },
  toggleDate: function (id, index, name) {
    var r = ref("projects", id);
    return getDoc(r).then(function (s) {
      if (!s.exists()) return;
      var votes = s.data().votes || {};
      var already = (votes[index] || []).indexOf(name) > -1;
      var patch = { interested: arrayUnion(name) };
      patch["votes." + index] = already ? arrayRemove(name) : arrayUnion(name);
      return updateDoc(r, patch);
    }).then(store.load);
  },
  addProject: function (project) {
    var data = {
      title: project.title, where: project.where, when: project.when, pitch: project.pitch,
      by: project.by, interested: project.interested,
      dates: project.dates.map(function (d) { return d.l; }),
      votes: {}, created: Date.now()
    };
    return addDoc(col("projects"), data).then(store.load);
  },
  removeProject: function (id) {
    return deleteDoc(ref("projects", id)).then(store.load);
  }
};

export default store;
