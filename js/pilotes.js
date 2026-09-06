/* =============================================================================
   PILOTES — les huit personnages jouables dès le début, et leur véhicule.

   Les statistiques sont notées de 1 à 5, comme dans n'importe quel jeu de kart :
   c'est lisible pour le joueur. Les multiplicateurs réels se calculent en bas
   du fichier, pour qu'un équilibrage se fasse sur les notes et pas sur des
   décimales sorties de nulle part.

     vitesse   la pointe en ligne droite
     accel     la reprise après un choc ou un virage raté
     tenue     le braquage, et la résistance au hors-piste
     poids     qui pousse qui dans un contact — et qui se fait pousser

   Les couleurs viennent des sprites de « Brad Bitt, mais le jeu » : le
   costard noir et la cravate rouge de Brad, le rouge et l'or du Serrano.
   ========================================================================== */
'use strict';

const PILOTES = [
  {
    id: 'brad', nom: 'Brad Bitt', vehicule: 'La Berline BC',
    stats: { vitesse: 3, accel: 3, tenue: 3, poids: 3 },
    note: 'Bon partout, exceptionnel nulle part. Le pilote de référence.',
    pal: {
      carro: '#1b1e28', carroClair: '#2b303e', carroSombre: '#101219',
      accent: '#c0302a', tenue: '#191b23', chemise: '#e8e6e0',
      peau: '#f0c8a0', peauOmbre: '#c99c76', cheveux: '#e0c07a', cheveuxClair: '#f4dda2',
    },
  },
  {
    id: 'lucy', nom: 'Lucy', vehicule: 'La Cravate Sport',
    stats: { vitesse: 3, accel: 4, tenue: 4, poids: 2 },
    note: 'Brad Bitt fille. Plus légère, plus vive, aussi têtue.',
    pal: {
      carro: '#d9d3c6', carroClair: '#f0ebe0', carroSombre: '#a49c8c',
      accent: '#c0302a', tenue: '#e4dfd2', chemise: '#ffffff',
      peau: '#f4d0aa', peauOmbre: '#cda180', cheveux: '#d9a94e', cheveuxClair: '#f2ce7c',
    },
  },
  {
    id: 'kirby67', nom: 'Kirby67', vehicule: 'Le Monde Parallèle',
    stats: { vitesse: 5, accel: 2, tenue: 2, poids: 5 },
    note: 'L\'adversaire de toujours. Lent à lancer, impossible à rattraper.',
    pal: {
      carro: '#4a2f6b', carroClair: '#65438e', carroSombre: '#2a1a3e',
      accent: '#b06ae8', tenue: '#241a33', chemise: '#3a2a52',
      peau: '#cdc0da', peauOmbre: '#9c8cad', cheveux: '#181022', cheveuxClair: '#2e2140',
    },
  },
  {
    id: 'serra', nom: 'Serra', vehicule: 'Le Trotteur Serrano',
    stats: { vitesse: 2, accel: 5, tenue: 4, poids: 1 },
    note: 'Le plus petit du plateau. Se faufile, se relance, se fait écraser.',
    pal: {
      carro: '#c5422a', carroClair: '#e0603f', carroSombre: '#8c271a',
      accent: '#bb7a10', tenue: '#a83525', chemise: '#e8b62c',
      peau: '#e07f78', peauOmbre: '#ac4e4c', cheveux: '#bb7a10', cheveuxClair: '#e8b62c',
    },
  },
  {
    id: 'serra-boost', nom: 'Serra-Boost', vehicule: 'La Bombe à Roulettes',
    stats: { vitesse: 4, accel: 5, tenue: 2, poids: 2 },
    note: 'Accélère comme il explose : d\'un coup, sans prévenir.',
    pal: {
      carro: '#d89a0c', carroClair: '#ffd91b', carroSombre: '#96650a',
      accent: '#e15c5c', tenue: '#cf9a1b', chemise: '#ffe98a',
      peau: '#f9bf0f', peauOmbre: '#cc8f11', cheveux: '#c04a2a', cheveuxClair: '#e8703f',
    },
  },
  {
    id: 'serra-lourd', nom: 'Serra-Lourd', vehicule: 'Le Rouleau',
    stats: { vitesse: 4, accel: 1, tenue: 2, poids: 5 },
    note: 'Il ne freine pas, il décide de s\'arrêter. Un contact et tu sors.',
    pal: {
      carro: '#ac4e4c', carroClair: '#cc6664', carroSombre: '#6e2e2c',
      accent: '#ffca4e', tenue: '#8e3c3a', chemise: '#f1b9ae',
      peau: '#e07f78', peauOmbre: '#ac4e4c', cheveux: '#ffca4e', cheveuxClair: '#ffe08a',
    },
  },
  {
    id: 'serra-lanceur', nom: 'Serra-Lanceur', vehicule: 'Le Lance-Boules',
    stats: { vitesse: 3, accel: 3, tenue: 3, poids: 3 },
    note: 'Tire plus vite que les autres : sa roulette tourne moins longtemps.',
    bonusObjet: true,
    pal: {
      carro: '#b93a3a', carroClair: '#d95454', carroSombre: '#7a2222',
      accent: '#ffc91e', tenue: '#9d2f2f', chemise: '#f9c3bc',
      peau: '#ee7370', peauOmbre: '#cf4849', cheveux: '#ffc91e', cheveuxClair: '#ffe07c',
    },
  },
  {
    id: 'serra-volant', nom: 'Serra-Volant', vehicule: 'L\'Aile Serrano',
    stats: { vitesse: 2, accel: 4, tenue: 5, poids: 1 },
    note: 'Le seul à ne jamais rater un virage. Encore faut-il aller vite.',
    pal: {
      carro: '#e15c5c', carroClair: '#f3948e', carroSombre: '#9c3838',
      accent: '#ffef98', tenue: '#c94b4b', chemise: '#f3c4ba',
      peau: '#f3c4ba', peauOmbre: '#cd8f89', cheveux: '#e4be4f', cheveuxClair: '#ffef98',
    },
  },
];

/* Les multiplicateurs. Une note de 3 donne à peu près 1 partout : c'est le
   kart neutre, celui sur lequel les REGLAGES sont calibrés. */
for (const p of PILOTES) {
  const s = p.stats;
  p.mult = {
    vitesse: 0.904 + s.vitesse * 0.032,   // 0.936 … 1.064
    accel:   0.760 + s.accel   * 0.080,   // 0.840 … 1.160
    tenue:   0.820 + s.tenue   * 0.060,   // 0.880 … 1.120
    poids:   0.550 + s.poids   * 0.150,   // 0.700 … 1.300
  };
  p.couleurHud = p.pal.carroClair;
}

function pilote(id) { return PILOTES.find((p) => p.id === id) || PILOTES[0]; }
