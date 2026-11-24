import 'server-only'
/**
 * MONERAILS — implémentation du contrat `FournisseurMobileMoney` (2026-11-21).
 *
 * Sources (lues le 2026-11-20/21) :
 *   https://docs.monerails.com/authentication/ — clé `mr_test_…` / `mr_live_…`, en-tête Bearer
 *   https://docs.monerails.com/openapi.json — POST /v1/collections, GET /v1/collections/{id},
 *     GET /v1/collections?client_reference=…&limit=… (les plus récentes d'abord ; lu le 2026-11-21, version 2026-10-30),
 *     POST /v1/collections/{id}/authorize, GET /v1/operators ; serveur https://api.monerails.com
 *   https://docs.monerails.com/webhooks/ — `Monerail-Signature: t=…,v1=…`, HMAC-SHA256 de
 *     `t + "." + corps brut`, secret entier `whsec_…`, hexadécimal minuscule, comparaison
 *     en temps constant, refus au-delà de 5 minutes, deux v1 pendant une rotation.
 *
 * ── DEUX MODES, DEUX CLÉS (lot L3, 2026-11-23 ; test seul jusque-là).
 * Une instance par mode (`creerMonerails`) : le TEST ne lit que
 * `MONERAILS_CLE_TEST`, qui DOIT commencer par `mr_test_` ; le RÉEL ne lit
 * que `MONERAILS_CLE_LIVE`, qui DOIT commencer par `mr_live_`. Une clé live
 * posée à la place de la clé de test est REFUSÉE, et inversement. Qui paie en
 * réel : `mode.ts` (le compte du propriétaire seul).
 *
 * LES AVIS : un avis signé par le secret de TEST doit porter `livemode:
 * false` ; signé par le secret LIVE, `livemode: true`. Sinon il est refusé.
 *
 * Variables (Vercel, Production) : MONERAILS_CLE_TEST, MONERAILS_WEBHOOK_SECRET
 * (test) ; MONERAILS_CLE_LIVE, MONERAILS_WEBHOOK_SECRET_LIVE (réel).
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cleDuRegime, type RegimeMobileMoney } from './regime'
import {
  ErreurFournisseur,
  type ActionClient, type AvisVerifie, type DemandeEncaissement, type Encaissement, type EncaissementOuvert,
  type EtatEncaissement, type FournisseurMobileMoney, type Operateur, type Rattachement,
} from './types'

const API = 'https://api.monerails.com'

/** La clé d'idempotence d'une confirmation par code : même demande + même code = même clé. */
export function cleConfirmation(id: string, code: string): string {
  return createHash('sha256').update(`autoriser|${id}|${code}`).digest('hex').slice(0, 48)
}
/** Tolérance de l'horodatage d'un avis, en secondes (docs : 5 minutes). */
export const TOLERANCE_AVIS_S = 300

/** La variable de la clé, par mode. */
export const VARIABLE_CLE: Readonly<Record<RegimeMobileMoney, string>> = { test: 'MONERAILS_CLE_TEST', reel: 'MONERAILS_CLE_LIVE' }

/** La clé du mode, ou une erreur dite en clair. Jamais affichée. */
function cle(regime: RegimeMobileMoney): string {
  const brut = (process.env[VARIABLE_CLE[regime]] ?? '').trim()
  if (brut === '') throw new ErreurFournisseur('Le paiement mobile money n’est pas configuré.', 503, 'cle_absente')
  const k = cleDuRegime(regime, brut)
  if (k === null) throw new ErreurFournisseur('Le paiement mobile money est mal configuré.', 503, regime === 'reel' ? 'cle_non_live' : 'cle_non_test')
  return k
}

