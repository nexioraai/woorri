| commit | date | +/− | sujet | fichiers du générateur |
|---|---|---|---|---|
| `83a7261e` | 2026-11-04T05:25 | +2/−3 | Zero question avant de construire — et la phrase qui mentait est partie | entites-declarees.ts |
| `17a95453` | 2026-11-04T06:23 | +96/−4 | Le bandeau mentait : la page publiee ne recevait jamais sa base | api/livraison/route.ts, base-de-l-oeuvre.ts, boucle-directe.ts |
| `78d6b589` | 2026-11-04T07:59 | +31/−6 | La cle etait fabriquee, renvoyee, et jetee dans la meme milliseconde | compte-oeuvre.ts |
| `7d4a3777` | 2026-11-04T09:16 | +382/−13 | Le constructeur declare ce dont il a besoin, et le refus propose | api/compte/route.ts, api/direct/route.ts, boucle-directe.ts, declaration-en-route.ts, entites-declarees.ts, juge-persistance.ts, retouche.ts |
| `631a362f` | 2026-11-04T09:37 | +252/−0 | M1 — ce qu'une modification n'a pas le droit de faire | entites-declarees.ts, migration-oeuvre.ts |
| `d242de5f` | 2026-11-04T09:56 | +301/−0 | M2 — la liste des formes emettables est BLANCHE, et elle a trouve deux trous | migration-sql.ts |
| `5a27dc36` | 2026-11-04T10:29 | +48/−13 | M2 complete — A, B, C, et la regle du jour | migration-sql.ts |
| `f33cd699` | 2026-11-04T11:40 | +176/−19 | L'apercu s'apercoit, et aucun mot brut n'atteint l'ecran | api/direct/route.ts, entites-declarees.ts, phrase-erreur.ts |
| `6a37e52d` | 2026-11-04T13:36 | +182/−0 | D — la connexion du migrateur n'a qu'un lecteur, et la classe security definer est fermee | connexion-migrateur.ts |
| `dde8eb1a` | 2026-11-04T14:10 | +51/−2 | La base dit qui nous sommes — et la variable de production porte un nom double | connexion-migrateur.ts |
| `b1b34297` | 2026-11-04T15:18 | +18/−1 | La sonde dit si la variable ARRIVE, pas si elle existe | api/schema/route.ts |
| `091aeef9` | 2026-11-04T15:41 | +308/−5 | M3 — l'instantane hors transaction, la porte eprouvee, et les comptes | connexion-migrateur.ts, instantane-migration.ts, migration-sql.ts |
| `0cea6e52` | 2026-11-04T16:24 | +37/−0 | Une retouche coupee ne s'ecrit plus par-dessus la bonne | api/retoucher/route.ts |
| `1d2df026` | 2026-11-04T17:20 | +168/−1 | M4 (a) — la declaration existe, et elle est montree | api/direct/route.ts, api/retoucher/route.ts, declaration-depuis-schema.ts, retouche.ts |
| `fa1150ea` | 2026-11-04T17:47 | +102/−13 | B et C — l'oeuvre amnesique ne se publie plus, et le dernier tour offre deux sorties | api/direct/route.ts, api/publier/route.ts, boucle-directe.ts, juge-persistance.ts |
| `6643ca5b` | 2026-11-04T23:28 | +42/−3 | Le faux arret sur le type — il aurait bloque tout M4 | entites-declarees.ts, migration-oeuvre.ts |
| `7ea15ead` | 2026-11-04T23:56 | +54/−1 | Ni taire ni garder — ne pas comparer | declaration-depuis-schema.ts, entites-declarees.ts, migration-oeuvre.ts |
| `20f866cd` | 2026-11-05T00:13 | +94/−14 | (b) — la retouche passe les six juges, et deux etaient inertes | api/direct/route.ts, api/retoucher/route.ts |
| `017b61c5` | 2026-11-05T00:33 | +282/−15 | Le perimetre est ouvert — et ce qui arrive aux donnees se dit avant, en francais | api/retoucher/route.ts, phrase-migration.ts, retouche.ts |
| `4da2c45e` | 2026-11-05T02:44 | +198/−6 | La prudence ne se paie pas deux fois | api/retoucher/route.ts, versions-oeuvre.ts |
| `07904438` | 2026-11-05T04:46 | +99/−0 | L'accueil parle des quatre choix, pas de trois | invites-accueil.ts |
| `22459094` | 2026-11-05T05:15 | +102/−0 | (b) — le juge rencontre enfin ce que la personne rencontre | juge-execution-enfant.mjs |
| `9aacbd0d` | 2026-11-05T05:31 | +17/−1 | Une oeuvre publiee porte son adresse — et « publiee » n'est pas « livree » | api/mes-applications/route.ts |
| `e730aa4d` | 2026-11-05T05:47 | +153/−0 | (c) — un vrai navigateur dans la chaine, et il dit la verite | juge-navigateur-enfant.mjs |
| `a83ba8e3` | 2026-11-05T05:57 | +52/−13 | Le bouchon — et la racine n'est pas une ligne de code | juge-navigateur-enfant.mjs |
| `a450c71e` | 2026-11-05T06:27 | +131/−0 | (c) fini — le juge navigateur branche la ou il peut tourner | juge-navigateur.ts |
| `ab824dd0` | 2026-11-05T06:40 | +114/−10 | A — l'apercu d'une oeuvre publiee ne mente plus | api/direct/[id]/route.ts, api/mes-applications/route.ts, boucle-directe.ts, entites-declarees.ts, sous-domaine.ts |
| `54b0d4b9` | 2026-11-05T07:37 | +149/−4 | Deux routes, deux regimes — les applications publiees redemarrent | boucle-directe.ts, publication.ts |
| `28d201ed` | 2026-11-05T15:02 | +69/−0 | P1 — une table declare si sa lecture est publique | entites-declarees.ts |
| `51699028` | 2026-11-05T15:49 | +169/−2 | P3 P4 P5 — le drapeau traverse, le diff le nomme, l'ecran le dit avant | api/publier/route.ts, migration-oeuvre.ts, phrase-migration.ts |
| `e1d49b4f` | 2026-11-05T16:16 | +63/−0 | La garde d'exposition — tenter n'est pas reussir | poser-oeuvre.ts |
| `854a9d5a` | 2026-11-05T17:10 | +15/−0 | A1 — le modele apprend qu'une oeuvre a donnees a un espace de gestion | entites-declarees.ts |
| `726d4415` | 2026-11-05T18:45 | +120/−2 | Le bandeau inverse, et une borne qui ne bornait rien | entites-declarees.ts, juge-bandeau.ts |
| `f6a9ff4b` | 2026-11-05T19:00 | +254/−13 | A2 A3 — le juge de la gestion, et son hypothese dite a voix haute | boucle-directe.ts, juge-gestion.ts, juge-persistance.ts |
| `1be52a6c` | 2026-11-05T20:25 | +93/−13 | C0 — l'angle mort du chemin sans table, ferme par construction | boucle-directe.ts, entites-declarees.ts, juge-bandeau.ts, juge-navigateur.ts |
| `59d53645` | 2026-11-05T21:35 | +60/−8 | C4 C1 C2 — l'exemple ne peut plus devenir un produit, et le fil passe | boucle-directe.ts, entites-declarees.ts, fil-accueil.ts, retouche.ts |
| `543d04a4` | 2026-11-06T04:58 | +64/−8 | EP-366 — « je n'ai rien mesure » ne se dit pas « 1,00 » | api/direct/route.ts, api/retoucher/route.ts, juge-couverture.ts, retouche.ts |
| `8e8a6a25` | 2026-11-06T05:35 | +283/−14 | EP-367 ②beta — le juge MESURE, il ne reproche pas | exigences-demande.ts, juge-couverture.ts |
| `bb88f640` | 2026-11-06T06:55 | +154/−22 | La loi public/gestion ① — la chaîne avant la consigne | api/retoucher/route.ts, boucle-directe.ts, declaration-en-route.ts |
| `16a6efd5` | 2026-11-06T07:08 | +82/−18 | La loi public/gestion ② — la loi dite, et les deux chemins vers la gestion | entites-declarees.ts |
| `3293ab9c` | 2026-11-06T07:38 | +3/−1 | La loi public/gestion ③ — quatre cliquets rouges, et ce qu'ils disaient | entites-declarees.ts |
| `67e26f79` | 2026-11-06T07:55 | +2/−1 | La loi public/gestion ④ — deux restitutions, trouvées par un diff dans les DEUX sens | entites-declarees.ts |
| `29d082c9` | 2026-11-06T09:22 | +495/−0 | J1 + ② — les deux faces se mesurent en montant, et le juge REFUSE | boucle-directe.ts, juge-faces-enfant.mjs, juge-faces.ts |
| `7aad0835` | 2026-11-06T09:39 | +26/−13 | J1 — trois rouges de gate, et le vocabulaire fige au registre | boucle-directe.ts, juge-faces-enfant.mjs, juge-faces.ts |
| `40b7e193` | 2026-11-09T09:10 | +8/−3 | LOT 11 A bis — approuver un compte, dans le tableau de bord | sous-domaine.ts |
| `d2680578` | 2026-11-09T22:31 | +5/−1 | LOT 13.2 — la Centrale ouvre les plis, retient et répond | sous-domaine.ts |
| `faf87ca2` | 2026-11-10T14:42 | +1/−1 | Sous-domaines : « guide » réservé (nouvelle route du produit, cliquet EP-291) | sous-domaine.ts |
| `5eec5a55` | 2026-11-12T05:24 | +1/−1 | feat(editeur): l'éditeur visuel en 3 colonnes — structure, aperçu réel, réglages | sous-domaine.ts |
| `6f870335` | 2026-11-12T07:13 | +567/−9 | feat(generateur): Deribfy apprend à faire un tableau de bord pour les applis qu'il génère | bibliotheque-ui.ts |
| `1a73ce63` | 2026-11-12T08:00 | +72/−16 | fix(generateur): le tableau de bord tient face à ce que le modèle écrit vraiment — mesuré sur une vr | bibliotheque-ui.ts |
| `3b8a5a93` | 2026-11-12T08:09 | +66/−6 | fix(generateur): le juge monte l'espace de gestion ; champs nommés ; tendances honnêtes | bibliotheque-ui.ts, boucle-directe.ts, juge-execution-enfant.mjs, juge-execution.ts |
| `8eedc275` | 2026-11-12T08:21 | +209/−58 | feat(generateur): quatre mises en page pour l'espace de gestion des applis générées | bibliotheque-ui.ts |
| `3e9856c7` | 2026-11-12T15:38 | +295/−9 | fix(generateur): le contrat des pièces — enseigné, jugé, et un plantage ne blanchit plus l'écran | bibliotheque-ui.ts, boucle-directe.ts, juge-contrat.ts |
