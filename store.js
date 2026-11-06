// Couche de données.
// L'interface est la même quel que soit le stockage : toutes les méthodes
// renvoient une Promise qui donne l'état complet { rides, projects }.
// Pour partager les données entre amis, il suffira d'écrire un second
// adaptateur "remote" avec les mêmes méthodes (voir README).
(function (global) {
  "use strict";

  var KEY = "rl_data_v1";

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function inDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function toggle(arr, name) {
    var i = arr.indexOf(name);
    if (i > -1) arr.splice(i, 1); else arr.push(name);
  }
  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    return null;
  }

  // Données de démonstration (dates relatives à aujourd'hui).
  function seed() {
    return {
      rides: [
        { id: "r1", date: inDays(1), time: "09:00", place: "Place de la mairie", km: 65, dp: 700, pace: "Tranquille, 25 km/h", by: "Julien", go: ["Julien", "Camille"], maybe: ["Théo"] },
        { id: "r2", date: inDays(2), time: "08:30", place: "Boulangerie du village", km: 90, dp: 1200, pace: "Soutenue, 28 km/h", by: "Sarah", go: ["Sarah"], maybe: [] },
        { id: "r3", date: inDays(4), time: "12:15", place: "Parking de la gare", km: 35, dp: 300, pace: "Pause déj’, 24 km/h", by: "Camille", go: ["Camille", "Marc", "Théo"], maybe: [] }
      ],
      projects: [
        { id: "p1", title: "Stage de printemps à Majorque", where: "Majorque, Espagne", when: "Mars ou avril 2027", pitch: "Une semaine de route au soleil : routes lisses, cols doux, café-gâteau tous les jours.", by: "Sarah", interested: ["Sarah", "Julien", "Théo"], dates: [{ l: "13–20 mars", v: ["Sarah"] }, { l: "3–10 avril", v: ["Julien", "Théo"] }] },
        { id: "p2", title: "Week-end gravel dans le Vercors", where: "Vercors, France", when: "Juin 2027", pitch: "Deux jours de pistes, un gîte au milieu, du dénivelé et des paysages.", by: "Marc", interested: ["Marc"], dates: [{ l: "12–13 juin", v: [] }, { l: "19–20 juin", v: ["Marc"] }] }
      ]
    };
  }

  // ---- Adaptateur local (localStorage) ----
  var db = null;
  function read() {
    try {
      var s = localStorage.getItem(KEY);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return seed();
  }
  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
  }
  function done() { write(); return Promise.resolve(clone(db)); }
  function ensure() { if (!db) db = read(); }

  var LocalStore = {
    load: function () { ensure(); return Promise.resolve(clone(db)); },

    // kind : "go" ou "maybe". Re-cliquer retire la réponse.
    setRide: function (id, name, kind) {
      ensure();
      var r = find(db.rides, id);
      if (r) {
        var other = kind === "go" ? "maybe" : "go";
        if (r[other].indexOf(name) > -1) toggle(r[other], name);
        toggle(r[kind], name);
      }
      return done();
    },
    addRide: function (ride) {
      ensure();
      ride.id = "r" + Date.now();
      db.rides.push(ride);
      return done();
    },
    removeRide: function (id) {
      ensure();
      db.rides = db.rides.filter(function (r) { return String(r.id) !== String(id); });
      return done();
    },

    toggleInterest: function (id, name) {
      ensure();
      var p = find(db.projects, id);
      if (p) {
        toggle(p.interested, name);
        if (p.interested.indexOf(name) === -1) {
          p.dates.forEach(function (d) {
            var i = d.v.indexOf(name);
            if (i > -1) d.v.splice(i, 1);
          });
        }
      }
      return done();
    },
    toggleDate: function (id, index, name) {
      ensure();
      var p = find(db.projects, id);
      if (p && p.dates[index]) {
        toggle(p.dates[index].v, name);
        if (p.interested.indexOf(name) === -1) p.interested.push(name);
      }
      return done();
    },
    addProject: function (project) {
      ensure();
      project.id = "p" + Date.now();
      db.projects.push(project);
      return done();
    },
    removeProject: function (id) {
      ensure();
      db.projects = db.projects.filter(function (p) { return String(p.id) !== String(id); });
      return done();
    }
  };

  // Plus tard : if (RL_CONFIG.BACKEND === "remote") store = RemoteStore;
  global.RL_STORE = LocalStore;
  global.RL_STORE_SEED = seed; // utile pour les tests
})(window);
