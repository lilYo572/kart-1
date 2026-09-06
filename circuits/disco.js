/* =============================================================================
   CIRCUIT 4 — DISCOTHÈQUE, BRÉSIL
   D'après le niveau 4. Nuit tiède, néons, enceintes empilées au bord de la
   piste. La palette est celle de « La piste », la zone 2 du niveau.

   Dernière course de la coupe, donc la plus technique : une épingle au milieu
   du tracé, deux virages aveugles derrière les enceintes.
   ========================================================================== */
'use strict';

CIRCUITS['disco'] = {
  nom: 'Discothèque — Brésil',
  resume: 'Une épingle, deux virages aveugles, et beaucoup trop de lumière.',
  musique: 'niveau4',
  decor: 'disco',
  horizon: 'neon',
  demiLargeur: 38,
  gr: 4404,

  ciel: { haut: '#1c0c30', bas: '#4a1858' },
  silhouette: { loin: '#2a1040', pres: '#38164e' },
  sol: {
    route: '#2e2436', accotement: '#1c1424',
    bord1: '#e8256e', bord2: '#25c9e8',
    hors: '#33163c', horsClair: '#5c2670', horsSombre: '#2a1040',
  },

  trace: [
    [512, 180], [730, 230], [800, 400], [650, 530],
    [830, 660], [700, 830], [460, 860], [330, 700],
    [430, 560], [260, 470], [300, 270],
  ],

  boites: [0.11, 0.27, 0.44, 0.62, 0.80, 0.93],
};
