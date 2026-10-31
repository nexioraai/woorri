/**
 * L'EXTRACTION DES EXIGENCES — le document décide, et il le prouve par des
 * identifiants.
 *
 * ── CE QU'ELLE REMPLACE, ET POURQUOI (arbitrage du 2026-10-31).
 *
 * Le juge de couverture jugeait sur un lexique de dix-huit familles ; la
 * table de l'élicitation posait des questions de boutique à une plateforme
 * B2B. Deux symptômes, UNE cause : une liste écrite d'avance à la place du
 * document téléversé. Une famille s'ajoutait à chaque défaut révélé —
 * indéfiniment.
 *
 * ── LA PROVENANCE EST EXACTE PAR CONSTRUCTION.
 *
 * Le découpage est déterministe (`enonces.ts`) et NUMÉROTÉ ; le modèle ne
 * rend que des IDENTIFIANTS. Pas d'`indexOf`, pas de normalisation, pas de
 * paraphrase possible — donc pas d'exigence hallucinée. Une mauvaise
 * affectation reste possible ; elle est VISIBLE à l'humain, qui lit le texte
 * à côté du numéro. Une erreur visible vaut mieux qu'une citation
 * invérifiable.
 *
 * ── LA PARTITION A TROIS CORBEILLES, PAS DEUX.
 *
 * Exiger que CHAQUE énoncé devienne une exigence pousserait le modèle à en
 * inventer pour absorber ce qui n'en est pas — « Version 1.0, document de
 * cadrage », un sommaire, ou le conseil de gouvernance du cahier Hayine
 * (« ne pas demander à un générateur de code de créer toute la plateforme en
 * une seule opération ») : un conseil au lecteur, pas une capacité à livrer.
 * Le bruit de pagination est DÉTERMINISTE et filtré en amont ; celui-ci est
 * SÉMANTIQUE — seul le modèle peut le classer. D'où : exigences,
 * non-exigences DÉCLARÉES (comptées et affichées, jamais jetées en silence),
 * orphelins (cible : zéro).
 *
 * ── « HORS PÉRIMÈTRE » NE PEUT PAS DEVENIR LE NOUVEAU SILENCE.
 *
 * Trois voix, jamais confondues, chacune journalisée pour elle-même :
 *   · LE MOTEUR — des FAITS sur ce que Deribfy sait faire (pas de build
 *     natif : c'est N3, écrit en octobre). Déterministe. Jamais renvoyé au
 *     modèle : il ne peut pas le corriger, et le lui demander brûlerait des
 *     tours payants contre un mur. C'est le mécanisme ANTI-BOUCLE.
 *   · LE MODÈLE — une liste FERMÉE, amputée du motif que personne ne peut
 *     vérifier (« reporté par le client » : chemin humain uniquement).
 *   · L'HUMAIN — tous les motifs, puisque c'est lui qui parle.
 */
import { decouperEnEnonces, enoncesNumerotes, type Enonce } from './enonces'

/** Qui a le droit de poser ce motif. Un motif sans source est refusé. */
export type Voix = 'moteur' | 'modele' | 'humain'

/**
 * LES MOTIFS DE HORS-PÉRIMÈTRE, liste FERMÉE.
 *
 * Un motif en texte libre est refusé : c'est ce qui empêche la politesse de
 * remplacer la raison. « ambigue » n'est PAS une sortie — il renvoie vers
 * l'élicitation (sans lui, une exigence floue recevrait un mauvais motif
 * faute d'un bon).
 */
export const MOTIFS_HORS_PERIMETRE: Readonly<Record<string, { readonly libelle: string; readonly voix: readonly Voix[] }>> = {
  service_externe_requis: {
    libelle: 'nécessite un service externe non connecté',
    voix: ['modele', 'humain'],
  },
  identifiants_requis: {
    libelle: 'nécessite des identifiants que le client doit fournir',
    voix: ['modele', 'humain'],
  },
  build_natif_requis: {
    libelle: 'nécessite une application native (non construite par Deribfy)',
    voix: ['moteur', 'humain'],
  },
  ambigue: {
    libelle: 'exigence ambiguë — clarification nécessaire',
    voix: ['modele', 'humain'],
  },
  reporte_par_le_client: {
    libelle: 'reporté par le client',
    voix: ['humain'],
  },
}

