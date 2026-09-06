/* =============================================================================
   CIRCUIT 7 — COMPLEXE SCIENTIFIQUE
   D'après le niveau 7 : le hall d'essais et la salle du réacteur. Sol
   quadrillé, cuves, bandes d'avertissement jaunes.

   Deux chicanes symétriques, une de chaque côté. Le circuit se lit comme un
   plan d'usine, et c'est voulu.
   ========================================================================== */
'use strict';

CIRCUITS['complexe'] = {
  nom: 'Complexe scientifique',
  resume: 'Deux chicanes symétriques. Le circuit se conduit au millimètre.',
  musique: 'niveau7',
  decor: 'labo',
  horizon: 'usine',
  demiLargeur: 40,
  gr: 7707,

  ciel: { haut: '#111c26', bas: '#223a44' },
  silhouette: { loin: '#1a2c38', pres: '#213542' },
  sol: {
    route: '#2c3a46', accotement: '#1a242e',
    bord1: '#e8b62c', bord2: '#111c26',
    hors: '#1f2833', horsClair: '#374a59', horsSombre: '#18202a',
  },

  trace: [
    [300, 150], [700, 150], [860, 320], [700, 470],
    [860, 650], [700, 850], [360, 850], [190, 650],
    [360, 480], [180, 300],
  ],

  boites: [0.10, 0.26, 0.42, 0.58, 0.74, 0.90],
};
