(function () {
  "use strict";

  var CFG = window.RL_CONFIG;
  var ASSOC = CFG.ASSOCIATION || {};
  var BRAND = ASSOC.name || "Alps Bike Society";
  var FIREBASE_MODE = CFG.BACKEND === "firebase";
  var store = null;

  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  var me = "";
  var code = "";
  var tab = "rides";
  var view = ""; // "join" : page « Rejoindre » affichée avant connexion
  var data = { rides: [], projects: [] };
  try {
    me = localStorage.getItem("rl_name") || "";
    code = localStorage.getItem("rl_code") || "";
  } catch (e) {}

  /* ---------- Utilitaires ---------- */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function dayLabel(iso) {
    var d = new Date(iso + "T12:00:00");
    var s = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function relTag(iso) {
    var diff = Math.round((new Date(iso + "T12:00:00") - new Date(todayISO() + "T12:00:00")) / 864e5);
    return diff === 0 ? "Aujourd’hui" : diff === 1 ? "Demain" : "";
  }
  function timeLabel(t) { return String(t).replace(":", "h"); }
  function hue(n) { var h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360; return h; }
  function av(n, maybe) {
    return '<span class="av' + (maybe ? " m" : "") + '" style="background:hsl(' + hue(n) + ' 45% 38%)" title="' +
      esc(n) + (maybe ? " (peut-être)" : "") + '">' + esc(n.charAt(0).toUpperCase()) + "</span>";
  }
  function has(a, n) { return a.indexOf(n) > -1; }
  function num(v) { var n = parseInt(v, 10); return isNaN(n) ? null : n; }
  function save(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function drop(key) { try { localStorage.removeItem(key); } catch (e) {} }
  function eyebrow() { return '<p class="eyebrow">' + esc(BRAND) + "</p>"; }
  function setErr(msg, id) { var el = $("#" + (id || "e")); if (el) el.textContent = msg; }

  var toastTimer = null;
  function flash(msg) {
    var el = $("#toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 3500);
  }

  /* ---------- Écrans avant connexion ---------- */
  function fatal(msg) {
    $("#app").innerHTML = '<div class="login"><div>' + eyebrow() + "<h1>Roue libre</h1><p class=\"sub\">" + esc(msg) +
      '</p></div><button class="cta" data-act="retry">Réessayer</button></div>';
  }

  function login(err) {
    $("#app").innerHTML =
      '<div class="login"><div>' + eyebrow() + '<h1>Roue libre</h1><p class="sub">Les sorties vélo de l’' + esc(BRAND) +
      ". Sans notifications : tu regardes quand tu veux.</p></div>" +
      '<label class="field">Ton prénom<input id="n" autocomplete="given-name" placeholder="Julien"></label>' +
      (code ? "" : '<label class="field">Code du groupe<input id="c" type="password" autocomplete="off" autocapitalize="none" placeholder="Code reçu de l’organisateur"></label>') +
      '<div class="err" id="e">' + esc(err || "") + '</div><button class="cta" data-act="login">Entrer</button>' +
      '<button class="link" data-act="join-public">Pas encore membre ? Rejoindre l’' + esc(BRAND) + "</button>" +
      (code ? '<button class="link" data-act="forget-code">Changer de code du groupe</button>' : "") +
      (FIREBASE_MODE ? "" : '<p class="note">Mode démo : les données restent dans ce téléphone. Le code est « ' + esc(CFG.GROUP_CODE) + " ».</p>") +
      "</div>";
  }
  function doLogin() {
    var n = $("#n").value.trim();
    var c = code || ($("#c") ? $("#c").value.trim() : "");
    if (!n) { setErr("Indique ton prénom."); return; }
    if (!c) { setErr("Indique le code du groupe."); return; }
    setErr("Vérification…");
    store.checkCode(c).then(function (ok) {
      if (!ok) { setErr("Code incorrect."); return; }
      me = n; code = c;
      save("rl_name", me); save("rl_code", code);
      start();
    }).catch(function (e) {
      console.error(e);
      setErr("Connexion impossible. Vérifie ta connexion internet.");
    });
  }
  function logout() {
    me = ""; drop("rl_name");
    view = "";
    renderShell();
  }
  function forgetCode() {
    me = ""; code = ""; drop("rl_name"); drop("rl_code");
    location.reload();
  }

  // Création du groupe : ouvre l'app avec « #creer » à la fin de l'adresse.
  function createScreen() {
    $("#app").innerHTML =
      '<div class="login"><div>' + eyebrow() + "<h1>Créer le groupe</h1>" +
      '<p class="sub">À faire une seule fois, par l’organisateur. Le code choisi sert à entrer dans l’app et à protéger vos données : il doit être long et difficile à deviner (par exemple trois mots et un nombre).</p></div>' +
      '<label class="field">Code du groupe (8 caractères ou plus)<input id="cc" autocomplete="off" autocapitalize="none" placeholder="ex. col-croix-fry-2027"></label>' +
      '<div class="err" id="ce"></div><button class="cta" data-act="create-group">Créer le groupe</button>' +
      '<button class="link" data-act="create-done">Retour à l’accueil</button></div>';
  }
  function doCreate() {
    var c = $("#cc").value.trim();
    if (c.replace(/[^A-Za-z0-9_-]/g, "").length < 8) { setErr("8 caractères ou plus : lettres, chiffres ou tirets.", "ce"); return; }
    setErr("Création…", "ce");
    store.checkCode(c).then(function (exists) {
      if (exists) { setErr("Ce code existe déjà. Choisis-en un autre.", "ce"); return; }
      return store.createGroup(c).then(function () {
        code = c; save("rl_code", code);
        $("#app").innerHTML =
          '<div class="login"><div>' + eyebrow() + "<h1>Groupe créé</h1>" +
          '<p class="sub">Voici le code à donner à tes amis, de préférence de vive voix ou en message privé :</p></div>' +
          '<p class="code">' + esc(c) + "</p>" +
          '<button class="cta" data-act="create-done">Continuer</button></div>';
      });
    }).catch(function (e) {
      console.error(e);
      setErr("Création impossible. Vérifie ta connexion et les règles Firestore.", "ce");
    });
  }
  function leaveCreate() {
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    view = "";
    if (me && code) start(); else login();
  }

  /* ---------- Page « Rejoindre » ---------- */
  function joinHtml() {
    var points = (ASSOC.points || []).map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("");
    var btns = "";
    if (ASSOC.joinUrl && /^https:\/\//.test(ASSOC.joinUrl)) {
      btns += '<a class="cta" href="' + esc(ASSOC.joinUrl) + '" target="_blank" rel="noopener">' + esc(ASSOC.joinLabel || "Adhérer") + "</a>";
    }
    if (ASSOC.contactEmail) {
      btns += '<a class="cta alt" href="mailto:' + esc(ASSOC.contactEmail) + '">Nous écrire</a>';
    }
    return '<div class="card join"><div class="when">Rejoindre l’' + esc(BRAND) + "</div>" +
      (ASSOC.pitch ? '<p class="pitch">' + esc(ASSOC.pitch) + "</p>" : "") +
      (points ? '<ul class="points">' + points + "</ul>" : "") +
      (btns || '<p class="none">Les infos d’adhésion arrivent bientôt.</p>') + "</div>";
  }
  function publicJoin() {
    $("#app").innerHTML = "<header>" + eyebrow() + "<h1>Roue libre</h1></header>" + joinHtml() +
      '<button class="link" data-act="back-login">← Retour à la connexion</button>';
  }

  /* ---------- Sorties ---------- */
  function rideCard(r) {
    var people = r.go.map(function (n) { return av(n, false); }).join("") +
                 r.maybe.map(function (n) { return av(n, true); }).join("");
    var facts = [];
    if (r.km != null) facts.push(r.km + " km");
    if (r.dp != null) facts.push(r.dp + " m D+");
    if (r.pace) facts.push(r.pace);
    var tag = relTag(r.date);
    var going = has(r.go, me);
    return '<div class="card"><div class="when">' + esc(timeLabel(r.time)) + "<small>" + esc(dayLabel(r.date)) + "</small>" +
      (tag ? '<span class="tag">' + tag + "</span>" : "") + "</div>" +
      '<p class="where">' + esc(r.place) + "</p>" +
      (facts.length ? '<div class="facts">' + facts.map(function (f) { return "<span>" + esc(f) + "</span>"; }).join("") + "</div>" : "") +
      '<p class="by">Proposée par ' + esc(r.by) +
      (r.by === me ? ' · <button class="link danger" data-act="ride-del" data-id="' + esc(r.id) + '">Annuler la sortie</button>' : "") + "</p>" +
      '<div class="people">' + (people || '<span class="none">Personne encore. Sois le premier.</span>') + "</div>" +
      '<div class="btns"><button class="b go' + (going ? " on" : "") + '" data-act="ride-go" data-id="' + esc(r.id) + '">' + (going ? "Je viens ✓" : "Je viens") + "</button>" +
      '<button class="b mb' + (has(r.maybe, me) ? " on" : "") + '" data-act="ride-maybe" data-id="' + esc(r.id) + '">Peut-être</button></div></div>';
  }
  function ridesList() {
    var today = todayISO();
    var upcoming = data.rides.filter(function (r) { return r.date >= today; })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    return "<h2>À venir</h2>" + (upcoming.length
      ? upcoming.map(rideCard).join("")
      : '<p class="empty">Aucune sortie prévue.<br>Propose la tienne ci-dessous.</p>');
  }
  function rideForm() {
    return '<details id="rideForm"><summary>Proposer une sortie</summary><div class="f">' +
      '<div class="row2"><label>Jour<input id="fd" type="date" min="' + todayISO() + '"></label><label>Heure<input id="ft" type="time" value="09:00"></label></div>' +
      '<label>Point de départ<input id="fp" placeholder="Ex. Place de la mairie"></label>' +
      '<div class="row2"><label>Distance (km)<input id="fk" type="number" inputmode="numeric" placeholder="60"></label><label>Dénivelé (m)<input id="fh" type="number" inputmode="numeric" placeholder="600"></label></div>' +
      '<label>Type<select id="fa"><option>🚴 Route</option><option>🚵 VTT</option><option>☕ Drink</option></select></label>' +
      '<div class="err" id="fe"></div><button class="cta" data-act="ride-add">Publier la sortie</button></div></details>';
  }
  function addRide() {
    var d = $("#fd").value, t = $("#ft").value, pl = $("#fp").value.trim();
    if (!d || !t || !pl) { setErr("Jour, heure et lieu sont nécessaires.", "fe"); return null; }
    return store.addRide({
      date: d, time: t, place: pl,
      km: num($("#fk").value), dp: num($("#fh").value),
      pace: $("#fa").value, by: me, go: [me], maybe: []
    }).then(function (res) {
      var f = $("#rideForm");
      if (f) f.open = false;
      ["fd", "fp", "fk", "fh"].forEach(function (id) { var el = $("#" + id); if (el) el.value = ""; });
      return res;
    });
  }

  /* ---------- Projets ---------- */
  function projCard(p) {
    var inter = has(p.interested, me);
    return '<div class="card proj"><div class="pt"><div class="when">' + esc(p.title) + '</div><p class="where">' +
      esc(p.where) + (p.where && p.when ? " · " : "") + esc(p.when) + '</p></div><div class="pb">' +
      (p.pitch ? '<p class="pitch">' + esc(p.pitch) + "</p>" : "") +
      '<div class="people">' + p.interested.map(function (n) { return av(n, false); }).join("") +
      '<span class="none">' + p.interested.length + " intéressé" + (p.interested.length > 1 ? "s" : "") + "</span></div>" +
      '<button class="b go' + (inter ? " on" : "") + '" style="width:100%" data-act="proj-int" data-id="' + esc(p.id) + '">' + (inter ? "Ça m’intéresse ✓" : "Ça m’intéresse") + "</button>" +
      (p.dates.length ? '<p class="lbl">Dates possibles (plusieurs choix permis)</p><div class="chips">' +
        p.dates.map(function (d, i) {
          return '<button class="chip' + (has(d.v, me) ? " on" : "") + '" data-act="proj-date" data-id="' + esc(p.id) + '" data-i="' + i + '">' + esc(d.l) + " · " + d.v.length + "</button>";
        }).join("") + "</div>" : "") +
      '<p class="by" style="margin:0">Lancé par ' + esc(p.by) +
      (p.by === me ? ' · <button class="link danger" data-act="proj-del" data-id="' + esc(p.id) + '">Supprimer</button>' : "") + "</p></div></div>";
  }
  function projList() {
    return "<h2>Pour plus tard</h2>" + (data.projects.length
      ? data.projects.map(projCard).join("")
      : '<p class="empty">Aucun projet pour l’instant.<br>Lance une idée ci-dessous.</p>') +
      '<p class="note">Un projet qui rassemble assez de monde, on l’organise ensemble.</p>';
  }
  function projForm() {
    return '<details id="projForm"><summary>Lancer un projet</summary><div class="f">' +
      '<label>Titre<input id="pt" placeholder="Ex. Stage à Majorque"></label>' +
      '<label>Lieu<input id="pw" placeholder="Ex. Majorque, Espagne"></label>' +
      '<label>Période<input id="pq" placeholder="Ex. Mars ou avril 2027"></label>' +
      '<label>Pour donner envie<textarea id="pp" placeholder="Une ou deux phrases"></textarea></label>' +
      '<label>Dates possibles (séparées par des virgules)<input id="pd" placeholder="13–20 mars, 3–10 avril"></label>' +
      '<div class="err" id="pe"></div><button class="cta" data-act="proj-add">Lancer le projet</button></div></details>';
  }
  function addProject() {
    var title = $("#pt").value.trim();
    if (!title) { setErr("Donne au moins un titre.", "pe"); return null; }
    var dates = $("#pd").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean)
      .map(function (l) { return { l: l, v: [] }; });
    return store.addProject({
      title: title, where: $("#pw").value.trim(), when: $("#pq").value.trim(),
      pitch: $("#pp").value.trim(), by: me, interested: [me], dates: dates
    }).then(function (res) {
      var f = $("#projForm");
      if (f) f.open = false;
      ["pt", "pw", "pq", "pp", "pd"].forEach(function (id) { var el = $("#" + id); if (el) el.value = ""; });
      return res;
    });
  }

  /* ---------- Rendu ---------- */
  // Le « shell » (en-tête, formulaire, navigation) n'est dessiné qu'au changement
  // d'onglet. Seule la liste est redessinée après un clic, pour ne jamais
  // effacer un formulaire à moitié rempli.
  function renderShell() {
    if (!me) { if (view === "join") publicJoin(); else login(); return; }
    var form = tab === "rides" ? rideForm() : tab === "proj" ? projForm() : "";
    $("#app").innerHTML =
      "<header>" + eyebrow() + '<h1>Roue libre</h1><p class="sub">Salut ' + esc(me) +
      '. Rien ne t’est poussé : tu regardes quand tu veux. <button class="link" data-act="logout">Changer de prénom</button></p></header>' +
      '<div id="list"></div>' + form +
      '<nav><div class="in">' +
      '<button class="tab' + (tab === "rides" ? " on" : "") + '" data-act="tab" data-tab="rides">Sorties</button>' +
      '<button class="tab' + (tab === "proj" ? " on" : "") + '" data-act="tab" data-tab="proj">Projets</button>' +
      '<button class="tab' + (tab === "join" ? " on" : "") + '" data-act="tab" data-tab="join">Rejoindre</button>' +
      "</div></nav>";
    refreshList();
  }
  function refreshList() {
    var el = $("#list");
    if (!el) return;
    el.innerHTML = tab === "rides" ? ridesList() : tab === "proj" ? projList() : joinHtml();
  }
  function apply(promise) {
    if (!promise) return;
    promise.then(function (d) { if (d) { data = d; refreshList(); } })
      .catch(function (e) { console.error(e); flash("Action non enregistrée. Vérifie ta connexion."); });
  }

  /* ---------- Actions (un seul écouteur de clic) ---------- */
  var actions = {
    login: doLogin,
    logout: logout,
    retry: function () { location.reload(); },
    "forget-code": forgetCode,
    "join-public": function () { view = "join"; renderShell(); window.scrollTo(0, 0); },
    "back-login": function () { view = ""; renderShell(); },
    "create-group": doCreate,
    "create-done": leaveCreate,
    tab: function (el) { tab = el.dataset.tab; renderShell(); window.scrollTo(0, 0); },
    "ride-go": function (el) { apply(store.setRide(el.dataset.id, me, "go")); },
    "ride-maybe": function (el) { apply(store.setRide(el.dataset.id, me, "maybe")); },
    "ride-add": function () { apply(addRide()); },
    "ride-del": function (el) { if (confirm("Annuler cette sortie ?")) apply(store.removeRide(el.dataset.id)); },
    "proj-int": function (el) { apply(store.toggleInterest(el.dataset.id, me)); },
    "proj-date": function (el) { apply(store.toggleDate(el.dataset.id, parseInt(el.dataset.i, 10), me)); },
    "proj-add": function () { apply(addProject()); },
    "proj-del": function (el) { if (confirm("Supprimer ce projet ?")) apply(store.removeProject(el.dataset.id)); }
  };
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]");
    if (el && actions[el.dataset.act] && store) actions[el.dataset.act](el);
  });

  // Au retour dans l'app, on relit les données (les autres ont pu en ajouter).
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && me && store && $("#list")) {
      store.load().then(function (d) { data = d; refreshList(); }).catch(function () {});
    }
  });

  /* ---------- Démarrage ---------- */
  function start() {
    store.setGroup(code);
    store.load().then(function (d) {
      data = d; view = "";
      renderShell();
    }).catch(function (e) {
      console.error(e);
      fatal("Impossible de charger les données. Vérifie ta connexion internet.");
    });
  }

  function loadStore() {
    if (FIREBASE_MODE) {
      if (!CFG.FIREBASE || !CFG.FIREBASE.apiKey) {
        return Promise.reject(new Error("Réglages Firebase manquants dans js/config.js"));
      }
      return import("./store-firebase.js").then(function (m) { return m.default; });
    }
    return Promise.resolve(window.RL_STORE);
  }

  function boot() {
    if (FIREBASE_MODE && location.hash === "#creer") { createScreen(); return; }
    if (me && code) start(); else login();
  }

  loadStore().then(function (s) { store = s; boot(); }).catch(function (e) {
    console.error(e);
    fatal("Impossible de se connecter au groupe. Vérifie ta connexion internet puis rouvre l’app.");
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
