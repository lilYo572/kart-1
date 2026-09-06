/* =============================================================================
   COUPES — le mode Grand Prix.

   Quatre coupes, quatre courses chacune. Les deux premières reprennent les
   décors de « Brad Bitt, mais le jeu » : les huit niveaux existants donnent
   exactement huit circuits, sans en inventer un seul. Les deux suivantes
   seront inédites, elles attendent leurs tracés.

   Ajouter, retirer ou réordonner une coupe se fait ici et nulle part ailleurs.
   Le menu se construit à partir de cette liste.
   ========================================================================== */
'use strict';

const COUPES = [
  {
    id: 'brad-coin',
    nom: 'Coupe Brad Coin',
    origine: 'D\'après « Brad Bitt, mais le jeu »',
    circuits: ['tournesols', 'ville-ete', 'vallee', 'disco'],
  },
  {
    id: 'serrano',
    nom: 'Coupe Serrano',
    origine: 'D\'après « Brad Bitt, mais le jeu »',
    circuits: ['ville-hiver', 'manoir', 'complexe', 'largage'],
  },
  {
    id: 'inedit-1',
    nom: 'Coupe ? ? ?',
    origine: 'Quatre circuits inédits',
    circuits: [],
    verrou: 'Les tracés arrivent avec le document complet.',
  },
  {
    id: 'inedit-2',
    nom: 'Coupe ? ? ?',
    origine: 'Quatre circuits inédits',
    circuits: [],
    verrou: 'Les tracés arrivent avec le document complet.',
  },
];

/* Barème d'une course de Grand Prix, pour huit karts. */
const POINTS = [15, 12, 10, 8, 6, 4, 2, 1];

/* L'ordre dans lequel les circuits apparaissent en course unique et en
   contre-la-montre : toutes les coupes jouables, mises bout à bout. */
const TOUS_CIRCUITS = COUPES.reduce((liste, c) => liste.concat(c.circuits), []);
