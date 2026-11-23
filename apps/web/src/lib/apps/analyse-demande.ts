/**
 * L'ANALYSE PHRASE PAR PHRASE D'UNE DEMANDE (boîte noire, 2026-11-23).
 *
 * Elle remplace, pour le DIAGNOSTIC, la couverture par noms de tables qui a
 * donné 100 % sur la place de marché alors que la moitié de la demande était
 * perdue. Elle n'est pas montrée au client.
 *
 * ── LE DÉFAUT QUE LA SECONDE VERSION FERME (2026-11-23).
 *
 * La première version attribuait « au moule » toute capacité que la
 * plateforme ne fournit pas — inscription, données propres à chacun, rôles —
 * SANS lire le code livré. Sur la place de marché (b21c548a), elle disait
 * l'inscription « perdue dans le moule » : or le modèle l'avait ÉCRITE
 * (`base.auth.signUp`, index.tsx:517). Ce qui la perdait, c'était la
 * publication : confirmation par courriel obligatoire, et un compte inscrit
 * sans l'autorisation de l'appli. « Absente » et « écrite mais inutilisable »
 * appellent deux réparations différentes ; les confondre envoie réparer le
 * mauvais étage.
 *
 * ── COMMENT ELLE SE CALCULE — sans modèle, donc sans coût, reproductible :
 *
 *   ① LES CAPACITÉS QUE LA PLATEFORME NE FOURNIT PAS. Pour chacune, on
 *      CHERCHE D'ABORD une trace dans le code livré :
 *      · trace trouvée, et l'échec une fois publiée MESURÉ → « écrite mais
 *        inutilisable une fois publiée », étape « publication : … » ;
 *      · trace trouvée, échec non mesuré → « écrite, non éprouvée une fois
 *        publiée » : on ne sait pas, et on le dit ;
 *      · aucune trace → « perdue », étape « génération : absente du code
 *        livré », avec ce que la plateforme ne fournit pas.
 *   ② LES LISTES DONNÉES : « (N'Djamena, Moundou, Sarh…) » — chaque valeur
 *      est cherchée dans le schéma et le code livrés.
 *   ③ LES MOTS porteurs, cherchés dans la lecture du cahier puis le code.
 *   ④ LES CONSTATS SUR L'APPLI LIVRÉE, hors phrases : mot de passe stocké en
 *      clair, table publique lisible en entier, lignes cachées à l'écran
 *      seulement. Ils se lisent dans la déclaration, les POLITIQUES émises et
 *      le code : ce sont des faits du livrable, pas des estimations.
 */
import { colonnesTrieesALEcran, jugerLecturePublique } from './juge-lecture-publique'
import type { EntiteDeclaree } from './entites-declarees'

export type StatutPhrase =
  | 'faite'
  | 'faite en partie'
  | 'écrite mais inutilisable une fois publiée'
  | 'écrite, non éprouvée une fois publiée'
  | 'perdue'
  | 'indéterminée'

export const STATUTS: readonly StatutPhrase[] = [
  'faite', 'faite en partie', 'écrite mais inutilisable une fois publiée', 'écrite, non éprouvée une fois publiée', 'perdue', 'indéterminée',
]

export type PhraseAnalysee = {
  readonly phrase: string
  readonly verdict: StatutPhrase
  /** Où elle s'est perdue : « génération : … », « publication : … », « lecture du cahier », « données pré-remplies ». */
  readonly etape: string | null
  readonly raison: string
  /** Comment le verdict a été obtenu : « brique », « liste », « mots ». */
  readonly methode: 'brique' | 'liste' | 'mots' | 'aucune'
}

/** Un fait du livrable, hors phrases. */
export type Constat = { readonly quoi: string; readonly preuve: string }

export type Analyse = {
  readonly phrases: readonly PhraseAnalysee[]
  readonly resume: Readonly<Record<StatutPhrase, number>>
  readonly constats: readonly Constat[]
  readonly fiabilite: string
}

type EntiteLue = { readonly id?: string; readonly name?: string; readonly fields?: readonly { readonly name?: string }[] }

/**
 * LES CAPACITÉS QUE LA PLATEFORME NE FOURNIT PAS (mesuré le 2026-11-22).
 *
 * `trace` : ce qui prouve que le MODÈLE l'a écrite dans le code livré.
 * `publiee` : POURQUOI elle ne marche pas une fois publiée — seulement quand
 * c'est MESURÉ. Absent : l'échec n'est pas éprouvé, et le verdict le dit.
 * `essentielle` : la capacité EST l'exigence de la phrase (« chacun ne
 * modifie que les siens ») — sans elle, rien de la phrase n'est fait.
 */
