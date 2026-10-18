/**
 * ETAGE 4 — LE SERVICE DES GENERATIONS, TESTABLE SANS UN CENTIME.
 *
 * ── POURQUOI UN SERVICE ET PAS DU CODE DANS LES ROUTES.
 *
 * Les routes Next importent `supabaseAdmin` au niveau module : les tester
 * exigerait de bouchonner des modules. Ici TOUT est injecte — la base, le
 * travailleur, l'environnement — et chaque chemin se prouve avec le harnais
 * maison et un moteur scripte. Les routes ne sont que des coutures.
 *
 * ── LA GARANTIE DE DEPENSE, MECANIQUE.
 *
 * `tournerUneTranche` verifie GO_EMISSION_IA AVANT de toucher quoi que ce
 * soit : desarme (defaut livre), il rend `desarme` sans UN appel a la base
 * ni au moteur — prouve par un harnais qui compte les appels. Meme deploye,
 * l'etage 4 ne PEUT pas depenser tant que le proprietaire n'arme pas.
 */
import { createHash } from 'node:crypto'
import type { creerTravailleur, RapportTranche } from './travailleur'
import { diagnosticsDepuisLigne, RAISON_ARRET_PROPRIETAIRE, TABLE_VERSIONS } from './journal'
import { questionsPour, type Question, fautesDeProduction } from './dialogue'
import { estReprenable } from './reprise'
import { journalDesTirages, type LigneTirage } from './journal-tirages'

type Travailleur = ReturnType<typeof creerTravailleur>

/** Depose une demande — une ligne `en_attente`, AUCUN moteur lance. Le
 *  travailleur recu par la route porte un moteur SENTINELLE qui jette :
 *  si un depot lancait une emission, le test le verrait exploser. */
export async function deposerGeneration({
  travailleur,
  demande,
  nom,
  email,
  proprietaire,
}: {
  travailleur: Pick<Travailleur, 'deposer'>
  demande: string
  nom: string
  email: string | null
  /** L'identite du jeton (dette 6a) — l'email n'est qu'un affichage. */
  proprietaire: string
}): Promise<string> {
  const propre = demande.trim()
  if (propre === '') throw new Error('DEMANDE_VIDE')
  return travailleur.deposer({ demande: propre, nom, email, proprietaire })
}

/**
 * Une tranche du cron. L'ordre des gardes EST la garantie :
 * ① kill-switch (zero appel de quoi que ce soit s'il est desarme) ;
 * ② puis seulement le balayage, qui peut payer.
 */
export async function tournerUneTranche({
  travailleur,
  env,
}: {
  travailleur: Pick<Travailleur, 'tourner'>
  env: Record<string, string | undefined>
}): Promise<{ desarme: boolean; rapports: readonly RapportTranche[] }> {
  if (env.GO_EMISSION_IA !== '1') {
    return { desarme: true, rapports: [] }
  }
  return { desarme: false, rapports: await travailleur.tourner() }
}

/**
 * LA TRADUCTION DES REFUS — l'utilisateur ne voit JAMAIS les entrailles.
 *
 * Mesure (audit du 2026-10-10) : la raison brute portait le jargon du
 * moteur (« filet anti-boucle », ids internes) et, PIRE, le JSON brut du
 * fournisseur avec l'etat du credit API du proprietaire. Regle absolue :
 * deux messages utilisateur, pas un de plus — le detail complet reste en
 * admin. Par defaut (raison inconnue) : le message generique, jamais le
 * brut — fail-closed.
 */
/**
 * LA MARCHE OU LE REFUS A EU LIEU — deduite de l'ARTEFACT, jamais devinee.
 *
 * MESURE (capture du 2026-10-15) : le travailleur ecrit `etape: null` en
 * meme temps que `statut: 'refusee'`, et l'ecran figeait alors la marche a
 * « Verifier et reparer ». Le tir mesure etait mort en P0 : l'ecran
 * affichait DEUX marches vertes — « Comprendre la demande » et « Ecrire
 * l'application » — qui n'avaient jamais eu lieu, sur une ligne portant
 * `sections=0` et `modele: null`.
 *
 * La ligne, elle, sait : pas de modele et rien d'acquis = P0 n'a jamais
 * abouti. Sinon des sections existent, et l'ecriture avait commence.
 */
