/* =============================================================================
   SPRITES

   Tout est dessiné en code, au pixel, sur de petites toiles hors écran. Aucune
   image à charger : la page s'ouvre par double-clic et le jeu démarre.

   Ce sont des REMPLAÇANTS. Le jour où tu as tes vrais karts, il n'y a rien à
   changer dans le reste du code : SPRITES.karts[id][vue] doit juste renvoyer
   une <canvas> ou une <img>. Le manifeste ci-dessous décrit ce que devra
   fournir un fichier PNG pour prendre la place de ce générateur — même forme
   que assets/ennemis/manifeste.json dans le jeu principal.

     7 vues par pilote, de la plus tournée à gauche à la plus tournée à droite.
     La vue 3 est le kart vu exactement de dos. Le moteur choisit la vue selon
     l'angle entre la caméra et le kart, et n'a pas besoin d'en savoir plus.
   ========================================================================== */
'use strict';

const SPRITES = (() => {

  const LK = 48, HK = 36;   // taille d'un sprite de kart
  const VUES = 7;

  const MANIFESTE = {
    kart: { largeur: LK, hauteur: HK, vues: VUES, vueDeDos: 3 },
    objet: { largeur: 20, hauteur: 20 },
  };

  function toile(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return c;
  }

  /* Un rectangle plein aux coordonnées entières : c'est ce qui garantit qu'un
     pixel reste un pixel, sans le moindre lissage sur les bords. */
  function r(x, px, py, w, h, c) {
    if (w <= 0 || h <= 0) return;
    x.fillStyle = c;
    x.fillRect(Math.round(px), Math.round(py), Math.round(w), Math.round(h));
  }

  /* ---------------------------------------------------------------------
     LE KART

     Un kart vu de dos, c'est trois choses empilées : deux essieux, une coque
     entre les deux, et un pilote assis dessus. Pour le faire tourner sans
     modèle 3D, on décale l'essieu AVANT sur le côté et on interpole la coque
     entre les deux essieux, ligne par ligne. À 48 pixels de large, l'œil
     complète tout seul.
  --------------------------------------------------------------------- */
  function dessinerKart(x, pal, t, frein) {
    const cxA = 24;                       // essieu arrière, toujours centré
    const cxF = 24 + t * 9.5;             // essieu avant, décalé selon l'angle
    const yF = 13, yA = 27;               // hauteurs des deux essieux
    const hwA = 13, hwF = 9.5 - Math.abs(t) * 2.0;
    const ombre = pal.carroSombre, corps = pal.carro, clair = pal.carroClair;
    const noir = '#0d0e14';

    // Ombre portée au sol
    x.globalAlpha = 0.28;
    r(x, cxA - 15, 30, 30, 4, '#000000');
    r(x, cxF - 11, 27, 22, 3, '#000000');
    x.globalAlpha = 1;

    // Roues avant — dessinées AVANT la coque, elles passent derrière
    const rf = (px) => { r(x, px - 3, yF - 1, 6, 9, noir); r(x, px - 2, yF, 3, 6, '#33333d'); };
    rf(cxF - hwF - 2);
    rf(cxF + hwF + 2);

    // Coque : une ligne de pixels par rangée, entre l'avant et l'arrière
    for (let y = yF; y <= yA; y++) {
      const k = (y - yF) / (yA - yF);
      const c = cxF + (cxA - cxF) * k;
      const hw = hwF + (hwA - hwF) * k;
      const teinte = y < yF + 4 ? clair : (y > yA - 3 ? ombre : corps);
      r(x, c - hw, y, hw * 2, 1, teinte);
    }

    // Liseré latéral aux couleurs du pilote
    for (let y = yF + 4; y <= yA - 2; y++) {
      const k = (y - yF) / (yA - yF);
      const c = cxF + (cxA - cxF) * k;
      const hw = hwF + (hwA - hwF) * k;
      r(x, c - hw, y, 1.5, 1, pal.accent);
      r(x, c + hw - 1.5, y, 1.5, 1, pal.accent);
    }

    // Panneau arrière, feux, aileron
    r(x, cxA - hwA, yA + 1, hwA * 2, 4, ombre);
    r(x, cxA - hwA, yA + 5, hwA * 2, 1, noir);
    const feu = frein ? '#ff5a4a' : '#8c2b26';
    r(x, cxA - hwA + 2, yA + 2, 3, 2, feu);
    r(x, cxA + hwA - 5, yA + 2, 3, 2, feu);
    r(x, cxA - hwA - 1, yA - 4, hwA * 2 + 2, 2, pal.accent);   // aileron
    r(x, cxA - hwA - 1, yA - 2, 2, 3, ombre);
    r(x, cxA + hwA - 1, yA - 2, 2, 3, ombre);

    // Roues arrière — au premier plan, plus grosses
    const ra = (px) => {
      r(x, px - 4, yA - 7, 8, 12, noir);
      r(x, px - 3, yA - 6, 4, 8, '#3a3a46');
      r(x, px - 3, yA - 2, 6, 2, '#15151c');
    };
    ra(cxA - hwA - 3);
    ra(cxA + hwA + 3);

    // Le pilote. Assis un peu en avant du milieu, tourné comme la coque.
    const kp = 0.42;
    const cp = cxF + (cxA - cxF) * kp;
    const yT = yF + 1;

    r(x, cp - 6, yT + 2, 12, 8, pal.tenue);              // torse
    r(x, cp - 6, yT + 2, 12, 2, pal.chemise);            // col
    r(x, cp - 1.5, yT + 3, 3, 6, pal.accent);            // cravate
    r(x, cp - 8, yT + 4, 2, 5, pal.tenue);               // bras
    r(x, cp + 6, yT + 4, 2, 5, pal.tenue);
    r(x, cp - 8, yT + 8, 2, 2, pal.peau);                // mains
    r(x, cp + 6, yT + 8, 2, 2, pal.peau);

    r(x, cp - 5, yT - 8, 10, 10, pal.peau);              // tête
    r(x, cp - 5, yT - 8, 10, 4, pal.cheveux);            // cheveux
    r(x, cp - 5, yT - 9, 10, 2, pal.cheveuxClair);
    r(x, cp - 5, yT - 4, 1.5, 4, pal.peauOmbre);         // côtés du visage
    r(x, cp + 3.5, yT - 4, 1.5, 4, pal.peauOmbre);
    r(x, cp - 6, yT - 8, 1.5, 7, pal.cheveux);
    r(x, cp + 4.5, yT - 8, 1.5, 7, pal.cheveux);
  }

  /* Un jeu complet de vues pour un pilote. */
  function feuilleKart(pal, frein) {
    const vues = [];
    for (let i = 0; i < VUES; i++) {
      const c = toile(LK, HK);
      dessinerKart(c.getContext('2d'), pal, (i - (VUES - 1) / 2) / ((VUES - 1) / 2), frein);
      vues.push(c);
    }
    return vues;
  }

  const karts = {};      // id → [7 vues]
  const kartsFrein = {}; // id → [7 vues], feux allumés

  function preparerKarts() {
    for (const p of PILOTES) {
      karts[p.id] = feuilleKart(p.pal, false);
      kartsFrein[p.id] = feuilleKart(p.pal, true);
    }
  }

  /* Choisit la vue selon l'écart d'angle entre le regard de la caméra et le
     cap du kart. Écart nul = on le voit de dos. */
  function vuePour(ecart) {
    let e = ecart;
    while (e > Math.PI) e -= Math.PI * 2;
    while (e < -Math.PI) e += Math.PI * 2;
    const k = Math.max(-1, Math.min(1, e / 1.15));
    return Math.round(3 + k * 3);
  }

  /* ---------------------------------------------------------------------
     LES OBJETS

     Inspirés de ce que tout le monde connaît, habillés en Brad Bitt : la
     boule du Serra-Lanceur remplace la carapace, la raclette remplace la
     peau de banane, le Brad-Shy remplace le champignon.
  --------------------------------------------------------------------- */

  const TO = 20;

  function disque(x, cx, cy, rad, c) {
    x.fillStyle = c;
    for (let y = -rad; y <= rad; y++) {
      const w = Math.floor(Math.sqrt(rad * rad - y * y));
      if (w > 0) x.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
    }
  }

  const dessins = {
    // La boule du Serra-Lanceur : jambon marbré, rouge et gras doré.
    boule(x) {
      disque(x, 10, 10, 8, '#c83e3f');
      disque(x, 10, 10, 6, '#e15e61');
      r(x, 5, 6, 3, 2, '#ffd3d4'); r(x, 12, 9, 2, 3, '#ffd3d4');
      r(x, 7, 13, 4, 2, '#ffd3d4'); r(x, 6, 8, 2, 2, '#fe6c71');
      disque(x, 8, 7, 2, '#ff9b9d');
    },
    // La même, mais elle te cherche.
    traqueuse(x) {
      disque(x, 10, 10, 8, '#7a1f24');
      disque(x, 10, 10, 6, '#c02a30');
      r(x, 4, 9, 12, 2, '#ffd3d4'); r(x, 9, 4, 2, 12, '#ffd3d4');
      disque(x, 10, 10, 2, '#ffe6a0');
    },
    // La flaque de raclette : ça glisse, et ça ne pardonne pas.
    raclette(x) {
      r(x, 3, 9, 14, 5, '#d99a12'); r(x, 4, 8, 12, 1, '#e8b62c');
      r(x, 5, 7, 9, 1, '#f5cf5e'); r(x, 2, 11, 16, 2, '#c07f0c');
      r(x, 6, 14, 3, 2, '#e8b62c'); r(x, 12, 14, 2, 3, '#e8b62c');
      r(x, 7, 5, 2, 2, '#ffe08a');
    },
    // Le verglas de la ville USA — hiver.
    verglas(x) {
      r(x, 4, 9, 12, 3, '#bcd9e8'); r(x, 6, 7, 8, 2, '#e4f2f8');
      r(x, 3, 11, 14, 2, '#8fb6cc'); r(x, 8, 5, 3, 2, '#ffffff');
      r(x, 5, 13, 4, 1, '#e4f2f8'); r(x, 12, 13, 3, 1, '#e4f2f8');
    },
    // Le Brad-Shy : l'essence mystique du jeu principal. Ici, elle pousse.
    bradshy(x) {
      disque(x, 10, 11, 6, '#4a3a9e');
      disque(x, 10, 11, 4, '#7a6ae0');
      r(x, 9, 2, 2, 6, '#a89aff'); r(x, 7, 4, 2, 4, '#7a6ae0');
      r(x, 11, 4, 2, 4, '#7a6ae0'); disque(x, 9, 10, 2, '#d8d0ff');
    },
    // Le costard doré : intouchable, et six secondes de bonheur.
    dore(x) {
      for (let i = 0; i < 8; i++) {
        const w = 8 - Math.abs(i - 3.5) * 2;
        r(x, 10 - w, 3 + i, w * 2, 1, i < 4 ? '#ffe08a' : '#e8b62c');
      }
      for (let i = 0; i < 6; i++) {
        const w = 6 - i;
        r(x, 10 - w, 11 + i, w * 2, 1, '#d99a12');
      }
      r(x, 8, 5, 2, 2, '#fffbe6');
    },
    // Le BRADDY3000 vient te chercher et te ramène devant.
    braddy(x) {
      r(x, 3, 6, 14, 9, '#6b7186'); r(x, 3, 6, 14, 2, '#98a0b6');
      r(x, 3, 13, 14, 2, '#454b5e'); r(x, 5, 8, 4, 4, '#d0453f');
      r(x, 11, 8, 4, 4, '#d0453f'); r(x, 6, 9, 2, 2, '#ff8a7a');
      r(x, 12, 9, 2, 2, '#ff8a7a'); r(x, 8, 3, 4, 3, '#98a0b6');
      r(x, 9, 1, 2, 2, '#e8b62c');
    },
    // La coupure de courant : tout le monde devant ralentit d'un coup.
    coupure(x) {
      const pts = [[11, 2, 4, 4], [9, 6, 4, 3], [7, 9, 6, 2], [10, 11, 3, 3], [8, 14, 3, 4]];
      for (const p of pts) r(x, p[0], p[1], p[2], p[3], '#e8b62c');
      r(x, 12, 3, 2, 2, '#ffe08a'); r(x, 8, 15, 2, 2, '#ffe08a');
    },
  };

  function icone(nom, triple) {
    const c = toile(TO, TO);
    const x = c.getContext('2d');
    const base = nom.replace(/3$/, '');
    if (triple) {
      // Trois exemplaires plus petits, comme un triple objet.
      const petit = toile(TO, TO);
      dessins[base](petit.getContext('2d'));
      for (const [dx, dy, s] of [[-5, 2, 0.62], [5, 2, 0.62], [0, -4, 0.62]]) {
        x.drawImage(petit, 0, 0, TO, TO, 10 + dx - TO * s / 2, 10 + dy - TO * s / 2, TO * s, TO * s);
      }
    } else {
      dessins[base](x);
    }
    return c;
  }

  const icones = {};

  function preparerObjets() {
    for (const id in OBJETS) icones[id] = icone(OBJETS[id].dessin, OBJETS[id].triple);
    icones['?'] = (() => {
      const c = toile(TO, TO); const x = c.getContext('2d');
      r(x, 6, 3, 8, 3, '#e8b62c'); r(x, 12, 5, 3, 4, '#e8b62c');
      r(x, 8, 8, 5, 3, '#e8b62c'); r(x, 8, 12, 4, 4, '#e8b62c');
      return c;
    })();
  }

  /* La boîte d'objets sur la piste : un cube qui tourne, quatre images. */
  const boites = [];

  function preparerBoites() {
    for (let f = 0; f < 4; f++) {
      const c = toile(24, 24);
      const x = c.getContext('2d');
      const l = 9 - Math.abs(f - 1.5) * 2.4;   // le cube s'aplatit puis revient
      x.globalAlpha = 0.9;
      for (let i = -10; i <= 10; i++) {
        const w = Math.round(l * (1 - Math.abs(i) / 12));
        if (w > 0) r(x, 12 - w, 12 + i, w * 2, 1, i < 0 ? '#f0c74a' : '#d99a12');
      }
      x.globalAlpha = 1;
      r(x, 12 - l, 11, l * 2, 1, '#ffe9a8');
      r(x, 10, 9, 4, 2, '#8c5a0a');
      r(x, 11, 11, 2, 3, '#8c5a0a');
      r(x, 11, 15, 2, 2, '#8c5a0a');
      boites.push(c);
    }
  }

  /* Petit portrait pour les menus : le kart de trois quarts, agrandi. */
  function portrait(id, echelle) {
    const c = toile(LK * echelle, HK * echelle);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(karts[id][4], 0, 0, LK * echelle, HK * echelle);
    return c;
  }

  function preparer() { preparerKarts(); preparerObjets(); preparerBoites(); }

  return { MANIFESTE, preparer, karts, kartsFrein, vuePour, icones, boites, portrait, toile, LK, HK };
})();
