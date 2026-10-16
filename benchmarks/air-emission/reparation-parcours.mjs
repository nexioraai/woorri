// ============================================================
// LA RÉPARATION DÉTERMINISTE DES PARCOURS — à coût NUL, sans IA.
//
// ── POURQUOI CE FICHIER EXISTE, ET POURQUOI IL EST SÉPARÉ.
//
// Deux règles refusaient le cahier CONTERAK aux TROIS tours, sans jamais
// converger — 2,74 $ pour rien, puis abandon :
//
//   DERIVATION_TRAVERSEE_ACTEUR      « écran traversé par 2 acteurs avec
//                                      surface NON publique »
//   DERIVATION_IDENTITE_NON_CONSOMMEE « identité élue par choisir, n'atteint
//                                      aucun consommateur »
//
// LES DEUX RÈGLES SONT JUSTES et ne bougent pas : la première empêche une
// fuite de données entre rôles, la seconde tient la cohérence d'un parcours.
// Ce fichier ne les touche pas, ne les lit même pas pour les contourner — il
// répare le MODÈLE pour qu'il les satisfasse, et les juges tranchent après,
// inchangés.
//
// ── POURQUOI PAS DANS `modele-metier.mjs`.
//
// Ce module porte la DÉFINITION des règles. Y ajouter leur réparation
// mettrait le juge et son contournement dans le même fichier : la tentation
// d'assouplir l'un pour simplifier l'autre deviendrait une modification d'une
// seule ligne. Ils vivent séparés, et c'est voulu.
//
// ── LA GARANTIE QUI REND CE FICHIER SÛR.
//
// Aucune réparation n'est retenue sur la foi de son intention. Chacune est
// APPLIQUÉE PUIS JUGÉE : on ne garde le modèle réparé que si les diagnostics
// DIMINUENT STRICTEMENT et qu'AUCUN code nouveau n'apparaît. Une réparation
// qui déplace le problème est donc jetée, pas célébrée.
// ============================================================

/**
 * Le « besoin » d'un geste pour la lecture humaine — jamais utilisé pour
 * décider, seulement pour dire ce qu'on a fait.
 */
const nommer = (p, i) => `${p.id}[${String(i)}]`;

/**
 * ① L'IDENTITÉ ÉLUE TROUVE SON CONSOMMATEUR.
 *
 * Le juge exige que la PREMIÈRE étape identitaire après un `choisir C` soit
 * un consommateur du MÊME concept (`consulter`/`retirer`/`contacter`), une
 * saisie de portée `instance:C`, ou un parcours de collection d'un concept
 * RELIÉ. Sinon « la première étape identitaire aval la remplace ou la jette ».
 *
 * LA RÉPARATION EST DÉTERMINÉE, et c'est le miroir exact de celle qui existe
 * déjà en sens inverse (poser `choisir` avant un consommateur orphelin) :
 * on pose `consulter C` IMMÉDIATEMENT après le `choisir C`. Immédiatement,
 * parce que le juge regarde la PREMIÈRE étape aval — l'insérer plus loin ne
 * répondrait pas à la question posée.
 *
 * L'acteur est celui du parcours : on n'en invente pas un.
 */
export function reparerIdentiteNonConsommee(modele, outils) {
  const { consommateursDIdentite, juger } = outils;
  const reparations = [];
  const consommateurs = consommateursDIdentite();
  // `consulter` est le consommateur le plus neutre : il LIT, il n'ecrit pas,
  // il ne retire rien et ne contacte personne. Si la table venait a ne plus
  // le porter, on ne devine pas : on ne repare pas.
  const lecture = consommateurs.includes("consulter") ? "consulter" : null;
  if (lecture === null) return { modele, reparations };

  // ── ON SE LAISSE GUIDER PAR LE JUGE, ON NE LE RE-IMPLEMENTE PAS.
  //
  // La fonction interne qui dit « quelle est la premiere etape identitaire
  // aval » n'est pas exportee, et on n'ouvre PAS `modele-metier.mjs` pour
  // l'exporter. On lirait d'ailleurs mal : deux lectures de la meme regle
  // finissent toujours par diverger.
  //
  // Le juge, lui, DIT exactement ou il refuse : `parcours[ID].etapes[N]`.
  // On repare la ou il montre, et on le relance pour savoir si ca a suffi.
  const cibles = new Map();
  for (const d of juger(modele)) {
    if (d.code !== "DERIVATION_IDENTITE_NON_CONSOMMEE") continue;
    const m = /^parcours\[([^\]]+)\]\.etapes\[(\d+)\]$/u.exec(String(d.path ?? ""));
    if (m === null) continue;
    const liste = cibles.get(m[1]) ?? [];
    liste.push(Number(m[2]));
    cibles.set(m[1], liste);
  }
  if (cibles.size === 0) return { modele, reparations };

  const parcours = (modele.parcours ?? []).map((p) => {
    const index = cibles.get(p.id);
    if (index === undefined) return p;
    const etapes = [...(p.etapes ?? [])];
    // Du PLUS LOIN au plus pres : inserer decale tout ce qui suit, et des
    // index calcules sur l'etat d'avant deviendraient faux.
    for (const i of [...index].sort((a, b) => b - a)) {
      const e = etapes[i];
      if (e === undefined || e.geste !== "choisir") continue;
      const consommation = { concept: e.concept, geste: lecture };
      if (e.acteur !== undefined) consommation.acteur = e.acteur;
      etapes.splice(i + 1, 0, consommation);
      reparations.push({
        parcours: p.id,
        action:
          `« ${lecture} ${String(e.concept)} » pose juste apres « choisir ` +
          `${String(e.concept)} » (${nommer(p, i)}) — une identite elue doit ` +
          `atteindre son consommateur`,
      });
    }
    return { ...p, etapes };
  });
  return { modele: { ...modele, parcours }, reparations };
}

