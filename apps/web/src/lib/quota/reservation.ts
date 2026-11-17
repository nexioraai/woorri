/**
 * LA RÉSERVATION D'UNE PLACE DE QUOTA — atomique, en une seule instruction SQL
 * (2026-11-17, décision du propriétaire : « répare l'ancien d'abord »).
 *
 * ── LE DÉFAUT QUE CE MODULE FERME.
 *
 * Le quota des sites (3 gratuits) LISAIT le compteur au début de
 * `api/chat` et ne l'INCRÉMENTAIT qu'à la fin, après toute la dépense, par
 * `upsert(generation_count: lu + 1)`. Deux requêtes lancées ensemble lisaient
 * la même valeur, passaient toutes les deux, et écrivaient toutes les deux
 * « lu + 1 » : deux sites pour une place, et le compteur n'en comptait qu'un.
 *
 * ── LA FORME : UN COMPARE-AND-SET.
 *
 * `remplacerSi(id, k, k + 1)` se traduit par UNE instruction :
 *
 *     UPDATE profiles SET generation_count = k + 1
 *      WHERE id = $id AND generation_count = k
 *     RETURNING generation_count
 *
 * Sous READ COMMITTED, deux UPDATE concurrents de la même ligne se
 * sérialisent : le second attend le verrou de ligne, puis RÉÉVALUE sa clause
 * WHERE sur la valeur commitée (k + 1 ≠ k) et ne touche rien. Une seule
 * requête obtient la place ; l'autre relit et recommence, ou est refusée.
 *
 * Pourquoi pas une fonction SQL `insert … on conflict do update … where` :
 * elle exigerait une migration dans la base de production. Le CAS passe par
 * l'API qui existe déjà, avec la clé de service, sans rien poser en base.
 *
 * ── LA PLACE SE RÉSERVE AVANT DE DÉPENSER, ET SE REND SI RIEN N'EST CRÉÉ.
 *
 * Le compteur garde son sens d'avant : le nombre de sites CRÉÉS. Une
 * génération qui échoue rend sa place (`rendrePlace`, même CAS en sens
 * inverse), exactement comme l'ancien code ne comptait que les réussites.
 *
 * ── UNE PANNE DE LA BASE NE BLOQUE PAS (comme avant).
 *
 * L'ancien code laissait passer quand la lecture échouait (compteur lu
 * comme 0) et avalait l'échec de l'incrément. Ce module garde ce choix — une
 * panne de la table `profiles` ne doit pas empêcher toute création de site —
 * mais le DIT : `{ ok: true, reservee: false, panne }`, journalisé par
 * l'appelant. Ce n'est PAS un contournement possible par le client : la
 * panne est côté serveur, le client ne peut pas la provoquer.
 */

/** Ce dont la réservation a besoin, et rien de plus. */
export type PortCompteur = {
  /** Crée la ligne à 0 si elle n'existe pas ; ne touche jamais une ligne existante. */
  creerSiAbsente: (id: string) => Promise<{ erreur?: string }>
  lire: (id: string) => Promise<{ valeur: number | null; erreur?: string }>
  /** UNE instruction : passe de `attendu` à `nouveau` seulement si la valeur est encore `attendu`. */
  remplacerSi: (id: string, attendu: number, nouveau: number) => Promise<{ change: boolean; erreur?: string }>
}

export type Reservation =
  | { ok: true; reservee: true; rang: number }
  | { ok: true; reservee: false; panne: string }
  | { ok: false; utilisees: number }

/** Au-delà, la ligne est disputée sans fin : on refuse plutôt que de tourner. */
export const ESSAIS_MAX = 8

