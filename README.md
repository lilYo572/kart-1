# Brad Bitt, mais le Kart — base 01

Un jeu de course en Mode 7, dans le navigateur, sans dépendance ni serveur.
Menu complet, huit karts en piste, système d'objets, huit circuits tirés des
décors de « Brad Bitt, mais le jeu ».

## Lancer

Double-clique `index.html`. C'est tout. Aucun build, aucun `npm install`,
déployable tel quel sur Netlify (racine du dépôt, pas de commande de build).

## Commandes

| Action | Clavier | Manette | Tactile |
|---|---|---|---|
| Accélérer | ↑ · W · Z | A · RT | automatique |
| Freiner / reculer | ↓ · S | B · LT | bouton carré |
| Tourner | ← → · A D · Q D | stick gauche | flèches |
| Déraper | Espace · Maj | LB · RB | bouton rouge |
| Utiliser l'objet | X · J · Ctrl | X · Y | bouton jaune |
| Pause | Échap | Start | — |
| Panneau de réglages | F1 | — | — |

AZERTY et QWERTY marchent tous les deux **sans configuration** : les touches
sont lues par position physique, pas par lettre. ZQSD et WASD, c'est le même
carré de touches.

## Ce qu'il y a dedans

**Le pilotage.** Accélération progressive, braquage qui dépend de la vitesse,
dérapage à la Mario Kart avec deux paliers de mini-turbo (0,85 s pour le
premier, 1,90 s pour le second), hors-piste qui coupe la vitesse de moitié,
départ canon si tu accélères dans la dernière demi-seconde du décompte.

**Huit pilotes**, chacun avec son véhicule et quatre statistiques : Brad Bitt,
Lucy, Kirby67, Serra, Serra-Boost, Serra-Lourd, Serra-Lanceur, Serra-Volant.
Les couleurs viennent des sprites du jeu principal.

**Dix objets**, les rôles de Mario Kart habillés en Brad Bitt : la boule du
Serra-Lanceur (simple et triple), la boule traqueuse, la flaque de raclette, le
triple verglas, le Brad-Shy (simple et triple), le costard doré, le BRADDY3000
et la coupure de courant. La roulette est pondérée par la place : le premier ne
tire jamais un BRADDY3000, le dernier ne tombe jamais sur une raclette.

**Huit circuits**, un par décor du jeu principal, avec les palettes exactes
reprises des fichiers `niveaux/` :

| Coupe Brad Coin | Coupe Serrano |
|---|---|
| Champ de tournesols | Ville USA — hiver |
| Ville ghetto — été | La maison hantée |
| Vallée enchantée | Complexe scientifique |
| Discothèque — Brésil | Zone de largage |

Les deux coupes inédites sont déjà dans le menu, en attente de leurs tracés.

**Trois modes** : Grand Prix (4 courses, barème 15/12/10/8/6/4/2/1),
course unique, contre-la-montre avec meilleur tour mémorisé.

**Trois cylindrées** reprenant les difficultés du jeu principal :
50cc Touriste, 100cc Connaisseur, 150cc Salé.

## Structure

```
index.html
style.css
js/reglages.js     valeurs ajustables + panneau F1 + options du joueur
js/audio.js        musique <audio> et effets synthétisés en Web Audio
js/pilotes.js      les 8 personnages et leurs statistiques
js/sprites.js      karts et objets dessinés au pixel, en code
js/objets.js       les 10 objets et la roulette pondérée
js/piste.js        spline → géométrie + texture de circuit + mini-cartes
js/mode7.js        le rendu pseudo-3D, ciel, brouillard, sprites
js/entrees.js      clavier · tactile · manette
js/course.js       physique, IA, tours, classement, HUD
js/menu.js         tous les écrans
js/jeu.js          mise en page et boucle principale
circuits/*.js      un fichier de données par circuit
circuits/coupes.js le regroupement en coupes
```

L'ordre des `<script>` compte, il est commenté dans `index.html`.

## Comment c'est fait

**Le Mode 7.** Chaque ligne de l'écran sous l'horizon correspond à une distance
fixe devant la caméra. On parcourt la texture du circuit en ligne droite et on
y prend un pixel par point de l'écran. Rendu interne en 320 × 180, agrandi par
CSS sans lissage — 34 000 pixels de sol par image, 60 images par seconde même
sur un téléphone. Aucune 3D, aucune bibliothèque.

**Un circuit n'est pas une image.** C'est une liste de points de contrôle, une
largeur et une palette. La spline fermée est rééchantillonnée à pas constant,
et cette ligne médiane sert à tout : avancement dans le tour, écart latéral
(donc l'herbe), trajectoire de l'IA, classement. On ne teste **jamais** une
collision en lisant la couleur d'un pixel — c'est le meilleur moyen de tout
casser en changeant une teinte. Ajouter un circuit = une quinzaine de lignes.

**Les sprites sont provisoires.** Ils sont dessinés en code, sept vues par
pilote, de la plus tournée à gauche à la plus tournée à droite. Pour les
remplacer par tes PNG, il suffit que `SPRITES.karts[id][vue]` renvoie une image :
`SPRITES.MANIFESTE` décrit le format attendu, sur le modèle de
`assets/ennemis/manifeste.json` du jeu principal. Rien d'autre à toucher.

## Le son

Les effets sont synthétisés à la volée : rien à télécharger, et le moteur suit
la vitesse. Ce sont des remplaçants — le jour où tu as tes vrais sons, seul le
corps de `bruit()` dans `js/audio.js` est à changer.

La musique cherche `assets/audio/<nom>.m4a`. Le dossier n'existe pas encore :
la console affiche un `ERR_FILE_NOT_FOUND` par piste et le jeu tourne en
silence, c'est normal. Copie `assets/audio/` depuis le jeu principal et les
morceaux se mettent en place tout seuls — chaque circuit pointe déjà vers la
musique de son niveau d'origine (`niveau1`, `niveau2`, …, `intro`), plus `menu`
pour les écrans.

## Le panneau F1

Vitesse de pointe, accélération, braquage, angle de dérapage, puissance du
boost, vitesse hors-piste, position et champ de la caméra, niveau de l'IA,
nombre de tours. Les valeurs se règlent **pendant** que tu roules et sont
mémorisées dans le navigateur. « Copier le réglage » met le tout dans le
presse-papier, prêt à être collé dans `js/reglages.js`.

## Ce qui n'y est pas encore

Le multijoueur local, les fantômes du contre-la-montre, les huit circuits
inédits, le dénivelé (tout est plat pour l'instant : la piste ne connaît que
deux dimensions), les sauts et les tremplins, le hub, la boutique, les vraies
voix du BRADDY3000 au départ.
