/**
 * L'ANALYSE PHRASE PAR PHRASE D'UNE DEMANDE (boîte noire, 2026-11-23).
 *
 * Elle remplace, pour le DIAGNOSTIC, la couverture par noms de tables qui a
 * donné 100 % sur la place de marché alors que la moitié de la demande était
 * perdue. Elle n'est pas montrée au client.
 *
 * ── COMMENT ELLE SE CALCULE — sans appel au modèle, donc sans coût, et
 * reproductible (la même entrée rend le même verdict) :
 *
 *   ① LES BRIQUES. Certaines demandes exigent une capacité que le moule ne
 *      sait pas produire aujourd'hui (inscription libre, données propres à
 *      chacun, envoi de fichiers, carte, notifications, messagerie interne,
 *      paiement, QR, plusieurs langues…). Une phrase qui en demande une est
 *      « perdue » (ou « en partie » quand le reste est fait), et l'étape est
 *      NOMMÉE : le moule, pas le modèle. Liste fermée, écrite ici.
 *   ② LES LISTES DONNÉES : « (N'Djamena, Moundou, Sarh…) » — chaque valeur
 *      est cherchée dans le schéma et le code livrés ; absentes, elles sont
 *      « perdues » à l'étape « données pré-remplies ».
 *   ③ LES MOTS. Pour le reste, les mots porteurs de la phrase (4 lettres et
 *      plus, hors mots vides, sans accents) sont cherchés dans la LECTURE DU
 *      CAHIER (tables, champs, rôles) puis dans le CODE LIVRÉ. Tous trouvés :
 *      « faite » ; une partie : « faite en partie » ; aucun : « perdue », et
 *      l'étape est la première où ils manquent (lecture, sinon génération).
 *
 * ── SA FIABILITÉ, DITE HONNÊTEMENT.
 *   · « perdue » par une brique : fiable — la brique n'existe pas, c'est un
 *     fait du code, pas une estimation ;
 *   · « faite » par les mots : FAIBLE — un mot présent dans le code ne prouve
 *     pas que le comportement marche (« filtrer par ville » trouve « ville »
 *     même si le filtre est faux). C'est une PRÉSOMPTION, à vérifier à l'écran ;
 *   · une capacité absente de la liste ① et dont les mots figurent dans le
 *     code passe pour « faite » : la liste doit grandir avec les cas vus.
 */

export type StatutPhrase = 'faite' | 'faite en partie' | 'perdue' | 'indéterminée'

export type PhraseAnalysee = {
  readonly phrase: string
  readonly verdict: StatutPhrase
  /** Où elle s'est perdue : « moule : … », « lecture du cahier », « génération », « données pré-remplies ». */
  readonly etape: string | null
  readonly raison: string
  /** Comment le verdict a été obtenu : « brique », « liste », « mots ». */
  readonly methode: 'brique' | 'liste' | 'mots' | 'aucune'
}

export type Analyse = {
  readonly phrases: readonly PhraseAnalysee[]
  readonly resume: Readonly<Record<StatutPhrase, number>>
  readonly fiabilite: string
}

type EntiteLue = { readonly id?: string; readonly name?: string; readonly fields?: readonly { readonly name?: string }[] }

/** Les capacités que le moule ne produit pas aujourd'hui (mesuré le 2026-11-22). */
/**
 * `essentielle` : la brique EST l'exigence de la phrase (« chacun ne modifie
 * que les siens ») — sans elle, rien de la phrase n'est fait, même si ses mots
 * se retrouvent dans le code. Sinon, la phrase peut être faite EN PARTIE.
 */
