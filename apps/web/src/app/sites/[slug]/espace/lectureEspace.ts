// ============================================================================
// UNE LECTURE, PARTAGÉE (CPA, 2026-11-19).
//
// Mesuré en production : chaque route d'espace répond en ~1 s. Le tableau de
// bord attendait le compte, PUIS lisait les commandes — 4 à 6 s avant le
// premier chiffre. Ici, une même adresse lue avec le même jeton pendant la
// vie de la page ne part qu'UNE fois : la barre latérale lance la lecture des
// commandes en même temps que celle du compte, et le tableau reprend la même
// réponse au lieu d'en demander une seconde.
//
// Seulement pour des LECTURES (GET). Un envoi (POST, PATCH) ne passe jamais
// par ici, et chaque page de l'espace est un chargement complet : rien ne
// reste périmé d'une page à l'autre.
// ============================================================================

type Reponse = { ok: boolean; status: number; d: Record<string, unknown> | null }

const deja = new Map<string, Promise<Reponse>>()

export function lireAvecJeton(url: string, jeton: string): Promise<Reponse> {
  const cle = `${url}|${jeton}`
  let p = deja.get(cle)
  if (!p) {
    p = fetch(url, { headers: { Authorization: `Bearer ${jeton}` }, cache: 'no-store' })
      .then(async (r) => ({ ok: r.ok, status: r.status, d: (await r.json().catch(() => null)) as Record<string, unknown> | null }))
      .catch(() => ({ ok: false, status: 0, d: null }))
    deja.set(cle, p)
  }
  return p
}

/** Pour les tests : repartir d'une page neuve. */
export function oublierLectures() { deja.clear() }
