/**
 * D'UNE PHRASE À UNE APPLICATION — LE PORT.
 *
 * ── CE QUE CE FICHIER EST, ET CE QU'IL N'EST PAS.
 *
 * C'est la COUTURE entre la conversation et le moteur. Tout ce qui est
 * au-dessus — la page, les messages, l'aperçu — ne connaît que `emettre()`.
 * Tout ce qui est en dessous peut changer sans qu'une ligne d'interface bouge.
 *
 * ── POURQUOI UNE COUTURE PLUTÔT QU'UN APPEL DIRECT.
 *
 * Le dépôt possède une chaîne d'émission ÉPROUVÉE — cinq appels structurés
 * (base → données → écrans → comportement → câblage), validation stricte,
 * réparation bornée, aller-retour vérifié par empreinte. Elle vit dans
 * `benchmarks/air-emission/emit-v3.mjs`.
 *
 * ET ELLE N'EST PAS APPELABLE : ce fichier s'EXÉCUTE au chargement. C'est un
 * script de campagne, pas un module. L'importer depuis une route lancerait la
 * campagne entière. Les ADAPTATEURS, eux, sont purs et exportent ce qu'il faut
 * — c'est la décomposition en cinq parties qui reste enfermée.
 *
 * La rendre appelable est une extraction, pas une correction ; elle se décide.
 * En attendant, cette couture existe et dit la vérité sur ce qu'elle sait
 * faire. Un produit qui prétend comprendre une phrase alors qu'il n'en lit que
 * le nom serait un mensonge ; celui-ci le dit à l'utilisateur.
 */
import type { ProjectAir } from '@deribfy/air-schema'
import { projectAirSchema } from '@deribfy/air-schema'
import { documentDeLaBoutique } from './document'

export type Emission =
  | { ok: true; document: ProjectAir; compris: string[]; parIA: boolean }
  | { ok: false; raison: string }

/** L'IA est-elle branchée ? Un `false` n'est pas une panne, c'est un état. */
export function emissionParIaDisponible(): boolean {
  return (process.env.EMISSION_IA ?? '') === '1'
}

/**
 * Ce qu'on sait tirer d'une phrase SANS modèle.
 *
 * Volontairement pauvre, et honnête sur sa pauvreté : un nom, une intention
 * lisible, un ordre de grandeur. On ne devine pas des entités ni des écrans —
 * inventer une structure que personne n'a demandée serait pire que de ne rien
 * faire, parce que l'utilisateur la croirait tirée de sa phrase.
 */
export function lireLaPhrase(phrase: string): { nom: string; intention: string; elements: number } {
  const propre = phrase.trim().replace(/\s+/g, ' ')
  // « Je veux une application de tontine » → « Tontine ».
  //
  // LE RETRAIT SE REPETE, et c'est le defaut qu'un test a trouve : une seule
  // passe laissait « Une application de ». Les amorces s'empilent dans la vraie
  // langue — « je veux une application de… » en compte quatre.
  const AMORCES =
    /^(je veux|je voudrais|j'aimerais|il me faut|fais[- ]moi|fais|faire|cr[eé]er?|une|un|des|de la|du|de|d'|l[ea]|les|application|appli|app|site|logiciel|pour)\s*/iu
  let reste = propre
  for (let i = 0; i < 8; i += 1) {
    const court = reste.replace(AMORCES, '')
    if (court === reste) break
    reste = court
  }
  const mots = reste.split(' ').filter((m) => m.length > 0)
  const nom = (mots.slice(0, 3).join(' ') || 'Mon application').slice(0, 60)
  // ── UN NOMBRE SUIVI D'UN MOT, QUEL QU'IL SOIT.
  //
  // La première version énumérait les noms : `articles|produits|membres|
  // fiches|éléments`. LA SONDE L'A PRISE EN DÉFAUT à sa première exécution,
  // sur « 12 ouvriers » — rendu 8, la valeur par défaut. Une liste fermée de
  // noms communs sera toujours incomplète : il y aura toujours un métier
  // qu'on n'avait pas prévu.
  //
  // On ne demande donc plus QUEL mot suit, seulement qu'un mot suive. Et le
  // nombre est borné à 200 : « une appli pour 2026 » n'est pas une quantité.
  //
  //   ⚠️ UNE ANNEE N'EST PAS UNE QUANTITE. « pour 2026 » ne demande pas deux
  //   mille applications. On la reconnaît par sa plage, pas par sa longueur :
  //   borner à trois chiffres ferait PERDRE « 9999 produits » au lieu de le
  //   ramener à la limite — et ignorer un nombre énoncé est pire que le
  //   borner, parce que l'utilisateur l'a écrit et ne le reverra pas.
  const chiffre = [...propre.matchAll(/\b(\d{1,5})\s+\p{L}{3,}/gu)].find((m) => {
    const n = Number(m[1])
    return n > 0 && !(n >= 1900 && n <= 2100)
  }) ?? null
  return {
    nom: nom.charAt(0).toUpperCase() + nom.slice(1),
    intention: propre.slice(0, 200),
    elements: chiffre === null ? 8 : Math.max(1, Math.min(200, Number(chiffre[1]))),
  }
}

/**
 * La phrase devient un document. Validé STRICTEMENT avant de sortir — le
 * contrôle sémantique rendait « 0 erreur » sur un document que le schéma
 * refusait, et je l'ai pris une fois pour une preuve.
 */
export function emettreSansIa(phrase: string): Emission {
  const lu = lireLaPhrase(phrase)
  const doc = documentDeLaBoutique({
    slug: lu.nom,
    nom: lu.nom,
    couleur: null,
    description: lu.intention,
    nombreArticles: lu.elements,
  })
  const juge = projectAirSchema.safeParse(doc)
  if (!juge.success) {
    return { ok: false, raison: 'Cette phrase ne produit pas encore un document valide.' }
  }
  return {
    ok: true,
    document: juge.data,
    // CE QUE J'AI COMPRIS, dit à l'utilisateur AVANT qu'il ne découvre le
    // résultat. Trois lignes valent mieux qu'une application surprise.
    compris: [
      `Nom : ${lu.nom}`,
      `Une liste de ${String(lu.elements)} éléments, avec une fiche par élément`,
      'Aucune autre structure — je ne devine pas ce que vous n’avez pas dit',
    ],
    parIA: false,
  }
}