/**
 * ② DEUX ACTEURS NE PARTAGENT PAS UNE SURFACE PRIVÉE.
 *
 * ── CE QUE LA MESURE A MONTRÉ, et qui rend la réparation déterminée.
 *
 * Une surface est identifiée par `concept|geste|état|PORTÉE`. Deux acteurs ne
 * peuvent donc partager une surface que si leur portée est IDENTIQUE — ce qui
 * exclut `acteur:<id>` (différent par acteur) et désigne `instance:<concept>`,
 * née de la propagation d'identité.
 *
 * Reproduit en local, à coût nul : deux parcours d'acteurs différents faisant
 * `choisir A` puis `decouvrir B` (B relié à A) partagent `srf_B_decouvrir` en
 * portée `instance:A`, et le juge refuse.
 *
 * ── LE REMÈDE, ET POURQUOI C'EST CELUI-LÀ.
 *
 * La règle dit : « le partage vaut pour le public, jamais pour l'identité ».
 * On ne rend donc JAMAIS public ce qui est privé — ce serait exactement la
 * fuite que la règle empêche. On sépare : le second acteur CHERCHE au lieu de
 * parcourir l'instance d'un autre. `chercher` porte la portée `resultat:B`,
 * qui est publique par construction, et c'est un parcours de collection — la
 * chaîne d'identité tient donc toujours.
 *
 * QUI CHANGE : jamais le parcours[0]. Il est le cœur du produit, celui dont
 * l'écran d'entrée est dérivé ; le déplacer changerait l'application elle-même.
 * C'est le parcours SUIVANT, d'un autre acteur, qui s'écarte.
 */
export function reparerTraverseeActeur(modele, outils) {
  const { ecransDe, surfacesDe } = outils;
  const reparations = [];
  const plan = ecransDe(modele);
  const parSurface = new Map(surfacesDe(modele).map((sf) => [sf.surfaceId, sf]));
  const acteurDe = new Map((modele.parcours ?? []).map((p) => [p.id, p.acteur]));
  const premier = (modele.parcours ?? [])[0]?.id ?? null;

  // Les surfaces à séparer : privées, et partagées par DEUX acteurs au moins.
  const aSeparer = new Set();
  for (const e of plan.ecrans ?? []) {
    const acteurs = new Set(
      (e.justification ?? []).map((j) => acteurDe.get(j.parcours)).filter((a) => a !== undefined),
    );
    if (acteurs.size <= 1) continue;
    for (const sid of e.surfaces ?? []) {
      const portee = parSurface.get(sid)?.portee ?? "";
      const publique = portee === "globale" || portee.startsWith("resultat:");
      if (publique) continue;
      const origines = parSurface.get(sid)?.origine ?? [];
      const acteursDeLaSurface = new Set(
        origines.map((o) => acteurDe.get(o.parcours)).filter((a) => a !== undefined),
      );
      if (acteursDeLaSurface.size > 1) aSeparer.add(sid);
    }
  }
  if (aSeparer.size === 0) return { modele, reparations };

  const parcours = (modele.parcours ?? []).map((p) => {
    if (p.id === premier) return p; // le cœur ne bouge pas
    const etapes = [...(p.etapes ?? [])];
    let touche = false;
    for (const sid of aSeparer) {
      for (const o of parSurface.get(sid)?.origine ?? []) {
        if (o.parcours !== p.id) continue;
        const e = etapes[o.etape];
        // On ne déplace que ce qui PARCOURT. Un geste qui écrit, confirme ou
        // contacte n'a pas d'équivalent « recherche » : on ne l'invente pas.
        if (e === undefined || e.geste !== "decouvrir") continue;
        etapes[o.etape] = { ...e, geste: "chercher" };
        touche = true;
        reparations.push({
          parcours: p.id,
          action:
            `« decouvrir ${String(e.concept)} » devient « chercher » dans ` +
            `${nommer(p, o.etape)} — deux acteurs ne partagent pas la surface ` +
            `privée ${sid}`,
        });
      }
    }
    return touche ? { ...p, etapes } : p;
  });
  return { modele: { ...modele, parcours }, reparations };
}

/**
 * LES DEUX RÉPARATIONS, SOUS GARDE.
 *
 * L'ordre compte : on sépare les acteurs AVANT de poser les consommations,
 * parce que changer un geste change les portées — donc les surfaces, donc les
 * écrans. L'inverse poserait des étapes sur un plan qui va bouger.
 *
 * LA GARDE : le modèle réparé n'est retenu que si les diagnostics DIMINUENT
 * STRICTEMENT et qu'aucun code NOUVEAU n'apparaît. Une réparation qui déplace
 * le problème est jetée. `juger` est fourni par l'appelant — ce fichier ne
 * décide jamais ce qu'est un défaut.
 */
export function reparerParcours(modele, outils) {
  const { juger } = outils;
  const avant = juger(modele).map((d) => d.code);
  if (avant.length === 0) return { modele, reparations: [] };

  let courant = modele;
  const reparations = [];
  for (const etape of [reparerTraverseeActeur, reparerIdentiteNonConsommee]) {
    const r = etape(courant, outils);
    if (r.reparations.length === 0) continue;
    const apres = juger(r.modele).map((d) => d.code);
    const codesAvant = new Set(juger(courant).map((d) => d.code));
    const sansNouveau = apres.every((c) => codesAvant.has(c));
    if (!sansNouveau || apres.length >= juger(courant).length) continue;
    courant = r.modele;
    reparations.push(...r.reparations);
  }
  return { modele: courant, reparations };
}
