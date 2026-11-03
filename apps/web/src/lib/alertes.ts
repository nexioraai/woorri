/**
 * ALERTER — la ligne d'abord, la poussée ensuite.
 *
 * ── CE QUE CE MODULE EXISTE POUR EMPÊCHER.
 *
 * Le 2026-11-03, le propriétaire a découvert que son produit ne générait
 * plus EN ESSAYANT DE S'EN SERVIR. Ses mots : « je dois automatiquement
 * être au courant quand ça ne génère pas. »
 *
 * ── L'ORDRE DES DEUX GESTES EST LA GARANTIE.
 *
 * On ÉCRIT, puis on POUSSE. La ligne est la trace, la poussée est le
 * signal. Si Telegram est injoignable — et au Tchad l'accès aux réseaux
 * sociaux a déjà été restreint — rien n'est perdu, et la ligne porte
 * `remise = false` avec son motif : une alerte non remise SE VOIT.
 *
 * L'ordre inverse (pousser puis écrire) perdrait l'alerte à chaque fois que
 * l'écriture échoue, c'est-à-dire exactement quand la base va mal — le
 * moment où l'on a le plus besoin de savoir.
 *
 * ── ET ELLE NE LÈVE JAMAIS.
 *
 * Une alerte qui casse la requête qu'elle observe transforme un incident en
 * deux. Toute erreur ici part dans `console.error` et s'arrête là.
 */
/**
 * LA CLÉ DE SERVICE SE CHARGE À L'USAGE, pas à l'import.
 *
 * `supabase-admin` LÈVE au chargement si la variable manque. Importé en
 * tête, ce module devenait donc inutilisable partout où la clé n'est pas
 * là — y compris pour `texteAlerte`, qui ne touche aucune base. Un module
 * qui exige un secret pour formater une phrase est un module qu'on ne peut
 * pas éprouver.
 */
async function base() {
  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  return supabaseAdmin
}

/** Les étapes nommées, pour qu'on puisse COMPTER au lieu de lire des phrases. */
export type EtapeAlerte =
  | 'modele'
  | 'validation'
  | 'ecriture'
  | 'reponse-perdue'
  | 'publication'
  | 'inconnue'

export type Alerte = {
  readonly sujet: 'boutique' | 'oeuvre'
  readonly sujetId?: string | null
  readonly ownerEmail?: string | null
  readonly motif: string
  readonly etape: EtapeAlerte
  readonly detail?: string | null
  readonly coutUsd?: number | null
}

/** Le canal est configuré, ou il ne l'est pas — et on le dit. */
function canal(): { jeton: string; salon: string } | null {
  const jeton = process.env.TELEGRAM_BOT_TOKEN ?? ''
  const salon = process.env.TELEGRAM_CHAT_ID ?? ''
  return jeton === '' || salon === '' ? null : { jeton, salon }
}

/**
 * LE TEXTE POUSSÉ — court, et il porte ce qu'il faut pour agir.
 *
 * Une alerte qu'on doit aller croiser avec une base pour comprendre est une
 * alerte qu'on finit par ignorer. Celle-ci dit : quoi, où, pourquoi, et si
 * ça a coûté de l'argent.
 */
export function texteAlerte(a: Alerte): string {
  const lignes = [
    `⚠️ Deribfy — ${a.sujet} : ${a.etape}`,
    a.motif,
    ...(a.sujetId === null || a.sujetId === undefined ? [] : [`id : ${a.sujetId}`]),
    ...(a.ownerEmail === null || a.ownerEmail === undefined ? [] : [`client : ${a.ownerEmail}`]),
    ...(a.coutUsd === null || a.coutUsd === undefined
      ? []
      : [`facturé : ${a.coutUsd.toFixed(4)} $`]),
    ...(a.detail === null || a.detail === undefined ? [] : [a.detail.slice(0, 300)]),
  ]
  return lignes.join('\n')
}

/**
 * ÉCRIT L'ALERTE, PUIS TENTE DE LA REMETTRE.
 *
 * Rend l'identifiant de la ligne, ou `null` si même l'écriture a échoué —
 * auquel cas le contenu part dans `console.error`, qui est la dernière
 * trace possible.
 */
export async function alerter(a: Alerte): Promise<string | null> {
  const ligne = {
    sujet: a.sujet,
    sujet_id: a.sujetId ?? null,
    owner_email: a.ownerEmail ?? null,
    motif: a.motif.slice(0, 500),
    etape: a.etape,
    detail: a.detail?.slice(0, 2000) ?? null,
    cout_usd: a.coutUsd ?? null,
    canal: canal() === null ? null : 'telegram',
  }

  let id: string | null = null
  try {
    // ① LA TRACE. Le client Supabase ne LÈVE PAS sur une erreur d'écriture :
    //    on lit `error`, sinon l'échec serait invisible (défaut déjà trouvé
    //    en audit sur `logGenerationFailure`).
    const ecrit = await (await base()).from('alertes_generation').insert(ligne).select('id').single()
    if (ecrit.error !== null) {
      console.error('[alertes] écriture impossible :', ecrit.error.message, JSON.stringify(ligne))
    } else {
      id = ecrit.data.id as string
    }
  } catch (e) {
    console.error('[alertes] écriture impossible :', e, JSON.stringify(ligne))
  }

  // ② LE SIGNAL. Son échec ne retire rien à la trace.
  const c = canal()
  if (c === null) {
    await noterRemise(id, false, 'canal non configuré (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)')
    return id
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${c.jeton}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: c.salon, text: texteAlerte(a), disable_web_page_preview: true }),
      // Une alerte qui bloque la requête qu'elle observe aggrave l'incident.
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) {
      await noterRemise(id, false, `telegram HTTP ${String(r.status)} ${(await r.text()).slice(0, 200)}`)
      return id
    }
    await noterRemise(id, true, null)
  } catch (e) {
    await noterRemise(id, false, e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200))
  }
  return id
}

/** Marque la ligne remise — ou non remise AVEC son motif. */
async function noterRemise(
  id: string | null,
  remise: boolean,
  erreur: string | null,
): Promise<void> {
  if (id === null) {
    if (!remise) console.error('[alertes] non remise et non écrite :', erreur)
    return
  }
  try {
    const r = await (await base())
      .from('alertes_generation')
      .update({ remise, remise_erreur: erreur, remise_at: new Date().toISOString() })
      .eq('id', id)
    if (r.error !== null) console.error('[alertes] état de remise non écrit :', r.error.message)
  } catch (e) {
    console.error('[alertes] état de remise non écrit :', e)
  }
}
