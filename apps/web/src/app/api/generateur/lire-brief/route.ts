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
import { clientIA, MODELE_LEGER } from '@/lib/ia/client'
import { nomProduitValide } from '@/lib/apps/nom-produit'
import { projectAirSchema } from '@deribfy/air-schema'
import { lireEntites } from '@/lib/apps/entites-declarees'
import { CONSIGNE } from '@/lib/apps/consigne-lire-brief'
import { SIGNES_LUS, type LectureBrief } from '@/lib/apps/lecture-brief'

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
  if (demande === '') return NextResponse.json({ deduites: {}, coutUsd: 0, lecture: { resultat: 'demande_vide', entreeCoupee: false, tables: 0 } satisfies LectureBrief })

  // ── LE STATUT DE LA LECTURE VOYAGE DANS TOUTES LES BRANCHES (M6, 2026-11-12) :
  // 34 générations sur 34 sans trace de ce résultat ; un JSON cassé tombait
  // dans le `catch` et rendait `{ deduites: {} }`, indiscernable de « rien à
  // déduire ». Voir lib/apps/lecture-brief.ts.
  const entreeCoupee = demande.length > SIGNES_LUS
  let tronqueeEnSortie = false
  try {
    const { QUESTIONS_DE_CONFIGURATION } = (await import(
      /* webpackIgnore: true */ `${racineDepot()}/benchmarks/air-emission/elicitation.mjs`
    )) as { QUESTIONS_DE_CONFIGURATION: Record<string, { choix?: { valeur: string }[] }> }

    const r = await clientIA().messages.create({
      model: MODELE_LEGER,
      // ── 8 000, ET 400 FAISAIT EXACTEMENT CE QUE CETTE ROUTE DOIT EMPECHER.
      //
      // MESURE LE 2026-10-30, contre l'API reellement servie :
      //
      //     max_tokens=400   → blocs [thinking] SEUL, texte VIDE
      //     max_tokens=4000  → blocs [thinking, text], 831 caracteres
      //
      // Ce fournisseur rend DEUX blocs et facture la reflexion sur
      // `max_tokens`. A 400, tout le budget part a reflechir et il ne reste
      // RIEN pour repondre. `brut` vaut "", `indexOf('{')` vaut -1, et la
      // route rendait `{}` — en silence.
      //
      // Le proprietaire a donc joint un cahier des charges de douze pages et
      // s'est vu demander « Que fait votre application avec l'argent ? ». La
      // route ecrite POUR eviter cette question la provoquait.
      //
      // 400 etait calibre sur un modele qui ne reflechissait pas. Un brief
      // COURT demande deja 962 jetons de sortie ; douze pages en demandent
      // plus. 8 000 laisse la marge et reste sous le seuil de 21 312 au-dela
      // duquel le SDK exige le flux.
      max_tokens: 8000,
      system: CONSIGNE,
      // Le brief est borné : au-delà, on lit le début, qui porte l'intention.
      messages: [{ role: 'user', content: demande.slice(0, SIGNES_LUS) }],
    })
    tronqueeEnSortie = r.stop_reason === 'max_tokens'

    const brut = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    const d = brut.indexOf('{')
    const f = brut.lastIndexOf('}')
    if (d === -1 || f <= d) {
      // ── « RIEN DEDUIT » ET « PAS PU LIRE » NE SONT PAS LA MEME CHOSE.
      //
      // C'est le defaut PROFOND, celui qui a rendu le precedent invisible.
      // Cette route rendait `{}` dans les DEUX cas : un brief muet et une
      // lecture ratee produisaient la meme reponse. L'ecran posait donc
      // toutes ses questions, et personne ne pouvait savoir pourquoi.
      //
      // Elle le DIT maintenant, et distingue la TRONCATURE du reste : meme
      // lecon que sur l'autre moteur, ou « Expected } but found EOF » se
      // lisait « mauvais code » alors que c'etait une coupure.
      const tronquee = r.stop_reason === 'max_tokens'
      console.warn('[lire-brief] reponse illisible', {
        stop_reason: r.stop_reason,
        blocs: r.content.map((b) => b.type),
        caracteres: brut.length,
      })
      return NextResponse.json({
        deduites: {},
        lecture: { resultat: tronquee ? 'tronquee' : 'illisible', entreeCoupee, tables: 0 } satisfies LectureBrief,
        illisible: true,
        motif: tronquee
          ? 'La lecture du brief a ete coupee avant la fin : la limite de longueur est atteinte.'
          : 'La lecture du brief n a rien rendu d exploitable.',
      })
    }
    let lu: Record<string, unknown>
    try {
      lu = JSON.parse(brut.slice(d, f + 1)) as Record<string, unknown>
    } catch {
      // Même réponse qu'avant (le `catch` général rendait `{ deduites: {} }`),
      // mais NOMMÉE : un JSON coupé par la limite est une troncature.
      return NextResponse.json({
        deduites: {},
        lecture: { resultat: tronqueeEnSortie ? 'tronquee' : 'json_casse', entreeCoupee, tables: 0 } satisfies LectureBrief,
      })
    }

    // ── LE FILTRE. La table décide, jamais le modèle.
    const deduites: Record<string, string> = {}
    for (const [code, valeur] of Object.entries(lu)) {
      const q = QUESTIONS_DE_CONFIGURATION[code]
      if (q === undefined) continue
      if (typeof valeur !== 'string' || valeur.trim() === '') continue
      if (q.choix !== undefined && !q.choix.some((c) => c.valeur === valeur)) continue
      deduites[code] = valeur
    }
    // ── LES QUESTIONS DU MODÈLE, BORNÉES (2026-11-03).
    //
    // DEMANDE DU PROPRIÉTAIRE, après une capture : quelqu'un qui veut lire
    // son compteur SNE s'est vu demander ce que son application « fait
    // avec l'argent ». La table des questions ne connaît pas son métier —
    // elle ne connaît que ses propres rubriques.
    //
    // Le modèle, lui, LIT la demande. On lui laisse donc poser ce qui
    // manque VRAIMENT.
    //
    // ── ET ON LE BORNE, parce qu'un champ libre venu d'un modèle finit à
    //    l'écran de quelqu'un.
    //
    // Trois questions au plus, quatre choix au plus, longueurs coupées. Ce
    // ne sont pas des précautions de style : c'est du texte qui sera rendu
    // dans une page, et dont la longueur n'est garantie par personne.
    const questionsIA: { code: string; texte: string; choix: string[] }[] = []
    if (Array.isArray(lu.QUESTIONS)) {
      for (const [n, brute] of (lu.QUESTIONS as unknown[]).slice(0, 3).entries()) {
        if (typeof brute !== 'object' || brute === null) continue
        const o = brute as { texte?: unknown; choix?: unknown }
        const texte = typeof o.texte === 'string' ? o.texte.trim().slice(0, 200) : ''
        if (texte === '') continue
        const choix = Array.isArray(o.choix)
          ? o.choix
              .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
              .slice(0, 4)
              .map((c) => c.trim().slice(0, 80))
          : []
        // UNE QUESTION SANS CHOIX RESTE UNE QUESTION : la personne répond
        // en texte libre. On ne la jette pas pour si peu.
        questionsIA.push({ code: `IA_${String(n)}`, texte, choix })
      }
    }

    // ── LES DONNÉES DÉCLARÉES, JUGÉES PAR LE CONTRAT LUI-MÊME.
    //
    // `entitySchema` vit dans le paquet AIR ; on lui soumet chaque entité
    // plutôt que de réécrire sa grammaire ici. Deux grammaires auraient
    // divergé, et c'est la nôtre qui aurait eu tort — la sienne est celle
    // que le compilateur applique.
    //
    // MESURÉ le 2026-11-02 : `{ id, name, fields:[{ id, name, type,
    // required }] }` est accepté. C'est exactement la forme demandée au
    // modèle, donc ce qu'il rend de bonne foi passe.
    const schemaEntite = projectAirSchema.shape.entities.element
    const declarees = lireEntites(lu.ENTITES, (e) => schemaEntite.safeParse(e).success)

    // ── LE NOM DU PRODUIT, ET SA CITATION EST VERIFIEE, PAS CRUE.
    //
    // Le reste de cette route filtre contre la table : « la table decide,
    // jamais le modele ». Le nom n'a pas de table -- c'est du texte libre, et
    // c'est la seule chose ici que le modele peut inventer. Deux gardes :
    //
    //   · `nomProduitValide` refuse nos propres remplissages (EP-309) : un
    //     « Application » rendu par le modele est ecarte comme s'il venait
    //     d'un ecran.
    //   · LA CITATION EST CHERCHEE DANS LE BRIEF. Le modele dit ou il a lu le
    //     nom ; on VERIFIE que ce passage existe, accents et casse aplatis.
    //     S'il n'existe pas, la citation tombe et le nom passe en
    //     « propose » -- il n'est pas refuse pour autant : un nom invente est
    //     legitime quand le document n'en porte aucun. Ce qui serait
    //     illegitime, c'est de faire croire qu'on l'a lu.
    //
    // Meme discipline que `dansLeDocument` dans extraction-exigences :
    // demander au modele « l'as-tu invente ? » serait lui demander de se
    // juger.
    const aplati = (t: string) => t.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/gu, ' ')
    const brief = aplati(demande)
    let nomProduit: { nom: string; citation?: string; dansLeDocument: boolean } | undefined
    const nomBrut = lu.NOM_PRODUIT
    if (typeof nomBrut === 'string') {
      const verdict = nomProduitValide(nomBrut)
      if (verdict.ok) {
        const citBrut = typeof lu.NOM_CITATION === 'string' ? lu.NOM_CITATION.trim().slice(0, 80) : ''
        const citTrouvee = citBrut !== '' && brief.includes(aplati(citBrut))
        nomProduit = {
          nom: verdict.nom,
          ...(citTrouvee ? { citation: citBrut } : {}),
          dansLeDocument: brief.includes(aplati(verdict.nom)),
        }
      }
    }
    return NextResponse.json({
      questionsIA,
      deduites,
      ...(nomProduit === undefined ? {} : { nomProduit }),
      // LES REFUS VOYAGENT AVEC LES ENTITÉS. Un refus muet produirait une
      // application à qui il manque une table, sans que personne sache
      // laquelle ni pourquoi.
      entites: declarees.entites,
      entitesRefusees: declarees.refus,
      lecture: { resultat: 'reussie', entreeCoupee, tables: declarees.entites.length } satisfies LectureBrief,
    })
  } catch {
    // UNE LECTURE RATÉE NE BLOQUE RIEN : on retombe sur le questionnaire.
    return NextResponse.json({ deduites: {}, lecture: { resultat: 'erreur', entreeCoupee, tables: 0 } satisfies LectureBrief })
  }
}