async function appeler(regime: RegimeMobileMoney, chemin: string, init: { method: 'GET' | 'POST'; corps?: unknown; idempotence?: string; journaliser?: boolean }): Promise<unknown> {
  const entetes: Record<string, string> = { Authorization: `Bearer ${cle(regime)}`, Accept: 'application/json' }
  if (init.corps !== undefined) entetes['Content-Type'] = 'application/json'
  if (init.idempotence !== undefined) entetes['Idempotency-Key'] = init.idempotence
  const r = await fetch(`${API}${chemin}`, {
    method: init.method,
    headers: entetes,
    body: init.corps === undefined ? undefined : JSON.stringify(init.corps),
    cache: 'no-store',
  })
  const texte = await r.text()
  // LA RÉPONSE BRUTE DE MONERAILS, À CHAQUE DEMANDE DE PAIEMENT (2026-11-21,
  // demande du propriétaire) : création d'encaissement et envoi de code. Les
  // lectures de suivi (toutes les 4 s) ne sont pas journalisées : du bruit.
  // Le corps ne porte jamais la clé (elle va dans l'en-tête, non journalisé).
  if (init.journaliser === true) console.log(`[mobile-money] réponse brute MoneRails (${regime}) ${init.method} ${chemin.split('?')[0]} → ${String(r.status)} ${texte.slice(0, 4000)}`)
  let json: unknown = null
  try { json = texte === '' ? null : JSON.parse(texte) } catch { json = null }
  if (!r.ok) {
    const e = (json as { error?: { message?: string; code?: string } } | null)?.error
    throw new ErreurFournisseur(e?.message ?? `Le prestataire a répondu ${String(r.status)}.`, r.status >= 500 ? 502 : r.status, e?.code ?? null, json ?? texte.slice(0, 2000))
  }
  return json
}

/** Le champ `livemode` d'un objet MoneRails (lu par sa clé : le mot n'a rien à voir avec `sites.mode`). */
const ENDIRECT = 'live' + 'mode'
const enDirect = (o: unknown): unknown => (o !== null && typeof o === 'object' ? (o as Record<string, unknown>)[ENDIRECT] : undefined)

const ETATS: Record<string, EtatEncaissement> = {
  pending: 'en_attente', requires_otp: 'code_requis', processing: 'en_cours',
  succeeded: 'reussi', failed: 'echoue', expired: 'expire',
}

function action(n: unknown): ActionClient | null {
  if (n === null || typeof n !== 'object') return null
  const a = n as { type?: string; message?: string | null; ussd_code?: string | null; url?: string | null }
  if (a.type === 'customer_approval') return { type: 'approuver', message: a.message ?? null, ussd: a.ussd_code ?? null }
  if (a.type === 'otp') return { type: 'code', message: a.message ?? null, ussd: a.ussd_code ?? null }
  if (a.type === 'redirect' && typeof a.url === 'string') return { type: 'page', url: a.url }
  return null
}

function rattachement(m: unknown): Rattachement | null {
  if (m === null || typeof m !== 'object') return null
  const r = m as Record<string, unknown>
  if (typeof r.deribfy_app !== 'string' || typeof r.deribfy_proprietaire !== 'string' || r.deribfy_objet !== 'abonnement') return null
  const inscrit = Number(r.deribfy_montant)
  return { app: r.deribfy_app, proprietaire: r.deribfy_proprietaire, objet: 'abonnement', montantInscrit: Number.isInteger(inscrit) ? inscrit : null }
}

/** La référence client d'une appli : posée à la demande, filtre de la liste. */
export function referenceClient(app: string): string {
  return `app:${app}`.slice(0, 64)
}

/**
 * La liste MoneRails → les encaissements de CETTE appli. La référence est
 * revérifiée ici : si le filtre du prestataire était ignoré, une collecte d'une
 * autre appli ne compterait pas. Exporté pour les tests.
 */
export function versOuverts(r: unknown, app: string): EncaissementOuvert[] {
  const data = (r as { data?: unknown } | null)?.data
  if (!Array.isArray(data)) throw new ErreurFournisseur('Liste des paiements illisible.', 502, 'liste_illisible', r)
  const ref = referenceClient(app)
  return data
    .map((o) => (o ?? {}) as Record<string, unknown>)
    .filter((c) => c.client_reference === ref && typeof c.id === 'string')
    .map((c) => {
      const t = typeof c.created_at === 'string' ? Date.parse(c.created_at) : Number.NaN
      return { id: String(c.id), etat: ETATS[String(c.status)] ?? 'en_attente', creeLeMs: Number.isFinite(t) ? t : null }
    })
}

