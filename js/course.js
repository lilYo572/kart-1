/* =============================================================================
   COURSE — la boucle de jeu.

   Huit karts, trois tours, une roulette d'objets. Tout ce qui bouge est ici.

   Un principe traverse le fichier : la position d'un kart sur le circuit n'est
   JAMAIS lue dans l'image. On projette sa position sur la ligne médiane, et
   cette projection donne d'un coup l'avancement dans le tour, l'écart latéral
   (donc l'herbe), la direction à suivre pour l'IA et le classement. Un seul
   calcul, quatre réponses.
   ========================================================================== */
'use strict';

const COURSE = (() => {

  let piste = null;
  let karts = [];
  let joueur = null;
  let config = null;

  let phase = 'attente';    // 'depart' · 'course' · 'arrivee' · 'fini'
  let compte = 0;           // décompte du départ, puis temps depuis l'arrivée
  let chrono = 0;
  let projectiles = [];
  let pieges = [];
  let secousse = 0;
  let voileForce = 0, voileCouleur = '#000';

  const cam = { x: 0, z: 0, ang: 0, h: 18, secousse: 0 };

  const TAILLE_KART = 11;   // largeur d'un kart en unités monde
  const RAYON = 6;          // rayon de collision

  /* ---------------------------------------------------------------------
     Mise en place
  --------------------------------------------------------------------- */

  function creerKart(p, ia, depart, rang) {
    return {
      pilote: p, ia,
      x: depart.x, z: depart.z, cap: depart.cap,
      v: 0, derapage: 0, derapeCote: 0, derapeTemps: 0,
      seg: 0, s: depart.s, d: 0, surRoute: true,
      tour: 0, progression: 0, place: rang + 1, rang,
      boost: 0, invincible: 0, toupie: 0, glisse: 0, fusee: 0,
      objet: null, objetQte: 0, roulette: 0,
      tempsTours: [], tempsTotal: 0, fini: false, points: 0,
      voie: (Math.random() * 2 - 1) * 0.55, voieChangement: 1 + Math.random() * 3,
      niveau: 1, delaiObjet: 0,
      freine: false, capVisuel: depart.cap,
    };
  }

  function preparer(cfg) {
    config = cfg;
    piste = PISTE.construire(cfg.circuit);

    const cyl = CYLINDREES[cfg.cylindree] || CYLINDREES['100'];
    const solo = cfg.mode === 'clm';
    const total = solo ? 1 : Math.min(REGLAGES.concurrents, PILOTES.length);

    // Le joueur part au fond de la grille : c'est là qu'un jeu de kart est
    // intéressant, et ça met la roulette d'objets à contribution dès le début.
    const autres = PILOTES.filter((p) => p.id !== cfg.piloteId);
    for (let i = autres.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [autres[i], autres[j]] = [autres[j], autres[i]];
    }

    karts = [];
    const ordre = solo ? [pilote(cfg.piloteId)]
                       : autres.slice(0, total - 1).concat([pilote(cfg.piloteId)]);

    ordre.forEach((p, i) => {
      const k = creerKart(p, p.id !== cfg.piloteId, piste.departs[i], i);
      k.niveau = REGLAGES.iaNiveau * cyl.ia * (0.945 + (total - i) * 0.012);
      const pr = PISTE.projeterPartout(piste, k.x, k.z);
      k.seg = pr.i; k.s = pr.s; k.sPrec = pr.s;
      karts.push(k);
    });

    joueur = karts.find((k) => !k.ia);
    joueur.niveau = 1;

    projectiles = []; pieges = [];
    chrono = 0; compte = 3.6; phase = 'depart';
    secousse = 0; voileForce = 1; voileCouleur = '#000';

    cam.ang = joueur.cap;
    cam.x = joueur.x - Math.cos(cam.ang) * REGLAGES.camRecul;
    cam.z = joueur.z - Math.sin(cam.ang) * REGLAGES.camRecul;

    AUDIO.jouerMusique(piste.def.musique);
    AUDIO.demarrerMoteur();
    classer();
  }

  /* ---------------------------------------------------------------------
     Pilotage
  --------------------------------------------------------------------- */

  function normaliser(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function vitesseMaxDe(k) {
    const cyl = CYLINDREES[config.cylindree] || CYLINDREES['100'];
    let v = REGLAGES.vitesseMax * cyl.vitesse * k.pilote.mult.vitesse;
    if (k.ia) {
      // Élastique : on aide celui qui décroche, on freine celui qui s'échappe.
      const ecart = (k.place - joueur.place) / Math.max(1, karts.length);
      v *= k.niveau * (1 + ecart * REGLAGES.iaElastique);
    }
    return v;
  }

  function commandesJoueur(k) {
    const auto = ENTREES.accelAutomatique() && phase === 'course';
    return {
      dir: ENTREES.direction(),
      accel: ENTREES.etat.accel || (auto && !ENTREES.etat.frein) ? 1 : 0,
      frein: ENTREES.etat.frein,
      derive: ENTREES.etat.derive,
    };
  }

  function commandesIA(k, dt) {
    // Une voie qui dérive lentement : sans ça, huit karts roulent sur la même
    // ligne et se collent les uns aux autres jusqu'à l'arrivée.
    k.voieChangement -= dt;
    if (k.voieChangement <= 0) {
      k.voie = (Math.random() * 2 - 1) * 0.62;
      k.voieChangement = 2 + Math.random() * 4;
    }

    const avance = 26 + k.v * 0.36;
    const cible = PISTE.echantillon(piste, k.s + avance);
    const tx = cible.x + cible.nx * k.voie * piste.demiLargeur * 0.62;
    const tz = cible.z + cible.nz * k.voie * piste.demiLargeur * 0.62;
    const e = normaliser(Math.atan2(tz - k.z, tx - k.x) - k.cap);

    /* Le virage qui arrive. Une IA qui garde le pied au plancher jusqu'à ce
       que l'écart d'angle devienne énorme sort à tous les coups : elle freine
       trop tard, part dans l'herbe, et la course perd son intérêt. On regarde
       donc la COURBURE du tracé devant, et on en déduit une vitesse limite. */
    let courbe = 0;
    for (const d of [20, 45, 75]) {
      courbe = Math.max(courbe, Math.abs(PISTE.echantillon(piste, k.s + avance + d).courbe));
    }
    const vmax = vitesseMaxDe(k);
    const limite = vmax * (1 - Math.min(0.42, courbe * 22));

    return {
      dir: Math.max(-1, Math.min(1, e * 2.4)),
      accel: k.v < limite ? 1 : 0,
      frein: (k.v > limite * 1.18 || (Math.abs(e) > 0.9 && k.v > 40)) ? 1 : 0,
      derive: (courbe > 0.010 && Math.abs(e) > 0.14 && k.v > vmax * 0.48) ? 1 : 0,
    };
  }

  function conduire(k, dt) {
    let c;
    if (k.toupie > 0) {
      k.toupie -= dt;
      k.capVisuel += 13 * dt;
      k.v *= Math.pow(0.30, dt);
      c = { dir: 0, accel: 0, frein: 0, derive: 0 };
    } else if (k.fusee > 0) {
      // Le BRADDY3000 conduit à ta place, et il conduit bien.
      k.fusee -= dt;
      const cible = PISTE.echantillon(piste, k.s + 40);
      const e = normaliser(Math.atan2(cible.z - k.z, cible.x - k.x) - k.cap);
      k.cap += Math.max(-4 * dt, Math.min(4 * dt, e * 4));
      k.v = vitesseMaxDe(k) * 1.65;
      avancer(k, dt);
      return;
    } else if (k.glisse > 0) {
      k.glisse -= dt;
      const cmd = k.ia ? commandesIA(k, dt) : commandesJoueur(k);
      c = { dir: cmd.dir * 0.25 + Math.sin(chrono * 7 + k.rang) * 0.8, accel: cmd.accel, frein: 0, derive: 0 };
    } else {
      c = k.ia ? commandesIA(k, dt) : commandesJoueur(k);
    }

    if (phase === 'depart') { c.accel = 0; c.frein = 0; c.dir = 0; c.derive = 0; }

    const vmaxBase = vitesseMaxDe(k);
    let vmax = vmaxBase;
    if (!k.surRoute) vmax *= REGLAGES.herbeVitesse;
    if (k.boost > 0 || k.invincible > 0) vmax *= REGLAGES.boostForce;
    if (k.derapeCote) vmax *= REGLAGES.deriveFrein;

    let acc = REGLAGES.acceleration * k.pilote.mult.accel;
    if (k.boost > 0) acc *= REGLAGES.boostAccel;

    if (c.accel) k.v += acc * (1 - k.v / vmax) * dt;
    else if (c.frein) k.v -= REGLAGES.freinage * dt;
    else k.v -= REGLAGES.frottement * dt;

    if (!k.surRoute) k.v -= REGLAGES.herbeFrein * dt * 0.5;
    if (c.frein && k.v <= 0) k.v -= REGLAGES.marcheArriere * dt * 0.6;

    const plafond = vmax * 1.25;
    if (k.v > plafond) k.v = plafond;
    if (k.v < -REGLAGES.marcheArriere) k.v = -REGLAGES.marcheArriere;
    if (!c.accel && !c.frein && Math.abs(k.v) < 1.2) k.v = 0;
    if (k.v < 0 && !c.frein) k.v = Math.min(0, k.v + REGLAGES.frottement * dt);

    // Braquage : on ne tourne pas à l'arrêt, et de moins en moins vite quand
    // la vitesse tombe. Sans ça, un kart pivote sur place comme une toupie.
    const prise = Math.min(1, Math.abs(k.v) / (vmaxBase * REGLAGES.priseVitesse));
    let rot = REGLAGES.rotation * k.pilote.mult.tenue * prise * dt;
    if (k.derapeCote) rot *= REGLAGES.rotationDerive;
    k.cap += c.dir * rot * (k.v < 0 ? -1 : 1);

    // Dérapage et mini-turbo
    const peutDeraper = c.derive && c.dir !== 0 && k.v > vmaxBase * 0.42 && k.toupie <= 0 && k.glisse <= 0;
    if (peutDeraper) {
      if (!k.derapeCote) { k.derapeCote = c.dir; k.derapeTemps = 0; if (!k.ia) AUDIO.bruit('derapage'); }
      if (c.dir === k.derapeCote) k.derapeTemps += dt;
    } else if (k.derapeCote) {
      if (k.derapeTemps > REGLAGES.turboPalier2) { k.boost = Math.max(k.boost, REGLAGES.turboDuree2); if (!k.ia) AUDIO.bruit('turbo'); }
      else if (k.derapeTemps > REGLAGES.turboPalier1) { k.boost = Math.max(k.boost, REGLAGES.turboDuree1); if (!k.ia) AUDIO.bruit('turbo'); }
      k.derapeCote = 0; k.derapeTemps = 0;
    }
    const cible = k.derapeCote * REGLAGES.deriveAngle;
    k.derapage += (cible - k.derapage) * Math.min(1, REGLAGES.deriveMontee * dt);
    k.freine = !!c.frein;

    avancer(k, dt);
  }

  function avancer(k, dt) {
    k.x += Math.cos(k.cap) * k.v * dt;
    k.z += Math.sin(k.cap) * k.v * dt;
    if (k.toupie <= 0) k.capVisuel = k.cap + k.derapage;

    if (k.boost > 0) k.boost -= dt;
    if (k.invincible > 0) k.invincible -= dt;
    if (k.roulette > 0) k.roulette -= dt;

    // Projection sur la piste : avancement, herbe, tour.
    const pr = PISTE.projeter(piste, k.x, k.z, k.seg);
    k.seg = pr.i; k.d = pr.d;
    const sAvant = k.s;
    k.s = pr.s;
    k.surRoute = Math.abs(pr.d) < piste.demiLargeur;

    const L = piste.longueur;
    if (sAvant > L * 0.75 && k.s < L * 0.25) passerLaLigne(k);
    else if (sAvant < L * 0.25 && k.s > L * 0.75) k.tour--;
    k.progression = k.tour * L + k.s;

    // Le mur : au-delà de la route et de sa marge, on est renvoyé dedans.
    const limite = piste.demiLargeur + REGLAGES.murMarge;
    if (Math.abs(pr.d) > limite) {
      const p = piste.pts[pr.i];
      const trop = Math.abs(pr.d) - limite;
      const sens = pr.d > 0 ? 1 : -1;
      k.x -= p.nx * sens * trop;
      k.z -= p.nz * sens * trop;
      k.v *= REGLAGES.chocRebond;
      if (!k.ia) { secousse = Math.max(secousse, 2.5); AUDIO.bruit('choc'); }
    }
  }

  function passerLaLigne(k) {
    if (k.fini) return;
    k.tour++;
    if (k.tour > 0) {
      const cumul = k.tempsTours.reduce((a, b) => a + b, 0);
      k.tempsTours.push(chrono - cumul);
    }
    if (k.tour > config.tours) terminer(k);
    else if (!k.ia && k.tour > 1) {
      // On n'annonce pas le tour 1 : le kart franchit la ligne au départ, et
      // « TOUR 1 » collé au « PARTEZ » ne dit rien à personne.
      AUDIO.bruit('tour');
      annoncer(k.tour === config.tours ? 'DERNIER TOUR' : 'TOUR ' + k.tour);
    }
  }

  function terminer(k) {
    k.fini = true;
    k.tempsTotal = chrono;
    if (!k.ia) {
      phase = 'arrivee'; compte = 0;
      AUDIO.bruit(k.place <= 3 ? 'victoire' : 'defaite');
      if (config.mode === 'clm') enregistrerRecord();
    }
  }

  function enregistrerRecord() {
    const cle = 'kart-record-' + config.circuit;
    const meilleur = Math.min.apply(null, joueur.tempsTours);
    try {
      const ancien = parseFloat(localStorage.getItem(cle));
      if (!ancien || meilleur < ancien) localStorage.setItem(cle, meilleur.toFixed(3));
    } catch (e) {}
  }

  /* ---------------------------------------------------------------------
     Contacts entre karts
  --------------------------------------------------------------------- */

  function contacts() {
    for (let i = 0; i < karts.length; i++) {
      for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i], b = karts[j];
        const dx = b.x - a.x, dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d > RAYON * 2 || d < 0.001) continue;

        const nx = dx / d, nz = dz / d;
        const chevauche = RAYON * 2 - d;
        const ma = a.pilote.mult.poids, mb = b.pilote.mult.poids;
        const total = ma + mb;

        a.x -= nx * chevauche * (mb / total); a.z -= nz * chevauche * (mb / total);
        b.x += nx * chevauche * (ma / total); b.z += nz * chevauche * (ma / total);

        // Le plus lourd garde sa vitesse, le plus léger part de travers.
        a.cap -= nx * 0.05 * (mb / ma); b.cap += nx * 0.05 * (ma / mb);
        a.v *= 0.96 - 0.06 * (mb / total);
        b.v *= 0.96 - 0.06 * (ma / total);
        if (!a.ia || !b.ia) { secousse = Math.max(secousse, 1.4); AUDIO.bruit('objet'); }
      }
    }
  }

  /* ---------------------------------------------------------------------
     Objets
  --------------------------------------------------------------------- */

  function ramasserBoites(dt) {
    for (const b of piste.boites) {
      if (b.repos > 0) { b.repos -= dt; continue; }
      for (const k of karts) {
        if (k.objet || k.roulette > 0) continue;
        if (Math.hypot(k.x - b.x, k.z - b.z) < 10) {
          donnerObjet(k);
          b.repos = 4;
          break;
        }
      }
    }
  }

  function donnerObjet(k) {
    const id = tirerObjet(k.place, karts.length);
    k.objet = id;
    k.objetQte = OBJETS[id].quantite || 1;
    k.roulette = k.pilote.bonusObjet ? 0.55 : 1.05;
    k.delaiObjet = REGLAGES.objetsDelaiIA * (0.6 + Math.random());
    if (!k.ia) AUDIO.bruit('obtenu');
  }

  function utiliserObjet(k) {
    if (!k.objet || k.roulette > 0) return;
    const o = OBJETS[k.objet];

    if (o.type === 'projectile') {
      projectiles.push({
        x: k.x + Math.cos(k.cap) * 12, z: k.z + Math.sin(k.cap) * 12,
        cap: k.cap, v: o.vitesse, vie: o.duree, rebonds: o.rebonds,
        image: SPRITES.icones[k.objet], tireur: k, suit: !!o.suit,
        cible: o.suit ? kartDevant(k) : null, seg: k.seg, grace: 0.25,
      });
      if (!k.ia) AUDIO.bruit('lancer');

    } else if (o.type === 'piege') {
      pieges.push({
        x: k.x - Math.cos(k.cap) * 16, z: k.z - Math.sin(k.cap) * 16,
        effet: o.effet, vie: o.duree, image: SPRITES.icones[k.objet],
      });
      if (!k.ia) AUDIO.bruit('poser');

    } else if (o.type === 'perso') {
      if (o.effet === 'boost') k.boost = Math.max(k.boost, o.duree);
      if (o.effet === 'invincible') { k.invincible = o.duree; k.boost = Math.max(k.boost, o.duree); }
      if (o.effet === 'fusee') { k.fusee = o.duree; k.invincible = Math.max(k.invincible, o.duree); }
      if (!k.ia) AUDIO.bruit('turbo');

    } else if (o.type === 'global') {
      for (const a of karts) {
        if (a === k || a.invincible > 0) continue;
        if (a.progression > k.progression) toucher(a, 1.1);
      }
      if (!k.ia) AUDIO.bruit('choc');
    }

    k.objetQte--;
    if (k.objetQte <= 0) k.objet = null;
    else k.roulette = 0.25;   // court délai entre deux tirs d'un triple
  }

  function kartDevant(k) {
    let meilleur = null, ecart = Infinity;
    for (const a of karts) {
      if (a === k) continue;
      const e = a.progression - k.progression;
      if (e > 0 && e < ecart) { ecart = e; meilleur = a; }
    }
    return meilleur;
  }

  function toucher(k, duree) {
    if (k.invincible > 0 || k.fini) return;
    k.toupie = duree;
    k.v *= 0.30;
    k.derapeCote = 0; k.derapage = 0;
    if (!k.ia) { secousse = 5; AUDIO.bruit('choc'); annoncer('TOUCHÉ'); }
  }

  function majProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.vie -= dt; p.grace -= dt;
      if (p.vie <= 0) { projectiles.splice(i, 1); continue; }

      if (p.suit && p.cible && !p.cible.fini) {
        const e = normaliser(Math.atan2(p.cible.z - p.z, p.cible.x - p.x) - p.cap);
        p.cap += Math.max(-3.4 * dt, Math.min(3.4 * dt, e * 3.4));
      }

      p.x += Math.cos(p.cap) * p.v * dt;
      p.z += Math.sin(p.cap) * p.v * dt;

      const pr = PISTE.projeter(piste, p.x, p.z, p.seg);
      p.seg = pr.i;
      const limite = piste.demiLargeur + 14;
      if (Math.abs(pr.d) > limite) {
        if (p.rebonds > 0) {
          // Rebond sur le bord : on renvoie le cap de l'autre côté de la
          // tangente. Une boule qui rebondit reste dangereuse, c'est le but.
          const t = piste.pts[pr.i];
          const at = Math.atan2(t.tz, t.tx);
          p.cap = 2 * at - p.cap;
          p.rebonds--;
          const sens = pr.d > 0 ? 1 : -1;
          p.x -= t.nx * sens * (Math.abs(pr.d) - limite + 2);
          p.z -= t.nz * sens * (Math.abs(pr.d) - limite + 2);
        } else { projectiles.splice(i, 1); continue; }
      }

      for (const k of karts) {
        if (k === p.tireur && p.grace > 0) continue;
        if (Math.hypot(k.x - p.x, k.z - p.z) < RAYON + 5) {
          toucher(k, 1.5);
          projectiles.splice(i, 1);
          break;
        }
      }
    }

    for (let i = pieges.length - 1; i >= 0; i--) {
      const t = pieges[i];
      t.vie -= dt;
      if (t.vie <= 0) { pieges.splice(i, 1); continue; }
      for (const k of karts) {
        if (Math.hypot(k.x - t.x, k.z - t.z) < RAYON + 4) {
          if (k.invincible > 0) continue;
          if (t.effet === 'toupie') toucher(k, 1.3);
          else { k.glisse = 1.5; k.v *= 0.8; if (!k.ia) { AUDIO.bruit('glisse'); annoncer('ÇA GLISSE'); } }
          pieges.splice(i, 1);
          break;
        }
      }
    }
  }

  function objetsIA(dt) {
    for (const k of karts) {
      if (!k.ia || !k.objet || k.roulette > 0) continue;
      k.delaiObjet -= dt;
      if (k.delaiObjet > 0) continue;
      const o = OBJETS[k.objet];
      let lancer = true;
      if (o.type === 'projectile' && !o.suit) {
        const devant = kartDevant(k);
        lancer = devant && devant.progression - k.progression < 130;
      }
      if (lancer) utiliserObjet(k);
      k.delaiObjet = 1.5 + Math.random() * 2;
    }
  }

  /* ---------------------------------------------------------------------
     Classement
  --------------------------------------------------------------------- */

  function classer() {
    const tri = karts.slice().sort((a, b) => {
      if (a.fini !== b.fini) return a.fini ? -1 : 1;
      if (a.fini && b.fini) return a.tempsTotal - b.tempsTotal;
      return b.progression - a.progression;
    });
    tri.forEach((k, i) => { k.place = i + 1; });
    return tri;
  }

  /* ---------------------------------------------------------------------
     Boucle
  --------------------------------------------------------------------- */

  function pas(dt) {
    if (phase === 'depart') {
      compte -= dt;
      // Départ canon : accélérer dans la dernière demi-seconde donne un boost.
      if (compte < 0.55 && compte > 0 && ENTREES.etat.accel) joueur.departCanon = true;
      if (compte <= 0) {
        phase = 'course';
        if (joueur.departCanon) { joueur.boost = 1.1; AUDIO.bruit('turbo'); annoncer('DÉPART CANON'); }
        AUDIO.bruit('depart');
      }
    } else if (phase === 'course' || phase === 'arrivee') {
      chrono += dt;
    }

    if (phase === 'arrivee') {
      compte += dt;
      if (compte > 3.2) phase = 'fini';
    }

    for (const k of karts) {
      if (k.fini && k.ia) { k.v *= Math.pow(0.4, dt); }
      conduire(k, dt);
    }

    contacts();
    ramasserBoites(dt);
    majProjectiles(dt);
    objetsIA(dt);
    classer();

    // Les IA qui ont fini continuent d'avancer doucement pour ne pas rester
    // plantées en travers de la ligne.
    for (const k of karts) if (k.fini && k.ia && !k.range) { k.range = true; }

    majCamera(dt);

    secousse *= Math.pow(0.02, dt);
    cam.secousse = OPTIONS.secousse ? (Math.random() - 0.5) * secousse : 0;
    voileForce = Math.max(0, voileForce - dt * 1.6);

    AUDIO.regimeMoteur(Math.min(1, Math.abs(joueur.v) / Math.max(1, vitesseMaxDe(joueur))), joueur.surRoute);
    majHud();
  }

  function majCamera(dt) {
    const k = joueur;
    const vise = k.cap + k.derapage * 0.42;
    cam.ang += normaliser(vise - cam.ang) * Math.min(1, REGLAGES.camSouplesse * dt);
    const recul = REGLAGES.camRecul * (1 + (k.boost > 0 ? 0.16 : 0));
    cam.x = k.x - Math.cos(cam.ang) * recul;
    cam.z = k.z - Math.sin(cam.ang) * recul;
    cam.h = REGLAGES.camHauteur;
  }

  /* ---------------------------------------------------------------------
     Affichage
  --------------------------------------------------------------------- */

  function entites() {
    const liste = [];

    for (const b of piste.boites) {
      if (b.repos > 0) continue;
      const f = Math.floor(chrono * 7 + b.x) & 3;
      liste.push({ x: b.x, z: b.z, y: 5, image: SPRITES.boites[f], taille: 11 });
    }
    for (const t of pieges) liste.push({ x: t.x, z: t.z, y: 1, image: t.image, taille: 8 });
    for (const p of projectiles) liste.push({ x: p.x, z: p.z, y: 3, image: p.image, taille: 8 });

    for (const k of karts) {
      const vue = SPRITES.vuePour(k.capVisuel - cam.ang);
      const jeu = k.freine ? SPRITES.kartsFrein : SPRITES.karts;
      let alpha = 1;
      if (k.invincible > 0) alpha = 0.55 + Math.abs(Math.sin(chrono * 18)) * 0.45;
      liste.push({ x: k.x, z: k.z, y: 0, image: jeu[k.pilote.id][vue], taille: TAILLE_KART, alpha });
    }
    return liste;
  }

  function dessiner() {
    MODE7.cadre(piste, cam, entites());

    if (phase === 'depart') {
      const n = Math.ceil(compte - 0.6);
      if (n >= 1 && n <= 3) MODE7.texteCentre(String(n), 62, 40, '#e8b62c');
      else if (compte <= 0.6) MODE7.texteCentre('PARTEZ', 62, 30, '#f2f2f2');
      else MODE7.texteCentre('PRÊT', 62, 22, '#8d93ab');
    }
    if (voileForce > 0) MODE7.voile(voileCouleur, voileForce);
  }

  /* ---------------------------------------------------------------------
     HUD
  --------------------------------------------------------------------- */

  const $ = (id) => document.getElementById(id);
  let annonceMinuteur = 0;

  function annoncer(texte) {
    const e = $('hud-annonce');
    e.textContent = texte;
    e.classList.remove('visible');
    void e.offsetWidth;   // relance l'animation CSS
    e.classList.add('visible');
    annonceMinuteur = 1;
  }

  function tempsTexte(t) {
    const m = Math.floor(t / 60);
    const s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }

  const SUFFIXES = ['er', 'e', 'e', 'e', 'e', 'e', 'e', 'e'];
  let hudObjet = null;

  function majHud() {
    $('hud-place').innerHTML = '<b>' + joueur.place + '</b><sup>' + SUFFIXES[joueur.place - 1] + '</sup>';
    $('hud-tour').textContent = config.mode === 'clm'
      ? 'TOUR ' + Math.max(1, joueur.tour) + '/' + config.tours
      : 'TOUR ' + Math.min(config.tours, Math.max(1, joueur.tour)) + '/' + config.tours;
    $('hud-chrono').textContent = tempsTexte(chrono);
    $('hud-kmh').textContent = Math.round(Math.abs(joueur.v) * 1.25);

    // La boîte d'objet : image fixe, ou roulette pendant la seconde d'attente.
    const boite = $('hud-objet');
    const cv = boite.firstElementChild;
    const ctx = cv.getContext('2d');
    let img = null;
    if (joueur.roulette > 0) {
      const cles = Object.keys(OBJETS);
      img = SPRITES.icones[cles[Math.floor(chrono * 16) % cles.length]];
      boite.classList.add('roulette'); boite.classList.remove('plein');
    } else if (joueur.objet) {
      img = SPRITES.icones[joueur.objet];
      boite.classList.remove('roulette'); boite.classList.add('plein');
    } else {
      boite.classList.remove('roulette', 'plein');
    }
    if (img !== hudObjet) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (img) { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 0, 0, cv.width, cv.height); }
      hudObjet = img;
    }
    if (joueur.objetQte > 1 && joueur.roulette <= 0) {
      ctx.fillStyle = '#e8b62c';
      ctx.fillRect(cv.width - 9, cv.height - 9, 7, 7);
    }

    // Le classement, réécrit seulement quand l'ordre change.
    const tri = classer();
    const signature = tri.map((k) => k.pilote.id).join();
    if (signature !== majHud.signature) {
      majHud.signature = signature;
      const ol = $('hud-classement');
      ol.innerHTML = '';
      for (const k of tri) {
        const li = document.createElement('li');
        if (k === joueur) li.className = 'moi';
        li.innerHTML = '<b>' + k.place + '</b><i style="background:' + k.pilote.couleurHud + '"></i>';
        li.appendChild(document.createTextNode(k.pilote.nom));
        ol.appendChild(li);
      }
    }
  }

  /* ---------------------------------------------------------------------
     Sortie
  --------------------------------------------------------------------- */

  function resultat() {
    const tri = classer();
    return tri.map((k, i) => ({
      pilote: k.pilote,
      place: i + 1,
      temps: k.fini ? k.tempsTotal : null,
      meilleur: k.tempsTours.length ? Math.min.apply(null, k.tempsTours) : null,
      points: POINTS[i] || 0,
      moi: k === joueur,
    }));
  }

  function arreter() {
    AUDIO.arreterMoteur();
    AUDIO.stopperMusique();
    karts = []; projectiles = []; pieges = []; piste = null;
  }

  /* Appelé sur le FRONT de la touche objet, pas sur son maintien : un appui
     tenu ne doit vider ni un triple ni la roulette. */
  function objetJoueur() {
    if (phase === 'course' && joueur && !joueur.fini) utiliserObjet(joueur);
  }

  return {
    preparer, pas, dessiner, resultat, arreter, objetJoueur,
    get phase() { return phase; },
    get piste() { return piste; },
    get joueur() { return joueur; },
    get chrono() { return chrono; },
    annoncer,
    tempsTexte,
  };
})();
