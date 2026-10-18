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
 *   · DEEPSEEK plafonne sa sortie à 8 192 jetons : au-delà, c'est un 400.
 *     C'est écrit dans l'adaptateur du dépôt (EP-089), et c'est une
 *     contrainte de dialecte, pas une préférence.
 *
 * Les deux sont donc appelés différemment. Ce fichier est le SEUL endroit qui
 * le sait.
 */

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
    modele: 'deepseek-chat',
    // ── 8 192, ET C'EST UN MUR, PAS UN RÉGLAGE.
    //
    // `adaptateur-deepseek.mjs` le déclare depuis EP-089 : « la sortie de
    // deepseek-chat est bornée à 8192 tokens — un max_tokens supérieur est
    // un 400 ». Une application plus grosse arrivera donc TRONQUÉE, et la
    // boucle le verra à l'assemblage. Mieux vaut un refus lisible qu'un 400.
    maxJetons: 8_192,
    prix: { entree: 0.27, sortie: 1.1 },
    variableCle: 'DEEPSEEK_API_KEY',
  },
}

export type Usage = { readonly entree: number; readonly sortie: number }
export type Reponse = { readonly texte: string; readonly usage: Usage }

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
    // Dialecte compatible OpenAI. Pas de flux : 8 192 jetons au plus, donc
    // jamais dix minutes — la contrainte qui impose le flux chez l'autre
    // n'existe pas ici.
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
      choices?: { message?: { content?: string } }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    return {
      texte: d.choices?.[0]?.message?.content ?? '',
      usage: { entree: d.usage?.prompt_tokens ?? 0, sortie: d.usage?.completion_tokens ?? 0 },
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
  }
}
