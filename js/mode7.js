/* =============================================================================
   MODE 7 — le rendu pseudo-3D.

   Le principe tient en une phrase : chaque LIGNE de l'écran, sous l'horizon,
   correspond à une distance fixe devant la caméra. Plus la ligne est basse,
   plus elle est proche. Il suffit alors de parcourir la texture du circuit en
   ligne droite et d'y prendre un pixel par point de l'écran.

   Aucune 3D, aucun polygone, aucune bibliothèque. C'est exactement ce que
   faisait une console 16 bits, et c'est pour ça que ça tourne à 60 images par
   seconde sur un téléphone : 320 × 106 pixels de sol à calculer, soit à peine
   34 000 opérations par image.

   Le ciel et les sprites, eux, passent par le canvas classique — inutile de
   les faire à la main quand drawImage fait mieux.
   ========================================================================== */
'use strict';

const MODE7 = (() => {

  const L = 320, H = 180;
  let cv = null, ctx = null, img = null, buf = null;
  let cielDegrade = null, cielCle = '';

  const DR = PISTE.DR, DG = PISTE.DG, DB = PISTE.DB, DA = PISTE.DA;

  function init(canvas) {
    cv = canvas;
    ctx = cv.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    img = ctx.createImageData(L, H);
    buf = new Uint32Array(img.data.buffer);
  }

  function melange(a, b, f) {
    const ar = (a >>> DR) & 255, ag = (a >>> DG) & 255, ab = (a >>> DB) & 255;
    const br = (b >>> DR) & 255, bg = (b >>> DG) & 255, bb = (b >>> DB) & 255;
    return (((ar + (br - ar) * f) & 255) << DR |
            ((ag + (bg - ag) * f) & 255) << DG |
            ((ab + (bb - ab) * f) & 255) << DB |
            255 << DA) >>> 0;
  }

  /* ---- Le ciel -----------------------------------------------------------
     Un dégradé vertical, plus une bande de silhouettes qui défile selon le cap.
     La bande fait 1024 pixels de large pour un tour complet : tourner de 90°
     la décale d'un quart. */

  function ciel(piste, cam, hz, secousse) {
    const cle = piste.id + hz;
    if (cle !== cielCle) {
      cielDegrade = ctx.createLinearGradient(0, 0, 0, hz);
      cielDegrade.addColorStop(0, piste.def.ciel.haut);
      cielDegrade.addColorStop(1, piste.def.ciel.bas);
      cielCle = cle;
    }
    ctx.fillStyle = cielDegrade;
    ctx.fillRect(0, 0, L, hz + 1);

    const bande = piste.horizon;
    const largeur = bande.width;
    // Un tour complet de cap = une largeur de bande.
    let dx = -(cam.ang / (Math.PI * 2)) * largeur;
    dx = ((dx % largeur) + largeur) % largeur;
    const y = hz - bande.height + 2 + secousse;
    ctx.drawImage(bande, -dx, y);
    ctx.drawImage(bande, largeur - dx, y);
    if (largeur - dx < L) ctx.drawImage(bande, largeur * 2 - dx, y);
  }

  /* ---- Le sol ------------------------------------------------------------ */

  function sol(piste, cam, hz) {
    const pix = piste.pixels, T = piste.taille, M = T - 1;
    const cos = Math.cos(cam.ang), sin = Math.sin(cam.ang);
    const F = REGLAGES.focale;
    const brume = piste.brume;
    const lignesBrume = 26;   // hauteur du voile, en lignes d'écran

    for (let py = hz; py < H; py++) {
      const dy = py - hz + 0.6;
      const z = (cam.h * F) / dy;
      let o = py * L;

      if (z > 6000) {   // au-delà, il n'y a plus rien à montrer
        for (let px = 0; px < L; px++) buf[o++] = brume;
        continue;
      }

      const ech = z / F;
      const stepX = -sin * ech, stepZ = cos * ech;
      let wx = cam.x + cos * z - stepX * (L / 2);
      let wz = cam.z + sin * z - stepZ * (L / 2);

      const dyv = py - hz;
      let f = dyv < lignesBrume ? 1 - dyv / lignesBrume : 0;
      if (f > 0) f = f * f * 0.96;

      if (f <= 0.004) {
        // Cas courant : pas de voile, on copie le pixel tel quel.
        for (let px = 0; px < L; px++) {
          let tx = wx | 0, tz = wz | 0;
          tx = tx < 0 ? 0 : tx > M ? M : tx;
          tz = tz < 0 ? 0 : tz > M ? M : tz;
          buf[o++] = pix[tz * T + tx];
          wx += stepX; wz += stepZ;
        }
      } else {
        for (let px = 0; px < L; px++) {
          let tx = wx | 0, tz = wz | 0;
          tx = tx < 0 ? 0 : tx > M ? M : tx;
          tz = tz < 0 ? 0 : tz > M ? M : tz;
          buf[o++] = melange(pix[tz * T + tx], brume, f);
          wx += stepX; wz += stepZ;
        }
      }
    }
    // On ne recopie que la partie basse : le ciel a déjà été peint au-dessus.
    ctx.putImageData(img, 0, 0, 0, hz, L, H - hz);
  }

  /* ---- Les sprites -------------------------------------------------------
     Chaque objet du monde est un rectangle posé au sol, face à la caméra. Sa
     taille à l'écran ne dépend que de sa distance : c'est la même focale que
     pour le sol, donc tout reste cohérent. */

  function sprites(piste, cam, entites, hz) {
    const cos = Math.cos(cam.ang), sin = Math.sin(cam.ang);
    const F = REGLAGES.focale;
    const vus = [];

    for (const e of entites) {
      const dx = e.x - cam.x, dz = e.z - cam.z;
      const avant = dx * cos + dz * sin;
      /* Rien de plus près que ça : un kart qui frôle la caméra serait agrandi
         à cinq fois l'écran et couvrirait toute l'image d'un coup. */
      if (avant < 15) continue;
      const cote = -dx * sin + dz * cos;
      const k = F / avant;
      const sx = L / 2 + cote * k;
      const largeur = e.taille * k;
      if (sx + largeur < -20 || sx - largeur > L + 20) continue;
      const base = hz + (cam.h - (e.y || 0)) * F / avant;
      vus.push({ e, sx, base, largeur, avant });
    }

    vus.sort((a, b) => b.avant - a.avant);

    for (const v of vus) {
      const im = v.e.image;
      const w = v.largeur;
      const h = w * im.height / im.width;
      if (w < 0.6) continue;
      ctx.globalAlpha = v.e.alpha == null ? 1 : v.e.alpha;
      ctx.drawImage(im, Math.round(v.sx - w / 2), Math.round(v.base - h), Math.round(w), Math.round(h));
    }
    ctx.globalAlpha = 1;
  }

  /* ---- L'image complète --------------------------------------------------- */

  function cadre(piste, cam, entites) {
    const secousse = cam.secousse || 0;
    const hz = Math.round(REGLAGES.horizon + secousse);
    ciel(piste, cam, hz, 0);
    sol(piste, cam, hz);
    sprites(piste, cam, entites, hz);
  }

  /* Un voile de couleur par-dessus tout : départ, arrivée, transitions. */
  function voile(couleur, force) {
    if (force <= 0) return;
    ctx.globalAlpha = Math.min(1, force);
    ctx.fillStyle = couleur;
    ctx.fillRect(0, 0, L, H);
    ctx.globalAlpha = 1;
  }

  /* Le compte à rebours et les grands textes, dessinés dans le tampon pour
     rester dans la même grille de pixels que le reste. */
  function texteCentre(texte, y, taille, couleur) {
    ctx.font = '700 ' + taille + 'px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(8,10,17,.85)';
    ctx.strokeText(texte, L / 2, y);
    ctx.fillStyle = couleur;
    ctx.fillText(texte, L / 2, y);
  }

  return { init, cadre, voile, texteCentre, L, H, get ctx() { return ctx; } };
})();