export const BRIQUES_ABSENTES: readonly { readonly nom: string; readonly motif: RegExp; readonly etape: string; readonly essentielle?: boolean }[] = [
  { nom: 'inscription libre des utilisateurs', motif: /cr[ée]+(?:nt|r)? (?:un|leur|son) compte|s['’]inscri|inscription|ouvrir un compte/iu, etape: 'moule : un seul compte par appli (compte-oeuvre.ts)' },
  { nom: 'données propres à chaque utilisateur', motif: /(?:ses|leurs|son|sa) propres?\b|que les siens|que les siennes|ne (?:peut|peuvent) (?:modifier|voir|supprimer|gérer)[^.]{0,30}que/iu, etape: 'moule : une seule porte par table (politiques-donnees.ts)', essentielle: true },
  { nom: 'plusieurs rôles avec des droits différents', motif: /\bun (?:administrateur|gérant|modérateur|livreur|enseignant|professeur|médecin|caissier|serveur)s? (?:peut|peuvent|valide|ajoute)/iu, etape: 'moule : un seul compte, tout le monde au même endroit' },
  { nom: 'envoi de photos ou de fichiers', motif: /\bphotos?\b|\bimages?\b|\bfichiers?\b|pièces? jointes?|\bscan|télévers|bulletin en pdf|\bpdf\b/iu, etape: 'moule : aucun stockage de fichiers (la photo devient un lien à coller)' },
  { nom: 'position et carte', motif: /\bcarte\b(?! d['’]identit| bancaire| de fidélit)|\bgps\b|position|localis|itinéraire|géolocal/iu, etape: 'moule : aucune carte ni position' },
  { nom: 'notifications', motif: /notifi|\bsms\b|rappel(?:s|er)? (?:par|avant|la veille)|prévenu|averti/iu, etape: 'moule : aucune notification' },
  { nom: 'messagerie entre utilisateurs', motif: /messagerie|discut|s['’]écrire|envoyer un message|conversation entre/iu, etape: 'moule : aucune messagerie interne' },
  { nom: 'paiement dans l’appli', motif: /\bpa(?:yer|ient|ient|iement)|mobile money|airtel money|moov money|carte bancaire|encaisser en ligne/iu, etape: 'moule : aucun paiement dans les applis générées' },
  { nom: 'code QR', motif: /\bqr\b|code[- ]barres?/iu, etape: 'moule : aucun code QR' },
  { nom: 'usage hors ligne complet', motif: /hors ligne|sans (?:connexion|internet|réseau)/iu, etape: 'moule : seul l’écran d’accueil s’ouvre hors ligne, rien ne s’enregistre' },
  { nom: 'plusieurs langues', motif: /\barabe\b|\banglais\b|plusieurs langues|tradui|bilingue/iu, etape: 'moule : une seule langue' },
  { nom: 'calendrier et créneaux', motif: /calendrier|créneau|agenda/iu, etape: 'moule : aucun calendrier ni gestion de créneaux' },
]

/** Une capacité que le moule SAIT produire, vérifiée par une trace précise dans le code. */
const BRIQUES_PRESENTES: readonly { readonly motif: RegExp; readonly trace: RegExp; readonly nom: string }[] = [
  { nom: 'contact WhatsApp', motif: /whatsapp/iu, trace: /wa\.me\//u },
]

const MOTS_VIDES = new Set(('avec aussi avoir dans des elle elles est etre leur leurs mais pour par plus que qui quoi sans ses son sont sur tous tout toute toutes une les aux ont peut peuvent chaque cette celui celle entre leurs comme donc dont alors ainsi faire fait font voir voient autres autre leur cela ceci nous vous ils elles etc tres bien selon depuis vers chez lors '
  + 'application appli client clients utilisateur utilisateurs').split(' '))

const sansAccents = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase()

/** Les phrases d'une demande : par ponctuation forte et par puces. */
export function phrasesDe(demande: string): string[] {
  return demande
    .split(/(?<=[.!?;])\s+|\n+\s*[-•·*]\s*|\n{2,}/u)
    .map((p) => p.trim())
    .filter((p) => p.replace(/[^\p{L}]/gu, '').length >= 8)
}

/** Les mots porteurs : 4 lettres et plus, hors mots vides, sans accents, singularisés grossièrement. */
export function motsPorteurs(phrase: string): string[] {
  const mots = sansAccents(phrase).match(/\p{L}{4,}/gu) ?? []
  return [...new Set(mots.filter((m) => !MOTS_VIDES.has(m)).map((m) => m.replace(/(?:s|x)$/u, '')))]
}

/** Les valeurs d'une liste donnée entre parenthèses : « (A, B, C et les autres) ». */
export function listeDonnee(phrase: string): string[] {
  const m = /\(([^)]+)\)/u.exec(phrase)
  if (m === null) return []
  const items = (m[1] ?? '').split(/,|\bet\b/u).map((x) => x.trim()).filter((x) => /^\p{Lu}/u.test(x) && !/^les autres$/iu.test(x))
  return items.length >= 3 ? items : []
}

export function analyserDemande(o: {
  readonly demande: string
  readonly entites: readonly EntiteLue[]
  readonly roles: readonly string[]
  /** Tout le code livré, concaténé. */
  readonly code: string
  readonly schema: string
}): Analyse {
  const lecture = sansAccents([
    ...o.entites.flatMap((e) => [e.id ?? '', e.name ?? '', ...(e.fields ?? []).map((f) => f.name ?? '')]),
    ...o.roles,
  ].join(' ').replace(/[_-]/gu, ' '))
  const code = sansAccents(o.code)
  const schema = sansAccents(o.schema)
  const trouve = (mot: string, ou: string): boolean => ou.includes(mot)

  const phrases: PhraseAnalysee[] = phrasesDe(o.demande).map((phrase): PhraseAnalysee => {
    // TOUS les constats de la phrase, jamais le premier seulement : une phrase
    // longue porte plusieurs exigences.
    const absentes = BRIQUES_ABSENTES.filter((b) => b.motif.test(phrase))
    const essentielle = absentes.find((b) => b.essentielle === true)
    const presentesManquees = BRIQUES_PRESENTES.filter((b) => b.motif.test(phrase) && !b.trace.test(o.code))
    const liste = listeDonnee(phrase)
    const listePerdue = liste.length > 0 && liste.filter((v) => code.includes(sansAccents(v)) || schema.includes(sansAccents(v))).length < liste.length / 2
    const mots = motsPorteurs(phrase.replace(/\([^)]*\)/gu, ''))
    const dansCode = mots.filter((m) => trouve(m, code))
    const dansLecture = mots.filter((m) => trouve(m, lecture))
    const partMots = mots.length === 0 ? 0 : dansCode.length / mots.length

    if (essentielle !== undefined) {
      return { phrase, verdict: 'perdue', etape: essentielle.etape, raison: `brique absente : ${essentielle.nom} — c’est l’exigence même de la phrase`, methode: 'brique' }
    }
    const manques: { readonly etape: string; readonly quoi: string }[] = [
      ...absentes.map((b) => ({ etape: b.etape, quoi: `brique absente : ${b.nom}` })),
      ...(listePerdue ? [{ etape: 'données pré-remplies', quoi: `liste donnée absente du schéma et du code : ${liste.join(', ')}` }] : []),
      ...presentesManquees.map((b) => ({ etape: 'génération', quoi: `${b.nom} : aucune trace dans le code livré` })),
    ]
    if (manques.length > 0) {
      return {
        phrase,
        verdict: partMots >= 0.5 ? 'faite en partie' : 'perdue',
        etape: (manques[0] as (typeof manques)[number]).etape,
        raison: manques.map((m) => m.quoi).join(' ; ') + (partMots >= 0.5 ? ' — le reste de la phrase se retrouve dans le code' : ''),
        methode: absentes.length > 0 || presentesManquees.length > 0 ? 'brique' : 'liste',
      }
    }
    if (mots.length === 0) return { phrase, verdict: 'indéterminée', etape: null, raison: 'aucun mot porteur à chercher', methode: 'aucune' }
    if (partMots >= 0.8) return { phrase, verdict: 'faite', etape: null, raison: `mots retrouvés dans le code : ${dansCode.join(', ')} (présomption, pas une preuve de comportement)`, methode: 'mots' }
    const manquants = mots.filter((m) => !dansCode.includes(m))
    const etape = manquants.some((m) => !dansLecture.includes(m)) && dansLecture.length < mots.length ? 'lecture du cahier' : 'génération'
    return {
      phrase,
      verdict: partMots >= 0.3 ? 'faite en partie' : 'perdue',
      etape,
      raison: `mots absents du code livré : ${manquants.join(', ')}`,
      methode: 'mots',
    }
  })

  const resume: Record<StatutPhrase, number> = { faite: 0, 'faite en partie': 0, perdue: 0, 'indéterminée': 0 }
  for (const p of phrases) resume[p.verdict] += 1
  return {
    phrases,
    resume,
    fiabilite:
      '« perdue » par une brique : fiable (la capacité n’existe pas dans le moule). « faite » par les mots : présomption ' +
      'faible (un mot présent ne prouve pas que le comportement marche). Calcul sans modèle, reproductible.',
  }
}
