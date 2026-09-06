/* =============================================================================
   CIRCUIT 2 — VILLE GHETTO, ÉTÉ
   D'après le niveau 2. Fin d'après-midi, ciel orange, immeubles bas.

   Un tracé de blocs : des angles francs et des lignes droites courtes. Le
   contraire du champ de tournesols, et c'est fait exprès — deuxième course
   d'une coupe, on serre la vis.
   ========================================================================== */
'use strict';

CIRCUITS['ville-ete'] = {
  nom: 'Ville ghetto — été',
  resume: 'Des angles droits, des murs partout. Freiner devient un métier.',
  musique: 'niveau2',
  decor: 'villeEte',
  horizon: 'immeubles',
  demiLargeur: 40,
  gr: 2202,

  ciel: { haut: '#4d7fb0', bas: '#e0b183' },
  silhouette: { loin: '#3c4a63', pres: '#2c3648' },
  sol: {
    route: '#3e4450', accotement: '#2c3038',
    bord1: '#d0453f', bord2: '#f2f2f2',
    hors: '#4a4038', horsClair: '#6b6156', horsSombre: '#3b3630',
  },

  trace: [
    [200, 150], [520, 140], [545, 330], [820, 345],
    [850, 600], [600, 625], [590, 860], [260, 870],
    [180, 600], [200, 380],
  ],

  boites: [0.10, 0.28, 0.46, 0.64, 0.84],
};
