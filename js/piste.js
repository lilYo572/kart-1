/* =============================================================================
   PISTE — de quelques points de contrôle à un circuit complet.

   Un circuit n'est PAS une image. C'est une liste de points, une largeur, et
   une palette. Tout le reste — la route, les bordures en damier, le décor
   autour, la ligne d'arrivée, la mini-carte — est construit ici, au chargement.
   Ajouter un circuit tient donc en une quinzaine de lignes de données.

   Deux sorties, et il faut bien voir qu'elles ne servent pas à la même chose :

     La TEXTURE (1024 × 1024 pixels) sert uniquement à l'affichage. Le Mode 7 y
     pioche un pixel par point du sol à l'écran, et rien d'autre.

     La GÉOMÉTRIE (la ligne médiane rééchantillonnée) sert à tout le reste : où
     se trouve un kart sur le tour, s'il est sur la route ou dans l'herbe, où
     l'IA doit viser, qui est premier. On ne lit JAMAIS la texture pour ça —
     un test de collision par couleur de pixel, c'est le meilleur moyen de se
     retrouver avec un kart qui traverse un mur parce qu'on a changé une teinte.

   Repère : 1 unité monde = 1 pixel de texture. Un circuit tient dans le carré
   0 → 1024 sur les deux axes.
   ========================================================================== */
'use strict';

const CIRCUITS = {};   // rempli par les fichiers de circuits/