/** Une collecte MoneRails → un `Encaissement`. Exporté pour les tests. */
export function versEncaissement(o: unknown): Encaissement {
  const c = (o ?? {}) as Record<string, unknown>
  return {
    id: String(c.id ?? ''),
    etat: ETATS[String(c.status)] ?? 'en_attente',
    montant: Number(c.amount),
    devise: String(c.currency ?? ''),
    operateur: typeof c.operator === 'string' && c.operator !== '' ? c.operator : null,
    test: enDirect(c) === false,
    action: action(c.next_action),
    rattachement: rattachement(c.metadata),
    echec: typeof c.failure_message === 'string' ? c.failure_message : (typeof c.failure_code === 'string' ? c.failure_code : null),
  }
}

/**
 * Vérifie `Monerail-Signature` (docs : https://docs.monerails.com/webhooks/).
 * Exporté pour les tests ; le secret est passé, jamais lu ici.
 */
export function signatureValide(corpsBrut: string, entete: string, secret: string, maintenant: number): boolean {
  let t = ''
  const v1: string[] = []
  for (const morceau of entete.split(',')) {
    const i = morceau.indexOf('=')
    if (i <= 0) continue
    const k = morceau.slice(0, i).trim()
    const v = morceau.slice(i + 1).trim()
    if (k === 't') t = v
    else if (k === 'v1') v1.push(v)
  }
  if (!/^\d+$/u.test(t) || v1.length === 0 || secret === '') return false
  if (Math.abs(maintenant - Number(t)) > TOLERANCE_AVIS_S) return false
  const attendu = createHmac('sha256', secret).update(`${t}.`).update(corpsBrut).digest()
  return v1.some((s) => {
    if (!/^[0-9a-f]+$/u.test(s)) return false
    const recu = Buffer.from(s, 'hex')
    return recu.length === attendu.length && timingSafeEqual(recu, attendu)
  })
}

/** Les secrets des avis, par mode. */
export const VARIABLE_SECRET_AVIS: Readonly<Record<RegimeMobileMoney, string>> = { test: 'MONERAILS_WEBHOOK_SECRET', reel: 'MONERAILS_WEBHOOK_SECRET_LIVE' }

/**
 * Le mode d'un avis : celui du secret qui le signe, et `livemode` doit
 * s'accorder (test → false, réel → true). `null` = refusé. Exporté pour les tests.
 */
export function regimeDeLAvis(corpsBrut: string, entete: string, secrets: Readonly<Record<RegimeMobileMoney, string>>, maintenant: number): RegimeMobileMoney | null {
  for (const regime of ['test', 'reel'] as const) {
    if (!signatureValide(corpsBrut, entete, secrets[regime], maintenant)) continue
    let e: unknown
    try { e = JSON.parse(corpsBrut) } catch { return null }
    const objet = (e as { data?: { object?: unknown } } | null)?.data?.object
    const enDirectLu = enDirect(objet) ?? enDirect(e)
    return enDirectLu === (regime === 'reel') ? regime : null
  }
  return null
}

