/* =============================================================================
   CIRCUIT 6 — LA MAISON HANTÉE
   D'après le niveau 6, palette du « parc du manoir ». Haies taillées et
   bougies posées dans l'allée : les mêmes que dans les couloirs du jeu.

   Le tracé le plus étroit des deux coupes. Doubler y coûte cher.
   ========================================================================== */
'use strict';

CIRCUITS['manoir'] = {
  nom: 'La maison hantée',
  resume: 'Étroit, sombre, mal éclairé. Doubler ici, c\'est un pari.',
  musique: 'niveau6',
  decor: 'manoir',
  horizon: 'manoir',
  demiLargeur: 38,
  gr: 6606,

  ciel: { haut: '#161326', bas: '#3b2b42' },
  silhouette: { loin: '#241d34', pres: '#2e2440' },
  sol: {
    route: '#3a2e28', accotement: '#241c18',
    bord1: '#6b5c78', bord2: '#e0d2a8',
    hors: '#2a2430', horsClair: '#463c4e', horsSombre: '#1e1a26',
  },

  trace: [
    [512, 150], [770, 200], [830, 420], [650, 500],
    [840, 640], [720, 840], [460, 860], [330, 690],
    [160, 600], [280, 430], [170, 250], [380, 170],
  ],

  boites: [0.13, 0.31, 0.49, 0.67, 0.85],
};
