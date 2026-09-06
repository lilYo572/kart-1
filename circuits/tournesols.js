/* =============================================================================
   CIRCUIT 1 — CHAMP DE TOURNESOLS
   D'après le niveau 1 de « Brad Bitt, mais le jeu ». Palette reprise telle
   quelle : même ciel, même vert, mêmes tournesols.

   Le premier circuit d'une coupe apprend à conduire. Large, deux vrais virages
   seulement, aucune épingle : on y prend ses marques sans jamais sortir.
   ========================================================================== */
'use strict';

CIRCUITS['tournesols'] = {
  nom: 'Champ de tournesols',
  resume: 'Large, roulant. Le circuit où l\'on apprend à déraper.',
  musique: 'niveau1',
  decor: 'champ',
  horizon: 'collines',
  demiLargeur: 48,
  gr: 1101,

  ciel: { haut: '#4a76b8', bas: '#9fc4d8' },
  silhouette: { loin: '#7f9b7a', pres: '#5d7f5a' },
  sol: {
    route: '#8a6a44', accotement: '#6b4a2e',
    bord1: '#d0453f', bord2: '#f2f2f2',
    hors: '#4f8a3c', horsClair: '#69ad4c', horsSombre: '#3d7233',
  },

  trace: [
    [512, 140], [760, 180], [880, 360], [860, 600],
    [720, 800], [500, 880], [300, 830], [170, 650],
    [150, 420], [280, 220],
  ],

  boites: [0.12, 0.30, 0.50, 0.70, 0.87],
};
