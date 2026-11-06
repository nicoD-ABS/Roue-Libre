(function () {
  "use strict";

  var CFG = window.RL_CONFIG;
  var store = window.RL_STORE;

  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  var me = "";
  var tab = "rides";
  var data = { rides: [], projects: [] };
  try { me = localStorage.getItem("rl_name") || ""; } catch (e) {}

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

  /* ---------- Connexion ---------- */
  function login() {
    $("#app").innerHTML =
      '<div class="login"><div><h1>Roue libre</h1><p class="sub">Les sorties vélo du groupe, sans notifications. Tu regardes quand tu veux.</p></div>' +
      '<label class="field">Ton prénom<input id="n" autocomplete="given-name" placeholder="Julien"></label>' +
      '<label class="field">Code du groupe<input id="c" type="password" autocomplete="off" placeholder="Code reçu de l’organisateur"></label>' +
      '<div class="err" id="e"></div><button class="cta" data-act="login">Entrer</button>' +
      (CFG.BACKEND === "local" ? '<p class="note">Mode démo : les données restent dans ce téléphone. Le code est « ' + esc(CFG.GROUP_CODE) + ' ».</p>' : "") +
      "</div>";
  }
  function doLogin() {
    var n = $("#n").value.trim();
    var c = $("#c").value.trim().toLowerCase();
    if (!n) { $("#e").textContent = "Indique ton prénom."; return; }
    if (c !== String(CFG.GROUP_CODE).toLowerCase()) { $("#e").textContent = "Code incorrect."; return; }
    me = n;
    try { localStorage.setItem("rl_name", me); } catch (e) {}
    renderShell();
  }
  function logout() {
    me = "";
    try { localStorage.removeItem("rl_name"); } catch (e) {}
    renderShell();
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
      '<label>Allure<select id="fa"><option>Tranquille, 25 km/h</option><option>Soutenue, 28 km/h</option><option>Sportive, 30 km/h et +</option><option>Café, 20 km/h</option></select></label>' +
      '<div class="err" id="fe"></div><button class="cta" data-act="ride-add">Publier la sortie</button></div></details>';
  }
  function addRide() {
    var d = $("#fd").value, t = $("#ft").value, pl = $("#fp").value.trim();
    if (!d || !t || !pl) { $("#fe").textContent = "Jour, heure et lieu sont nécessaires."; return null; }
    return store.addRide({
      date: d, time: t, place: pl,
      km: num($("#fk").value), dp: num($("#fh").value),
      pace: $("#fa").value, by: me, go: [me], maybe: []
    }).then(function (res) {
      $("#rideForm").open = false;
      ["fd", "fp", "fk", "fh"].forEach(function (id) { $("#" + id).value = ""; });
      return res;
    });
  }

  /* ---------- Projets ---------- */
  function projCard(p) {
    var inter = has(p.interested, me);
    return '<div class="card proj"><div class="pt"><div class="when">' + esc(p.title) + '</div><p class="where">' +
      esc(p.where) + (p.when ? " · " + esc(p.when) : "") + "</p></div><div class=\"pb\">" +
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
    if (!title) { $("#pe").textContent = "Donne au moins un titre."; return null; }
    var dates = $("#pd").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean)
      .map(function (l) { return { l: l, v: [] }; });
    return store.addProject({
      title: title, where: $("#pw").value.trim(), when: $("#pq").value.trim(),
      pitch: $("#pp").value.trim(), by: me, interested: [me], dates: dates
    }).then(function (res) {
      $("#projForm").open = false;
      ["pt", "pw", "pq", "pp", "pd"].forEach(function (id) { $("#" + id).value = ""; });
      return res;
    });
  }

  /* ---------- Rendu ---------- */
  // Le "shell" (en-tête, formulaire, navigation) n'est dessiné qu'au changement
  // d'onglet. Seule la liste est redessinée après un clic, pour ne jamais
  // effacer un formulaire à moitié rempli.
  function renderShell() {
    if (!me) { login(); return; }
    $("#app").innerHTML =
      '<header><h1>Roue libre</h1><p class="sub">Salut ' + esc(me) +
      '. Rien ne t’est poussé : tu regardes quand tu veux. <button class="link" data-act="logout">Changer de prénom</button></p></header>' +
      '<div id="list"></div>' + (tab === "rides" ? rideForm() : projForm()) +
      '<nav><div class="in"><button class="tab' + (tab === "rides" ? " on" : "") + '" data-act="tab" data-tab="rides">Sorties</button>' +
      '<button class="tab' + (tab === "proj" ? " on" : "") + '" data-act="tab" data-tab="proj">Projets</button></div></nav>';
    refreshList();
  }
  function refreshList() {
    var el = $("#list");
    if (el) el.innerHTML = tab === "rides" ? ridesList() : projList();
  }
  function apply(promise) {
    if (!promise) return;
    promise.then(function (d) { data = d; refreshList(); })
      .catch(function (e) { console.error(e); });
  }

  /* ---------- Actions (un seul écouteur de clic) ---------- */
  var actions = {
    login: doLogin,
    logout: logout,
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
    if (el && actions[el.dataset.act]) actions[el.dataset.act](el);
  });

  // Au retour dans l'app, on relit les données (utile avec une base partagée).
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && me) {
      store.load().then(function (d) { data = d; refreshList(); });
    }
  });

  /* ---------- Démarrage ---------- */
  store.load().then(function (d) { data = d; renderShell(); });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
