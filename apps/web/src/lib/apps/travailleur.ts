/**
 * LE TRAVAILLEUR — etage 3 du plan asynchrone (forme validee le 2026-10-08).
 *
 * ── CE QU'IL EST : UN BALAYEUR SANS MEMOIRE.
 *
 * Chaque invocation de `tourner` fait la meme chose, qu'elle vienne du cron
 * ou (plus tard) d'un auto-appel : saisir UNE ligne par compare-and-set,
 * travailler dans un budget temps via `poursuivreEmission`, consigner l'etat
 * en base, lacher. Rien ne vit entre deux invocations ailleurs que dans la
 * table. Supprimez tout declencheur sauf le cron : le systeme reste correct,
 * juste plus lent — c'est la condition posee par le proprietaire.
 *
 * ── LE VERROU, EN DEUX MOITIES.
 *
 * LA SAISIE est un unique `UPDATE … WHERE id = X AND statut = 'en_attente'`
 * (ou battement perime) qui pose d'un meme geste statut, battement et JETON.
 * Un UPDATE mono-instruction est atomique au niveau ligne : si deux
 * invocations visent la meme ligne, un seul WHERE matche, l'autre recoit
 * zero ligne et s'en va.
 *
 * LE JETON DE CLOTURE (fencing) : un travailleur declare mort peut se
 * reveiller apres qu'un autre a repris sa ligne. CHAQUE ecriture porte donc
 * `WHERE jeton_travailleur = <le mien>` — le ressuscite touche zero ligne,
 * comprend qu'il est depossede, et s'arrete AVANT son prochain appel payant.
 *
 * ── L'ISOLATION, PAR IMPOSSIBILITE MECANIQUE.
 *
 * `table` est OBLIGATOIRE et sans defaut ; tout nom qui ne finit pas par
 * `_test` est REFUSE sauf `production: true` explicite — et un cliquet
 * interdit `production: true` hors du futur fichier de route. Ce module ne
 * contient AUCUN nom de table, AUCUN import de base : tout est injecte.
 * A cet etage, aucune route HTTP n'existe : rien en production ne peut
 * invoquer ce code.
 *
 * ── LES ECRITURES NE SONT JAMAIS AVALEES.
 *
 * Le journal de l'etage 1 OBSERVE et avale ses erreurs ; le travailleur
 * AGIT — un point de reprise perdu, c'est de l'argent dont l'etat est perdu.
 * Chaque ecriture est attendue et verifiee : echec → UNE reprise d'ecriture,
 * puis abandon de tranche en laissant la ligne reprenable (battement
 * perimera). Rien d'avale.
 */
import { randomUUID } from 'node:crypto'
import {
  codeEtChemin,
  detailDuDefaut,
  RAISON_ARRET_PROPRIETAIRE,
  TABLE_GENERATIONS,
  TABLE_VERSIONS,
} from './journal'
import { estReprenable, etatDeReprise } from './reprise'
// « Livrée » doit vouloir dire TÉLÉCHARGEABLE. Voir le verdict plus bas.
import { projectAirSchema } from '@deribfy/air-schema'

type Lignes = { data: Record<string, unknown>[] | null; error: { message: string } | null }

/** La surface Supabase dont le travailleur a besoin — injectee, jamais importee. */
export type BaseGeneration = {
  from: (table: string) => {
    select: (colonnes: string) => unknown
    insert: (ligne: Record<string, unknown>) => unknown
    update: (champs: Record<string, unknown>) => unknown
  }
}

export type MoteurContinuation = {
  poursuivreEmission: (o: {
    brief: string
    slug: string
    etat: unknown
    budgetMs: number
  }) => Promise<{
    fini: boolean
    resultat?: {
      ok: boolean
      document?: unknown
      diagnostics: { code?: string; path?: string }[]
      tirages: unknown[]
      /** Volet ① — le journal des tours de reparation (avant/apres, rejets,
       *  revelations, couts). Optionnel : les moteurs scriptes des harnais
       *  n'en rendent pas. */
      tours?: unknown[]
      coutUsd: number
      jetons: { entree: number; sortie: number }
      niveaux?: unknown
      raison?: string
    }
    etat?: {
      acquis: Record<string, unknown>
      tirages: unknown[]
      niveaux: unknown
      coutUsd: number
      jetons: { entree: number; sortie: number }
    } & Record<string, unknown>
    etape?: string
  }>
}

export type RapportTranche = {
  readonly id: string | null
  readonly issue: 'livree' | 'refusee' | 'suspendu' | 'rien' | 'depossede' | 'erreur'
  readonly etape?: string
  readonly detail?: string
  /** TROU COMPTABLE n°2 — le cout REELLEMENT paye par une tranche
   *  DEPOSSEDEE : il ne peut pas aller sur la ligne (le fencing l'interdit,
   *  a raison : elle appartient a un autre), il va au total de la
   *  plateforme. Present uniquement sur `depossede`, et seulement si le
   *  moteur a etiquete un chiffre. */
  readonly coutPerdu?: number
  readonly jetonsPerdus?: { entree: number; sortie: number }
}