/** Les motifs de non-exigence, fermés eux aussi, par cohérence. */
export const MOTIFS_NON_EXIGENCE: Readonly<Record<string, string>> = {
  metadonnee: 'métadonnée du document (version, date, auteur)',
  sommaire: 'sommaire ou titre de section',
  conseil_au_lecteur: 'conseil de méthode adressé au lecteur, pas une capacité',
  contexte: 'contexte ou récit, sans capacité demandée',
}

export type Exigence = {
  readonly nom: string
  readonly enonces: readonly number[]
  /** Posé seulement quand l'exigence est déclarée hors périmètre. */
  readonly horsPerimetre?: { readonly motif: string; readonly voix: Voix }
}

export type NonExigence = { readonly enonce: number; readonly motif: string }

export type Extraction = {
  readonly exigences: readonly Exigence[]
  readonly nonExigences: readonly NonExigence[]
  /** Énoncés qu'aucune corbeille ne réclame. Cible : zéro. */
  readonly orphelins: readonly number[]
  /** Ce qui a été REFUSÉ dans la réponse du modèle, et pourquoi. */
  readonly refus: readonly string[]
  readonly enonces: readonly Enonce[]
}

/** Ce que le moteur SAIT ne pas savoir faire — des faits, pas des avis. */
const LIMITES_DU_MOTEUR: readonly (readonly [string, RegExp])[] = [
  [
    'build_natif_requis',
    /\b(android|iphone|ios)\b|app store|google play|application native/iu,
  ],
]

export function construirePrompt(enonces: readonly Enonce[]): string {
  const motifs = Object.entries(MOTIFS_HORS_PERIMETRE)
    .filter(([, m]) => m.voix.includes('modele'))
    .map(([clef, m]) => `"${clef}" (${m.libelle})`)
    .join(', ')
  const nonExigences = Object.entries(MOTIFS_NON_EXIGENCE)
    .map(([clef, l]) => `"${clef}" (${l})`)
    .join(', ')
  return `Voici un cahier des charges découpé en énoncés numérotés.

${enoncesNumerotes(enonces)}

Groupe ces énoncés en EXIGENCES — une exigence est une capacité vérifiable,
dont on peut dire « couverte » ou « pas couverte » en ouvrant un écran ou en
exerçant un comportement. Vise 15 à 30 exigences pour un long document.

TU NE RECOPIES AUCUN TEXTE. Tu ne rends que des NUMÉROS d'énoncés.

CHAQUE énoncé va dans EXACTEMENT UNE des deux corbeilles :
  · une exigence ;
  · ou la liste des non-exigences, avec un motif parmi : ${nonExigences}.
    N'invente pas d'exigence pour absorber ce qui n'en est pas.

Si une exigence ne peut pas être livrée, dis-le avec un motif parmi :
${motifs}. N'emploie aucun autre motif.

Réponds UNIQUEMENT par un objet JSON de cette forme, sans rien avant ni après :
{"exigences":[{"nom":"Moyens de paiement","enonces":[12,13,47]},
              {"nom":"Notifications","enonces":[20],"horsPerimetre":{"motif":"service_externe_requis"}}],
 "nonExigences":[{"enonce":1,"motif":"metadonnee"}]}`
}

/** Extrait le premier objet JSON d'une réponse de modèle, ou rend null. */
function lireJson(texte: string): unknown {
  const debut = texte.indexOf('{')
  const fin = texte.lastIndexOf('}')
  if (debut < 0 || fin <= debut) return null
  try {
    return JSON.parse(texte.slice(debut, fin + 1))
  } catch {
    return null
  }
}

/**
 * Vérifie la réponse du modèle contre les énoncés réels, et rend l'extraction
 * assainie. Ne jette jamais : un refus est une DONNÉE, pas une panne.
 */
