/**
 * QUEL FOURNISSEUR ÉCRIT LE CODE — un interrupteur, pas un choix en dur.
 *
 * ── POURQUOI, MESURÉ LE 2026-10-18.
 *
 * Le crédit Anthropic du propriétaire est tombé à zéro au milieu d'un tir, et
 * un rechargement de 10 $ n'y a rien changé — la clé rend toujours
 * « Your credit balance is too low ». Vérifié directement contre l'API :
 * HTTP 400, request_id req_011CgAXUTM9DCqy9LVX15B5X.
 *
 * Un produit dont la seule porte est fermée n'a plus de porte. La clé
 * DeepSeek du dépôt, elle, répond HTTP 200.
 *
 * ── ET L'ÉCART DE PRIX N'EST PAS UN DÉTAIL.
 *
 *     Anthropic Opus    entrée 5,00 $/M    sortie 25,00 $/M
 *     DeepSeek          entrée 0,27 $/M    sortie  1,10 $/M
 *
 * Dix-huit fois moins cher en entrée, vingt-trois fois en sortie. Sur treize
 * tirs à 66 $, l'écart aurait payé l'année.
 *
 * ── CE QUI DIFFÈRE VRAIMENT ENTRE LES DEUX, ET QU'ON NE PEUT PAS IGNORER.
 *
 *   · ANTHROPIC exige le FLUX dès que `max_tokens` autorise une réponse de
 *     plus de dix minutes — mesuré au premier essai du propriétaire.
 *   · CHACUN DIT À SA MANIÈRE qu'il a COUPÉ sa réponse : `finish_reason`
 *     vaut `length` chez l'un, `stop_reason` vaut `max_tokens` chez l'autre.
 *
 * Les deux sont donc appelés différemment. Ce fichier est le SEUL endroit qui
 * le sait.
 *
 * ── ET UNE ERREUR QUI M'A COÛTÉ DEUX TIRS, LE 2026-10-19.
 *
 * J'avais écrit ici que DeepSeek plafonnait sa sortie à 8 192 jetons, en
 * recopiant EP-089 sans le revérifier. Les deux tirs du propriétaire ont
 * rendu 24 576 jetons de sortie pour trois tours — 8 192 au jeton près à
 * chaque tour. Le compilateur disait « Expected } but found EOF », et je
 * lisais « le modèle écrit mal ».
 *
 * Le modèle écrivait bien. C'est MA borne qui coupait.
 *
 * Plafond réel, mesuré contre l'API le 2026-10-19 par une requête
 * volontairement hors-borne (un 400 ne génère rien et ne facture rien) :
 *
 *     « the valid range of max_tokens is [1, 393216] »
 *     request_id dbc0d307-233b-4031-847c-1cca7d8dbbfc
 *
 * Quarante-huit fois ma valeur. Et le catalogue avait changé aussi :
 * `deepseek-chat` ne figure plus parmi les modèles servis.
 */

/**
 * LE PLAFOND DUR DE L'API, MESURÉ — pas une préférence, une borne.
 *
 * Aucune configuration ne peut le dépasser : au-delà, c'est un 400 et le tir
 * est perdu avant d'avoir commencé. Un contrôle le vérifie.
 */
export const PLAFOND_API_DEEPSEEK = 393_216

export type Fournisseur = 'anthropic' | 'deepseek'

/**
 * Quel fournisseur sert cette génération.
 *
 * FAIL-SAFE VERS LE CONNU : seule la valeur exacte `deepseek` bascule. Comme
 * pour l'interrupteur de moteur, une faute de frappe ne doit pas changer de
 * fournisseur en silence.
 */
export function fournisseurChoisi(valeur: string | undefined): Fournisseur {
  return valeur === 'deepseek' ? 'deepseek' : 'anthropic'
}

export type Config = {
  readonly modele: string
  /** Plafond de sortie par appel — contrainte du dialecte, pas un réglage. */
  readonly maxJetons: number
  /** Tarifs par million de jetons, tels que le dépôt les déclare déjà. */
  readonly prix: { readonly entree: number; readonly sortie: number }
  readonly variableCle: string
}

