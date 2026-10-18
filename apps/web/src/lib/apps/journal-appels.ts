/**
 * MESURER CHAQUE ALLER-RETOUR AU MODÈLE — sans toucher au moteur scellé.
 *
 * ── LE POINT D'INSERTION, ET POURQUOI C'EST CELUI-LÀ.
 *
 * Le moteur ne construit pas son SDK : le site le lui PASSE (`sdk`), depuis
 * 2026-10-14, parce qu'en ligne il ne se résout pas seul. C'est donc le seul
 * endroit où l'on peut compter le temps sans éditer `emission-coeur.mjs`, qui
 * est scellé.
 *
 * On enveloppe `messages.create`. Tout ce qui est en dessous — flux,
 * échéance de tranche, comptabilité des jetons — continue exactement comme
 * avant : on ne remplace rien, on observe.
 *
 * ── CE QU'ON SAIT LIRE, ET CE QU'ON N'INVENTE PAS.
 *
 * La PARTIE se lit dans le texte envoyé : l'orchestration écrit
 * « SECTIONS À ÉMETTRE MAINTENANT : … ». La sonde, elle, envoie `user: "x"`
 * et se reconnaît à ça. Rien n'est deviné.
 *
 * Le NIVEAU de dégradation ne voyage nulle part jusqu'ici. Mais les six
 * barreaux pèsent 41, 40, 33, 28, 25 et 20 Ko : la TAILLE de la grammaire
 * les distingue sans ambiguïté. On mesure donc ce qu'on voit — des octets —
 * plutôt que de faire voyager un numéro à travers un module scellé.
 *
 * ── ET IL NE PEUT PAS CASSER UNE GÉNÉRATION.
 *
 * L'écriture est tirée et oubliée, sous `try`. Perdre une mesure est bénin ;
 * perdre un tir payé parce qu'on le mesurait serait absurde.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_APPELS } from './journal'

/** Le tir en cours, posé par la continuation avant chaque tranche. */
let slugCourant: string | null = null

export function direQuelTirCommence(slug: string | null): void {
  slugCourant = slug
}

type Requete = {
  readonly messages?: readonly { readonly content?: unknown }[]
  readonly output_config?: { readonly format?: { readonly schema?: unknown } }
}

/** La partie demandée, lue dans le texte envoyé — jamais devinée. */
function partieDe(requete: Requete): string {
  const contenu = requete.messages?.[0]?.content
  const texte =
    typeof contenu === 'string'
      ? contenu
      : Array.isArray(contenu)
        ? contenu
            .map((b) => (typeof b === 'object' && b !== null && 'text' in b ? String(b.text) : ''))
            .join('')
        : ''
  if (texte.trim() === 'x') return 'sonde'
  const m = /SECTIONS À ÉMETTRE MAINTENANT\s*:\s*([^.\n]+)/u.exec(texte)
  return m?.[1]?.trim().slice(0, 80) ?? 'inconnue'
}

/** Le poids de la grammaire : c'est lui qui nomme le barreau de l'escalier. */
function grammaireKo(requete: Requete): number {
  const s = requete.output_config?.format?.schema
  if (s === undefined || s === null) return 0
  try {
    return Math.round(JSON.stringify(s).length / 1024)
  } catch {
    return 0
  }
}

type Usage = { input_tokens?: number; output_tokens?: number }

function ecrire(ligne: {
  partie: string
  grammaire_ko: number
  ms: number
  jetons_entree: number
  jetons_sortie: number
  issue: string
}): void {
  // TIRÉE ET OUBLIÉE. On n'attend pas, et on n'échoue pas : le `catch` du
  // `void` attrape aussi bien le rejet que l'exception synchrone.
  try {
    void supabaseAdmin
      .from(TABLE_APPELS)
      .insert({ slug: slugCourant, ...ligne })
      .then(
        () => undefined,
        () => undefined,
      )
  } catch {
    // Une panne du journal ne touche pas le tir en cours.
  }
}

type Constructeur = new (options: Record<string, unknown>) => {
  messages: { create: (...args: unknown[]) => Promise<unknown> }
}

/**
 * Le SDK, instrumenté.
 *
 * Un constructeur qui REND un objet remplace `this` : on construit le vrai
 * client, on enveloppe sa seule méthode qui part sur le réseau, et on le
 * rend. Le moteur ne voit aucune différence.
 */
export function sdkJournalise(Base: Constructeur): Constructeur {
  // Pas d'`extends` : on ne veut rien hériter, on veut ENVELOPPER. Un
  // constructeur qui rend un objet remplace `this` — c'est du JavaScript
  // ordinaire, et ça évite de dépendre de la forme interne du SDK.
  return class {
    constructor(options: Record<string, unknown>) {
      const vrai = new Base(options)
      const original = vrai.messages.create.bind(vrai.messages)
      vrai.messages.create = async (...args: unknown[]): Promise<unknown> => {
        const requete = (args[0] ?? {}) as Requete
        const partie = partieDe(requete)
        const grammaire_ko = grammaireKo(requete)
        const debut = Date.now()
        try {
          const r = (await original(...args)) as { usage?: Usage; stop_reason?: string }
          const u = r.usage ?? {}
          ecrire({
            partie,
            grammaire_ko,
            ms: Date.now() - debut,
            jetons_entree: u.input_tokens ?? 0,
            jetons_sortie: u.output_tokens ?? 0,
            // L'ISSUE DIT CE QUI S'EST PASSÉ, pas seulement si ça a marché :
            // une réponse TRONQUÉE est facturée et jetée, et c'est
            // exactement le gaspillage qu'on cherche.
            issue: r.stop_reason === 'max_tokens' ? 'tronquee' : (r.stop_reason ?? 'ok'),
          })
          return r
        } catch (e: unknown) {
          const statut = (e as { status?: number }).status
          ecrire({
            partie,
            grammaire_ko,
            ms: Date.now() - debut,
            jetons_entree: 0,
            jetons_sortie: 0,
            // Un 400 est un REFUS DE GRAMMAIRE : rien n'est facturé, mais
            // l'aller-retour a bien eu lieu et il a coûté du temps.
            issue: statut === undefined ? 'erreur' : `http_${String(statut)}`,
          })
          throw e
        }
      }
      return vrai as never
    }
  } as unknown as Constructeur
}