export function etapeDuRefus(statut: string, sa: Record<string, unknown>): string | null {
  if (statut !== 'refusee') return null
  const sansModele = sa.modele === null || sa.modele === undefined
  const sansAcquis = sa.acquis === null || sa.acquis === undefined
  return sansModele && sansAcquis ? 'p0' : null
}

export const RAISON_TECHNIQUE = 'Une erreur technique est survenue. Réessayez dans un moment.'

/**
 * ── « REESSAYEZ » QUAND REESSAYER NE DONNERA RIEN (defaut 2026-10-15).
 *
 * MESURE, capture a l'appui : la generation arrivee a 22/22 s'est arretee
 * sur « Your credit balance is too low ». L'ecran affichait « Une erreur
 * technique est survenue. Reessayez dans un moment. » — le proprietaire
 * pouvait cliquer dix fois pour rien.
 *
 * Un solde epuise n'est PAS passager. Le dire autrement fait perdre du
 * temps a celui qui lit, et c'est la definition d'un mensonge utile a
 * personne. Le message ne nomme NI le fournisseur NI un montant : il dit
 * qu'il faut agir et que reessayer ne suffira pas.
 */
export const RAISON_INDISPONIBLE =
  'La génération est indisponible pour le moment. Réessayer n’y changera rien — ' +
  'nous sommes prévenus et nous rétablissons le service.'
export const RAISON_NON_ABOUTIE =
  'La génération n’a pas pu aboutir cette fois. Nous avons été prévenus et regardons ce qui s’est passé.'

export const RAISON_ARRETEE =
  'Vous avez arrêté cette génération. Rien n’a été lancé depuis.'

export function traduireRaison(brute: string | undefined): string {
  const r = String(brute ?? '')
  // ── UN ARRET VOULU N'EST PAS UNE PANNE (defaut 2026-10-15, capture).
  //
  // Le proprietaire a appuye sur Arreter, et l'ecran lui repondait « La
  // generation n'a pas pu aboutir cette fois. Nous avons ete prevenus et
  // regardons ce qui s'est passe. » — une panne racontee la ou il y a eu
  // une DECISION. On ne previent personne quand quelqu'un decide.
  if (r === RAISON_ARRET_PROPRIETAIRE) return RAISON_ARRETEE
  // erreurs d'infrastructure : credit, facturation, 400 fournisseur,
  // timeouts, echecs repetes — le message generique, RIEN du brut.
  // ① D'ABORD CE QUI NE SE RESOUT PAS TOUT SEUL : un solde epuise, une
  //    facturation refusee. « Reessayez » y serait un mensonge.
  if (/credit|facturation|billing|quota/iu.test(r)) {
    return RAISON_INDISPONIBLE
  }
  // ② PUIS LE PASSAGER : coupure, 4xx/5xx, expiration.
  if (/^erreur fatale|^echec repete|timed out|\b4\d\d\b|\b5\d\d\b/iu.test(r)) {
    return RAISON_TECHNIQUE
  }
  // refus de convergence du moteur : filet, plafond, amputation, stagnation…
  return RAISON_NON_ABOUTIE
}

/** La surface de lecture dont l'ecran a besoin — restreinte au proprietaire,
 *  et DEGRAISSEE : ni cout, ni diagnostics bruts (un devtools ouvert ne voit
 *  que ceci). Le detail complet vit dans la route admin, pour l'operateur. */