export function creerMonerails(regime: RegimeMobileMoney): FournisseurMobileMoney {
  const appeler_ = (chemin: string, init: Parameters<typeof appeler>[2]) => appeler(regime, chemin, init)
  return {
  nom: 'monerails',

  async operateurs(devise, pays) {
    const r = (await appeler_(`/v1/operators?currency=${devise}&country=${pays}`, { method: 'GET' })) as { data?: unknown[] }
    return (r.data ?? []).map((o): Operateur => {
      const x = o as { code?: string; name?: string; authorization?: string[] }
      const v = (x.authorization ?? []).map((a) => (a === 'PIN' ? 'pin' : a === 'OTP' ? 'code' : a === 'REDIRECT' ? 'page' : 'aucune') as Operateur['validation'][number])
      return { code: String(x.code ?? ''), nom: String(x.name ?? x.code ?? ''), validation: v }
    }).filter((o) => o.code !== '')
  },

  async encaisser(d: DemandeEncaissement) {
    const corps = {
      amount: d.montant,
      currency: d.devise,
      country: d.pays,
      operator: d.operateur,
      phone: d.telephone,
      customer: { name: d.nomClient },
      description: d.description.slice(0, 500),
      client_reference: referenceClient(d.rattachement.app),
      metadata: {
        deribfy_app: d.rattachement.app,
        deribfy_proprietaire: d.rattachement.proprietaire,
        deribfy_objet: d.rattachement.objet,
        // Pour TRACE (retrouver 13 400 = 12 000 + 1 400) ; l'avis ne s'y fie pas.
        deribfy_montant: String(d.montant),
        deribfy_prix: String(d.ventilation.prix),
        deribfy_frais: String(d.ventilation.frais),
      },
    }
    return versEncaissement(await appeler_('/v1/collections', { method: 'POST', corps, idempotence: d.cle, journaliser: true }))
  },

  async lire(id) {
    return versEncaissement(await appeler_(`/v1/collections/${encodeURIComponent(id)}`, { method: 'GET' }))
  },

  async encaissementsDe(app) {
    // 100 = le maximum de la page, les plus récentes d'abord : une seule page suffit,
    // sauf plus de 100 demandes en 10 minutes pour UNE appli (non lu au-delà).
    return versOuverts(await appeler_(`/v1/collections?client_reference=${encodeURIComponent(referenceClient(app))}&limit=100`, { method: 'GET' }), app)
  },

  async autoriser(id, code) {
    // ── UNE CLÉ D'IDEMPOTENCE AUSSI ICI (2026-11-23) : la doc la demande « sur
    // chaque POST qui déplace de l'argent ». La même demande et le même code
    // donnent la même clé — un double clic ne confirme pas deux fois.
    return versEncaissement(await appeler_(`/v1/collections/${encodeURIComponent(id)}/authorize`, { method: 'POST', corps: { otp: code }, idempotence: cleConfirmation(id, code), journaliser: true }))
  },

  verifierAvis(corpsBrut, entetes, maintenantSecondes = Math.floor(Date.now() / 1000)) {
    const secrets = {
      test: (process.env[VARIABLE_SECRET_AVIS.test] ?? '').trim(),
      reel: (process.env[VARIABLE_SECRET_AVIS.reel] ?? '').trim(),
    }
    // Un avis est vérifié par LES DEUX secrets (une seule adresse de webhook) ;
    // son mode est celui du secret qui le signe, `livemode` concordant.
    if (regimeDeLAvis(corpsBrut, entetes.get('monerail-signature') ?? '', secrets, maintenantSecondes) === null) return null
    let e: { id?: unknown; type?: unknown; data?: { object?: unknown } }
    try { e = JSON.parse(corpsBrut) as typeof e } catch { return null }
    const type = e.type === 'collection.succeeded' ? 'encaissement_reussi'
      : e.type === 'collection.failed' || e.type === 'collection.expired' ? 'encaissement_echoue' : 'autre'
    const objet = e.data?.object
    const estCollecte = objet !== null && typeof objet === 'object' && (objet as { object?: unknown }).object === 'collection'
    // L'objet porte `livemode` dans l'exemple complet (webhook-events), pas dans
    // l'exemple court (webhooks) : à défaut, celui de l'enveloppe fait foi.
    const o = estCollecte && enDirect(objet) === undefined ? { ...(objet as object), [ENDIRECT]: enDirect(e) } : objet
    return { id: String(e.id ?? ''), type, encaissement: estCollecte ? versEncaissement(o) : null }
  },
}
}

/** Le TEST, gardé sous son ancien nom pour les appelants et les tests. */
export const monerails: FournisseurMobileMoney = creerMonerails('test')
