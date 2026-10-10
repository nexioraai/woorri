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

  /** Le perimetre s'applique aux DEUX selections de candidates — la saisie
   *  (CAS) vise ensuite un id exact, deja filtre ici. */
  const restreindre = (q: any): any => {
    let r = q
    if (perimetre?.proprietaire !== undefined) r = r.eq('owner_email', perimetre.proprietaire)
    if (perimetre?.ligne !== undefined) r = r.eq('id', perimetre.ligne)
    return r
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

  /** LA SAISIE — compare-and-set, deux tentatives : en attente, puis perimee. */
  async function saisir(jeton: string): Promise<Record<string, unknown> | null> {
    const maintenant = new Date().toISOString()
    // ① La plus ancienne ligne en attente.
    const attente = (await restreindre(t().select('id').eq('statut', 'en_attente'))
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
      if (depossede) return { id, issue: 'depossede' }

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
        if (ecrit.data === null || ecrit.data.length === 0) return { id, issue: 'depossede' }
        return { id, issue: 'suspendu', etape: r.etape }
      }

      const res = r.resultat as NonNullable<typeof r.resultat>
      const final = res.ok
        ? {
            statut: 'livree',
            ok: true,
            document: res.document,
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
      const codes = res.diagnostics.map((d) => {
        const chemin = String((d as { path?: unknown }).path ?? '').slice(0, 120)
        return chemin === '' ? (d.code ?? '?') : `${d.code ?? '?'}@${chemin}`
      })
      const ecrit = await ecrire(
        () =>
          t()
            .update({
              ...final,
              diagnostics: !res.ok && res.raison !== undefined ? [res.raison, ...codes] : codes,
              sections_acquises: {
                phase: 'terminee',
                tirages: res.tirages,
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
                ...(res.ok
                  ? {}
                  : {
                      acquis: res.document ?? null,
                      modele: (res as { modele?: unknown }).modele ?? null,
                      premierePasse:
                        (res as { premierePasse?: unknown }).premierePasse ?? null,
                    }),
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
      if (ecrit.data === null || ecrit.data.length === 0) return { id, issue: 'depossede' }
      return { id, issue: res.ok ? 'livree' : 'refusee' }
    } catch (e: unknown) {
      if (depossede) return { id, issue: 'depossede' }
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
      if (ecrit.data === null || ecrit.data.length === 0) return { id, issue: 'depossede' }
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

  return { deposer, tourner }
}