export type EtatGeneration = {
  readonly id: string
  readonly statut: 'en_attente' | 'en_cours' | 'livree' | 'refusee'
  readonly etape: string | null
  readonly nom: string | null
  readonly aDocument: boolean
  /** Traduite — jamais la raison brute du moteur ni du fournisseur. */
  readonly raison: string | null
  /** LE TRIPTYQUE HONNETE (arbitrage 2026-10-10) — des TEMPS et des COMPTES,
   *  aucune entraille : l'instant de depot (ecoule calcule a l'ecran), l'age
   *  du dernier battement (l'anti-« plante » 100 % reel), la fraction de
   *  sections ecrites, le compte de defauts du dernier jugement, et
   *  l'empreinte d'apercu (l'ecran ne recharge que si elle change). */
  readonly creeIl: string
  readonly activiteSec: number | null
  readonly sections: { faites: number; total: number }
  readonly defautsRestants: number | null
  readonly apercuVersion: string | null
  /**
   * CE QUE L'HUMAIN SEUL PEUT TRANCHER — et qui n'existait pas ici.
   *
   * Le chemin SYNCHRONE partageait les diagnostics (EP-135) : ce que
   * l'utilisateur peut decider devient une QUESTION, le reste est notre
   * faute. Le chemin asynchrone, lui, n'en savait rien — zero occurrence du
   * mot « question » dans le travailleur comme dans ce service. Une ligne
   * refusee se contentait donc de dire non, meme quand il suffisait de
   * demander. Derive A LA LECTURE, depuis les diagnostics deja en base :
   * gratuit, et sans rien ajouter a l'ecriture.
   */
  readonly questions: readonly Question[]
  /** Le refus est de NOTRE cote : l'humain n'a rien a corriger (EP-135). */
  readonly notreFaute: boolean
  /** P0 a REELLEMENT produit un modele. Sans lui, rien n'a ete compris. */
  readonly comprise: boolean
  /** Le proprietaire a appuye sur Arreter. Ni panne, ni incomprehension. */
  readonly arrete: boolean
  /**
   * COMBIEN DE TOURS DE REPARATION ONT EU LIEU.
   *
   * Replit montre ses boucles d'auto-test — « 4 boucles, un defaut attrape
   * a la boucle 2 ». Nous les comptions deja et ne les montrions pas : un
   * ecran qui dit « en cours » depuis vingt minutes sans dire qu'il en est
   * a sa deuxieme reparation ne dit rien d'utile. Un COMPTE, pas le detail
   * — les tours portent des codes, et les codes ne vont pas a l'ecran.
   */
  readonly tours: number
  /**
   * LE JOURNAL DES TIRAGES, TRADUIT.
   *
   * Chaque ligne dit ce qui s'est passe, ce que le generateur a repare
   * lui-meme, et ce que le tirage a coute. Aucun code, aucun chemin de
   * validateur : le brut reste en base, ou un diagnostic le trouve.
   *
   * Vide quand le moteur n'a rien ecrit, ou quand aucun arret n'est
   * traduisible — se taire vaut mieux qu'une phrase fabriquee.
   */
  readonly journal: readonly LigneTirage[]
  /** UNE REPRISE EST-ELLE POSSIBLE. Faux sur une livree (elle est finie) et
   *  faux sans base recuperable — l'ecran ne propose pas un bouton qui
   *  relancerait une generation complete en la deguisant en reprise. */
  readonly reprenable: boolean
  /** LA GENERATION ATTEND VOTRE ACCORD pour continuer — mode plan apres P0,
   *  puis a chaque passe. Sans ca l'ecran afficherait « en cours » sur une
   *  ligne qui ne bougera plus tant que personne ne clique. */
  readonly attendVous: boolean
  /**
   * L'HISTORIQUE, EN METADONNEES SEULEMENT.
   *
   * Jamais l'etat : mesure sur les documents reels, le plus gros AIR pese
   * 112 ko et l'ecran relit cette surface toutes les cinq secondes. On
   * rend de quoi AFFICHER une liste et proposer un retour ; le contenu
   * n'est charge qu'au moment ou l'on revient.
   */
  readonly versions: readonly { rang: number; etape: string | null; creeIl: string }[]
}

/** Les sections attendues d'un document AIR — le total de la fraction.
 *  Chiffre DERIVE du schema au build des tests (22 cles) ; consigne ici en
 *  constante nommee pour ne pas charger zod dans un chemin de polling. */
export const SECTIONS_ATTENDUES = 22

/** La surface de LECTURE, injectee et volontairement etroite : elle dit
 *  exactement ce que ce module fait, et rien de plus. Deux formes, parce
 *  qu'il y a deux lectures — la ligne (une seule, par proprietaire) et son
 *  historique (une liste, triee, SANS la colonne lourde). */
export type BaseLecture = {
  from: (table: string) => {
    select: (colonnes: string) => {
      eq: (c: string, v: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
        }
        order: (
          c: string,
          o: { ascending: boolean },
        ) => PromiseLike<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>
      }
    }
  }
}

