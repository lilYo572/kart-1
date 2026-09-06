/* =============================================================================
   JEU — l'assemblage.

   Ce fichier ne contient aucune règle de jeu. Il fait trois choses : dimensionner
   l'écran, faire tourner la boucle, et aiguiller les touches vers le menu ou vers
   la course. Tout le reste est ailleurs, et c'est volontaire — quand quelque
   chose ne va pas, on sait dans quel fichier aller.
   ========================================================================== */
'use strict';

const JEU = (() => {

  const $ = (id) => document.getElementById(id);
  let etat = 'menu';        // 'menu' · 'course' · 'pause' · 'resultats'
  let dernier = 0;
  let cadre, canvas;

  /* ---- Mise en page ------------------------------------------------------
     Le cadre garde toujours le rapport 16:9. Le canvas, lui, reste en 320×180
     et c'est le CSS qui l'agrandit — d'où l'image-rendering: pixelated. */

  function redimensionner() {
    const w = innerWidth, h = innerHeight;
    let cw = Math.min(w, h * 16 / 9);
    let ch = cw * 9 / 16;
    if (ch > h) { ch = h; cw = ch * 16 / 9; }
    cadre.style.width = Math.floor(cw) + 'px';
    cadre.style.height = Math.floor(ch) + 'px';

    const portrait = h > w;
    $('rotation').hidden = !(ENTREES.tactile && portrait);
  }

  /* ---- Boucle ------------------------------------------------------------ */

  function boucle(t) {
    requestAnimationFrame(boucle);
    let dt = (t - dernier) / 1000;
    dernier = t;
    if (!isFinite(dt) || dt <= 0) return;
    if (dt > 0.05) dt = 0.05;   // un onglet en arrière-plan ne téléporte personne

    ENTREES.lireManette();

    if (etat === 'course') {
      COURSE.pas(dt);
      COURSE.dessiner();
      if (COURSE.phase === 'fini') finirCourse();
    } else if (etat === 'pause' || etat === 'resultats') {
      COURSE.dessiner();
    }
  }

  /* ---- Course ------------------------------------------------------------ */

  function lancerCourse(cfg) {
    COURSE.preparer(cfg);
    etat = 'course';
    $('hud').hidden = false;
    $('tactile').hidden = !ENTREES.tactile;
    ENTREES.relacherTout();
  }

  function pause() {
    if (etat !== 'course') return;
    etat = 'pause';
    $('tactile').hidden = true;
    ENTREES.relacherTout();
    MENU.pause(() => {
      etat = 'course';
      $('tactile').hidden = !ENTREES.tactile;
      dernier = performance.now();
    });
  }

  function finirCourse() {
    etat = 'resultats';
    $('hud').hidden = true;
    $('tactile').hidden = true;
    MENU.resultats(COURSE.resultat());
  }

  function quitterCourse() {
    COURSE.arreter();
    etat = 'menu';
    $('hud').hidden = true;
    $('tactile').hidden = true;
  }

  /* ---- Aiguillage des touches -------------------------------------------- */

  function touche(nom) {
    if (etat === 'course') {
      if (nom === 'retour') return pause();
      if (nom === 'objet') return COURSE.objetJoueur();
      return;
    }
    MENU.touche(nom);
  }

  /* ---- Démarrage ---------------------------------------------------------- */

  function demarrer() {
    cadre = $('cadre');
    canvas = $('jeu');

    MODE7.init(canvas);
    SPRITES.preparer();
    ENTREES.init();
    ENTREES.surTouche = touche;
    monterPanneauReglages();

    addEventListener('resize', redimensionner);
    addEventListener('orientationchange', () => setTimeout(redimensionner, 120));
    redimensionner();

    // Un onglet qu'on quitte met la course en pause : personne n'aime revenir
    // sur un kart planté dans un mur.
    addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

    MENU.titre();
    dernier = performance.now();
    requestAnimationFrame(boucle);
  }

  return { lancerCourse, quitterCourse, pause, redimensionner, demarrer, get etat() { return etat; } };
})();

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', JEU.demarrer);
else JEU.demarrer();