export async function reserverPlace(port: PortCompteur, id: string, limite: number): Promise<Reservation> {
  const creee = await port.creerSiAbsente(id)
  if (creee.erreur !== undefined) return { ok: true, reservee: false, panne: `création : ${creee.erreur}` }

  for (let essai = 0; essai < ESSAIS_MAX; essai += 1) {
    const lu = await port.lire(id)
    if (lu.erreur !== undefined || lu.valeur === null) {
      return { ok: true, reservee: false, panne: `lecture : ${lu.erreur ?? 'ligne absente'}` }
    }
    if (lu.valeur >= limite) return { ok: false, utilisees: lu.valeur }
    const cas = await port.remplacerSi(id, lu.valeur, lu.valeur + 1)
    if (cas.erreur !== undefined) return { ok: true, reservee: false, panne: `réservation : ${cas.erreur}` }
    if (cas.change) return { ok: true, reservee: true, rang: lu.valeur + 1 }
    // Une autre requête a pris la valeur entre la lecture et le CAS : on relit.
  }
  // Disputée plus de ESSAIS_MAX fois de suite : c'est une rafale, pas un client.
  const fin = await port.lire(id)
  return { ok: false, utilisees: fin.valeur ?? limite }
}

/** Rend une place réservée et non consommée. Ne descend jamais sous 0. */
export async function rendrePlace(port: PortCompteur, id: string): Promise<{ rendue: boolean; panne?: string }> {
  for (let essai = 0; essai < ESSAIS_MAX; essai += 1) {
    const lu = await port.lire(id)
    if (lu.erreur !== undefined || lu.valeur === null) return { rendue: false, panne: `lecture : ${lu.erreur ?? 'ligne absente'}` }
    if (lu.valeur <= 0) return { rendue: false }
    const cas = await port.remplacerSi(id, lu.valeur, lu.valeur - 1)
    if (cas.erreur !== undefined) return { rendue: false, panne: `restitution : ${cas.erreur}` }
    if (cas.change) return { rendue: true }
  }
  return { rendue: false, panne: 'ligne disputée' }
}

/** Le client minimal dont `portProfiles` se sert — celui de `supabaseAdmin`. */
type ClientProfiles = {
  from: (table: 'profiles') => {
    upsert: (ligne: { id: string; generation_count: number }, o: { onConflict: string; ignoreDuplicates: boolean }) => PromiseLike<{ error: { message: string } | null }>
    select: (c: 'generation_count') => {
      eq: (k: 'id', v: string) => { maybeSingle: () => PromiseLike<{ data: { generation_count: number | null } | null; error: { message: string } | null }> }
    }
    update: (v: { generation_count: number }) => {
      eq: (k: 'id', v: string) => {
        eq: (k: 'generation_count', v: number) => {
          select: (c: 'generation_count') => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
        }
      }
    }
  }
}

/**
 * Le compteur des SITES : `profiles.generation_count`, par la clé de service.
 *
 * `client` arrive tel quel (`supabaseAdmin`) : confronter son type complet à
 * `ClientProfiles` fait échouer TypeScript (TS2589, instanciation trop
 * profonde, mesuré le 2026-11-17). Le type minimal s'applique donc ici, en
 * un seul endroit — et les tests l'exercent avec un client qui n'a QUE lui.
 */
export function portProfiles(clientBrut: unknown): PortCompteur {
  const client = clientBrut as ClientProfiles
  return {
    async creerSiAbsente(id) {
      // INSERT … ON CONFLICT (id) DO NOTHING : une ligne existante n'est jamais remise à 0.
      const { error } = await client.from('profiles').upsert({ id, generation_count: 0 }, { onConflict: 'id', ignoreDuplicates: true })
      return error === null ? {} : { erreur: error.message }
    },
    async lire(id) {
      const { data, error } = await client.from('profiles').select('generation_count').eq('id', id).maybeSingle()
      if (error !== null) return { valeur: null, erreur: error.message }
      // NULL n'est pas 0 : `generation_count = 0` ne le reconnaîtrait jamais,
      // et le CAS tournerait à vide. On le rend comme une panne, qui laisse
      // passer comme avant, au lieu d'un refus. Aucune ligne NULL en base au
      // 2026-11-17 (répartition mesurée : 0, 1, 2, 3).
      if (data !== null && data.generation_count === null) return { valeur: null, erreur: 'generation_count NULL' }
      return { valeur: data === null ? null : data.generation_count }
    },
    async remplacerSi(id, attendu, nouveau) {
      const { data, error } = await client
        .from('profiles')
        .update({ generation_count: nouveau })
        .eq('id', id)
        .eq('generation_count', attendu)
        .select('generation_count')
      if (error !== null) return { change: false, erreur: error.message }
      return { change: (data ?? []).length === 1 }
    },
  }
}
