/* =============================================================================
   ENTRÉES — clavier, tactile, manette.

   Le clavier est lu par CODE et pas par lettre. Un code désigne une POSITION
   physique sur le clavier : KeyW, c'est la touche en haut à gauche du bloc,
   celle qui porte un W en QWERTY et un Z en AZERTY. Résultat : ZQSD et WASD
   marchent tous les deux, sans configuration et sans détection de langue. Les
   lettres sont acceptées en plus, pour ceux qui ont une disposition exotique.

   La manette passe par l'API Gamepad, relevée à chaque image. Le support est
   volontairement simple pour l'instant : direction, accélérer, freiner,
   déraper, objet, pause. La cartographie fine viendra avec le reste.
   ========================================================================== */
'use strict';

const ENTREES = (() => {

  const etat = { gauche: 0, droite: 0, accel: 0, frein: 0, derive: 0, objet: 0 };
  const enfonce = {};       // ce qui est maintenu, par nom d'action
  let manetteBranchee = false;
  let tactile = false;

  /* Une action peut avoir plusieurs touches. On note ici les codes physiques
     puis, en secours, les lettres. */
  const CODES = {
    ArrowUp: 'accel', KeyW: 'accel',
    ArrowDown: 'frein', KeyS: 'frein',
    ArrowLeft: 'gauche', KeyA: 'gauche',
    ArrowRight: 'droite', KeyD: 'droite',
    Space: 'derive', ShiftLeft: 'derive', ShiftRight: 'derive',
    KeyX: 'objet', KeyJ: 'objet', ControlLeft: 'objet',
    Enter: 'valider', NumpadEnter: 'valider',
    Escape: 'retour', Backspace: 'retour',
  };
  const LETTRES = { z: 'accel', w: 'accel', s: 'frein', q: 'gauche', a: 'gauche', d: 'droite', x: 'objet', j: 'objet' };

  /* Les actions de menu se consomment une fois : on ne veut pas descendre de
     dix lignes parce qu'une touche est restée appuyée un dixième de seconde. */
  let ecouteur = null;
  function signaler(nom) { if (ecouteur) ecouteur(nom); }

  function nomDe(ev) {
    return CODES[ev.code] || LETTRES[(ev.key || '').toLowerCase()] || null;
  }

  function bas(nom) {
    if (enfonce[nom]) return;
    enfonce[nom] = true;
    if (nom in etat) etat[nom] = 1;
    signaler(nom);
  }

  function haut(nom) {
    enfonce[nom] = false;
    if (nom in etat) etat[nom] = 0;
  }

  function init() {
    addEventListener('keydown', (ev) => {
      if (ev.repeat) return;
      const n = nomDe(ev);
      if (!n) return;
      /* On coupe le comportement natif : sans ça, Entrée ou Espace « clique »
         le bouton qui a le focus EN PLUS de valider notre menu, et chaque
         appui compte double. Les flèches, elles, feraient défiler la page. */
      ev.preventDefault();
      bas(n);
    });

    addEventListener('keyup', (ev) => {
      const n = nomDe(ev);
      if (n) haut(n);
    });

    // Une fenêtre qui perd le focus laisserait sinon un kart bloqué à fond.
    addEventListener('blur', relacherTout);

    /* ---- Tactile ------------------------------------------------------- */
    for (const b of document.querySelectorAll('#tactile .tbtn')) {
      const n = b.dataset.touche;
      const presser = (ev) => { ev.preventDefault(); b.classList.add('enfonce'); bas(n); };
      const lacher  = (ev) => { ev.preventDefault(); b.classList.remove('enfonce'); haut(n); };
      b.addEventListener('pointerdown', presser);
      b.addEventListener('pointerup', lacher);
      b.addEventListener('pointercancel', lacher);
      b.addEventListener('pointerleave', lacher);
      b.addEventListener('contextmenu', (ev) => ev.preventDefault());
    }

    tactile = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    addEventListener('gamepadconnected', () => { manetteBranchee = true; });
    addEventListener('gamepaddisconnected', () => { manetteBranchee = false; });
  }

  function relacherTout() {
    for (const k in etat) etat[k] = 0;
    for (const k in enfonce) enfonce[k] = false;
    for (const b of document.querySelectorAll('#tactile .tbtn')) b.classList.remove('enfonce');
  }

  /* ---- Manette -----------------------------------------------------------
     Relevée à chaque image : l'API Gamepad n'envoie pas d'événements pour les
     boutons, il faut aller les chercher. */

  const dernierBouton = {};

  function lireManette() {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    for (const p of pads) {
      if (!p) continue;
      manetteBranchee = true;

      const ax = p.axes[0] || 0;
      const zone = 0.22;
      if (ax < -zone) { etat.gauche = 1; etat.droite = 0; }
      else if (ax > zone) { etat.droite = 1; etat.gauche = 0; }
      else if (!enfonce.gauche && !enfonce.droite) { etat.gauche = etat.droite = 0; }

      const b = (i) => p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.35);

      if (b(0) || b(7)) etat.accel = 1; else if (!enfonce.accel) etat.accel = 0;
      if (b(1) || b(6)) etat.frein = 1; else if (!enfonce.frein) etat.frein = 0;
      if (b(5) || b(4)) etat.derive = 1; else if (!enfonce.derive) etat.derive = 0;

      // Fronts montants : menus et lancer d'objet
      const front = (i, nom) => {
        const on = b(i);
        if (on && !dernierBouton[i]) signaler(nom);
        dernierBouton[i] = on;
      };
      front(2, 'objet');
      front(3, 'objet');
      front(0, 'valider');
      front(1, 'retour');
      front(9, 'retour');
      front(12, 'accel');
      front(13, 'frein');
      front(14, 'gauche');
      front(15, 'droite');

      if (b(2) || b(3)) etat.objet = 1; else if (!enfonce.objet) etat.objet = 0;
      break;   // une seule manette pour l'instant
    }
  }

  /* Direction résultante, de -1 à 1. */
  function direction() { return (etat.droite ? 1 : 0) - (etat.gauche ? 1 : 0); }

  /* Faut-il accélérer tout seul ? Sur téléphone, tenir un bouton
     d'accélération en plus de la direction ne laisse plus de doigt pour le
     reste. Par défaut : oui sur tactile, non ailleurs. */
  function accelAutomatique() {
    return OPTIONS.accelAuto == null ? tactile : !!OPTIONS.accelAuto;
  }

  return {
    init, etat, relacherTout, lireManette, direction, accelAutomatique,
    set surTouche(f) { ecouteur = f; },
    get tactile() { return tactile; },
    get manette() { return manetteBranchee; },
  };
})();
