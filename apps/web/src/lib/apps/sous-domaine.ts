/**
 * UN SOUS-DOMAINE PAR APPLICATION — cpa-tchad.deribfy.com.
 *
 * ── LA DEMANDE DU PROPRIÉTAIRE, 2026-10-30.
 *
 * « chaque appli doit avoir appli.deribfy.com ». Le lien par jeton
 * (/p/8tdj8k3b…) fonctionne mais ne se retient pas, ne se dit pas au
 * téléphone, ne s'imprime pas sur une carte. Un nom, si.
 *
 * ── POURQUOI PAR L'API CLOUDFLARE, ET PAS UN WILDCARD VERCEL.
 *
 * Mesuré : les nameservers de deribfy.com sont chez Cloudflare
 * (june/emerson.ns.cloudflare.com). Un wildcard `*.deribfy.com` chez Vercel
 * exigerait d'y déménager le DNS entier — risqué, le proxy Cloudflare sert
 * le site. À la place, CHAQUE publication crée SON enregistrement :
 *
 *   ① CNAME `<nom>` → cname.vercel-dns.com chez Cloudflare (DNS only :
 *      proxied=false, sinon Vercel ne peut ni servir ni émettre le
 *      certificat) ;
 *   ② le domaine `<nom>.deribfy.com` est attaché au projet Vercel ;
 *   ③ le middleware route l'hôte vers l'œuvre.
 *
 * Les deux appels sont IDEMPOTENTS : republier un nom existant ne crée pas
 * de doublon et ne casse rien.
 *
 * ── LE JETON NE SORT JAMAIS D'ICI.
 *
 * `CLOUDFLARE_API_TOKEN` est borné à Zone/DNS/Edit sur deribfy.com — il ne
 * peut rien faire d'autre, et il vit dans l'environnement, jamais dans une
 * réponse ni un journal.
 */

/**
 * Les noms qu'une application ne peut PAS prendre.
 *
 * Deux familles : ceux qui désignent déjà le produit (www, api…) et ceux
 * qu'un escroc choisirait pour se faire passer pour nous (admin, login,
 * paiement…). Un sous-domaine d'application est servi en origine opaque,
 * mais l'ADRESSE, elle, est lue par des humains.
 */
export const NOMS_RESERVES: ReadonlySet<string> = new Set([
  'www', 'api', 'app', 'apps', 'admin', 'dashboard', 'mail', 'email',
  'login', 'auth', 'compte', 'account', 'paiement', 'payment', 'pay',
  'deribfy', 'support', 'aide', 'help', 'blog', 'docs', 'status', 'cdn',
  'assets', 'static', 'staging', 'dev', 'test', 'demo', 'ns1', 'ns2',
])

/**
 * Un nom valide : minuscules, chiffres, tirets intérieurs, 3 à 40 signes.
 * C'est la grammaire DNS, resserrée — pas de tiret en tête ni en queue,
 * pas de double tiret (lisibilité et homographes).
 */
export function nomValide(nom: string): boolean {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/u.test(nom)) return false
  if (nom.includes('--')) return false
  return !NOMS_RESERVES.has(nom)
}

/** Propose un nom à partir d'un texte libre — jamais imposé, toujours éditable. */
export function nomSuggere(texte: string): string {
  const brut = texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .replace(/-{2,}/gu, '-')
    .slice(0, 40)
    .replace(/-+$/u, '')
  return nomValide(brut) ? brut : `app-${brut}`.slice(0, 40).replace(/-+$/u, '')
}

type Clefs = {
  readonly cloudflareToken: string
  readonly vercelToken: string
  readonly vercelProjectId: string
}

export type ResultatSousDomaine =
  | { readonly ok: true; readonly hote: string }
  | { readonly ok: false; readonly erreur: string }

/**
 * Crée (ou retrouve) `<nom>.deribfy.com` : DNS chez Cloudflare, domaine chez
 * Vercel. Idempotent des deux côtés.
 */
export async function creerSousDomaine(nom: string, clefs: Clefs): Promise<ResultatSousDomaine> {
  if (!nomValide(nom)) return { ok: false, erreur: 'nom invalide ou réservé' }
  const hote = `${nom}.deribfy.com`
  const cf = { Authorization: `Bearer ${clefs.cloudflareToken}`, 'content-type': 'application/json' }

  // ── LA ZONE, RETROUVÉE PAR SON NOM — jamais un id écrit en dur, qui
  // survivrait à une migration de compte et pointerait dans le vide.
  const zr = (await (
    await fetch('https://api.cloudflare.com/client/v4/zones?name=deribfy.com', { headers: cf })
  ).json()) as { success?: boolean; result?: { id: string }[] }
  const zone = zr.result?.[0]?.id
  if (zone === undefined) return { ok: false, erreur: 'zone deribfy.com introuvable chez Cloudflare' }

  // ── ① LE CNAME, S'IL N'EXISTE PAS DÉJÀ.
  const existants = (await (
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zone}/dns_records?type=CNAME&name=${hote}`,
      { headers: cf },
    )
  ).json()) as { result?: { id: string; content?: string }[] }
  if ((existants.result ?? []).length === 0) {
    const cr = (await (
      await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/dns_records`, {
        method: 'POST',
        headers: cf,
        body: JSON.stringify({
          type: 'CNAME',
          name: nom,
          content: 'cname.vercel-dns.com',
          // DNS ONLY, PAS DE PROXY : derrière le nuage orange, Vercel ne
          // verrait pas l'hôte et ne pourrait pas émettre le certificat —
          // c'est le 525 déjà vu sur ce domaine, recréé volontairement.
          proxied: false,
          ttl: 1,
          comment: 'Application Deribfy — créé automatiquement à la publication',
        }),
      })
    ).json()) as { success?: boolean; errors?: { message?: string }[] }
    if (cr.success !== true) {
      return { ok: false, erreur: `DNS refusé : ${cr.errors?.[0]?.message ?? 'inconnu'}` }
    }
  }

  // ── ② LE DOMAINE CHEZ VERCEL. 409 = déjà attaché : c'est un succès.
  const vr = await fetch(`https://api.vercel.com/v10/projects/${clefs.vercelProjectId}/domains`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${clefs.vercelToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name: hote }),
  })
  if (!vr.ok && vr.status !== 409) {
    const corps = (await vr.json().catch(() => null)) as { error?: { message?: string } } | null
    return { ok: false, erreur: `Vercel refuse le domaine : ${corps?.error?.message ?? vr.status}` }
  }

  return { ok: true, hote }
}