export const CONFIGS: Readonly<Record<Fournisseur, Config>> = {
  anthropic: {
    modele: 'claude-opus-5',
    // Le flux lève la limite de durée ; 32 000 reste au-dessus de tout
    // document qu'on ait mesuré (le plus gros fait 10 609 jetons).
    maxJetons: 32_000,
    prix: { entree: 5, sortie: 25 },
    variableCle: 'ANTHROPIC_API_KEY',
  },
  deepseek: {
    // ARBITRAGE DU PROPRIÉTAIRE, 2026-10-19 : le plus capable des deux.
    // Écrire une application entière d'un seul jet est le travail le plus
    // dur qu'on demande au modèle ; ce n'est pas là qu'on économise.
    modele: 'deepseek-v4-pro',
    // ── 65 536, ET VOICI L'ARITHMÉTIQUE QUI LE CHOISIT.
    //
    // L'API accepte 393 216. On ne les prend pas : à 350 jetons/seconde
    // (mesuré — 8 192 jetons en 21 s), les épuiser demanderait dix-huit
    // minutes pour UN tour, et la route est synchrone.
    //
    // 65 536, c'est HUIT FOIS ce qui a été coupé, et environ trois minutes
    // par tour. Large pour toute application qu'on ait vue.
    //
    // Et si ça coupait quand même, personne n'aurait à le deviner : la
    // troncature est désormais LUE et NOMMÉE. C'est le vrai garde-fou — le
    // chiffre n'en est que la marge.
    maxJetons: 65_536,
    // Tarifs deepseek-v4-pro, relevés à la documentation le 2026-10-19.
    prix: { entree: 0.66, sortie: 1.98 },
    variableCle: 'DEEPSEEK_API_KEY',
  },
}

export type Usage = { readonly entree: number; readonly sortie: number }
export type Reponse = {
  readonly texte: string
  readonly usage: Usage
  /**
   * LE FOURNISSEUR A-T-IL COUPÉ SA RÉPONSE ?
   *
   * DÉFAUT MESURÉ LE 2026-10-19, ET C'EST LE VRAI DÉFAUT.
   *
   * Deux tirs ont échoué sur une réponse tronquée. Le compilateur disait
   * « Expected } but found EOF » — un diagnostic EXACT —, et je le relayais
   * au modèle comme une erreur de syntaxe. Il « corrigeait » donc du code qui
   * n'avait jamais été faux, et se faisait couper à nouveau. Trois fois.
   *
   * L'information était dans la réponse depuis le début, et je ne la lisais
   * pas. Un plafond plus haut rend la coupure rare ; le lire la rend
   * IMPOSSIBLE À CONFONDRE. C'est le second qui ferme le défaut.
   */
  readonly tronquee: boolean
}

/**
 * UN SEUL APPEL, DEUX DIALECTES.
 *
 * L'appelant ne sait pas lequel il parle — c'est tout l'intérêt. Le jour où
 * un troisième fournisseur arrive, il s'ajoute ICI et nulle part ailleurs.
 */
export async function appelerFournisseur(
  f: Fournisseur,
  cle: string,
  system: string,
  messages: readonly { role: 'user' | 'assistant'; content: string }[],
): Promise<Reponse> {
  const c = CONFIGS[f]

  if (f === 'deepseek') {
    // Dialecte compatible OpenAI, sans flux — et c'est une ARITHMÉTIQUE, pas
    // une préférence. 65 536 jetons à 350 jetons/seconde font environ trois
    // minutes : sous les dix minutes au-delà desquelles l'autre dialecte
    // exige le flux. Si le plafond montait, ce calcul serait à refaire.
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cle}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: c.modele,
        max_tokens: c.maxJetons,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    })
    if (!r.ok) throw new Error(`${String(r.status)} ${(await r.text()).slice(0, 300)}`)
    const d = (await r.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    return {
      texte: d.choices?.[0]?.message?.content ?? '',
      usage: { entree: d.usage?.prompt_tokens ?? 0, sortie: d.usage?.completion_tokens ?? 0 },
      // `length` : le modèle n'avait pas fini, c'est la borne qui l'a arrêté.
      tronquee: d.choices?.[0]?.finish_reason === 'length',
    }
  }

  // ── ANTHROPIC : EN FLUX, ET CE N'EST PAS UN CONFORT.
  //
  // Le SDK REFUSE un appel non streamé dès que `max_tokens` autorise une
  // réponse de plus de dix minutes — mesuré au premier essai du propriétaire,
  // rien n'était parti et rien n'avait été facturé.
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: cle })
  const flux = client.messages.stream({
    model: c.modele,
    max_tokens: c.maxJetons,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  })
  const r = await flux.finalMessage()
  return {
    texte: r.content.map((b) => (b.type === 'text' ? b.text : '')).join(''),
    usage: { entree: r.usage.input_tokens, sortie: r.usage.output_tokens },
    // Même fait, autre nom : ce dialecte dit `max_tokens`, l'autre `length`.
    tronquee: r.stop_reason === 'max_tokens',
  }
}