const PISTE = (() => {

  const TAILLE = 1024;   // côté de la texture, et donc du monde
  const PAS = 3;         // distance entre deux points de la ligne médiane

  /* ---- Boutisme ---------------------------------------------------------
     Un Uint32Array posé sur des pixels ne range pas les octets dans le même
     ordre selon la machine. On le mesure une fois, et on ne s'en préoccupe
     plus : toutes les couleurs passent par empaqueter(). */
  const sonde = new ArrayBuffer(4);
  new Uint32Array(sonde)[0] = 0x0a0b0c0d;
  const PETIT = new Uint8Array(sonde)[0] === 0x0d;
  const DR = PETIT ? 0 : 24, DG = PETIT ? 8 : 16, DB = PETIT ? 16 : 8, DA = PETIT ? 24 : 0;

  function empaqueter(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (((n >> 16) & 255) << DR | ((n >> 8) & 255) << DG | (n & 255) << DB | 255 << DA) >>> 0;
  }

  /* ---- Aléatoire reproductible ------------------------------------------
     Le décor est semé au hasard, mais toujours le MÊME hasard : deux joueurs
     doivent voir le même circuit, et toi tu dois pouvoir corriger un détail
     sans que tout se redessine ailleurs. */
  function graine(s) {
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function toile(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /* ---- La ligne médiane -------------------------------------------------
     Catmull-Rom passe exactement par les points donnés, ce qui veut dire que
     tu peux placer un virage à l'œil sur une grille et il tombera là. On
     échantillonne finement, puis on rééchantillonne à pas constant : sans ça,
     les longues lignes droites auraient dix fois moins de points que les
     épingles, et l'IA comme le classement s'en trouveraient faussés. */

  function catmull(a, b, c, d, t) {
    const t2 = t * t, t3 = t2 * t;
    return [
      0.5 * ((2 * b[0]) + (-a[0] + c[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * t3),
      0.5 * ((2 * b[1]) + (-a[1] + c[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * t3),
    ];
  }

  function medianeDe(trace) {
    const n = trace.length;
    const fin = [];
    for (let i = 0; i < n; i++) {
      const a = trace[(i - 1 + n) % n], b = trace[i], c = trace[(i + 1) % n], d = trace[(i + 2) % n];
      for (let k = 0; k < 60; k++) fin.push(catmull(a, b, c, d, k / 60));
    }

    // Rééchantillonnage à pas constant
    const pts = [];
    let reste = 0;
    for (let i = 0; i < fin.length; i++) {
      const p = fin[i], q = fin[(i + 1) % fin.length];
      const dx = q[0] - p[0], dz = q[1] - p[1];
      const l = Math.hypot(dx, dz);
      if (l < 1e-6) continue;
      let t = reste;
      while (t < l) {
        pts.push({ x: p[0] + dx * (t / l), z: p[1] + dz * (t / l) });
        t += PAS;
      }
      reste = t - l;
    }

    // Tangentes, normales, abscisse curviligne
    const m = pts.length;
    let s = 0;
    for (let i = 0; i < m; i++) {
      const p = pts[i], q = pts[(i + 1) % m], o = pts[(i - 1 + m) % m];
      const tx = q.x - o.x, tz = q.z - o.z;
      const l = Math.hypot(tx, tz) || 1;
      p.tx = tx / l; p.tz = tz / l;
      p.nx = -p.tz; p.nz = p.tx;         // normale, positive vers la gauche
      p.s = s;
      s += Math.hypot(q.x - p.x, q.z - p.z);
    }
    // Courbure : sert à l'IA (ralentir avant un virage) et aux bordures.
    for (let i = 0; i < m; i++) {
      const a = pts[(i - 4 + m) % m], b = pts[(i + 4) % m];
      let d = Math.atan2(b.tz, b.tx) - Math.atan2(a.tz, a.tx);
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      pts[i].courbe = d / (PAS * 8);
    }
    return { pts, longueur: s };
  }

  /* ---- Décors -----------------------------------------------------------
     Un peintre par ambiance. Tout est posé AVANT la route : ce qui déborde
     sur le tracé passe dessous et disparaît, on n'a donc pas à vérifier
     chaque arbre. */

  function tache(x, px, pz, r, c) { x.fillStyle = c; x.beginPath(); x.arc(px, pz, r, 0, 6.2832); x.fill(); }

  const decors = {

    champ(x, d, al) {
      // Un champ, ce sont des bandes de culture, pas un aplat vert.
      for (let i = 0; i < 60; i++) {
        const y = al() * TAILLE, h = 14 + al() * 26;
        x.fillStyle = al() < 0.5 ? d.sol.horsClair : d.sol.horsSombre;
        x.fillRect(0, y, TAILLE, h);
      }
      for (let i = 0; i < 4200; i++) {   // les tournesols
        const px = al() * TAILLE, pz = al() * TAILLE;
        x.fillStyle = '#4a6b24'; x.fillRect(px, pz + 3, 2, 5);
        x.fillStyle = '#e8b62c'; x.fillRect(px - 2, pz, 6, 5);
        x.fillStyle = '#7a4a12'; x.fillRect(px, pz + 1, 2, 2);
      }
    },

    villeEte(x, d, al) {
      for (let i = 0; i < 130; i++) {
        const w = 40 + al() * 110, h = 40 + al() * 130;
        const px = al() * TAILLE - w / 2, pz = al() * TAILLE - h / 2;
        x.fillStyle = ['#4a4038', '#3b3630', '#57504a', '#6b6156'][(al() * 4) | 0];
        x.fillRect(px, pz, w, h);
        x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(px + 6, pz + h, w, 8);
        x.fillStyle = '#e0b183';
        for (let k = 0; k < 8; k++) x.fillRect(px + 6 + al() * (w - 14), pz + 6 + al() * (h - 14), 5, 5);
      }
    },

    foret(x, d, al) {
      for (let i = 0; i < 260; i++) tache(x, al() * TAILLE, al() * TAILLE, 18 + al() * 40, d.sol.horsSombre);
      for (let i = 0; i < 340; i++) {
        const px = al() * TAILLE, pz = al() * TAILLE, r = 9 + al() * 12;
        tache(x, px + 3, pz + 4, r, 'rgba(0,0,0,.3)');
        tache(x, px, pz, r, '#2f5a2a');
        tache(x, px - r * 0.3, pz - r * 0.3, r * 0.55, '#4a7d38');
      }
      for (let i = 0; i < 26; i++) {   // les pierres levées
        const px = al() * TAILLE, pz = al() * TAILLE;
        for (let k = 0; k < 7; k++) {
          const a = k / 7 * 6.2832;
          x.fillStyle = '#8a8a96';
          x.fillRect(px + Math.cos(a) * 26 - 4, pz + Math.sin(a) * 26 - 6, 8, 12);
        }
      }
    },

    disco(x, d, al) {
      for (let i = 0; i < 90; i++) {   // les faisceaux de la piste
        const c = ['#e8256e', '#25c9e8', '#8a25e8', '#e8b62c'][(al() * 4) | 0];
        x.globalAlpha = 0.10 + al() * 0.14;
        tache(x, al() * TAILLE, al() * TAILLE, 40 + al() * 90, c);
      }
      x.globalAlpha = 1;
      for (let i = 0; i < 120; i++) {  // les enceintes
        const px = al() * TAILLE, pz = al() * TAILLE;
        x.fillStyle = '#1a1520'; x.fillRect(px, pz, 26, 40);
        x.fillStyle = '#2e2438'; x.fillRect(px + 3, pz + 3, 20, 20);
        x.fillStyle = '#e8256e'; x.fillRect(px + 9, pz + 30, 8, 5);
      }
    },

    neige(x, d, al) {
      for (let i = 0; i < 200; i++) tache(x, al() * TAILLE, al() * TAILLE, 20 + al() * 50, d.sol.horsClair);
      for (let i = 0; i < 120; i++) tache(x, al() * TAILLE, al() * TAILLE, 12 + al() * 26, d.sol.horsSombre);
      for (let i = 0; i < 200; i++) {  // les arbres nus
        const px = al() * TAILLE, pz = al() * TAILLE;
        x.fillStyle = '#2c333e'; x.fillRect(px, pz, 3, 16);
        x.fillStyle = '#e8eef4'; x.fillRect(px - 4, pz - 3, 11, 4);
      }
    },

    manoir(x, d, al) {
      for (let i = 0; i < 150; i++) {  // les haies taillées
        const w = 30 + al() * 80;
        const px = al() * TAILLE, pz = al() * TAILLE;
        x.fillStyle = '#1e2a1c'; x.fillRect(px, pz, w, 18);
        x.fillStyle = '#2c3a26'; x.fillRect(px, pz, w, 6);
      }
      for (let i = 0; i < 220; i++) {  // les bougies
        const px = al() * TAILLE, pz = al() * TAILLE;
        x.globalAlpha = 0.22; tache(x, px, pz, 14, '#e8b62c'); x.globalAlpha = 1;
        x.fillStyle = '#e0d2a8'; x.fillRect(px - 1, pz - 3, 3, 7);
        x.fillStyle = '#ffe08a'; x.fillRect(px - 1, pz - 5, 2, 3);
      }
    },

    labo(x, d, al) {
      x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 1;
      for (let i = 0; i <= TAILLE; i += 32) {
        x.beginPath(); x.moveTo(i, 0); x.lineTo(i, TAILLE); x.stroke();
        x.beginPath(); x.moveTo(0, i); x.lineTo(TAILLE, i); x.stroke();
      }
      for (let i = 0; i < 90; i++) {   // les cuves et les barrières
        const px = al() * TAILLE, pz = al() * TAILLE;
        x.fillStyle = '#243044'; x.fillRect(px, pz, 40, 40);
        x.fillStyle = '#2f4058'; x.fillRect(px + 4, pz + 4, 32, 10);
        x.fillStyle = '#e8b62c';
        for (let k = 0; k < 4; k++) x.fillRect(px + k * 10, pz + 32, 5, 5);
      }
      for (let i = 0; i < 40; i++) tache(x, al() * TAILLE, al() * TAILLE, 30 + al() * 50, 'rgba(60,180,220,.07)');
    },

    futuriste(x, d, al) {
      for (let i = 0; i < 200; i++) {  // dalles du terrain de largage
        const px = ((al() * TAILLE) | 0) & ~15, pz = ((al() * TAILLE) | 0) & ~15;
        x.fillStyle = al() < 0.5 ? d.sol.horsClair : d.sol.horsSombre;
        x.fillRect(px, pz, 48, 48);
      }
      x.strokeStyle = 'rgba(120,160,220,.12)'; x.lineWidth = 2;
      for (let i = 0; i <= TAILLE; i += 48) {
        x.beginPath(); x.moveTo(i, 0); x.lineTo(i, TAILLE); x.stroke();
        x.beginPath(); x.moveTo(0, i); x.lineTo(TAILLE, i); x.stroke();
      }
      for (let i = 0; i < 30; i++) {   // les marques d'atterrissage
        const px = al() * TAILLE, pz = al() * TAILLE;
        x.strokeStyle = '#e8b62c'; x.lineWidth = 4;
        x.strokeRect(px - 24, pz - 24, 48, 48);
      }
    },
  };

  /* ---- Route ------------------------------------------------------------ */

  function chemin(x, pts, decalage) {
    x.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const px = p.x + p.nx * decalage, pz = p.z + p.nz * decalage;
      i ? x.lineTo(px, pz) : x.moveTo(px, pz);
    }
    x.closePath();
  }

  function dessinerTexture(def, geo) {
    const hw = def.demiLargeur;
    const c = toile(TAILLE, TAILLE);
    const x = c.getContext('2d');
    const al = graine(def.gr || 1234);

    x.fillStyle = def.sol.hors;
    x.fillRect(0, 0, TAILLE, TAILLE);
    (decors[def.decor] || decors.champ)(x, def, al);

    x.lineJoin = 'round'; x.lineCap = 'round';

    // Accotement, puis route
    x.strokeStyle = def.sol.accotement; x.lineWidth = (hw + 11) * 2; chemin(x, geo.pts, 0); x.stroke();
    x.strokeStyle = def.sol.route;      x.lineWidth = hw * 2;        chemin(x, geo.pts, 0); x.stroke();

    // Bandes transversales : sans elles, une route d'une seule couleur ne
    // donne aucune sensation de vitesse en Mode 7. C'est le détail qui fait
    // toute la différence à l'écran.
    x.globalAlpha = 0.085;
    x.strokeStyle = '#000000';
    x.lineWidth = hw * 2;
    x.setLineDash([24, 24]);
    chemin(x, geo.pts, 0); x.stroke();
    x.setLineDash([]);
    x.globalAlpha = 1;

    // Traces de pneus
    x.globalAlpha = 0.10; x.strokeStyle = '#000000'; x.lineWidth = 7;
    chemin(x, geo.pts, hw * 0.34); x.stroke();
    chemin(x, geo.pts, -hw * 0.34); x.stroke();
    x.globalAlpha = 1;

    // Bordures en damier, sur les deux bords
    for (const cote of [1, -1]) {
      x.lineWidth = 9;
      for (let phase = 0; phase < 2; phase++) {
        x.strokeStyle = phase ? def.sol.bord2 : def.sol.bord1;
        x.setLineDash([16, 16]);
        x.lineDashOffset = phase * 16;
        chemin(x, geo.pts, cote * (hw + 4.5));
        x.stroke();
      }
      x.setLineDash([]); x.lineDashOffset = 0;
    }

    // Ligne de départ : un damier posé en travers, exactement sur s = 0.
    const p0 = geo.pts[0];
    x.save();
    x.translate(p0.x, p0.z);
    x.rotate(Math.atan2(p0.tz, p0.tx));
    const cases = Math.ceil(hw * 2 / 11);
    for (let i = 0; i < cases; i++) {
      for (let k = 0; k < 2; k++) {
        x.fillStyle = ((i + k) % 2) ? '#f2f2f2' : '#20222c';
        x.fillRect(-11 + k * 11, -hw + i * 11, 11, 11);
      }
    }
    x.fillStyle = def.sol.bord1;
    x.fillRect(-14, -hw - 12, 3, hw * 2 + 24);
    x.restore();

    return c;
  }

  /* ---- Ciel et silhouettes ---------------------------------------------
     Une bande large répétée à l'horizon, décalée selon le cap de la caméra.
     C'est très peu de code pour beaucoup d'effet : sans elle, tourner sur
     place ne se voit pas. */

  function dessinerHorizon(def) {
    const L = 1024, H = 30;
    const c = toile(L, H);
    const x = c.getContext('2d');
    const al = graine((def.gr || 1234) + 77);
    const p = def.silhouette || {};
    const loin = p.loin || '#2c3444', pres = p.pres || '#232a38';

    const profil = def.horizon || 'immeubles';

    /* La bande se répète en boucle pendant qu'on tourne. Tout ce qui dépasse
       à droite doit donc RÉAPPARAÎTRE à gauche, sinon on voit une couture
       verticale traverser le ciel à chaque tour de volant. */
    const bloc = (px, py, w, h, c) => {
      x.fillStyle = c;
      x.fillRect(px, py, w, h);
      if (px + w > L) x.fillRect(px - L, py, w, h);
      if (px < 0) x.fillRect(px + L, py, w, h);
    };
    const rond = (px, py, r, c) => {
      x.fillStyle = c;
      x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill();
      if (px + r > L) { x.beginPath(); x.arc(px - L, py, r, 0, 6.2832); x.fill(); }
    };

    if (profil === 'immeubles' || profil === 'usine' || profil === 'futuriste') {
      for (const [couleur, base, ht] of [[loin, H - 4, 20], [pres, H, 15]]) {
        let px = 0;
        while (px < L) {
          const w = 12 + al() * 26, h = 5 + al() * ht;
          bloc(px, base - h, w, h, couleur);
          if (profil === 'usine' && al() < 0.3) bloc(px + w * 0.3, base - h - 9, 4, 9, couleur);
          if (profil === 'futuriste' && al() < 0.4) bloc(px + 3, base - h + 2, 2, 2, '#e8b62c');
          px += w + 2 + al() * 5;
        }
      }
    } else if (profil === 'collines' || profil === 'arbres') {
      /* Des fréquences entières sur la largeur de la bande : le profil se
         referme exactement sur lui-même, sans raccord visible. */
      const f1 = Math.PI * 2 * 2 / L, f2 = Math.PI * 2 * 5 / L, f3 = Math.PI * 2 * 9 / L;
      for (const [couleur, base, ht, ph] of [[loin, H - 3, 17, 0], [pres, H + 1, 12, 1.9]]) {
        x.fillStyle = couleur;
        x.beginPath(); x.moveTo(0, H);
        for (let px = 0; px <= L; px += 8) {
          const n = (Math.sin(px * f1 + ph) * 0.55 + Math.sin(px * f2 + ph * 2) * 0.3 + Math.sin(px * f3 + ph) * 0.15);
          x.lineTo(px, base - (n * 0.5 + 0.5) * ht);
        }
        x.lineTo(L, H); x.closePath(); x.fill();
      }
      if (profil === 'arbres') {
        for (let i = 0; i < 180; i++) rond(al() * L, H - 5 - al() * 8, 3 + al() * 3.5, pres);
      }
    } else if (profil === 'neon') {
      for (let i = 0; i < 110; i++) {
        const px = al() * L, w = 8 + al() * 20, h = 6 + al() * 20;
        bloc(px, H - h, w, h, al() < 0.5 ? loin : pres);
        bloc(px + 2, H - h + 2, w - 4, 2, ['#e8256e', '#25c9e8', '#8a25e8'][(al() * 3) | 0]);
      }
    } else { // 'manoir', 'hiver' : une masse sombre et découpée
      let px = 0;
      while (px < L) {
        const w = 16 + al() * 44, h = 6 + al() * 16;
        bloc(px, H - h, w, h, loin);
        if (al() < 0.35) bloc(px + w * 0.3, H - h - 8, w * 0.4, 8, loin);   // pignon
        px += w - 3;
      }
      px = 0;
      while (px < L) { const w = 10 + al() * 22, h = 4 + al() * 9; bloc(px, H - h, w, h, pres); px += w + al() * 8; }
    }
    return c;
  }

  /* ---- Mini-carte -------------------------------------------------------- */

  function dessinerCarte(def, geo, taille) {
    const c = toile(taille, taille);
    const x = c.getContext('2d');
    x.fillStyle = def.sol.hors; x.fillRect(0, 0, taille, taille);
    const k = taille / TAILLE;
    x.save(); x.scale(k, k);
    x.lineJoin = x.lineCap = 'round';
    x.strokeStyle = def.sol.accotement; x.lineWidth = (def.demiLargeur + 10) * 2;
    chemin(x, geo.pts, 0); x.stroke();
    x.strokeStyle = def.sol.route; x.lineWidth = def.demiLargeur * 2;
    chemin(x, geo.pts, 0); x.stroke();
    x.restore();
    const p0 = geo.pts[0];
    x.fillStyle = '#f2f2f2';
    x.fillRect(p0.x * k - 3, p0.z * k - 3, 6, 6);
    return c;
  }

  /* ---- Assemblage -------------------------------------------------------- */

  function construire(id) {
    const def = CIRCUITS[id];
    const geo = medianeDe(def.trace);
    const texture = dessinerTexture(def, geo);
    const img = texture.getContext('2d').getImageData(0, 0, TAILLE, TAILLE);

    const piste = {
      id, def,
      nom: def.nom,
      pts: geo.pts,
      longueur: geo.longueur,
      demiLargeur: def.demiLargeur,
      taille: TAILLE,
      pixels: new Uint32Array(img.data.buffer),
      horizon: dessinerHorizon(def),
      carte: dessinerCarte(def, geo, 96),
      cielHaut: empaqueter(def.ciel.haut),
      cielBas: empaqueter(def.ciel.bas),
      brume: empaqueter(def.ciel.bas),
      boites: [],
      departs: [],
    };

    // Les boîtes d'objets : des rangées en travers de la route, réparties sur
    // le tour. Trois par rangée, une au centre, deux sur les côtés.
    const rangees = def.boites || [0.14, 0.31, 0.48, 0.66, 0.83];
    for (const f of rangees) {
      const p = echantillon(piste, f * piste.longueur);
      for (const d of [-0.5, 0, 0.5]) {
        piste.boites.push({
          x: p.x + p.nx * d * piste.demiLargeur,
          z: p.z + p.nz * d * piste.demiLargeur,
          repos: 0,
        });
      }
    }

    // La grille de départ : deux colonnes, en quinconce, derrière la ligne.
    for (let i = 0; i < 12; i++) {
      const recul = 26 + Math.floor(i / 2) * 24;
      const cote = (i % 2 ? 1 : -1) * piste.demiLargeur * 0.42;
      const p = echantillon(piste, piste.longueur - recul);
      piste.departs.push({
        x: p.x + p.nx * cote,
        z: p.z + p.nz * cote,
        cap: Math.atan2(p.tz, p.tx),
        s: piste.longueur - recul,
      });
    }

    return piste;
  }

  /* ---- Requêtes ---------------------------------------------------------- */

  /* Le point de la ligne médiane à l'abscisse s (le tour boucle tout seul). */
  function echantillon(piste, s) {
    const n = piste.pts.length;
    let i = Math.floor(((s % piste.longueur) + piste.longueur) % piste.longueur / PAS);
    if (i >= n) i = n - 1;
    return piste.pts[i];
  }

  function indicePour(piste, s) {
    const n = piste.pts.length;
    let i = Math.floor(((s % piste.longueur) + piste.longueur) % piste.longueur / PAS);
    return i >= n ? n - 1 : i;
  }

  /* Où se trouve ce point par rapport à la piste ? Renvoie l'indice du segment,
     l'abscisse le long du tour, et l'écart latéral signé (positif = à gauche).

     On ne cherche que dans une fenêtre autour du dernier indice connu : un kart
     avance de moins de deux unités par image, une fenêtre de ±40 segments
     couvre largement, même à l'arrêt en travers. */
  function projeter(piste, x, z, depuis) {
    const pts = piste.pts, n = pts.length;
    let meilleur = Infinity, mi = depuis, mt = 0;
    for (let k = -40; k <= 40; k++) {
      const i = (depuis + k + n * 2) % n;
      const a = pts[i], b = pts[(i + 1) % n];
      const dx = b.x - a.x, dz = b.z - a.z;
      const l2 = dx * dx + dz * dz;
      let t = l2 ? ((x - a.x) * dx + (z - a.z) * dz) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a.x + dx * t, pz = a.z + dz * t;
      const d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (d2 < meilleur) { meilleur = d2; mi = i; mt = t; }
    }
    const a = pts[mi];
    const d = (x - a.x) * a.nx + (z - a.z) * a.nz;
    return { i: mi, s: a.s + mt * PAS, d, distance: Math.sqrt(meilleur) };
  }

  function projeterPartout(piste, x, z) {
    const pts = piste.pts, n = pts.length;
    let meilleur = Infinity, mi = 0;
    for (let i = 0; i < n; i += 4) {
      const d2 = (x - pts[i].x) * (x - pts[i].x) + (z - pts[i].z) * (z - pts[i].z);
      if (d2 < meilleur) { meilleur = d2; mi = i; }
    }
    return projeter(piste, x, z, mi);
  }

  /* Une vignette pour les menus. On ne construit QUE la ligne médiane : pas de
     texture de 1024 × 1024 pour afficher une case de 96 pixels. Le résultat est
     gardé en cache, la sélection de circuit se feuillette sans à-coup. */
  const cacheApercu = {};

  function apercu(id, taille) {
    const cle = id + ':' + taille;
    if (cacheApercu[cle]) return cacheApercu[cle];
    const def = CIRCUITS[id];
    const geo = medianeDe(def.trace);
    return (cacheApercu[cle] = dessinerCarte(def, geo, taille));
  }

  return {
    TAILLE, PAS, construire, apercu, echantillon, indicePour, projeter, projeterPartout,
    empaqueter, DR, DG, DB, DA, toile, graine,
  };
})();
