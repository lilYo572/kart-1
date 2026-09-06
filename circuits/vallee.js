/* =============================================================================
   CIRCUIT 3 — VALLÉE ENCHANTÉE
   D'après le niveau 3 : la clairière, le bosquet, le cercle de pierres. Les
   pierres levées sont là, semées dans l'herbe.

   Tracé sinueux, sans aucune ligne droite franche. C'est le circuit qui
   récompense les enchaînements de dérapages.
   ========================================================================== */
'use strict';

CIRCUITS['vallee'] = {
  nom: 'Vallée enchantée',
  resume: 'Que des courbes. Enchaîne les dérapages ou reste derrière.',
  musique: 'niveau3',
  decor: 'foret',
  horizon: 'arbres',
  demiLargeur: 42,
  gr: 3303,

  ciel: { haut: '#6aa8d8', bas: '#cfe6c8' },
  silhouette: { loin: '#5d7f8c', pres: '#3f6b52' },
  sol: {
    route: '#7a6a52', accotement: '#5a4330',
    bord1: '#e8b62c', bord2: '#f2f2f2',
    hors: '#4f9a48', horsClair: '#74c25c', horsSombre: '#3d7a44',
  },

  trace: [
    [512, 120], [700, 200], [720, 380], [880, 470],
    [820, 680], [600, 720], [520, 880], [330, 800],
    [380, 600], [200, 520], [260, 320], [400, 260],
  ],

  boites: [0.14, 0.33, 0.52, 0.71, 0.90],
};
