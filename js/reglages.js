/* =============================================================================
   RÉGLAGES — toutes les valeurs ajustables du jeu, au même endroit.

   Même principe que dans « Brad Bitt, mais le jeu » : aucune constante magique
   perdue au milieu du code. On règle le kart depuis le panneau F1 pendant
   qu'on roule, et la valeur trouvée est mémorisée dans ce navigateur.

   Les distances sont en UNITÉS MONDE. Une piste tient dans un carré de 1024
   unités, la demi-largeur d'une route vaut environ 42. Le repère est le même
   que la texture du circuit : 1 unité = 1 pixel de la texture.
   ========================================================================== */
'use strict';

const REGLAGES = {

  // ---- Pilotage ---------------------------------------------------------
  vitesseMax:     112,    // u/s à 150cc, avant le bonus du personnage
  acceleration:    52,    // u/s² — approche exponentielle, pas linéaire
  freinage:        95,
  marcheArriere:   34,
  frottement:      26,    // décélération quand on lâche tout
  rotation:        2.15,  // rad/s à pleine vitesse
  rotationDerive:  1.55,  // multiplicateur pendant un dérapage
  priseVitesse:    0.32,  // en dessous de 32 % de la vitesse max, on tourne moins

  // ---- Dérapage et mini-turbo ------------------------------------------
  deriveAngle:     0.52,  // angle de glisse maximal du kart, en radians
  deriveMontee:    2.6,   // vitesse à laquelle la glisse s'installe
  deriveFrein:     0.90,  // le dérapage coûte 10 % de vitesse de pointe
  turboPalier1:    0.85,  // secondes de dérapage pour le turbo bleu
  turboPalier2:    1.90,  // ... et pour le turbo orange
  turboDuree1:     0.65,
  turboDuree2:     1.25,
  boostForce:      1.42,  // vitesse max × pendant un boost
  boostAccel:      2.6,

  // ---- Hors-piste et chocs ---------------------------------------------
  herbeVitesse:    0.52,  // vitesse max × quand les roues quittent la route
  herbeFrein:      64,
  murMarge:        44,    // au-delà de la route + cette marge, on est repoussé
  chocRebond:      0.55,
  chocPoussee:     46,

  // ---- Caméra -----------------------------------------------------------
  /* Ces quatre valeurs sont liées : la hauteur et le recul décident à la fois
     de l'angle de plongée ET de la taille du kart à l'écran. En l'état, le
     kart du joueur occupe environ un quart de la largeur, et l'image plonge de
     30° — c'est le réglage d'un jeu de kart 16 bits. */
  camRecul:        34,    // unités derrière le kart
  camHauteur:      13.4,
  camSouplesse:    9.5,   // plus c'est haut, plus la caméra colle
  horizon:         66,    // ligne d'horizon, en pixels du tampon 320×180
  /* Une seule focale pour les deux axes. C'est ce qui donne une perspective
     juste : deux valeurs différentes écrasent le sol verticalement et le
     lointain se replie d'un coup. Plus la valeur est basse, plus le champ est
     large — et plus les karts paraissent petits. */
  focale:          188,

  // ---- Course -----------------------------------------------------------
  tours:           3,
  concurrents:     8,
  iaNiveau:        0.90,  // 1 = l'IA vise la vitesse max théorique
  iaElastique:     0.16,  // aide au retardataire / frein au fuyard
  objetsDelaiIA:   1.2,   // secondes de réflexion avant qu'une IA lance un objet
};

/* Ce qui apparaît dans le panneau F1. Le reste reste modifiable dans ce
   fichier, mais n'encombre pas l'écran. */
const REGLAGES_PANNEAU = [
  ['vitesseMax',     60, 160, 1,    'Vitesse de pointe'],
  ['acceleration',   20, 110, 1,    'Accélération'],
  ['rotation',      1.0, 3.6, 0.05, 'Braquage'],
  ['deriveAngle',   0.2, 1.0, 0.02, 'Angle de dérapage'],
  ['boostForce',    1.1, 2.0, 0.02, 'Puissance du boost'],
  ['herbeVitesse',  0.2, 1.0, 0.02, 'Vitesse hors-piste'],
  ['camRecul',       10,  60, 1,    'Recul de la caméra'],
  ['camHauteur',      6,  32, 0.5,  'Hauteur de la caméra'],
  ['focale',        110, 300, 2,    'Champ de vision'],
  ['horizon',        44, 110, 1,    'Ligne d\'horizon'],
  ['iaNiveau',      0.5, 1.1, 0.01, 'Niveau de l\'IA'],
  ['tours',           1,   7, 1,    'Nombre de tours'],
];

