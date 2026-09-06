/* =============================================================================
   OBJETS

   Le descriptif est clair : « inspirés du jeu Mario Kart pour une meilleure
   connaissance de son utilisation mais l'apparence ne sera pas la même ». Donc
   on garde les rôles — le projectile bête, celui qui suit, le piège au sol, le
   boost, l'invincible, l'objet de dernier recours — et on les habille avec ce
   qui existe déjà dans « Brad Bitt, mais le jeu » :

     la boule du Serra-Lanceur   →  le projectile
     la flaque de raclette       →  le piège qui fait tourner
     le verglas de la ville USA  →  le piège qui fait glisser
     le Brad-Shy                 →  le boost
     le costard doré             →  l'invincibilité
     le BRADDY3000               →  le rattrapage du dernier
     la coupure de courant       →  la punition de ceux qui sont devant

   La roulette est pondérée par la POSITION. C'est ce qui rend une course
   serrée : le premier ne tire jamais un BRADDY3000, le dernier ne tombe jamais
   sur une flaque de raclette.
   ========================================================================== */
'use strict';

const OBJETS = {

  boule: {
    nom: 'Boule serrano', dessin: 'boule', type: 'projectile',
    vitesse: 205, duree: 3.6, rebonds: 2,
    poids: [34, 30, 24, 17, 11, 7, 4, 2],
  },

  boule3: {
    nom: 'Triple boule', dessin: 'boule', triple: true, quantite: 3, type: 'projectile',
    vitesse: 205, duree: 3.6, rebonds: 2,
    poids: [0, 5, 10, 14, 16, 14, 10, 6],
  },

  traqueuse: {
    nom: 'Boule traqueuse', dessin: 'traqueuse', type: 'projectile', suit: true,
    vitesse: 235, duree: 6.5, rebonds: 0,
    poids: [0, 8, 14, 18, 18, 16, 12, 8],
  },

  raclette: {
    nom: 'Flaque de raclette', dessin: 'raclette', type: 'piege', effet: 'toupie',
    duree: 26, quantite: 1,
    poids: [36, 27, 19, 12, 8, 5, 3, 2],
  },

  verglas3: {
    nom: 'Triple verglas', dessin: 'verglas', triple: true, type: 'piege', effet: 'glisse',
    duree: 26, quantite: 3,
    poids: [20, 18, 15, 12, 9, 6, 4, 2],
  },

  bradshy: {
    nom: 'Brad-Shy', dessin: 'bradshy', type: 'perso', effet: 'boost',
    duree: 1.7,
    poids: [10, 12, 14, 16, 16, 16, 14, 12],
  },

  bradshy3: {
    nom: 'Triple Brad-Shy', dessin: 'bradshy', triple: true, quantite: 3,
    type: 'perso', effet: 'boost', duree: 1.7,
    poids: [0, 0, 4, 8, 12, 16, 18, 18],
  },

  dore: {
    nom: 'Costard doré', dessin: 'dore', type: 'perso', effet: 'invincible',
    duree: 6.5,
    poids: [0, 0, 0, 2, 6, 10, 16, 22],
  },

  braddy: {
    nom: 'BRADDY3000', dessin: 'braddy', type: 'perso', effet: 'fusee',
    duree: 4.5,
    poids: [0, 0, 0, 0, 2, 5, 10, 18],
  },

  coupure: {
    nom: 'Coupure de courant', dessin: 'coupure', type: 'global', effet: 'coupure',
    duree: 2.4,
    poids: [0, 0, 2, 4, 6, 8, 10, 12],
  },
};

/* Ce que le BRADDY3000 annonce quand il te croise. Il a toujours eu ce
   rôle-là : il commente, il ne se tait pas. */
const REPLIQUES_BRADDY = {
  depart:    ['Trois. Deux. Un.', 'Moteurs. Enfin, façon de parler.', 'Ceci est un départ.'],
  premier:   ['Statistiquement improbable.', 'Je note. J\'archive. Je juge.'],
  dernier:   ['Il reste des tours.', 'Techniquement, tu es toujours en course.'],
  objet:     ['Tu es sûr de vouloir passer la transaction ?'],
  fin:       ['Course terminée. Comme prévu.', 'Voilà. C\'est fait.'],
};

/* Tire un objet selon la place occupée. `place` compte à partir de 1. */
function tirerObjet(place, total) {
  const t = Math.max(2, total);
  // On ramène la place réelle sur une échelle de 8 : la table reste valable
  // même si un jour tu passes à 12 karts.
  const i = Math.min(7, Math.max(0, Math.round((place - 1) / (t - 1) * 7)));

  let somme = 0;
  const cles = [];
  for (const id in OBJETS) {
    const p = OBJETS[id].poids[i];
    if (p > 0) { somme += p; cles.push([id, somme]); }
  }
  if (!somme) return 'boule';

  const tirage = Math.random() * somme;
  for (const [id, seuil] of cles) if (tirage < seuil) return id;
  return cles[cles.length - 1][0];
}