export const BRIQUES_ABSENTES: readonly {
  readonly nom: string
  readonly motif: RegExp
  readonly trace: RegExp
  readonly plateforme: string
  readonly publiee?: string
  readonly essentielle?: boolean
}[] = [
  {
    nom: 'inscription libre des utilisateurs',
    motif: /cr[ée]+(?:nt|r)? (?:un|leur|son) compte|s['’]inscri|inscription|ouvrir un compte/iu,
    trace: /\.auth\.signUp\(/u,
    plateforme: 'un seul compte par appli (compte-oeuvre.ts)',
    publiee:
      'confirmation par courriel obligatoire sur le projet des applis, et un compte inscrit ne porte pas ' +
      'l’autorisation de l’appli (app_metadata.oeuvre) : la base lui refuse tout — mesuré le 2026-11-23 ' +
      '(réglages de connexion, base jetable)',
  },
  {
    nom: 'données propres à chaque utilisateur',
    motif: /(?:ses|leurs|son|sa) propres?\b|que les siens|que les siennes|ne (?:peut|peuvent) (?:modifier|voir|supprimer|gérer)[^.]{0,30}que/iu,
    trace: /\.filter\([^;\n]{0,160}(?:session|[aA]ctuel|[cC]ourant|[cC]onnect)|\.eq\(\s*['"`](?:proprietaire|owner|auteur|user|utilisateur|vendeur)(?:_id)?['"`]/u,
    plateforme: 'une seule porte par table (politiques-donnees.ts)',
    publiee:
      'le tri par compte n’existe qu’à l’écran ; la base n’a qu’une porte par table : seul le compte du ' +
      'propriétaire lit et écrit, un compte inscrit ne voit rien — mesuré le 2026-11-23 (base jetable)',
    essentielle: true,
  },
  {
    nom: 'plusieurs rôles avec des droits différents',
    motif: /\bun (?:administrateur|gérant|modérateur|livreur|enseignant|professeur|médecin|caissier|serveur)s? (?:peut|peuvent|valide|ajoute)/iu,
    trace: /estAdmin|isAdmin|\brole\s*===|\brôle\s*===/u,
    plateforme: 'un seul compte, tout le monde au même endroit',
    publiee:
      'le rôle n’existe qu’à l’écran : la base ne connaît que le compte du propriétaire — mesuré le ' +
      '2026-11-23 (`estAdmin` vrai pour tout compte connecté, base jetable)',
  },
  { nom: 'envoi de photos ou de fichiers', motif: /\bphotos?\b|\bimages?\b|\bfichiers?\b|pièces? jointes?|\bscan|télévers|bulletin en pdf|\bpdf\b/iu, trace: /type=["'`]file["'`]|\.storage\.from\(/u, plateforme: 'aucun stockage de fichiers (la photo devient un lien à coller)' },
  { nom: 'position et carte', motif: /\bcarte\b(?! d['’]identit| bancaire| de fidélit)|\bgps\b|position|localis|itinéraire|géolocal/iu, trace: /geolocation|leaflet|maps\.google|mapbox/u, plateforme: 'aucune carte ni position' },
  { nom: 'notifications', motif: /notifi|\bsms\b|rappel(?:s|er)? (?:par|avant|la veille)|prévenu|averti/iu, trace: /new Notification\(|PushManager|sendSms|twilio/u, plateforme: 'aucune notification' },
  { nom: 'messagerie entre utilisateurs', motif: /messagerie|discut|s['’]écrire|envoyer un message|conversation entre/iu, trace: /from\(\s*['"`](?:message|messages|conversation)['"`]/u, plateforme: 'aucune messagerie interne' },
  { nom: 'paiement dans l’appli', motif: /\bpa(?:yer|ient|iement)|mobile money|airtel money|moov money|carte bancaire|encaisser en ligne/iu, trace: /stripe|checkout|paiement\s*\(/iu, plateforme: 'aucun paiement dans les applis générées' },
  { nom: 'code QR', motif: /\bqr\b|code[- ]barres?/iu, trace: /qrcode|QRCode|BarcodeDetector/u, plateforme: 'aucun code QR' },
  { nom: 'usage hors ligne complet', motif: /hors ligne|sans (?:connexion|internet|réseau)/iu, trace: /indexedDB|navigator\.onLine/u, plateforme: 'seul l’écran d’accueil s’ouvre hors ligne, rien ne s’enregistre' },
  { nom: 'plusieurs langues', motif: /\barabe\b|\banglais\b|plusieurs langues|tradui|bilingue/iu, trace: /\blangue\s*===|i18n|traductions?\s*[:=]/u, plateforme: 'une seule langue' },
  { nom: 'calendrier et créneaux', motif: /calendrier|créneau|agenda/iu, trace: /creneau|calendrier|agenda/iu, plateforme: 'aucun calendrier ni gestion de créneaux' },
]

/** Une capacité que la plateforme SAIT produire, vérifiée par une trace précise dans le code. */
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

/** Une colonne qui porte un secret saisi : son nom le dit. */
const NOM_DE_SECRET = /^(?:mot_?de_?passe|motdepasse|mdp|password|passwd|pass|pin|code_secret|code_pin)$/u

/**
 * ④ LES CONSTATS SUR L'APPLI LIVRÉE — des faits du livrable, pas des phrases.
 *
 * `politiques` est le SQL de la porte TEL QU'IL A ÉTÉ ÉMIS pour cette version :
 * une appli d'avant le 2026-11-23 accordait la table entière au visiteur, et
 * c'est ce texte-là qui le prouve, pas l'émetteur d'aujourd'hui.
 */
export function constatsDuLivre(o: {
  readonly entites: readonly EntiteDeclaree[]
  readonly fichiers: ReadonlyMap<string, string>
  readonly politiques: string
}): Constat[] {
  const constats: Constat[] = []
  for (const e of o.entites) {
    const t = e.id.replace(/^ent_/u, '')
    for (const f of e.fields as readonly { id: string; sensitive?: boolean }[]) {
      const c = f.id.replace(/^fld_/u, '')
      if (NOM_DE_SECRET.test(c) && f.sensitive !== true) {
        constats.push({
          quoi: `mot de passe stocké en clair : « ${t}.${c} »`,
          preuve: `colonne déclarée et conservée (${t}.${c}) ; le compte du propriétaire la lit telle qu’elle a été saisie`,
        })
      }
    }
  }
  const publiques = o.entites.filter((e) => e.lecturePublique === true)
  for (const e of publiques) {
    const t = e.id.replace(/^ent_/u, '')
    const entiere = new RegExp(`^grant select on ${t} to anon;$`, 'mu').test(o.politiques)
    if (!entiere) continue
    const conservees = (e.fields as readonly { id: string; derived?: unknown; sensitive?: boolean }[])
      .filter((f) => f.derived === undefined && f.sensitive !== true)
      .map((f) => f.id.replace(/^fld_/u, ''))
    constats.push({
      quoi: `table « ${t} » lisible EN ENTIER par tout visiteur sans compte`,
      preuve: `politique émise : « grant select on ${t} to anon » et « using (true) » — colonnes : ${conservees.join(', ')}`,
    })
    const booleens = (e.fields as readonly { id: string; type: string }[]).filter((f) => f.type === 'boolean').map((f) => f.id.replace(/^fld_/u, ''))
    for (const c of colonnesTrieesALEcran(o.fichiers, booleens)) {
      constats.push({
        quoi: `lignes de « ${t} » cachées à l’écran seulement (« ${c} ») : lisibles par tout visiteur`,
        preuve: `le code trie par « .${c} » dans un .filter( ; la politique n’a aucune condition de ligne`,
      })
    }
  }
  // Une appli émise avec la porte par colonnes : le juge d'aujourd'hui dit le reste.
  for (const d of jugerLecturePublique(publiques.filter((e) => !new RegExp(`^grant select on ${e.id.replace(/^ent_/u, '')} to anon;$`, 'mu').test(o.politiques)), o.fichiers)) {
    if (d.genre === 'champ-non-lu') constats.push({ quoi: `« ${d.table}.${d.champ} » lisible sans compte, montré nulle part`, preuve: 'déclaré dans champsPublics, demandé par aucune lecture bornée' })
    if (d.genre === 'tri-a-l-ecran') constats.push({ quoi: `lignes de « ${d.table} » cachées à l’écran seulement (« ${d.champ} »)`, preuve: 'le code trie dans un .filter( sans condition de ligne déclarée' })
  }
  return constats
}

export function analyserDemande(o: {
  readonly demande: string
  readonly entites: readonly EntiteLue[]
  readonly roles: readonly string[]
  /** Tout le code livré, concaténé. */
  readonly code: string
  readonly schema: string
  /** Pour les constats ④ : le livrable lui-même. Absent : aucun constat. */
  readonly livre?: { readonly entites: readonly EntiteDeclaree[]; readonly fichiers: ReadonlyMap<string, string>; readonly politiques: string }
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
    const demandees = BRIQUES_ABSENTES.filter((b) => b.motif.test(phrase))
    // ── D'ABORD LE CODE : écrite, ou absente ? (le défaut de la v1)
    const ecrites = demandees.filter((b) => b.trace.test(o.code))
    const absentes = demandees.filter((b) => !b.trace.test(o.code))
    const presentesManquees = BRIQUES_PRESENTES.filter((b) => b.motif.test(phrase) && !b.trace.test(o.code))
    const liste = listeDonnee(phrase)
    const listePerdue = liste.length > 0 && liste.filter((v) => code.includes(sansAccents(v)) || schema.includes(sansAccents(v))).length < liste.length / 2
    const mots = motsPorteurs(phrase.replace(/\([^)]*\)/gu, ''))
    const dansCode = mots.filter((m) => trouve(m, code))
    const dansLecture = mots.filter((m) => trouve(m, lecture))
    const partMots = mots.length === 0 ? 0 : dansCode.length / mots.length

    const essentielle = demandees.find((b) => b.essentielle === true)
    if (essentielle !== undefined) {
      if (!essentielle.trace.test(o.code)) {
        return { phrase, verdict: 'perdue', etape: `génération : absente du code livré — la plateforme ne la fournit pas non plus (${essentielle.plateforme})`, raison: `${essentielle.nom} : aucune trace dans le code, et c’est l’exigence même de la phrase`, methode: 'brique' }
      }
      return essentielle.publiee !== undefined
        ? { phrase, verdict: 'écrite mais inutilisable une fois publiée', etape: `publication : ${essentielle.plateforme}`, raison: `${essentielle.nom} : écrite par le modèle, inutilisable une fois publiée — ${essentielle.publiee}`, methode: 'brique' }
        : { phrase, verdict: 'écrite, non éprouvée une fois publiée', etape: `publication : ${essentielle.plateforme}`, raison: `${essentielle.nom} : écrite par le modèle ; son fonctionnement une fois publiée n’est pas éprouvé`, methode: 'brique' }
    }
    const manques: { readonly etape: string; readonly quoi: string; readonly genre: 'absente' | 'inutilisable' | 'non-eprouvee' | 'liste' }[] = [
      ...absentes.map((b) => ({ etape: `génération : absente du code livré (${b.plateforme})`, quoi: `${b.nom} : aucune trace dans le code`, genre: 'absente' as const })),
      ...ecrites.map((b) =>
        b.publiee !== undefined
          ? { etape: `publication : ${b.plateforme}`, quoi: `${b.nom} : écrite par le modèle, inutilisable une fois publiée — ${b.publiee}`, genre: 'inutilisable' as const }
          : { etape: `publication : ${b.plateforme}`, quoi: `${b.nom} : écrite par le modèle, non éprouvée une fois publiée`, genre: 'non-eprouvee' as const }),
      ...(listePerdue ? [{ etape: 'données pré-remplies', quoi: `liste donnée absente du schéma et du code : ${liste.join(', ')}`, genre: 'liste' as const }] : []),
      ...presentesManquees.map((b) => ({ etape: 'génération', quoi: `${b.nom} : aucune trace dans le code livré`, genre: 'absente' as const })),
    ]
    if (manques.length > 0) {
      // LE PIRE DÉCIDE : une absence est une perte ; une capacité écrite mais
      // inutilisable le dit — c'est une autre réparation, à un autre étage.
      const verdict: StatutPhrase =
        manques.some((m) => m.genre === 'absente' || m.genre === 'liste')
          ? partMots >= 0.5 ? 'faite en partie' : 'perdue'
          : manques.some((m) => m.genre === 'inutilisable')
            ? 'écrite mais inutilisable une fois publiée'
            : 'écrite, non éprouvée une fois publiée'
      const premier = manques.find((m) => m.genre === 'absente' || m.genre === 'liste') ?? manques.find((m) => m.genre === 'inutilisable') ?? manques[0]
      return {
        phrase,
        verdict,
        etape: (premier as (typeof manques)[number]).etape,
        raison: manques.map((m) => m.quoi).join(' ; ') + (partMots >= 0.5 && verdict === 'faite en partie' ? ' — le reste de la phrase se retrouve dans le code' : ''),
        methode: demandees.length > 0 || presentesManquees.length > 0 ? 'brique' : 'liste',
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

  const resume = Object.fromEntries(STATUTS.map((s) => [s, 0])) as Record<StatutPhrase, number>
  for (const p of phrases) resume[p.verdict] += 1
  return {
    phrases,
    resume,
    constats: o.livre === undefined ? [] : constatsDuLivre(o.livre),
    fiabilite:
      'Calcul sans modèle, reproductible. FIABLE : « écrite » ou « absente » (une trace précise est cherchée dans le code livré) ; ' +
      '« inutilisable une fois publiée » pour l’inscription, les données propres à chacun et les rôles (échec MESURÉ le 2026-11-23 sur base jetable) ; ' +
      'les constats (lus dans la déclaration, la porte émise et le code). ' +
      'PRÉSOMPTION FAIBLE : « faite » par les mots est une présomption (un mot présent ne prouve pas que le comportement marche) ; ' +
      '« non éprouvée » (écrite, échec ni prouvé ni écarté). ' +
      'ANGLE MORT : une trace absente de la liste passe pour « absente » ; une capacité hors de la liste ① passe pour « faite » si ses mots sont dans le code.',
  }
}