const DEFAUTS = Object.assign({}, REGLAGES);

/* ---------------------------------------------------------------------------
   Options du joueur — volume, aides, difficulté. Séparées des réglages de
   développement : ça n'a rien à voir, et ça ne se remet pas à zéro ensemble.
--------------------------------------------------------------------------- */
const OPTIONS = {
  volumeMusique: 0.55,
  volumeEffets:  0.75,
  cylindree:     '100',   // '50' Touriste · '100' Connaisseur · '150' Salé
  accelAuto:     null,    // null = automatique selon l'appareil
  secousse:      true,
};

const CYLINDREES = {
  '50':  { nom: 'Touriste',    vitesse: 0.78, ia: 0.80, note: 'Pour profiter du décor.' },
  '100': { nom: 'Connaisseur', vitesse: 0.92, ia: 0.90, note: 'L\'équilibre.' },
  '150': { nom: 'Salé',        vitesse: 1.00, ia: 1.00, note: 'Le BRADDY3000 ne le recommande pas.' },
};

/* --------------------------------------------------------------------------
   Persistance. Une clé par famille, pour qu'un réglage de dev cassé n'emporte
   pas les options du joueur avec lui.
-------------------------------------------------------------------------- */

function lireStock(cle, cible) {
  try {
    const brut = localStorage.getItem(cle);
    if (!brut) return;
    const objet = JSON.parse(brut);
    for (const k in objet) if (k in cible) cible[k] = objet[k];
  } catch (e) { /* stockage refusé (navigation privée) : on continue sans. */ }
}

function ecrireStock(cle, source) {
  try { localStorage.setItem(cle, JSON.stringify(source)); } catch (e) {}
}

function sauverReglages() { ecrireStock('kart-reglages', REGLAGES); }
function sauverOptions()  { ecrireStock('kart-options',  OPTIONS); }

lireStock('kart-reglages', REGLAGES);
lireStock('kart-options',  OPTIONS);

/* --------------------------------------------------------------------------
   Panneau de développement (F1).
-------------------------------------------------------------------------- */

function monterPanneauReglages() {
  const hote = document.getElementById('curseurs');
  if (!hote) return;

  for (const [cle, min, max, pas, nom] of REGLAGES_PANNEAU) {
    const bloc = document.createElement('div');
    bloc.className = 'curseur';
    bloc.innerHTML =
      '<div class="ligne"><span class="nom"></span><span class="valeur"></span></div>' +
      '<input type="range">';
    bloc.querySelector('.nom').textContent = nom;
    const valeur = bloc.querySelector('.valeur');
    const curseur = bloc.querySelector('input');
    curseur.min = min; curseur.max = max; curseur.step = pas;
    curseur.value = REGLAGES[cle];
    valeur.textContent = REGLAGES[cle];
    curseur.addEventListener('input', () => {
      REGLAGES[cle] = parseFloat(curseur.value);
      valeur.textContent = curseur.value;
      sauverReglages();
      if (typeof window.surReglageChange === 'function') window.surReglageChange(cle);
    });
    hote.appendChild(bloc);
  }

  const bascule = (ouvert) => { document.getElementById('reglages').hidden = !ouvert; };
  document.getElementById('ouvrir-reglages').onclick = () => bascule(true);
  document.getElementById('fermer-reglages').onclick = () => bascule(false);

  document.getElementById('reinit').onclick = () => {
    Object.assign(REGLAGES, DEFAUTS);
    sauverReglages();
    hote.textContent = '';
    monterPanneauReglages();
  };

  document.getElementById('exporter').onclick = (e) => {
    const texte = JSON.stringify(REGLAGES, null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(texte);
    e.target.textContent = 'Copié';
    setTimeout(() => { e.target.textContent = 'Copier le réglage'; }, 1200);
  };

  addEventListener('keydown', (ev) => {
    if (ev.key === 'F1') { ev.preventDefault(); bascule(document.getElementById('reglages').hidden); }
  });
}
