/* =============================================================================
   CIRCUIT 8 — ZONE DE LARGAGE
   D'après le niveau d'introduction. Dalles métalliques, marques
   d'atterrissage, tours au loin. C'est là que tout a commencé.

   Le circuit le plus rapide et le plus large des deux coupes : dernière course
   de la Coupe Serrano, celle qui décide du classement général.
   ========================================================================== */
'use strict';

CIRCUITS['largage'] = {
  nom: 'Zone de largage',
  resume: 'Le plus rapide des huit. C\'est ici que la coupe se joue.',
  musique: 'intro',
  decor: 'futuriste',
  horizon: 'futuriste',
  demiLargeur: 46,
  gr: 8808,

  ciel: { haut: '#141a30', bas: '#2d2a48' },
  silhouette: { loin: '#1b2138', pres: '#232a44' },
  sol: {
    route: '#343a56', accotement: '#232848',
    bord1: '#e8b62c', bord2: '#6b74a8',
    hors: '#2f3350', horsClair: '#4a5178', horsSombre: '#232840',
  },

  trace: [
    [512, 130], [800, 220], [890, 480], [770, 740],
    [512, 880], [250, 760], [130, 490], [230, 230],
  ],

  boites: [0.12, 0.30, 0.48, 0.66, 0.84],
};
