/* =============================================================================
   AUDIO

   Deux mondes séparés, exactement comme dans le jeu principal :

   - La MUSIQUE passe par un élément <audio>. Un morceau de deux minutes n'a
     rien à faire dans la mémoire d'un contexte Web Audio. Si le fichier
     n'existe pas, on n'affiche pas d'erreur : le jeu tourne sans musique et tu
     déposes tes .m4a dans assets/audio/ quand tu veux.

   - Les EFFETS sont synthétisés à la volée. Pas un fichier à télécharger, donc
     rien à attendre au chargement. Ce sont des remplaçants assumés : le jour
     où tu as tes vrais sons, il n'y a que le corps de bruit() à remplacer.

   Le moteur, lui, est un cas à part : c'est un son CONTINU dont la hauteur suit
   la vitesse. Il vit dans son propre petit graphe, allumé au départ, éteint à
   l'arrivée.
   ========================================================================== */
'use strict';

const AUDIO = (() => {

  let ctx = null;
  let busEffets = null;
  let debloque = false;

  const musique = new Audio();
  musique.loop = true;
  musique.preload = 'auto';
  let pisteCourante = null;

  /* Le premier clic du joueur autorise le son pour toute la session. C'est
     une règle des navigateurs, pas un choix de design : avant cette
     interaction, toute lecture est refusée. */
  function debloquer() {
    if (debloque) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      busEffets = ctx.createGain();
      busEffets.gain.value = OPTIONS.volumeEffets;
      busEffets.connect(ctx.destination);
      debloque = true;
    } catch (e) { /* pas de Web Audio : le jeu reste jouable en silence */ }
  }

  function volumes() {
    if (busEffets) busEffets.gain.value = OPTIONS.volumeEffets;
    musique.volume = OPTIONS.volumeMusique;
  }

  /* ---- Musique --------------------------------------------------------- */

  function jouerMusique(nom) {
    if (pisteCourante === nom) return;
    pisteCourante = nom;
    if (!nom) { musique.pause(); return; }
    musique.src = 'assets/audio/' + nom + '.m4a';
    musique.volume = OPTIONS.volumeMusique;
    const p = musique.play();
    if (p && p.catch) p.catch(() => { /* fichier absent ou lecture refusée */ });
  }

  function stopperMusique() { pisteCourante = null; musique.pause(); }

  /* ---- Effets ---------------------------------------------------------- */

  /* Une enveloppe courte sur un oscillateur, plus un peu de bruit blanc quand
     il faut de la matière. Tout part de là. */
  function ton(freq, duree, forme, volume, glissando) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = forme || 'square';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (glissando) o.frequency.exponentialRampToValueAtTime(Math.max(20, glissando), ctx.currentTime + duree);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(volume || 0.2, ctx.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duree);
    o.connect(g); g.connect(busEffets);
    o.start(); o.stop(ctx.currentTime + duree + 0.02);
  }

  function souffle(duree, volume, coupure, chute) {
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * duree);
    const tampon = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = tampon.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = tampon;
    const filtre = ctx.createBiquadFilter();
    filtre.type = 'bandpass';
    filtre.frequency.setValueAtTime(coupure || 900, ctx.currentTime);
    if (chute) filtre.frequency.exponentialRampToValueAtTime(chute, ctx.currentTime + duree);
    const g = ctx.createGain();
    g.gain.value = volume || 0.18;
    src.connect(filtre); filtre.connect(g); g.connect(busEffets);
    src.start(); src.stop(ctx.currentTime + duree);
  }

  const effets = {
    curseur:   () => ton(520, 0.05, 'square', 0.12),
    valider:   () => { ton(660, 0.06, 'square', 0.16); setTimeout(() => ton(990, 0.10, 'square', 0.14), 55); },
    retour:    () => ton(300, 0.08, 'square', 0.12, 190),
    compte:    () => ton(440, 0.14, 'square', 0.22),
    depart:    () => { ton(880, 0.35, 'square', 0.26); souffle(0.35, 0.14, 1800, 300); },
    objet:     () => ton(720, 0.05, 'triangle', 0.16),
    obtenu:    () => { ton(600, 0.07, 'triangle', 0.18); setTimeout(() => ton(900, 0.07, 'triangle', 0.18), 70);
                       setTimeout(() => ton(1200, 0.12, 'triangle', 0.18), 140); },
    lancer:    () => { ton(340, 0.12, 'sawtooth', 0.20, 900); souffle(0.14, 0.12, 1400, 600); },
    poser:     () => ton(180, 0.10, 'square', 0.16, 110),
    choc:      () => { ton(150, 0.22, 'sawtooth', 0.26, 60); souffle(0.20, 0.20, 500, 120); },
    glisse:    () => souffle(0.45, 0.14, 2600, 700),
    turbo:     () => { ton(420, 0.30, 'sawtooth', 0.22, 1300); souffle(0.30, 0.16, 700, 2400); },
    derapage:  () => souffle(0.12, 0.07, 3200, 2200),
    tour:      () => { ton(760, 0.09, 'square', 0.18); setTimeout(() => ton(1010, 0.14, 'square', 0.16), 90); },
    victoire:  () => [0, 120, 240, 400].forEach((d, i) => setTimeout(() => ton([523, 659, 784, 1046][i], 0.28, 'triangle', 0.20), d)),
    defaite:   () => [0, 150, 320].forEach((d, i) => setTimeout(() => ton([392, 330, 262][i], 0.30, 'triangle', 0.18), d)),
  };

  function bruit(nom) { if (ctx && effets[nom]) effets[nom](); }

  /* ---- Moteur ---------------------------------------------------------- */
  /* Deux oscillateurs désaccordés à l'octave, filtrés bas : c'est le minimum
     pour que ça ronfle sans siffler. La hauteur suit la vitesse. */

  let moteur = null;

  function demarrerMoteur() {
    if (!ctx || moteur) return;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'square';
    const filtre = ctx.createBiquadFilter(); filtre.type = 'lowpass'; filtre.frequency.value = 900;
    const g = ctx.createGain(); g.gain.value = 0;
    o1.connect(filtre); o2.connect(filtre); filtre.connect(g); g.connect(busEffets);
    o1.start(); o2.start();
    moteur = { o1, o2, g, filtre };
  }

  function regimeMoteur(part, auSol) {
    if (!moteur || !ctx) return;
    const f = 46 + part * 132;
    const t = ctx.currentTime;
    moteur.o1.frequency.setTargetAtTime(f, t, 0.05);
    moteur.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    moteur.filtre.frequency.setTargetAtTime(380 + part * 1500, t, 0.08);
    moteur.g.gain.setTargetAtTime((auSol ? 0.055 : 0.03) + part * 0.05, t, 0.08);
  }

  function arreterMoteur() {
    if (!moteur) return;
    try { moteur.o1.stop(); moteur.o2.stop(); } catch (e) {}
    moteur = null;
  }

  return {
    debloquer, volumes, bruit,
    jouerMusique, stopperMusique,
    demarrerMoteur, regimeMoteur, arreterMoteur,
    get pret() { return debloque; },
  };
})();
