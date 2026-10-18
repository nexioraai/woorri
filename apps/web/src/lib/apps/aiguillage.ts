/**
 * L'AIGUILLAGE VERS L'APPLICATION — par le TEXTE, pas par un bouton.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-18 SUR LE PROPRIÉTAIRE LUI-MÊME.
 *
 * Il a décrit son application en détail — tranches tarifaires, frais fixes,
 * exemples chiffrés. Le modèle l'a parfaitement comprise et lui a répondu :
 * « choisissez l'option Application depuis l'écran d'accueil ».
 *
 * Il n'a pas trouvé le bouton. Il a abandonné.
 *
 * DIRE À QUELQU'UN D'ALLER CLIQUER N'EST PAS UN AIGUILLAGE. C'est une impasse
 * pour tous ceux qui tapent simplement ce qu'ils veulent — et ils sont la
 * majorité. Ses mots : « il y a des utilisateurs qui viennent taper
 * directement le texte, sans appuyer sur le bouton, il ne faut pas décevoir
 * ceux-là. »
 *
 * La compréhension existait dans la tête du modèle et nulle part dans la
 * réponse. C'est la même famille que les sept « machines posées,
 * débranchées » de ce chantier : la donnée est là, personne ne l'écoute.
 *
 * ── POURQUOI UNE FONCTION, ET PAS TROIS CONDITIONS DANS L'ÉCRAN.
 *
 * EP-267 a coûté la leçon : un contrôle qui lit des MENTIONS dans une source
 * ne mesure pas un câblage. Une décision enfouie dans un composant de 900
 * lignes ne se teste pas — `apps/web` n'a aucun harnais de rendu. Extraite
 * ici, elle s'APPELLE, et chaque refus se prouve.
 */

/** Ce que la route d'accueil rend quand elle pose une question. */
export type ReponseAccueil = {
  readonly type?: unknown
  readonly estApplication?: unknown
}

/**
 * Faut-il basculer cette personne vers le chemin des applications ?
 *
 * ── TROIS REFUS, ET CHACUN A SA RAISON.
 *
 * ① `=== true` STRICTEMENT. Une valeur absente, nulle, ou seulement
 *    « truthy » (`1`, `"oui"`, `"false"`) n'aiguille personne. Le signal
 *    traverse un modèle de langage : il peut rendre n'importe quoi, et
 *    basculer quelqu'un qui voulait une boutique serait PIRE que l'impasse
 *    qu'on répare.
 *
 * ② Le drapeau ne vaut que sur une QUESTION (`type === 'ask'`). Sur une
 *    conversation terminée, la bascule détruirait un travail déjà fait.
 *
 * ③ Si le chemin des applications n'est pas armé, on ne bascule pas : on
 *    enverrait la personne sur un écran qui ne peut rien produire.
 */
export function doitAiguillerVersApplication(
  reponse: ReponseAccueil,
  cheminArme: boolean,
): boolean {
  if (!cheminArme) return false
  if (reponse.type !== 'ask') return false
  return reponse.estApplication === true
}
