/* =============================================================================
   CIRCUIT 5 — VILLE USA, HIVER
   D'après le niveau 5. Le trottoir volontairement sombre du jeu principal
   devient ici une chaussée déneigée au milieu d'un décor blanc : c'est ce
   contraste qui rend la route lisible à pleine vitesse.

   Deux longues lignes droites, une épingle profonde. Le circuit où le
   BRADDY3000 fait le plus de dégâts.
   ========================================================================== */
'use strict';

CIRCUITS['ville-hiver'] = {
  nom: 'Ville USA — hiver',
  resume: 'De longues droites, une épingle profonde, et de la neige partout.',
  musique: 'niveau5',
  decor: 'neige',
  horizon: 'hiver',
  demiLargeur: 44,
  gr: 5505,

  ciel: { haut: '#2e3f5c', bas: '#8ea2b8' },
  silhouette: { loin: '#46566e', pres: '#33415a' },
  sol: {
    route: '#333a46', accotement: '#232932',
    bord1: '#d0453f', bord2: '#f2f2f2',
    hors: '#cdd9e4', horsClair: '#e8eef4', horsSombre: '#a8b8c8',
  },

  trace: [
    [180, 180], [820, 170], [880, 380], [560, 430],
    [880, 560], [840, 830], [300, 860], [160, 650],
    [300, 520], [150, 380],
  ],

  boites: [0.09, 0.24, 0.42, 0.58, 0.76, 0.90],
};
