/**
 * LIRE AVANT DE DEMANDER.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-19.
 *
 * Le propriétaire a joint un cahier des charges de douze pages — pays,
 * devise, encaissement, numéros : tout y était écrit. Le pré-vol a posé
 * « Que fait votre application avec l'argent ? ». `configurationADemander`
 * ne reçoit QUE les réponses : le brief ne lui parvient jamais.
 *
 * ── LA FRONTIÈRE AVEC LA DEVINETTE D'EP-255 B.
 *
 * Ce module ne DEVINE pas : il CITE. Déduire « France » de la langue
 * française est une devinette — l'erreur de v0. Lire « Tchad » écrit en
 * toutes lettres n'en est pas une. La consigne l'exige textuellement, et
 * ce qui n'est pas énoncé reste absent : la question sera posée.
 *
 * ── POURQUOI PAS DANS `/avant`.
 *
 * L'absence de dépense de `/avant` tient par la FORME de son fichier —
 * aucun client, aucune clé — et EP-257 la mesure sur le texte source. Un
 * appel ici l'aurait cassée. Cette route-ci coûte, peu, et le dit.
 *
 * ── RIEN N'EST CRU SUR PAROLE.
 *
 * La sortie est filtrée contre `QUESTIONS_DE_CONFIGURATION` : un code
 * inconnu ou une valeur hors choix est jetée. Le modèle ne peut donc pas
 * élargir la table, seulement la remplir.
 */