export async function etatGeneration({
  base,
  table,
  id,
  proprietaire,
}: {
  base: BaseLecture
  table: string
  id: string
  proprietaire: string
}): Promise<EtatGeneration | null> {
  const r = await base
    .from(table)
    .select(
      'id, statut, etape, nom, diagnostics, document, created_at, battement, sections_acquises, cout_usd, jetons_entree, jetons_sortie, attente_validation',
    )
    .eq('id', id)
    .eq('owner_id', proprietaire) // dette 6a : l'IDENTITE est l'id du jeton
    .maybeSingle()
  if (r.error !== null || r.data === null) return null
  const l = r.data
  const statut = l.statut as EtatGeneration['statut']
  const diagnostics = Array.isArray(l.diagnostics) ? (l.diagnostics as string[]) : []
  const sa = (l.sections_acquises ?? {}) as {
    phase?: string
    acquis?: Record<string, unknown>
    // Le JOURNAL du refus : arrets, codes et reparations de chaque tirage.
    // C'est la, et nulle part ailleurs, que vivent les VRAIS codes d'un
    // refus P0 — la colonne `diagnostics` n'en porte qu'une phrase.
    tirages?: readonly Record<string, unknown>[]
    modele?: unknown
    defautsRestants?: number | null
    tours?: readonly unknown[]
  }
  const acquis = sa.acquis ?? null
  const faites =
    statut === 'livree'
      ? SECTIONS_ATTENDUES
      : acquis === null
        ? 0
        : Math.min(SECTIONS_ATTENDUES, Object.keys(acquis).length)
  const battement = l.battement === null || l.battement === undefined ? null : String(l.battement)
  // LA COLONNE LOURDE N'EST PAS SELECTIONNEE — c'est tout l'interet d'une
  // table separee. Une requete indexee sur (generation_id, rang).
  const vs = await base
    .from(TABLE_VERSIONS)
    .select('rang, etape, cree_le')
    .eq('generation_id', id)
    .order('rang', { ascending: true })
  const versions = (Array.isArray(vs.data) ? vs.data : []).map((x: Record<string, unknown>) => ({
    rang: Number(x.rang ?? 0),
    etape: (x.etape ?? null) as string | null,
    creeIl: String(x.cree_le ?? ''),
  }))
  // ── LES VRAIS CODES D'UN REFUS P0 NE SE PERDENT PLUS (defaut 2026-10-15).
  //
  // MESURE, capture du proprietaire a l'appui : un refus P0 ecrit dans
  // `diagnostics` une PHRASE — « P0 refuse 3 fois » — et non un code.
  // `diagnosticsDepuisLigne` exige `^[A-Z][A-Z0-9_]*$` : elle n'en lit
  // donc AUCUN, `questionsPour` rend zero question, et l'ecran tombait
  // dans sa branche par defaut « Je n'ai pas compris — je ne construis
  // rien ». On accusait le proprietaire d'un defaut classe
  // `faute_de_production`, dont la table dit l'inverse : il n'a rien a
  // repondre. Les vrais codes vivaient dans le journal des tirages, que
  // personne ne lisait.
  const codesDesTirages = Array.isArray(sa.tirages)
    ? (sa.tirages as Record<string, unknown>[]).flatMap((t) =>
        Array.isArray(t.diagnostics) ? (t.diagnostics as unknown[]).map((x) => String(x)) : [],
      )
    : []
  const diagsLus = diagnosticsDepuisLigne([...diagnostics, ...codesDesTirages])
  // GRATUIT : `dialogue.ts` n'appelle aucune API. Seule une ligne refusee
  // peut porter des questions — une livree n'a plus rien a demander.
  const questions = statut === 'refusee' ? await questionsPour(diagsLus) : []
  // NOTRE FAUTE, ET ON LE DIT. Fail-closed vers NOUS : un refus qu'on ne
  // sait pas classer n'autorise pas a mettre la faute sur l'humain.
  // UN ARRET VOULU N'EST LA FAUTE DE PERSONNE. Sans cette exclusion,
  // l'ecran repondait « L'echec vient de nous » a quelqu'un qui venait
  // d'appuyer sur Arreter — on s'accusait d'une decision.
  const arretVoulu = diagnostics[0] === RAISON_ARRET_PROPRIETAIRE
  const notreFaute =
    statut === 'refusee' &&
    !arretVoulu &&
    questions.length === 0 &&
    (diagsLus.length === 0 || (await fautesDeProduction(diagsLus)).length > 0)
  return {
    id: String(l.id),
    statut,
    etape:
      l.etape === null || l.etape === undefined
        ? etapeDuRefus(statut, sa)
        : String(l.etape),
    nom: l.nom === null || l.nom === undefined ? null : String(l.nom),
    aDocument: l.document !== null && l.document !== undefined,
    raison: statut === 'refusee' ? traduireRaison(diagnostics[0]) : null,
    questions,
    notreFaute,
    // ── UN ARRET VOULU N'EST NI UNE PANNE NI UNE INCOMPREHENSION.
    //
    // DEFAUT QUE J'AI MOI-MEME INTRODUIT (EP-229, corrige ici) : en
    // excluant l'arret volontaire de `notreFaute`, je l'ai fait retomber
    // sur la branche par defaut de l'ecran — « Je n'ai pas compris, je ne
    // construis rien ». Le proprietaire venait d'appuyer sur Arreter, et on
    // lui repondait qu'on n'avait pas compris sa demande. C'etait PIRE
    // qu'avant ma correction.
    //
    // Trois etats, trois etiquettes : notre faute, son incomprehension, ou
    // sa DECISION. La troisieme manquait.
    arrete: arretVoulu,
    // ── « COMPRISE » DOIT VOULOIR DIRE COMPRISE (defaut 2026-10-15, capture).
    //
    // L'ecran affichait « Votre demande a ete comprise » des que la ligne
    // attendait l'humain avec zero section ecrite. MESURE sur la vraie
    // ligne : `attente_validation: true`, `sections: 0` — et `modele: null`.
    // P0 n'avait RIEN produit ; un tirage venait d'etre refuse par les
    // juges. On annoncait une comprehension qui n'avait pas eu lieu.
    //
    // Le modele P0 est le SEUL fait qui dit qu'on a compris : il existe, ou
    // il n'existe pas. Aucune entraille ne sort — juste ce booleen.
    comprise: sa.modele !== null && sa.modele !== undefined,
    tours: Array.isArray(sa.tours) ? sa.tours.length : 0,
    // ── LE JOURNAL DES TIRAGES, ENFIN RENDU (defaut 2026-10-17).
    //
    // `sa.tirages` etait LU juste au-dessus — son type est declare depuis le
    // 2026-10-15, avec le commentaire « C'est la, et nulle part ailleurs, que
    // vivent les VRAIS codes d'un refus P0 ». Et il ne sortait pas d'ici.
    //
    // Le proprietaire a regarde 53 minutes de generation a 16,03 $ sans savoir
    // ce qui se passait, pendant que le moteur l'ecrivait. SIXIEME « machine
    // posee, debranchee » de ce chantier.
    //
    // TRADUIT, jamais brut : c'est la regle que ce fichier applique deja aux
    // refus (« Deja TRADUITE par le serveur — le brut du moteur ne voyage
    // jamais »). Les codes et les chemins du validateur restent en base.
    journal: journalDesTirages(sa.tirages),
    reprenable: estReprenable(statut, l as Parameters<typeof estReprenable>[1]),
    attendVous: l.attente_validation === true,
    versions,
    creeIl: String(l.created_at ?? ''),
    activiteSec:
      battement === null ? null : Math.max(0, Math.round((Date.now() - new Date(battement).getTime()) / 1000)),
    sections: { faites, total: SECTIONS_ATTENDUES },
    defautsRestants: typeof sa.defautsRestants === 'number' ? sa.defautsRestants : null,
    // ── UNE APPLICATION LIVREE DOIT POUVOIR SE REGARDER (defaut 2026-10-15).
    //
    // L'empreinte ne se calculait que sur `acquis` — ce que le moteur ecrit
    // ENTRE deux tranches. Une generation qui aboutit sans jamais se
    // suspendre n'ecrit aucun acquis : l'empreinte restait nulle, l'ecran
    // ne declenchait jamais l'apercu, et le proprietaire ne voyait JAMAIS
    // son application — meme en cas de succes complet. Seul le zip restait.
    //
    // La route `apercu-live` savait deja preferer le DOCUMENT quand la
    // ligne est livree ; c'est le declencheur qui l'ignorait. Une oeuvre
    // livree ne change plus : son empreinte est donc constante.
    apercuVersion:
      statut === 'livree' && l.document !== null && l.document !== undefined
        ? 'livree'
        : acquis === null
          ? null
          : createHash('md5').update(JSON.stringify(acquis)).digest('hex').slice(0, 8),
  }
}
