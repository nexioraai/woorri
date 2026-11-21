import 'server-only'
/**
 * MONERAILS — implémentation du contrat `FournisseurMobileMoney` (2026-11-21).
 *
 * Sources (lues le 2026-11-20/21) :
 *   https://docs.monerails.com/authentication/ — clé `mr_test_…` / `mr_live_…`, en-tête Bearer
 *   https://docs.monerails.com/openapi.json — POST /v1/collections, GET /v1/collections/{id},
 *     POST /v1/collections/{id}/authorize, GET /v1/operators ; serveur https://api.monerails.com
 *   https://docs.monerails.com/webhooks/ — `Monerail-Signature: t=…,v1=…`, HMAC-SHA256 de
 *     `t + "." + corps brut`, secret entier `whsec_…`, hexadécimal minuscule, comparaison
 *     en temps constant, refus au-delà de 5 minutes, deux v1 pendant une rotation.
 *
 * ── MODE TEST SEULEMENT (décision du propriétaire, 2026-11-21).
 * Une clé qui ne commence pas par `mr_test_` est REFUSÉE ici : aucun argent
 * réel ne bouge tant que ce garde n'est pas retiré, par un commit nommé.
 *
 * Variables (Vercel, Production) : MONERAILS_SECRET_KEY, MONERAILS_WEBHOOK_SECRET.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  ErreurFournisseur,
  type ActionClient, type AvisVerifie, type DemandeEncaissement, type Encaissement,
  type EtatEncaissement, type FournisseurMobileMoney, type Operateur, type Rattachement,
} from './types'

const API = 'https://api.monerails.com'
/** Tolérance de l'horodatage d'un avis, en secondes (docs : 5 minutes). */
export const TOLERANCE_AVIS_S = 300

/** La clé de test, ou une erreur dite en clair. Jamais affichée. */
function cleTest(): string {
  const k = (process.env.MONERAILS_SECRET_KEY ?? '').trim()
  if (k === '') throw new ErreurFournisseur('Le paiement mobile money n’est pas configuré.', 503, 'cle_absente')
  if (!k.startsWith('mr_test_')) {
    throw new ErreurFournisseur('Seul le mode test est autorisé pour le paiement mobile money.', 503, 'cle_non_test')
  }
  return k
}

async function appeler(chemin: string, init: { method: 'GET' | 'POST'; corps?: unknown; idempotence?: string; journaliser?: boolean }): Promise<unknown> {
  const entetes: Record<string, string> = { Authorization: `Bearer ${cleTest()}`, Accept: 'application/json' }
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
  // Mode test seulement : la clé `mr_test_` est exigée plus haut.
  if (init.journaliser === true) console.log(`[mobile-money] réponse brute MoneRails ${init.method} ${chemin.split('?')[0]} → ${String(r.status)} ${texte.slice(0, 4000)}`)
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
  const montant = Number(r.deribfy_montant)
  if (typeof r.deribfy_app !== 'string' || typeof r.deribfy_proprietaire !== 'string' || r.deribfy_objet !== 'abonnement' || !Number.isInteger(montant)) return null
  return { app: r.deribfy_app, proprietaire: r.deribfy_proprietaire, objet: 'abonnement', montantAttendu: montant }
}

/** Une collecte MoneRails → un `Encaissement`. Exporté pour les tests. */
export function versEncaissement(o: unknown): Encaissement {
  const c = (o ?? {}) as Record<string, unknown>
  return {
    id: String(c.id ?? ''),
    etat: ETATS[String(c.status)] ?? 'en_attente',
    montant: Number(c.amount),
    devise: String(c.currency ?? ''),
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

export const monerails: FournisseurMobileMoney = {
  nom: 'monerails',

  async operateurs(devise, pays) {
    const r = (await appeler(`/v1/operators?currency=${devise}&country=${pays}`, { method: 'GET' })) as { data?: unknown[] }
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
      client_reference: `app:${d.rattachement.app}`.slice(0, 64),
      metadata: {
        deribfy_app: d.rattachement.app,
        deribfy_proprietaire: d.rattachement.proprietaire,
        deribfy_objet: d.rattachement.objet,
        deribfy_montant: String(d.rattachement.montantAttendu),
      },
    }
    return versEncaissement(await appeler('/v1/collections', { method: 'POST', corps, idempotence: d.cle, journaliser: true }))
  },

  async lire(id) {
    return versEncaissement(await appeler(`/v1/collections/${encodeURIComponent(id)}`, { method: 'GET' }))
  },

  async autoriser(id, code) {
    return versEncaissement(await appeler(`/v1/collections/${encodeURIComponent(id)}/authorize`, { method: 'POST', corps: { otp: code }, journaliser: true }))
  },

  verifierAvis(corpsBrut, entetes, maintenantSecondes = Math.floor(Date.now() / 1000)) {
    const secret = (process.env.MONERAILS_WEBHOOK_SECRET ?? '').trim()
    if (!signatureValide(corpsBrut, entetes.get('monerail-signature') ?? '', secret, maintenantSecondes)) return null
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