import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth/require-authenticated-user'
import { racineDepot } from '@/lib/apps/racine'
import { clientIA, FOURNISSEUR, MODELE_LEGER } from '@/lib/ia/client'
import { CONFIGS, tarifDe } from '@/lib/apps/fournisseur'
import { nomProduitValide } from '@/lib/apps/nom-produit'
import { projectAirSchema } from '@deribfy/air-schema'
import { lireEntites } from '@/lib/apps/entites-declarees'
import { CONSIGNE } from '@/lib/apps/consigne-lire-brief'
import { decouperEnTranches, fusionnerLectures, FUSIBLE_SIGNES, type LectureBrief, type LecturePartielle, type TrancheLue } from '@/lib/apps/lecture-brief'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * ── LA CONSIGNE DISTINGUE DEUX SILENCES, ET C'EST LA CORRECTION DU 2026-10-30.
 *
 * L'ancienne version disait : « si ce n'est pas écrit noir sur blanc, tu
 * OMETS la clé ». Le modèle OBÉISSAIT parfaitement — mesuré : un cahier des
 * charges institutionnel complet, sans un mot sur l'argent, rendait
 * `{"MARCHE_VISE":"Cameroun"}` et la question « Que fait votre application
 * avec l'argent ? » était posée QUAND MÊME. Le propriétaire a joint douze
 * pages trois fois, et trois fois la même question est revenue.
 *
 * Le défaut était dans la règle, pas dans le modèle : elle confondait
 *
 *   · DEVINER — le pays depuis la langue, un numéro depuis un indice.
 *     Une faute, à juste titre interdite (EP-255 B, l'erreur de v0).
 *   · LIRE L'ABSENCE — un document COMPLET qui ne mentionne ni paiement ni
 *     vente dit, par son silence même : « elle n'encaisse rien ». La valeur
 *     `aucun` existe précisément pour cela, et la règle interdisait au
 *     modèle de la choisir.
 *
 * La frontière n'est plus « écrit ou pas » mais « document complet ou
 * fragment » : un brief détaillé qui se tait sur l'argent → `aucun` ; un
 * brief court ou vague → on omet, et la question se pose — elle est alors
 * légitime. Se tromper coûte un clic (la question garde son échappatoire
 * « si aucune ne correspond, dites-le ») ; poser une question dont la
 * réponse est dans le document coûte la confiance de la personne.
 */


export async function POST(req: Request) {
  const garde = await requireAuthenticatedUser(req)
  if (!garde.ok) return garde.response

  const corps = (await req.json().catch(() => null)) as { demande?: unknown } | null
  const demande = typeof corps?.demande === 'string' ? corps.demande.trim() : ''
  // Un texte vide n'a rien à dire. On ne paie pas pour l'apprendre.
  const RIEN_LU = { coutUsd: 0, jetons: { entree: 0, sortie: 0 }, parTranche: [] } as const
  if (demande === '') {
    return NextResponse.json({ deduites: {}, coutUsd: 0, lecture: { resultat: 'demande_vide', tables: 0, tentatives: 0, tranches: 0, tranchesEchouees: 0, signesLus: 0, ...RIEN_LU, roles: [], ecrans: [], questionsOuvertes: [] } satisfies LectureBrief })
  }
  // ── LE FUSIBLE ANTI-ABUS — invisible en usage normal, jamais dans l'interface.
  if (demande.length > FUSIBLE_SIGNES) {
    return NextResponse.json(
      { error: 'Texte trop volumineux pour ce service.', deduites: {}, lecture: { resultat: 'erreur', tables: 0, tentatives: 0, tranches: 0, tranchesEchouees: 0, signesLus: demande.length, ...RIEN_LU, roles: [], ecrans: [], questionsOuvertes: [] } satisfies LectureBrief },
      { status: 413, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // ── LE RÉSULTAT DE LA LECTURE VOYAGE DANS TOUTES LES BRANCHES (M6, étape 1).
  // Voir lib/apps/lecture-brief.ts.
  let tentatives = 0
  // ── LE COÛT EST COMPTÉ SUR L'USAGE RENDU, APPEL PAR APPEL (G30, 2026-11-13).
  //
  // La ligne `9cc16d10` n'avait que « estimation, pas mesure » pour sa
  // lecture. Chaque appel ajoute ses jetons ici ; le tarif est celui de
  // l'heure de la lecture, comme pour la génération (fournisseur.ts).
  const jetons = { entree: 0, cache: 0, sortie: 0 }
  const coutDeLaLecture = (): number => {
    const t = tarifDe(CONFIGS[FOURNISSEUR].prixLeger, new Date())
    return Number(((jetons.entree * t.entree + jetons.cache * t.entreeCache + jetons.sortie * t.sortie) / 1e6).toFixed(6))
  }
  const jetonsLus = () => ({ entree: jetons.entree + jetons.cache, sortie: jetons.sortie })
  const tranches = decouperEnTranches(demande)
  try {
    const { QUESTIONS_DE_CONFIGURATION } = (await import(
      /* webpackIgnore: true */ `${racineDepot()}/benchmarks/air-emission/elicitation.mjs`
    )) as { QUESTIONS_DE_CONFIGURATION: Record<string, { choix?: { valeur: string }[] }> }

    // ── UNE LECTURE SANS RÉFLEXION, ET UNE REPRISE UNIQUE PAR TRANCHE (2b).
    //
    // MESURÉ (M10, cahier de 1 709 signes, limite 8 000) : en mode réflexion,
    // 2 rejeux sur 3 étaient COUPÉS — 28 000 signes de réflexion, texte
    // tronqué au milieu de la liste des tables, 0 table. Le point d'accès
    // ignore `budget_tokens` : la réflexion ne se borne pas, elle se coupe.
    // MESURÉ (M11) : `thinking.disabled` honoré 3/3, reussie 3/3, ~1 500
    // jetons de sortie (5× sous la limite), 6 s, 0,001 $ — contre 1/3 reussie
    // en mode réflexion. Cette lecture est une transcription structurée du
    // cahier, pas un raisonnement : la réflexion n'y apportait que la coupe.
    //
    // ── PAR TRANCHES, SANS BORNE (G30 élargi, 2026-11-13). La lecture coupait
    // à 24 000 signes, en silence. Désormais chaque tranche (frontières de
    // paragraphes) est lue par ce même appel, avec sa reprise unique, puis les
    // lectures sont FUSIONNÉES (lib/apps/lecture-brief.ts › fusionnerLectures).
    const lireUneFois = async (texte: string): Promise<
      | { resultat: 'reussie'; lu: Record<string, unknown> }
      | { resultat: 'illisible' | 'tronquee' | 'json_casse' }
    > => {
      tentatives += 1
      const r = await clientIA().messages.create({
        model: MODELE_LEGER,
        // ── 8 000 : mesuré le 2026-10-30, 400 laissait la réflexion manger
        // tout le budget et rendait un texte VIDE. Sans réflexion (2b), un
        // tranche de 24 000 signes rend ~1 500 à 2 500 jetons : la marge est large.
        max_tokens: 8000,
        thinking: { type: 'disabled' },
        system: CONSIGNE,
        messages: [{ role: 'user', content: texte }],
      })
      const u = (r.usage ?? {}) as { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null }
      jetons.entree += u.input_tokens ?? 0
      jetons.cache += u.cache_read_input_tokens ?? 0
      jetons.sortie += u.output_tokens ?? 0
      const tronquee = r.stop_reason === 'max_tokens'
      const brut = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
      const d = brut.indexOf('{')
      const f = brut.lastIndexOf('}')
      if (d === -1 || f <= d) {
        console.warn('[lire-brief] reponse illisible', {
          stop_reason: r.stop_reason,
          blocs: r.content.map((b) => b.type),
          caracteres: brut.length,
          tentative: tentatives,
        })
        return { resultat: tronquee ? 'tronquee' : 'illisible' }
      }
      try {
        return { resultat: 'reussie', lu: JSON.parse(brut.slice(d, f + 1)) as Record<string, unknown> }
      } catch {
        return { resultat: tronquee ? 'tronquee' : 'json_casse' }
      }
    }

    const aplati = (t: string) => t.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/gu, ' ')
    const brief = aplati(demande)
    const chaines = (brut: unknown, max: number): string[] =>
      Array.isArray(brut) ? brut.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim().slice(0, 200)).slice(0, max) : []

    /** Ce qu'UNE tranche lue donne, avant fusion — la même lecture qu'avant, par tranche. */
    const extraire = (lu: Record<string, unknown>): LecturePartielle => {
      const deduites: Record<string, string> = {}
      for (const [code, valeur] of Object.entries(lu)) {
        const q = QUESTIONS_DE_CONFIGURATION[code]
        if (q === undefined) continue
        if (typeof valeur !== 'string' || valeur.trim() === '') continue
        if (q.choix !== undefined && !q.choix.some((c) => c.valeur === valeur)) continue
        deduites[code] = valeur
      }
      const questionsIA: { code: string; texte: string; choix: string[] }[] = []
      if (Array.isArray(lu.QUESTIONS)) {
        for (const [n, brute] of (lu.QUESTIONS as unknown[]).slice(0, 3).entries()) {
          if (typeof brute !== 'object' || brute === null) continue
          const o = brute as { texte?: unknown; choix?: unknown }
          const texte = typeof o.texte === 'string' ? o.texte.trim().slice(0, 200) : ''
          if (texte === '') continue
          const choix = Array.isArray(o.choix)
            ? o.choix.filter((c): c is string => typeof c === 'string' && c.trim() !== '').slice(0, 4).map((c) => c.trim().slice(0, 80))
            : []
          questionsIA.push({ code: `IA_${String(n)}`, texte, choix })
        }
      }
      let nomProduit: LecturePartielle['nomProduit']
      let nomRefuse: string | undefined
      const nomBrut = lu.NOM_PRODUIT
      if (typeof nomBrut === 'string') {
        const verdict = nomProduitValide(nomBrut)
        if (verdict.ok) {
          const citBrut = typeof lu.NOM_CITATION === 'string' ? lu.NOM_CITATION.trim().slice(0, 80) : ''
          const citTrouvee = citBrut !== '' && brief.includes(aplati(citBrut))
          nomProduit = { nom: verdict.nom, ...(citTrouvee ? { citation: citBrut } : {}), dansLeDocument: brief.includes(aplati(verdict.nom)) }
        } else if (nomBrut.trim() !== '') {
          // Le nom écarté est GARDÉ pour la ligne : savoir ce que la tranche a
          // proposé vaut mieux qu'un `null` muet (tir de la découpe, 2026-11-13).
          nomRefuse = nomBrut.trim().slice(0, 80)
        }
      }
      return {
        deduites,
        ...(nomProduit === undefined ? {} : { nomProduit }),
        ...(nomRefuse === undefined ? {} : { nomRefuse }),
        entites: Array.isArray(lu.ENTITES) ? (lu.ENTITES as LecturePartielle['entites']) : [],
        questionsIA,
        roles: chaines(lu.ROLES, 12),
        ecrans: chaines(lu.ECRANS, 40),
        questionsOuvertes: chaines(lu.QUESTIONS_OUVERTES, 20),
        parcours: chaines(lu.PARCOURS, 8),
        langues: chaines(lu.LANGUES, 12).map((x) => x.toLowerCase()).filter((x) => /^[a-z]{2}$/u.test(x)),
        devises: chaines(lu.DEVISES, 8).map((x) => x.toUpperCase()).filter((x) => /^[A-Z]{3}$/u.test(x)),
        moyensPaiement: chaines(lu.MOYENS_PAIEMENT, 12),
        pays: chaines(lu.PAYS, 30),
      }
    }

    const parties: LecturePartielle[] = []
    const parTranche: TrancheLue[] = []
    let tranchesEchouees = 0
    let premierEchec: 'illisible' | 'tronquee' | 'json_casse' | null = null
    for (const tranche of tranches) {
      const avant = tentatives
      let lecture = await lireUneFois(tranche)
      if (lecture.resultat !== 'reussie') lecture = await lireUneFois(tranche)
      if (lecture.resultat !== 'reussie') {
        tranchesEchouees += 1
        if (premierEchec === null) premierEchec = lecture.resultat
        parTranche.push({ signes: tranche.length, tentatives: tentatives - avant, resultat: lecture.resultat, tables: 0, nom: null, nomRefuse: null, ecrans: 0, roles: 0, questionsOuvertes: 0 })
        continue
      }
      const p = extraire(lecture.lu)
      parties.push(p)
      parTranche.push({
        signes: tranche.length, tentatives: tentatives - avant, resultat: 'reussie', tables: p.entites.length,
        nom: p.nomProduit?.nom ?? null, nomRefuse: p.nomRefuse ?? null,
        ecrans: p.ecrans.length, roles: p.roles.length, questionsOuvertes: p.questionsOuvertes.length,
      })
    }
    const fusion = fusionnerLectures(parties)
    const schemaEntite = projectAirSchema.shape.entities.element
    const declarees = lireEntites(fusion.entites, (e) => schemaEntite.safeParse(e).success)
    const lecture: LectureBrief = {
      // Une seule tranche qui n'aboutit pas, et le résultat le DIT — jamais converti en « reussie ».
      resultat: premierEchec ?? 'reussie',
      tables: declarees.entites.length,
      tentatives,
      tranches: tranches.length,
      tranchesEchouees,
      signesLus: demande.length,
      coutUsd: coutDeLaLecture(),
      jetons: jetonsLus(),
      parTranche,
      roles: fusion.roles,
      ecrans: fusion.ecrans,
      questionsOuvertes: fusion.questionsOuvertes,
      parcours: fusion.parcours ?? [],
      langues: fusion.langues ?? [],
      devises: fusion.devises ?? [],
      moyensPaiement: fusion.moyensPaiement ?? [],
      pays: fusion.pays ?? [],
    }
    return NextResponse.json({
      questionsIA: fusion.questionsIA,
      deduites: fusion.deduites,
      ...(fusion.nomProduit === undefined ? {} : { nomProduit: fusion.nomProduit }),
      entites: declarees.entites,
      entitesRefusees: declarees.refus,
      roles: fusion.roles,
      ecrans: fusion.ecrans,
      questionsOuvertes: fusion.questionsOuvertes,
      lecture,
      ...(premierEchec === null ? {} : { illisible: true, motif: premierEchec === 'tronquee' ? 'La lecture du brief a ete coupee avant la fin : la limite de longueur est atteinte.' : 'La lecture du brief n a rien rendu d exploitable.' }),
    })
  } catch {
    // Ce qui a été dépensé avant l'erreur est dit quand même : une panne ne rend pas la lecture gratuite.
    return NextResponse.json({ deduites: {}, lecture: { resultat: 'erreur', tables: 0, tentatives, tranches: tranches.length, tranchesEchouees: tranches.length, signesLus: demande.length, coutUsd: coutDeLaLecture(), jetons: jetonsLus(), parTranche: [], roles: [], ecrans: [], questionsOuvertes: [] } satisfies LectureBrief })
  }
}
