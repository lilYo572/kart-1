/* =============================================================================
   MENUS

   Tous les écrans sont du HTML : c'est net à n'importe quelle définition, ça se
   navigue au clavier comme à la souris comme au doigt sans rien réécrire, et ça
   ne coûte pas une image par seconde de rendu.

   Un seul mécanisme sert partout : une liste d'éléments, un index courant, et
   trois actions — monter, descendre, valider. Que ce soit une liste verticale
   ou une grille de circuits ne change que le nombre de colonnes.
   ========================================================================== */
'use strict';

const MENU = (() => {

  const $ = (id) => document.getElementById(id);
  const ecrans = {};
  for (const s of document.querySelectorAll('#ecran section')) ecrans[s.dataset.ecran] = s;

  let courant = 'titre';
  let index = 0;
  let colonnes = 1;
  let items = [];           // [{ el, choix, verrou }]
  let surValider = null;
  let surRetour = null;
  let surBouge = null;

  /* Choix en cours de constitution, transmis à la course. */
  const choix = {
    mode: 'gp',
    coupe: 0,
    circuit: 0,
    pilote: 'brad',
    cylindree: OPTIONS.cylindree,
  };

  /* Un Grand Prix en cours : la coupe, la course dans la coupe, les points. */
  let gp = null;

  /* ---------------------------------------------------------------------
     Ossature
  --------------------------------------------------------------------- */

  function montrer(nom) {
    for (const k in ecrans) ecrans[k].hidden = (k !== nom);
    $('ecran').hidden = false;
    courant = nom;
    // Le bouton cliqué à l'écran précédent garde le focus, et le clavier
    // continuerait de l'atteindre. On le lâche à chaque changement d'écran.
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function cacherTout() {
    for (const k in ecrans) ecrans[k].hidden = true;
    $('ecran').hidden = true;
    courant = null;
  }

  function poser(liste, depart, cols, valider, retour, bouge) {
    items = liste; colonnes = cols || 1;
    surValider = valider; surRetour = retour; surBouge = bouge || null;
    index = Math.max(0, Math.min(items.length - 1, depart || 0));
    marquer();
  }

  function marquer() {
    items.forEach((it, i) => it.el.classList.toggle('actif', i === index));
    if (items[index] && items[index].el.scrollIntoView) {
      items[index].el.scrollIntoView({ block: 'nearest' });
    }
    if (surBouge) surBouge(index);
  }

  function bouger(pas) {
    if (!items.length) return;
    let i = index;
    for (let essai = 0; essai < items.length; essai++) {
      i = (i + pas + items.length) % items.length;
      if (!items[i].verrou) break;
    }
    if (i !== index) { index = i; AUDIO.bruit('curseur'); marquer(); }
  }

  function valider() {
    const it = items[index];
    if (!it || it.verrou) { AUDIO.bruit('retour'); return; }
    AUDIO.bruit('valider');
    if (surValider) surValider(it.choix, index);
  }

  function touche(nom) {
    if (!courant) return false;
    if (nom === 'accel') { bouger(colonnes > 1 ? -colonnes : -1); return true; }
    if (nom === 'frein') { bouger(colonnes > 1 ? colonnes : 1); return true; }
    if (nom === 'gauche' && colonnes > 1) { bouger(-1); return true; }
    if (nom === 'droite' && colonnes > 1) { bouger(1); return true; }
    if (nom === 'valider' || nom === 'objet') { valider(); return true; }
    if (nom === 'retour') { AUDIO.bruit('retour'); if (surRetour) surRetour(); return true; }
    return false;
  }

  /* Fabrique un élément cliquable et le branche sur la navigation. */
  function bouton(hote, html, choixValeur, classe, verrou) {
    const b = document.createElement('button');
    b.className = (classe || 'item') + '';
    b.innerHTML = html;
    if (verrou) b.disabled = true;
    hote.appendChild(b);
    const it = { el: b, choix: choixValeur, verrou: !!verrou };
    b.addEventListener('click', () => {
      if (verrou) return;
      index = items.indexOf(it); marquer(); valider();
    });
    /* pointermove et non pointerenter : quand un écran se reconstruit sous le
       curseur immobile, le navigateur envoie quand même un « entrer » sur
       l'élément qui se retrouve dessous, et la sélection sautait toute seule.
       Un mouvement réel, lui, ne ment pas. */
    b.addEventListener('pointermove', (ev) => {
      if (verrou || (!ev.movementX && !ev.movementY)) return;
      const i = items.indexOf(it);
      if (i >= 0 && i !== index) { index = i; marquer(); }
    });
    return it;
  }

  /* ---------------------------------------------------------------------
     Écran titre
  --------------------------------------------------------------------- */

  function titre() {
    montrer('titre');
    const b = ecrans.titre.querySelector('[data-action="demarrer"]');
    /* Ce bouton n'est pas décoratif : les navigateurs interdisent toute lecture
       audio tant que l'utilisateur n'a pas cliqué. C'est ce clic qui autorise
       le son pour le reste de la session. */
    b.onclick = () => {
      AUDIO.debloquer();
      AUDIO.volumes();
      AUDIO.bruit('valider');
      principal();
    };
    poser([{ el: b, choix: 'go' }], 0, 1, () => b.onclick(), null);
  }

  /* ---------------------------------------------------------------------
     Menu principal
  --------------------------------------------------------------------- */

  const ENTREES_MENU = [
    ['gp',      'Grand Prix',       'Quatre courses, un classement.'],
    ['unique',  'Course unique',    'Un circuit, huit karts.'],
    ['clm',     'Contre-la-montre', 'Seul en piste, contre le chrono.'],
    ['options', 'Options',          ''],
    ['credits', 'Crédits',          ''],
  ];

  function principal() {
    montrer('menu');
    AUDIO.jouerMusique('menu');
    const hote = $('menu-liste');
    hote.innerHTML = '';
    const liste = ENTREES_MENU.map(([id, nom, sous]) =>
      bouton(hote, '<span>' + nom + '</span>' + (sous ? '<small>' + sous + '</small>' : ''), id));
    poser(liste, 0, 1, (id) => {
      if (id === 'options') return options();
      if (id === 'credits') return credits();
      choix.mode = id;
      if (id === 'gp') coupes(); else circuits();
    }, null);
  }

  function credits() {
    montrer('credits');
    const b = ecrans.credits.querySelector('[data-action="retour"]');
    b.onclick = () => { AUDIO.bruit('retour'); principal(); };
    poser([{ el: b, choix: 0 }], 0, 1, () => b.onclick(), () => b.onclick());
  }

  /* ---------------------------------------------------------------------
     Coupes et circuits
  --------------------------------------------------------------------- */

  function coupes() {
    montrer('coupes');
    const hote = $('coupes-grille');
    hote.innerHTML = '';
    const liste = COUPES.map((c, i) => {
      const it = bouton(hote,
        '<b>' + c.nom + '</b><span>' + (c.verrou ? c.verrou : c.circuits.length + ' courses') + '</span>',
        i, 'item', !!c.verrou);
      const cv = document.createElement('canvas');
      cv.width = cv.height = 96;
      const x = cv.getContext('2d');
      if (c.circuits.length) {
        x.drawImage(PISTE.apercu(c.circuits[0], 96), 0, 0);
      } else {
        x.fillStyle = '#171a26'; x.fillRect(0, 0, 96, 96);
        x.fillStyle = '#2a2f42'; x.font = '700 44px ui-monospace, monospace';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('?', 48, 50);
      }
      it.el.insertBefore(cv, it.el.firstChild);
      return it;
    });
    poser(liste, choix.coupe, 2, (i) => {
      choix.coupe = i;
      gp = { coupe: COUPES[i], course: 0, points: {} };
      cylindree();
    }, principal, (i) => {
      const c = COUPES[i];
      $('coupes-detail').textContent = c.verrou ? c.verrou
        : c.origine + ' — ' + c.circuits.map((id) => CIRCUITS[id].nom).join(' · ');
    });
  }

  function circuits() {
    montrer('circuits');
    const hote = $('circuits-grille');
    hote.innerHTML = '';
    const liste = TOUS_CIRCUITS.map((id, i) => {
      const c = CIRCUITS[id];
      const it = bouton(hote, '<b>' + c.nom + '</b><span>' + c.resume + '</span>', i);
      const vig = PISTE.apercu(id, 96);
      const cv = document.createElement('canvas');
      cv.width = cv.height = 96;
      cv.getContext('2d').drawImage(vig, 0, 0);
      it.el.insertBefore(cv, it.el.firstChild);
      return it;
    });
    poser(liste, choix.circuit, 3, (i) => { choix.circuit = i; cylindree(); },
      principal,
      (i) => {
        let t = CIRCUITS[TOUS_CIRCUITS[i]].resume;
        if (choix.mode === 'clm') {
          const r = record(TOUS_CIRCUITS[i]);
          if (r) t += '  ·  Meilleur tour : ' + COURSE.tempsTexte(r);
        }
        $('circuits-detail').textContent = t;
      });
  }

  function record(id) {
    try { return parseFloat(localStorage.getItem('kart-record-' + id)) || null; }
    catch (e) { return null; }
  }

  /* ---------------------------------------------------------------------
     Cylindrée et pilote
  --------------------------------------------------------------------- */

  function cylindree() {
    montrer('cylindree');
    const hote = $('cylindree-liste');
    hote.innerHTML = '';
    const cles = Object.keys(CYLINDREES);
    const liste = cles.map((c) => bouton(hote,
      '<span>' + c + 'cc — ' + CYLINDREES[c].nom + '</span><small>' + CYLINDREES[c].note + '</small>', c));
    poser(liste, cles.indexOf(choix.cylindree), 1, (c) => {
      choix.cylindree = c; OPTIONS.cylindree = c; sauverOptions();
      pilotes();
    }, choix.mode === 'gp' ? coupes : circuits);
  }

  function pilotes() {
    montrer('pilotes');
    const hote = $('pilotes-grille');
    hote.innerHTML = '';
    const liste = PILOTES.map((p, i) => {
      const it = bouton(hote, '<b>' + p.nom + '</b>', p.id);
      const vig = SPRITES.portrait(p.id, 2);
      it.el.insertBefore(vig, it.el.firstChild);
      return it;
    });
    const depart = Math.max(0, PILOTES.findIndex((p) => p.id === choix.pilote));
    poser(liste, depart, 4, (id) => { choix.pilote = id; lancer(); }, cylindree, (i) => {
      const p = PILOTES[i];
      const jauge = (n) => '<div class="jauge"><i style="width:' + (n / 5 * 100) + '%"></i></div>';
      $('pilote-fiche').innerHTML =
        '<div class="vehicule">' + p.vehicule + '</div>' +
        '<div class="ligne"><span>Vitesse</span>' + jauge(p.stats.vitesse) + '</div>' +
        '<div class="ligne"><span>Accélération</span>' + jauge(p.stats.accel) + '</div>' +
        '<div class="ligne"><span>Tenue</span>' + jauge(p.stats.tenue) + '</div>' +
        '<div class="ligne"><span>Poids</span>' + jauge(p.stats.poids) + '</div>' +
        '<p class="note" style="text-transform:none;letter-spacing:0">' + p.note + '</p>';
    });
  }

  /* ---------------------------------------------------------------------
     Lancement d'une course
  --------------------------------------------------------------------- */

  function circuitCourant() {
    if (choix.mode === 'gp') return gp.coupe.circuits[gp.course];
    return TOUS_CIRCUITS[choix.circuit];
  }

  function lancer() {
    cacherTout();
    JEU.lancerCourse({
      circuit: circuitCourant(),
      piloteId: choix.pilote,
      cylindree: choix.cylindree,
      mode: choix.mode,
      tours: REGLAGES.tours,
    });
  }

  /* ---------------------------------------------------------------------
     Pause
  --------------------------------------------------------------------- */

  function pause(reprendre) {
    montrer('pause');
    const hote = $('pause-liste');
    hote.innerHTML = '';
    const liste = [
      bouton(hote, '<span>Reprendre</span>', 'reprendre'),
      bouton(hote, '<span>Recommencer</span>', 'recommencer'),
      bouton(hote, '<span>Menu principal</span>', 'menu'),
    ];
    poser(liste, 0, 1, (id) => {
      if (id === 'reprendre') { cacherTout(); reprendre(); }
      else if (id === 'recommencer') lancer();
      else { JEU.quitterCourse(); principal(); }
    }, () => { cacherTout(); reprendre(); });
  }

  /* ---------------------------------------------------------------------
     Résultats
  --------------------------------------------------------------------- */

  function resultats(res) {
    montrer('resultats');

    let titreTexte = 'Arrivée';
    const enGP = choix.mode === 'gp' && gp;
    if (enGP) {
      for (const r of res) gp.points[r.pilote.id] = (gp.points[r.pilote.id] || 0) + r.points;
      titreTexte = gp.coupe.nom + ' — course ' + (gp.course + 1) + '/' + gp.coupe.circuits.length;
    } else if (choix.mode === 'clm') {
      const m = res[0].meilleur;
      titreTexte = m ? 'Meilleur tour : ' + COURSE.tempsTexte(m) : 'Contre-la-montre';
    }
    $('resultats-titre').textContent = titreTexte;

    const ol = $('resultats-tableau');
    ol.innerHTML = '';
    for (const r of res) {
      const li = document.createElement('li');
      if (r.moi) li.className = 'moi';
      const total = enGP ? gp.points[r.pilote.id] : r.points;
      li.innerHTML =
        '<span>' + r.place + (r.place === 1 ? 'er' : 'e') + '</span>' +
        '<i style="background:' + r.pilote.couleurHud + '"></i>' +
        '<span>' + r.pilote.nom + '</span>' +
        '<span class="tps">' + (r.temps ? COURSE.tempsTexte(r.temps) : '—') + '</span>' +
        '<span class="pts">' + (choix.mode === 'clm' ? '' : total + ' pt') + '</span>';
      ol.appendChild(li);
    }

    const hote = $('resultats-liste');
    hote.innerHTML = '';
    const liste = [];
    if (enGP && gp.course + 1 < gp.coupe.circuits.length) {
      liste.push(bouton(hote, '<span>Course suivante</span><small>' +
        CIRCUITS[gp.coupe.circuits[gp.course + 1]].nom + '</small>', 'suite'));
    } else if (enGP) {
      liste.push(bouton(hote, '<span>Rejouer la coupe</span>', 'recoupe'));
    } else {
      liste.push(bouton(hote, '<span>Rejouer</span>', 'rejouer'));
      liste.push(bouton(hote, '<span>Autre circuit</span>', 'autre'));
    }
    liste.push(bouton(hote, '<span>Menu principal</span>', 'menu'));

    poser(liste, 0, 1, (id) => {
      if (id === 'suite') { gp.course++; lancer(); }
      else if (id === 'recoupe') { gp.course = 0; gp.points = {}; lancer(); }
      else if (id === 'rejouer') lancer();
      else if (id === 'autre') { JEU.quitterCourse(); circuits(); }
      else { JEU.quitterCourse(); principal(); }
    }, null);
  }

  /* ---------------------------------------------------------------------
     Options
  --------------------------------------------------------------------- */

  function options() {
    montrer('options');
    const hote = $('options-corps');
    hote.innerHTML = '';

    const curseur = (nom, cle, min, max, pas, fmt) => {
      const l = document.createElement('label');
      l.innerHTML = '<span>' + nom + '</span><span class="val"></span>';
      const inp = document.createElement('input');
      inp.type = 'range'; inp.min = min; inp.max = max; inp.step = pas;
      inp.value = OPTIONS[cle];
      const val = l.querySelector('.val');
      val.textContent = fmt(OPTIONS[cle]);
      inp.oninput = () => {
        OPTIONS[cle] = parseFloat(inp.value);
        val.textContent = fmt(OPTIONS[cle]);
        AUDIO.volumes(); sauverOptions();
      };
      l.appendChild(inp);
      hote.appendChild(l);
    };

    const pourcent = (v) => Math.round(v * 100) + ' %';
    curseur('Volume musique', 'volumeMusique', 0, 1, 0.05, pourcent);
    curseur('Volume effets', 'volumeEffets', 0, 1, 0.05, pourcent);

    const bascule = (nom, cle, valeurs, noms) => {
      const l = document.createElement('label');
      l.innerHTML = '<span>' + nom + '</span>';
      const b = document.createElement('button');
      b.className = 'gros';
      const rendre = () => {
        const i = valeurs.indexOf(OPTIONS[cle]);
        b.textContent = noms[i < 0 ? 0 : i];
      };
      b.onclick = () => {
        const i = valeurs.indexOf(OPTIONS[cle]);
        OPTIONS[cle] = valeurs[(i + 1) % valeurs.length];
        rendre(); sauverOptions(); AUDIO.bruit('curseur');
      };
      rendre();
      l.appendChild(b);
      hote.appendChild(l);
    };

    bascule('Accélération automatique', 'accelAuto', [null, true, false], ['Selon l\'appareil', 'Toujours', 'Jamais']);
    bascule('Secousses d\'écran', 'secousse', [true, false], ['Oui', 'Non']);

    const retourBtn = document.createElement('button');
    retourBtn.className = 'gros';
    retourBtn.textContent = 'Retour';
    hote.appendChild(retourBtn);
    retourBtn.onclick = () => { AUDIO.bruit('retour'); principal(); };

    poser([{ el: retourBtn, choix: 0 }], 0, 1, () => retourBtn.onclick(), () => retourBtn.onclick());
  }

  return { titre, principal, pause, resultats, touche, choix, get ecran() { return courant; } };
})();