export function creerTravailleur({
  table,
  base,
  moteur,
  budgetTrancheMs,
  battementPerimeMs,
  battementRafraichiMs,
  production = false,
  perimetre,
  journaliserOrphelin,
}: {
  table: string
  base: BaseGeneration
  moteur: MoteurContinuation
  budgetTrancheMs: number
  battementPerimeMs: number
  /** Defaut : un tiers de la peremption — trois battements manques avant
   *  qu'un autre puisse saisir. */
  battementRafraichiMs?: number
  production?: boolean
  /** TROU COMPTABLE n°2 — ou va le cout d'une tranche depossedee. INJECTE :
   *  le travailleur reste AVEUGLE a la base (cliquet), il delegue. Absent :
   *  le comportement d'avant, le cout reste perdu (les bancs n'en passent
   *  pas). L'implementation de production ecrit UNE ligne `ai_usage_log`
   *  (`usage_type: 'application_orpheline'`) et JAMAIS app_generations. */
  journaliserOrphelin?: (o: {
    id: string
    coutUsd: number
    jetons: { entree: number; sortie: number }
  }) => Promise<void>
  /** Restreint le BALAYAGE aux lignes d'UN proprietaire (`owner_email`) ou
   *  d'UNE ligne (id exact). Lecon du 2026-10-09 : la purge n'etait pas le
   *  seul chemin de destruction — un balayeur de harnais saisissait la plus
   *  ancienne `en_attente` QUELLE QU'ELLE SOIT, et un moteur scripte aurait
   *  ECRASE une ligne payee garee, par UPDATE legal. Un harnais declare son
   *  perimetre ; la production, elle, balaie tout : option absente. */
  perimetre?: { proprietaire?: string; ligne?: string }
}) {
  // ── LE REFUS QUI REND L'ISOLATION MECANIQUE. Le code de test ne PEUT pas
  // viser la vraie table : il faudrait ecrire `production: true`, et un
  // cliquet l'interdit hors du fichier de route de production.
  if (typeof table !== 'string' || table === '') {
    throw new Error('TRAVAILLEUR_TABLE_REQUISE')
  }
  if (!table.endsWith('_test') && production !== true) {
    throw new Error(
      `TRAVAILLEUR_TABLE_NON_TEST: « ${table} » — seul le chemin de production declare l'option dediee`,
    )
  }
  const rafraichi = battementRafraichiMs ?? Math.max(1, Math.floor(battementPerimeMs / 3))

  // Les requetes passent par la surface injectee ; le `any` de PostgREST est
  // confine ici, derriere des aides qui rendent des formes nettes.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const t = () => base.from(table) as any
  // L'HISTORIQUE vit dans SA table — mesure : ~1 Mo pour neuf suspensions,
  // et l'ecran relit la ligne toutes les cinq secondes. Sur la jumelle de
  // test, la table d'historique suit le meme suffixe.
  const tableVersions = table === TABLE_GENERATIONS ? TABLE_VERSIONS : `${TABLE_VERSIONS}_test`
  const v = () => base.from(tableVersions) as any

  /**
   * GARDER CETTE VERSION — sans jamais casser la tranche qui l'a produite.
   *
   * Un historique est un CONFORT : s'il echoue, la generation continue et
   * on le DIT au serveur. L'inverse — perdre une tranche payee parce que
   * son archivage a rate — serait absurde.
   *
   * Le rang vient d'un COMPTE, pas d'une date : deux suspensions peuvent
   * tomber dans la meme milliseconde, et « revenir a la version 3 » doit
   * designer une seule version. Le fencing garantit un seul travailleur par
   * ligne, donc ce compte ne court aucune concurrence.
   */
  async function garderVersion(
    id: string,
    etat: Record<string, unknown>,
    etape: string | null,
  ): Promise<void> {
    try {
      const deja = (await v().select('id').eq('generation_id', id)) as Lignes
      const rang = (deja.data?.length ?? 0) + 1
      const ecrit = (await v().insert({
        generation_id: id,
        rang,
        etape,
        cout_usd: Number(etat.coutUsd ?? 0),
        etat,
      })) as Lignes
      if (ecrit.error !== null) {
        console.error(`[historique] version ${String(rang)} non gardee : ${ecrit.error.message}`)
      }
    } catch (e) {
      console.error(`[historique] version non gardee : ${e instanceof Error ? e.message : 'inconnue'}`)
    }
  }

  /** Le perimetre s'applique aux DEUX selections de candidates — la saisie
   *  (CAS) vise ensuite un id exact, deja filtre ici. */
  const restreindre = (q: any): any => {
    let r = q
    if (perimetre?.proprietaire !== undefined) r = r.eq('owner_email', perimetre.proprietaire)
    if (perimetre?.ligne !== undefined) r = r.eq('id', perimetre.ligne)
    return r
  }

  /**
   * LA SORTIE DEPOSSEDEE, UNE SEULE FOIS ECRITE (4 sites l'appellent).
   *
   * Le fencing a parle : un autre possede la ligne, et aucune de nos
   * ecritures ne doit l'atteindre. Mais le cout, lui, a ETE paye : il part
   * au total de la plateforme par le journal INJECTE — jamais sur la ligne,
   * jamais compte deux fois (le repreneur, lui, reprend un etat qui ne
   * contient PAS cette tranche : elle n'a jamais ete ecrite).
   */
  const sortirDepossede = async (
    id: string,
    porteur: { coutTrancheUsd?: number; jetonsTranche?: { entree?: number; sortie?: number } } | null,
  ): Promise<RapportTranche> => {
    const coutPerdu = Number(porteur?.coutTrancheUsd ?? 0)
    const jetonsPerdus = {
      entree: Number(porteur?.jetonsTranche?.entree ?? 0),
      sortie: Number(porteur?.jetonsTranche?.sortie ?? 0),
    }
    if (coutPerdu > 0 && journaliserOrphelin !== undefined) {
      try {
        await journaliserOrphelin({ id, coutUsd: coutPerdu, jetons: jetonsPerdus })
      } catch {
        // le journal d'un cout perdu ne doit JAMAIS casser une tranche :
        // on a deja perdu l'argent, on ne perd pas le rapport en plus.
      }
    }
    return coutPerdu > 0
      ? { id, issue: 'depossede', coutPerdu, jetonsPerdus }
      : { id, issue: 'depossede' }
  }

  /** Une ecriture VERIFIEE : une reprise, puis l'echec se dit. */
  const ecrire = async (fabrique: () => PromiseLike<Lignes>): Promise<Lignes> => {
    let r = await fabrique()
    if (r.error !== null) r = await fabrique()
    return r
  }

  /** Depose une demande — une ligne `en_attente`, demande COMPLETE. */
  async function deposer({
    demande,
    nom,
    email,
    proprietaire,
  }: {
    demande: string
    nom: string
    email: string | null
    /** L'IDENTITE (dette 6a) : l'id d'utilisateur du jeton — l'email n'est
     *  qu'une donnee d'affichage. Optionnel : les bancs d'essai n'en ont pas,
     *  et la colonne est nullable tant que le SQL n'est pas re-pose. */
    proprietaire?: string
  }): Promise<string> {
    const r = (await t()
      .insert({
        statut: 'en_attente',
        // La premiere tranche COMMENCE a p0, et la saisie n'ecrit pas
        // d'etape : sans cette ligne, l'ecran montrait « ecrire » pendant
        // que P0 comprenait (audit du 2026-10-10).
        etape: 'p0',
        demande, // JAMAIS tronquee : c'est l'ENTREE du travail, pas un affichage
        nom,
        owner_email: email,
        ...(proprietaire === undefined ? {} : { owner_id: proprietaire }),
        ok: false,
      })
      .select('id')) as Lignes
    if (r.error !== null || r.data === null || r.data.length !== 1) {
      throw new Error(`TRAVAILLEUR_DEPOT_REFUSE: ${r.error?.message ?? 'aucune ligne rendue'}`)
    }
    return String(r.data[0].id)
  }

  /**
   * REPRENDRE UNE LIGNE REFUSEE — sans repayer ce qui est deja ecrit.
   *
   * Les quatre generateurs comparables reprennent tous ; nous etions les
   * seuls a tout refaire. La machinerie existait pourtant : `tourner` lit
   * son etat dans `sections_acquises`. Il manquait de remettre la ligne en
   * attente AVEC un etat que le moteur sache relire — c'est le role de
   * `etatDeReprise`, qui traduit le journal de fin en point de reprise.
   *
   * TROIS GARDES, et chacune ferme une facon de payer deux fois :
   *  ① seul le PROPRIETAIRE reprend sa ligne ;
   *  ② seule une ligne REFUSEE se reprend — une livree est finie, la
   *     relancer serait repayer une application qu'on possede deja ;
   *  ③ compare-and-set sur le statut : deux clics ne produisent qu'UNE
   *     reprise, et le second ne declenche rien.
   *
   * Sans base recuperable, on REFUSE — jamais une generation neuve
   * deguisee en reprise.
   */
  async function reprendre({
    id,
    proprietaire,
  }: {
    id: string
    proprietaire: string
  }): Promise<'reprise' | 'rien_a_reprendre' | 'introuvable'> {
    const lu = (await t()
      .select('id, statut, sections_acquises, cout_usd, jetons_entree, jetons_sortie')
      .eq('id', id)
      .eq('owner_id', proprietaire)
      .limit(1)) as Lignes
    if (lu.error !== null || lu.data === null || lu.data.length !== 1) return 'introuvable'
    const ligne = lu.data[0] as Record<string, unknown>
    if (!estReprenable(ligne.statut, ligne)) return 'rien_a_reprendre'
    const etat = etatDeReprise(ligne)
    if (etat === null) return 'rien_a_reprendre'

    const reprisesAvant = Number(ligne.reprises ?? 0)
    const ecrit = (await t()
      .update({
        statut: 'en_attente',
        // UNE LIGNE REPRISE REPART : sans cette remise a zero, elle
        // retomberait dans l'attente posee par la suspension precedente et
        // le bouton « reprendre » ne ferait visiblement RIEN.
        attente_validation: false,
        etape: 'reparation',
        sections_acquises: etat,
        ok: false,
        document: null,
        battement: null,
        jeton_travailleur: null,
        reprises: Number.isFinite(reprisesAvant) ? reprisesAvant + 1 : 1,
      })
      .eq('id', id)
      .eq('owner_id', proprietaire)
      .eq('statut', 'refusee')
      .select('id')) as Lignes
    if (ecrit.error !== null || ecrit.data === null || ecrit.data.length === 0) {
      return 'rien_a_reprendre'
    }
    return 'reprise'
  }

  /**
   * ARRETER — le proprietaire coupe une generation qui tourne.
   *
   * ── POURQUOI CE GESTE N'EXISTAIT PAS, ET CE QUE CA A COUTE.
   *
   * MESURE DU 2026-10-15 : une generation a tourne 1 h 10 en boucle a vide.
   * Le proprietaire ne pouvait RIEN faire — l'ecran ne portait aucun bouton,
   * et la seule facon de l'arreter a ete que j'ecrive en base a sa place.
   * Personne ne doit dependre de moi pour stopper une panne.
   *
   * Compare-and-set sur le statut : une ligne deja terminee n'est pas
   * re-ecrite, et deux clics n'arretent qu'une fois. Le travail en vol n'est
   * pas tue — on ne peut pas tuer une fonction distante — mais la ligne
   * cesse d'etre saisissable, donc le prochain cron ne la reprendra pas.
   */
  async function arreter({
    id,
    proprietaire,
  }: {
    id: string
    proprietaire: string
  }): Promise<'arretee' | 'rien_a_arreter'> {
    const ecrit = (await t()
      .update({
        statut: 'refusee',
        ok: false,
        etape: null,
        diagnostics: [RAISON_ARRET_PROPRIETAIRE],
      })
      .eq('id', id)
      .eq('owner_id', proprietaire)
      .in('statut', ['en_attente', 'en_cours'])
      .select('id')) as Lignes
    return ecrit.error === null && ecrit.data !== null && ecrit.data.length === 1
      ? 'arretee'
      : 'rien_a_arreter'
  }

  /**
   * RELANCER — repartir de la MEME demande, dans une ligne NEUVE.
   *
   * Ce n'est PAS une reprise : une reprise repart de ce qui est deja ecrit,
   * et une ligne morte en P0 n'a rien d'ecrit — `estReprenable` la refuse,
   * donc aucun bouton n'apparaissait et le proprietaire restait coince.
   *
   * La demande est relue EN BASE, jamais renvoyee par l'ecran : le cahier
   * des charges ne refait pas l'aller-retour, et une ligne relancee porte
   * exactement le texte d'origine — pas une version re-saisie.
   *
   * HONNETE SUR LE PRIX : une relance est un travail NEUF, donc un cout
   * neuf. Elle ne se declenche que sur un geste explicite.
   */
  async function relancer({
    id,
    proprietaire,
  }: {
    id: string
    proprietaire: string
  }): Promise<{ id: string } | 'introuvable'> {
    const lu = (await t()
      .select('demande, nom, owner_email')
      .eq('id', id)
      .eq('owner_id', proprietaire)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: unknown }
    const ligne = lu.data
    if (lu.error !== null || ligne === null) return 'introuvable'
    const demande = typeof ligne.demande === 'string' ? ligne.demande : ''
    if (demande.trim() === '') return 'introuvable'
    const neuf = await deposer({
      demande,
      nom: typeof ligne.nom === 'string' ? ligne.nom : 'application',
      email: typeof ligne.owner_email === 'string' ? ligne.owner_email : null,
      proprietaire,
    })
    return { id: neuf }
  }

  /**
   * CONTINUER — le proprietaire a vu, et il dit d'avancer.
   *
   * C'est l'autre moitie du « mode plan » et du pas-a-pas : la suspension
   * POSE l'attente, ce geste la LEVE. Rien d'autre ne bouge — l'acquis, le
   * cout et les tirages restent ou ils sont ; seule la ligne redevient
   * saisissable.
   *
   * Compare-and-set sur le drapeau lui-meme : deux clics ne relancent
   * qu'une fois, et le second ne declenche rien.
   */
  async function continuer({
    id,
    proprietaire,
  }: {
    id: string
    proprietaire: string
  }): Promise<'repartie' | 'rien_a_continuer'> {
    const ecrit = (await t()
      .update({ attente_validation: false })
      .eq('id', id)
      .eq('owner_id', proprietaire)
      .eq('attente_validation', true)
      .select('id')) as Lignes
    return ecrit.error === null && ecrit.data !== null && ecrit.data.length === 1
      ? 'repartie'
      : 'rien_a_continuer'
  }

  /**
   * REVENIR A UNE VERSION — gratuitement, comme chez Bolt.
   *
   * « Restaurer une version precedente ne consomme aucun jeton » : c'est
   * une ecriture en base, rien d'autre. La ligne reprend l'etat archive et
   * redevient saisissable ; tout ce qui avait ete produit APRES est
   * abandonne, ce qui est exactement ce qu'on demande en revenant en
   * arriere.
   *
   * L'historique, lui, n'est PAS tronque : les versions suivantes restent
   * lisibles. Revenir en arriere ne doit pas detruire ce qu'on quitte —
   * c'est toute la difference avec ce que faisait ce depot jusqu'ici.
   */
  async function revenirAVersion({
    id,
    rang,
    proprietaire,
  }: {
    id: string
    rang: number
    proprietaire: string
  }): Promise<'revenue' | 'introuvable'> {
    const possede = (await t()
      .select('id')
      .eq('id', id)
      .eq('owner_id', proprietaire)
      .limit(1)) as Lignes
    if (possede.error !== null || possede.data === null || possede.data.length !== 1) {
      return 'introuvable'
    }
    const lu = (await v()
      .select('etat, etape')
      .eq('generation_id', id)
      .eq('rang', rang)
      .limit(1)) as Lignes
    if (lu.error !== null || lu.data === null || lu.data.length !== 1) return 'introuvable'
    const version = lu.data[0] as Record<string, unknown>

    const ecrit = (await t()
      .update({
        statut: 'en_attente',
        // ON REVIENT POUR REGARDER, pas pour relancer : la ligne attend de
        // nouveau votre accord. Repartir toute seule apres un retour en
        // arriere serait la derniere chose a faire.
        attente_validation: true,
        etape: version.etape ?? null,
        sections_acquises: version.etat,
        ok: false,
        document: null,
        battement: null,
        jeton_travailleur: null,
      })
      .eq('id', id)
      .eq('owner_id', proprietaire)
      .select('id')) as Lignes
    return ecrit.error === null && ecrit.data !== null && ecrit.data.length === 1
      ? 'revenue'
      : 'introuvable'
  }

  /** LA SAISIE — compare-and-set, deux tentatives : en attente, puis perimee. */
  async function saisir(jeton: string): Promise<Record<string, unknown> | null> {
    const maintenant = new Date().toISOString()
    // ① La plus ancienne ligne en attente.
    // `attente_validation` ECARTE la ligne : elle est en attente de
    // l'HUMAIN, pas d'un travailleur. Les deux branches de saisie le
    // respectent — sinon la reprise des lignes perimees la ramasserait par
    // la porte de derriere.
    const attente = (await restreindre(t().select('id').eq('statut', 'en_attente'))
      .eq('attente_validation', false)
      .order('created_at', { ascending: true })
      .limit(1)) as Lignes
    const candidate = attente.data?.[0]?.id
    if (candidate !== undefined) {
      const prise = (await t()
        .update({ statut: 'en_cours', battement: maintenant, jeton_travailleur: jeton })
        .eq('id', candidate)
        .eq('statut', 'en_attente') // la condition et l'ecriture sont la MEME instruction
        .select('*')) as Lignes
      if (prise.data !== null && prise.data.length === 1) return prise.data[0]
    }
    // ② Sinon, une ligne en cours dont le coeur a cesse de battre.
    const seuil = new Date(Date.now() - battementPerimeMs).toISOString()
    const mortes = (await restreindre(t().select('id').eq('statut', 'en_cours'))
      .eq('attente_validation', false)
      .lt('battement', seuil)
      .order('battement', { ascending: true })
      .limit(1)) as Lignes
    const morte = mortes.data?.[0]?.id
    if (morte !== undefined) {
      const prise = (await t()
        .update({ statut: 'en_cours', battement: maintenant, jeton_travailleur: jeton })
        .eq('id', morte)
        .eq('statut', 'en_cours')
        .lt('battement', seuil) // le CAS re-verifie la peremption DANS l'UPDATE
        .select('*')) as Lignes
      if (prise.data !== null && prise.data.length === 1) return prise.data[0]
    }
    return null
  }

  /** Une tranche sur UNE ligne saisie. */
  async function travailler(ligne: Record<string, unknown>, jeton: string): Promise<RapportTranche> {
    const id = String(ligne.id)
    const brutEtat = ligne.sections_acquises
    const etat =
      brutEtat !== null && typeof brutEtat === 'object' && Object.keys(brutEtat).length > 0
        ? brutEtat
        : null

    // ── LE COEUR BAT PENDANT LA TRANCHE, garde par le jeton. S'il cesse de
    // toucher une ligne, un autre nous a depossede : on le note, et la
    // prochaine ecriture — AVANT tout appel payant suivant — s'arretera.
    let depossede = false
    const minuterie = setInterval(() => {
      void (async () => {
        const b = (await t()
          .update({ battement: new Date().toISOString() })
          .eq('id', id)
          .eq('jeton_travailleur', jeton)
          .select('id')) as Lignes
        // ── SEULE UNE REPONSE PROPRE A ZERO LIGNE CERTIFIE LA DEPOSSESSION.
        //
        // MESURE (tir 0234da42) : une erreur passagere du battement rendait
        // `data: null` — et ce test concluait « depossede ». La tranche a
        // alors JETE 333 secondes de reparation payee, sans ecrire, et la
        // ligne est restee figee `en_cours` jusqu'a peremption. Une ecriture
        // en echec ne prouve RIEN : le battement suivant retentera ; c'est
        // la reponse SANS erreur et sans ligne qui dit « un autre detient le
        // jeton ».
        if (b.error === null && (b.data === null || b.data.length === 0)) depossede = true
      })()
    }, rafraichi)

    try {
      const r = await moteur.poursuivreEmission({
        brief: String(ligne.demande),
        slug: `gen-${id.slice(0, 8)}`,
        etat,
        budgetMs: budgetTrancheMs,
      })
      // Depossede PENDANT la tranche (battement sans effet) : ce que le
      // moteur vient de rendre porte le cout de la tranche — il part en
      // orphelin, la ligne n'est pas touchee.
      if (depossede) {
        return await sortirDepossede(
          id,
          (r.resultat ?? r.etat ?? null) as Parameters<typeof sortirDepossede>[1],
        )
      }

      if (!r.fini) {
        const e = r.etat as NonNullable<typeof r.etat>
        // ── LA SUSPENSION RELACHE LE VERROU, et V3 l'a exige : ma premiere
        // version laissait la ligne `en_cours` avec un battement FRAIS — le
        // balayeur suivant n'avait donc rien a saisir, et chaque tranche
        // aurait attendu la peremption entiere (dix minutes en production)
        // avant la suivante. Mesure sur la jumelle : « suspendu → rien »,
        // ligne figee `en_cours`.
        //
        // La semantique juste : le verrou n'est tenu QUE pendant une tranche.
        // `en_cours` = un travailleur y est EN CE MOMENT ; suspendu = la
        // ligne redevient `en_attente`, acquis conserves, saisissable par le
        // tick suivant. `en_cours` au battement perime ne reste que pour les
        // travailleurs MORTS en pleine tranche.
        const ecrit = await ecrire(
          () =>
            t()
              .update({
                statut: 'en_attente',
                // ── LA LIGNE ATTEND L'HUMAIN, elle ne repart pas seule.
                //
                // C'est le « mode plan » et le pas-a-pas d'un seul geste :
                // le moteur a suspendu, l'acquis est sauf, et c'est au
                // proprietaire de dire si on continue. Sans ce drapeau la
                // ligne redevenait saisissable au tick suivant et la
                // generation allait jusqu'au bout — jusqu'a la facture —
                // sans que personne n'ait rien valide.
                // ── ET SEULEMENT QUAND IL Y A QUELQUE CHOSE A VALIDER.
                //
                // Le moteur distingue desormais deux suspensions : celle qui
                // DECIDE (on s'apprete a depenser pour ecrire l'application)
                // et celle qui RANGE une mesure et rend la main. La seconde
                // ne doit pas faire cliquer le proprietaire sur un arret qui
                // ne lui demande rien.
                //
                // Defaut PRUDENT : sans reponse du moteur, on attend l'accord.
                attente_validation: (r as { accordRequis?: boolean }).accordRequis !== false,
                battement: null,
                jeton_travailleur: null,
                sections_acquises: e,
                etape: r.etape ?? null,
                cout_usd: e.coutUsd,
                jetons_entree: e.jetons.entree,
                jetons_sortie: e.jetons.sortie,
                tirages: e.tirages.length,
                niveaux_sondes: e.niveaux ?? null,
              })
              .eq('id', id)
              .eq('jeton_travailleur', jeton)
              .select('id') as PromiseLike<Lignes>,
        )
        if (ecrit.error !== null) return { id, issue: 'erreur', detail: ecrit.error.message }
        if (ecrit.data === null || ecrit.data.length === 0) {
          // l'etiquette de cout voyage sur l'enveloppe OU dans l'etat selon
          // la sortie du moteur : on lit les deux, l'enveloppe d'abord.
          const enveloppe = r as Parameters<typeof sortirDepossede>[1]
          const dansEtat = e as unknown as Parameters<typeof sortirDepossede>[1]
          return await sortirDepossede(
            id,
            enveloppe?.coutTrancheUsd !== undefined ? enveloppe : dansEtat,
          )
        }
        // L'ARCHIVE APRES L'ECRITURE DE LA LIGNE, jamais avant : on
        // n'historise que ce qui est reellement enregistre.
        await garderVersion(id, e as Record<string, unknown>, r.etape ?? null)
        return { id, issue: 'suspendu', etape: r.etape }
      }

      const res = r.resultat as NonNullable<typeof r.resultat>

      // ════════════════════════════════════════════════════════════════
      //  ON LIVRE CE QUI EXISTE. ON NE REFUSE QUE S'IL N'Y A RIEN.
      // ════════════════════════════════════════════════════════════════
      //
      // ── CE QUE CES QUATRE LIGNES ONT COÛTÉ, MESURÉ.
      //
      // Elles disaient : s'il reste UN diagnostic, `document: null`. Or le
      // moteur REND un document (`document: air ?? document`). L'application
      // existait, en mémoire, à chaque tir — et cette ligne la jetait.
      //
      // Douze générations sur le cahier CONTERAK, ~29 $ dépensés, un
      // meilleur tir à 22 sections sur 22, et le propriétaire n'a JAMAIS vu
      // une application. Pas parce que le moteur ne savait pas en faire :
      // parce qu'on détruisait celles qu'il faisait.
      //
      // ── C'EST UN CHANGEMENT DE DOCTRINE, PAS UNE CORRECTION DE BOGUE.
      //
      // La doctrine d'avant est écrite dans `pour.ts` : « un partiel gardé ne
      // peut pas être servi comme une application finie ». Elle est
      // défendable, et elle a tenu tant qu'on croyait qu'un tir propre
      // arriverait. Au bout de deux mois, elle ne protège plus personne :
      // elle garantit le vide.
      //
      // DÉCISION DU PROPRIÉTAIRE, 2026-10-16 : les juges perdent le droit de
      // VETO, ils gardent le droit de PAROLE. Leur verdict voyage avec
      // l'application au lieu de l'empêcher.
      //
      // ── CE QUI N'EST PAS ASSOUPLI, ET C'EST L'ESSENTIEL.
      //
      // Aucune règle n'est touchée. Aucun juge n'est désarmé. `ok` porte
      // TOUJOURS leur verdict exact, `diagnostics` porte TOUJOURS la liste
      // complète, `defauts` porte TOUJOURS le détail. Une application livrée
      // avec `ok: false` est une application dont on SAIT ce qui cloche —
      // c'est strictement plus d'information qu'une ligne vide.
      //
      // ── ET LE REFUS GARDE UN SENS : quand il n'y a RIEN.
      //
      // Quand P0 refuse ses trois tentatives, le moteur ne rend aucun
      // document — pas un document imparfait, RIEN. Refuser y est honnête :
      // on ne peut pas livrer une œuvre qui n'existe pas. C'est la seule
      // porte qui reste.
      //
      // La contrainte de base le permet : `check (statut <> 'livree' or
      // document is not null)` ne dit que « une livrée porte un document ».
      // Elle n'a jamais exigé qu'une imparfaite soit détruite.
      // ── « LIVRÉE » DOIT VOULOIR DIRE TÉLÉCHARGEABLE.
      //
      // Le moteur rend `air ?? document` : le premier est validé, le second
      // est le candidat du dernier tour. Déclarer « livrée » sur un candidat
      // qui ne se parse pas donnerait une erreur 500 au moment du
      // téléchargement — une application promise qu'on ne peut pas prendre
      // est pire qu'un refus franc.
      //
      // On parse donc AVANT de promettre. Ce qui ne se parse pas n'est pas
      // une œuvre : ça reste une base, rangée dans `acquis`, et la ligne est
      // refusée — honnêtement, parce qu'il n'y a rien à livrer.
      // ── ET ON NE RE-JUGE PAS CE QUE LE MOTEUR A VALIDE.
      //
      // Ma premiere version parsait TOUT, y compris les resultats `ok`. Un
      // cliquet l'a attrapee : un moteur qui dit « conforme » a deja
      // valide, et lui opposer un second juge, c'est recreer le verrou
      // qu'on vient d'enlever — a un autre etage.
      //
      // Le parse ne sert donc qu'aux cas A RESERVES : c'est la que personne
      // n'a verifie que l'oeuvre est prenable.
      const brut = res.document ?? null
      const lisible =
        brut !== null && (res.ok || projectAirSchema.safeParse(brut).success)

      // ════════════════════════════════════════════════════════════════
      //  LOT 2 — LES JUGES REÇOIVENT DES YEUX.
      // ════════════════════════════════════════════════════════════════
      //
      // ── CE QU'AUCUN JUGE NE VOYAIT, ET QUI SE MESURE.
      //
      // Les cinq juges d'acceptation lisent le DOCUMENT. Aucun ne compile.
      // Un document peut donc être valide, passer tous les juges, et ne pas
      // produire d'application — personne ne s'en apercevrait avant que le
      // propriétaire clique sur « télécharger » et reçoive une erreur 500.
      //
      // Mesuré : `compileProject` et `compileWeb` ne sont appelés nulle part
      // pendant la génération. Ils le sont à la LIVRAISON et à l'APERÇU,
      // c'est-à-dire devant l'utilisateur.
      //
      // ── POURQUOI C'EST FAISABLE ICI, ET GRATUIT.
      //
      // La compilation est PURE : aucun réseau, aucun fichier, aucun appel
      // payant. Elle tourne dans cette fonction comme elle tourne dans la
      // route de livraison, qui l'appelle déjà. Coût mesuré sur une
      // application réelle : moins d'une seconde pour 83 fichiers.
      //
      // ── ET « TÉLÉCHARGEABLE » DEVIENT VRAI, PAS ESPÉRÉ.
      //
      // Le LOT 1 parsait le document. Parser dit « la forme est bonne ».
      // Compiler dit « l'application existe ». C'est ce second mot qui
      // intéresse quelqu'un qui attend depuis deux mois.
      let compile: { ok: true } | { ok: false; grief: string } = { ok: true }
      if (lisible && brut !== null) {
        try {
          const { compileProject } = await import('@deribfy/compiler')
          const sortie = compileProject(brut)
          if (sortie.files.size === 0) {
            compile = { ok: false, grief: 'compilation vide : aucun fichier émis' }
          }
        } catch (e: unknown) {
          // L'ERREUR EST NOMMÉE, PAS AVALÉE. `EmitError` porte son code et
          // son chemin ; une erreur anonyme porte au moins son message.
          const m = e as { code?: string; path?: string; message?: string }
          compile = {
            ok: false,
            grief: `COMPILE_${m.code ?? 'ERREUR'}@${(m.path ?? '').slice(0, 80)} ${(m.message ?? String(e)).slice(0, 160)}`,
          }
        }
      }

      const aUneOeuvre = lisible && compile.ok
      const oeuvre = aUneOeuvre ? brut : null
      const final = aUneOeuvre
        ? {
            statut: 'livree',
            // Le verdict des juges, INTACT. Livrée ne veut pas dire conforme.
            ok: res.ok,
            document: oeuvre,
            etape: null,
          }
        : {
            statut: 'refusee',
            ok: false,
            document: null,
            etape: null,
          }
      // ── TROUS n°2 ET n°3 DU PREMIER TIR REEL.
      //
      // ② La ligne refusee etait MUETTE : le refus P0 porte sa cause dans
      // `raison`, pas dans `diagnostics` — et seul le second etait ecrit.
      // La raison OUVRE desormais la liste : l'ecran a quelque chose a dire.
      // ③ Le detail des tirages (arrets, diagnostics, reparations) vivait
      // dans l'etat et mourait avec le dernier write : impossible de dire
      // POURQUOI P0 a refuse sans re-payer. Il persiste dans
      // `sections_acquises` — la colonne du point de reprise devient, une
      // fois la ligne terminee, son JOURNAL : phase `terminee`, aucune
      // nouvelle colonne, aucun SQL a re-poser.
      // ── CODE@CHEMIN, PAS LE CODE SEUL. Tir n°4 : trois SCHEMA en base
      // conservee, et impossible de dire OU ils tombent — les chemins
      // mouraient ici, dans ce map. Diagnostiquer exigeait de re-payer un
      // tir entier. Le chemin est borne a 120 caracteres : il localise, il
      // ne transporte pas un document.
      // LE FORMAT VIT DANS `journal.ts`, appele par les DEUX chemins.
      const codes = res.diagnostics.map(codeEtChemin)
      const ecrit = await ecrire(
        () =>
          t()
            .update({
              ...final,
              // LE GRIEF DE COMPILATION OUVRE LA LISTE quand il existe : il
              // explique à lui seul pourquoi une œuvre lisible n'est pas
              // livrable, et c'est la première chose à lire.
              diagnostics: [
                ...(compile.ok ? [] : [compile.grief]),
                ...(!res.ok && res.raison !== undefined ? [res.raison] : []),
                ...codes,
              ],
              sections_acquises: {
                phase: 'terminee',
                tirages: res.tirages,
                // ── LE DETAIL DE CHAQUE DEFAUT, ET PAS SEULEMENT SON CODE.
                //
                // `diagnostics` ne garde que `CODE@chemin` : pour un defaut
                // de schema cela donne `SCHEMA@entities.1.fields.2` — on sait
                // OU, jamais QUOI. Le message de zod porte le fait, et il
                // existe deja sur le diagnostic ; il mourait dans le `map`
                // au-dessus. Champ ADDITIF : `diagnostics` garde son contrat.
                //
                // Ce qui n'y est PAS, et pourquoi : `issue.code`
                // (`unrecognized_keys`…) et `issue.keys` sont jetes dans
                // `acceptation.mjs`, module SCELLE. On ne l'ouvre pas.
                defauts: res.diagnostics.map(detailDuDefaut),
                // Volet ① : POURQUOI chaque tour a retenu, rejete ou stagne —
                // lisible dans la ligne, sans re-payer.
                tours: res.tours ?? [],
                niveaux: res.niveaux ?? null,
                // ── LA BASE SURVIT AU REFUS (3e chemin de perte, ferme le
                // 2026-10-09). Cette ecriture JETAIT acquis et modele : la
                // ligne a8b12457 (10,61 $, base elargie + 79 diagnostics
                // connus) est devenue IRRESSUSCITABLE a l'instant meme du
                // refus — le moteur rendait pourtant les deux. Une refusee
                // porte desormais sa base : une resurrection repart d'ici,
                // sans re-payer l'emission. (La COLONNE document reste nulle :
                // la contrainte livree_a_document dit qu'un refus n'a pas
                // d'oeuvre a livrer — la base n'est pas une oeuvre.)
                // ── LA BASE DE REPRISE, ET CE QUI A CHANGÉ.
                //
                // `acquis` existait pour qu'un REFUS puisse ressusciter sans
                // re-payer. Depuis que toute œuvre est livrée, le document
                // vit dans sa propre colonne : le recopier ici doublerait un
                // JSON de plusieurs centaines de kilo-octets pour rien.
                //
                // `modele` et `premierePasse` restent dans les DEUX cas :
                // ils ne sont pas l'œuvre, ils sont de quoi la REPRENDRE —
                // une application livrée avec réserves se répare aussi.
                ...(aUneOeuvre ? {} : { acquis: brut }),
                modele: (res as { modele?: unknown }).modele ?? null,
                premierePasse: (res as { premierePasse?: unknown }).premierePasse ?? null,
              },
              cout_usd: res.coutUsd,
              jetons_entree: res.jetons.entree,
              jetons_sortie: res.jetons.sortie,
              tirages: res.tirages.length,
              niveaux_sondes: res.niveaux ?? null,
              duree_ms: Date.now() - new Date(String(ligne.created_at)).getTime(),
            })
            .eq('id', id)
            .eq('jeton_travailleur', jeton)
            .select('id') as PromiseLike<Lignes>,
      )
      if (ecrit.error !== null) return { id, issue: 'erreur', detail: ecrit.error.message }
      if (ecrit.data === null || ecrit.data.length === 0) {
        return await sortirDepossede(id, res as Parameters<typeof sortirDepossede>[1])
      }
      return { id, issue: aUneOeuvre ? 'livree' : 'refusee' }
    } catch (e: unknown) {
      // Depossede ET en erreur : l'erreur porte l'etiquette de cout (4e
      // chemin) — meme traitement, le cout part en orphelin.
      if (depossede) {
        return await sortirDepossede(id, e as Parameters<typeof sortirDepossede>[1])
      }
      // ── ECHEC EN PLEINE TRANCHE. Le partiel voyage avec l'erreur (D-103) ;
      // il est replie dans l'etat, et la ligne redevient saisissable TOUT DE
      // SUITE (`en_attente`) plutot que d'attendre la peremption. Trois
      // echecs → refusee, en disant pourquoi.
      const messageErreur = e instanceof Error ? e.message : String(e)
      // ── FATALE OU TRANSITOIRE : L'ETIQUETTE DU MOTEUR FAIT FOI.
      //
      // Tir n°6 : un 400 de facturation retente deux fois — un solde epuise
      // ne se repare pas en reessayant, les reprises etaient du temps perdu.
      // Le moteur etiquette (`transitoire: false` = certifie non transitoire)
      // et le travailleur obeit : refusee IMMEDIATE, en disant pourquoi.
      // Une erreur NON etiquetee (origine inconnue) garde les reprises.
      const fatale = (e as { transitoire?: boolean }).transitoire === false
      const partiel = (e as { assemblagePartiel?: Record<string, unknown> }).assemblagePartiel
      // ── LE COUT DE LA TRANCHE MORTE EST REPLIE — dans la COLONNE et dans
      // `etat.coutUsd`, ENSEMBLE. Mordu deux fois (tir 6, reprise a8b12457 :
      // ~1,5-2,5 $ invisibles) : ne replier que la colonne la ferait ECRASER
      // a la suspension suivante, qui recalcule depuis etat.coutUsd. Une
      // erreur non etiquetee vaut zero : rien ne change pour elle.
      const facture = e as {
        coutTrancheUsd?: number
        jetonsTranche?: { entree?: number; sortie?: number }
      }
      const coutTranche = Number(facture.coutTrancheUsd ?? 0)
      const entreeTranche = Number(facture.jetonsTranche?.entree ?? 0)
      const sortieTranche = Number(facture.jetonsTranche?.sortie ?? 0)
      // ── 4e CHEMIN DE PERTE, FERME : si l'erreur porte l'ETAT COMPLET du
      // moteur (modele, tours, tirages, niveaux — ce que la suspension
      // ecrit), il FAIT FOI : une erreur avant toute suspension ne tue plus
      // le P0 paye. Son coutUsd est deja CUMULATIF (tranche comprise) — on
      // ne rajoute pas coutTranche par-dessus : ce serait compter double.
      const complet = (e as { etatComplet?: Record<string, unknown> }).etatComplet
      const stocke = (etat ?? {}) as Record<string, unknown>
      const avant = { ...stocke, ...(complet ?? {}) }
      const acquisAvant = (stocke.acquis ?? {}) as Record<string, unknown>
      const jetonsAvant = (avant.jetons ?? {}) as { entree?: number; sortie?: number }
      const coutEtat =
        complet !== undefined
          ? Number(Number(avant.coutUsd ?? 0).toFixed(6))
          : Number((Number(avant.coutUsd ?? 0) + coutTranche).toFixed(6))
      const jetonsEtat =
        complet !== undefined
          ? { entree: Number(jetonsAvant.entree ?? 0), sortie: Number(jetonsAvant.sortie ?? 0) }
          : {
              entree: Number(jetonsAvant.entree ?? 0) + entreeTranche,
              sortie: Number(jetonsAvant.sortie ?? 0) + sortieTranche,
            }
      const nouvelEtat = {
        ...avant,
        phase: avant.phase ?? 'emission',
        acquis: { ...acquisAvant, ...(partiel?.document ?? partiel ?? {}) },
        coutUsd: coutEtat,
        jetons: jetonsEtat,
      }
      const comptage = {
        cout_usd: Number(coutEtat.toFixed(4)),
        jetons_entree: jetonsEtat.entree,
        jetons_sortie: jetonsEtat.sortie,
      }
      const reprises = Number(ligne.reprises ?? 0) + 1
      const champs =
        fatale || reprises >= 3
          ? {
              statut: 'refusee',
              ok: false,
              // L'etat (acquis + cout) est conserve MEME sur refusee : une
              // ligne refusee reste ressuscitable sans rien perdre.
              sections_acquises: nouvelEtat,
              ...comptage,
              diagnostics: [
                fatale
                  ? `erreur fatale (non transitoire) : ${messageErreur.slice(0, 160)}`
                  : `echec repete x${String(reprises)}: ${messageErreur.slice(0, 160)}`,
              ],
            }
          : {
              statut: 'en_attente',
              battement: null,
              jeton_travailleur: null,
              sections_acquises: nouvelEtat,
              ...comptage,
            }
      const ecrit = await ecrire(
        () =>
          t()
            .update({ ...champs, reprises })
            .eq('id', id)
            .eq('jeton_travailleur', jeton)
            .select('id') as PromiseLike<Lignes>,
      )
      if (ecrit.data === null || ecrit.data.length === 0) {
        return await sortirDepossede(id, e as Parameters<typeof sortirDepossede>[1])
      }
      return {
        id,
        issue: fatale || reprises >= 3 ? 'refusee' : 'erreur',
        detail: messageErreur.slice(0, 200),
      }
    } finally {
      clearInterval(minuterie)
    }
  }

  /** Une invocation de balayeur : au plus `maxLignes` tranches. */
  async function tourner({ maxLignes = 1 }: { maxLignes?: number } = {}): Promise<RapportTranche[]> {
    const rapports: RapportTranche[] = []
    for (let i = 0; i < maxLignes; i++) {
      const jeton = randomUUID()
      const ligne = await saisir(jeton)
      if (ligne === null) {
        rapports.push({ id: null, issue: 'rien' })
        break
      }
      rapports.push(await travailler(ligne, jeton))
    }
    return rapports
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return { arreter, continuer, deposer, relancer, reprendre, revenirAVersion, tourner }
}