export function verifierExtraction(reponse: string, cahier: string): Extraction {
  const enonces = decouperEnEnonces(cahier)
  const valides = new Set(enonces.map((e) => e.id))
  const refus: string[] = []
  const lu = lireJson(reponse) as {
    exigences?: { nom?: unknown; enonces?: unknown; horsPerimetre?: { motif?: unknown } }[]
    nonExigences?: { enonce?: unknown; motif?: unknown }[]
  } | null
  if (lu === null) {
    return { exigences: [], nonExigences: [], orphelins: [...valides], refus: ['réponse illisible : aucun objet JSON'], enonces }
  }

  const pris = new Set<number>()
  const exigences: Exigence[] = []
  for (const brut of lu.exigences ?? []) {
    const nom = typeof brut.nom === 'string' ? brut.nom.trim().slice(0, 80) : ''
    const ids = Array.isArray(brut.enonces)
      ? brut.enonces.filter((n): n is number => typeof n === 'number' && valides.has(n))
      : []
    const inconnus = Array.isArray(brut.enonces)
      ? brut.enonces.filter((n) => typeof n !== 'number' || !valides.has(n))
      : []
    if (inconnus.length > 0) {
      refus.push(`« ${nom} » cite des énoncés qui n'existent pas : ${inconnus.join(', ')}`)
    }
    // UN ÉNONCÉ, UNE SEULE EXIGENCE : la partition se vérifie ici, et le
    // doublon est REFUSÉ plutôt que silencieusement rangé deux fois.
    const propres = ids.filter((id) => {
      if (pris.has(id)) {
        refus.push(`l'énoncé ${String(id)} est réclamé deux fois — gardé dans la première exigence`)
        return false
      }
      pris.add(id)
      return true
    })
    if (nom === '' || propres.length === 0) continue

    let horsPerimetre: Exigence['horsPerimetre']
    const motif = brut.horsPerimetre?.motif
    if (typeof motif === 'string') {
      const connu = MOTIFS_HORS_PERIMETRE[motif]
      if (connu === undefined) {
        refus.push(`« ${nom} » : motif inconnu « ${motif.slice(0, 40)} » — il reste à couvrir`)
      } else if (!connu.voix.includes('modele')) {
        // La porte ouverte au milieu de la liste fermée : refermée.
        refus.push(`« ${nom} » : le motif « ${motif} » n'appartient qu'à l'humain — il reste à couvrir`)
      } else {
        horsPerimetre = { motif, voix: 'modele' }
      }
    }
    exigences.push({ nom, enonces: propres, ...(horsPerimetre === undefined ? {} : { horsPerimetre }) })
  }

  const nonExigences: NonExigence[] = []
  for (const brut of lu.nonExigences ?? []) {
    const id = typeof brut.enonce === 'number' ? brut.enonce : -1
    const motif = typeof brut.motif === 'string' ? brut.motif : ''
    if (!valides.has(id) || pris.has(id)) continue
    if (MOTIFS_NON_EXIGENCE[motif] === undefined) {
      refus.push(`l'énoncé ${String(id)} est écarté avec un motif inconnu « ${motif.slice(0, 40)} »`)
      continue
    }
    pris.add(id)
    nonExigences.push({ enonce: id, motif })
  }

  // ── LA VOIX DU MOTEUR : des faits, posés après coup, et JAMAIS renvoyés
  // au modèle. Il ne peut pas construire une application native ; le lui
  // reprocher brûlerait des tours payants contre un mur.
  const final = exigences.map((ex) => {
    if (ex.horsPerimetre !== undefined) return ex
    const texte = ex.enonces
      .map((id) => enonces.find((e) => e.id === id)?.texte ?? '')
      .join(' ')
    for (const [motif, detecteur] of LIMITES_DU_MOTEUR) {
      if (detecteur.test(texte)) return { ...ex, horsPerimetre: { motif, voix: 'moteur' as const } }
    }
    return ex
  })

  return {
    exigences: final,
    nonExigences,
    orphelins: enonces.filter((e) => !pris.has(e.id)).map((e) => e.id),
    refus,
    enonces,
  }
}
