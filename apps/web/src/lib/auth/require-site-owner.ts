import { NextResponse } from 'next/server';
import { supabase as supabaseAnon } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

type OwnerCheck =
  /** M2-219 — `viaAdmin` : l'accès est celui de l'OPÉRATEUR de la
   *  plateforme, pas du propriétaire. L'appelant doit le journaliser. */
  { ok: true; site: any; email?: string; viaAdmin?: boolean } |
  { ok: false; response: NextResponse };

/**
 * Verifie que le porteur du token est bien proprietaire du site.
 * Retourne soit le site, soit la reponse d'erreur a renvoyer telle quelle.
 *
 * Sans ce controle, n'importe qui peut lire, modifier les prix ou supprimer
 * les produits d'une boutique qui ne lui appartient pas.
 *
 * Audit Mode 3/POD BRAND, perfectionnement -- cause racine : `sites.owner_id`
 * (supabase/sql/sites_owner_id_step1_add_column.sql) est une colonne
 * additive SANS backfill -- seuls les sites crees APRES ce chantier
 * (src/app/api/chat/route.ts) l'ont renseignee ; aucun fichier de migration
 * "step2" n'existe dans supabase/sql/ pour les sites reels preexistants.
 * Comparer uniquement sur owner_id (comme avant ce correctif) aurait donc
 * renvoye 403 a TOUT proprietaire legitime d'un site preexistant sur TOUTES
 * les routes qui appellent ce garde-fou (generate-mockups, catalog/curate,
 * catalog/enhance, catalog/selections, sites/[slug]/archive, stripe/portal)
 * -- une regression fonctionnelle reelle, pas seulement theorique, sur le
 * coeur de POD BRAND. owner_id reste la verification stricte et prioritaire
 * (identite stable, insensible a un changement d'email) ; le repli sur
 * owner_email ne s'applique QUE quand owner_id est encore null cote DB (site
 * pas encore backfille), jamais quand owner_id est renseigne mais different
 * de l'utilisateur courant -- aucun affaiblissement de la garde pour les
 * sites deja migres. Voir sites_owner_id_step2_backfill.sql : une fois ce
 * backfill execute et verifie, tous les sites ont owner_id non-null et ce
 * repli ne s'exerce plus jamais en pratique (code inchange requis).
 */
/**
 * M2-02 -- coeur partage. Extrait pour que la resolution PAR SLUG et la
 * resolution PAR ID appliquent EXACTEMENT la meme regle de propriete : c'est
 * la divergence entre implementations qui etait le defaut, pas la regle
 * elle-meme. `apply` ne choisit que la CLE de recherche ; tout le reste --
 * verification du jeton, colonnes ajoutees d'office, priorite owner_id,
 * codes de reponse -- est commun par construction.
 */
async function resolveOwnedSite(
  req: Request,
  columns: string,
  apply: (q: ReturnType<ReturnType<typeof supabaseAdmin.from>['select']>) => any
): Promise<OwnerCheck> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'Non authentifie.' }, { status: 401 }) };
  }

  const { data: { user }, error: authErr } = await supabaseAnon.auth.getUser(token);
  if (authErr || !user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Non authentifie.' }, { status: 401 }) };
  }

  let select = columns.includes('owner_id') ? columns : columns + ', owner_id';
  if (!select.includes('owner_email')) select += ', owner_email';
  const { data: site } = await apply(supabaseAdmin.from('sites').select(select)).maybeSingle();

  if (!site) {
    return { ok: false, response: NextResponse.json({ error: 'Site introuvable' }, { status: 404 }) };
  }

  const siteOwnerId = (site as any).owner_id;
  const isOwner = siteOwnerId != null
    ? siteOwnerId === user.id
    : !!user.email && (site as any).owner_email === user.email;
  // ============================================================
  // M2-219 — L'OPÉRATEUR DE LA PLATEFORME AGIT POUR SES CLIENTS.
  //
  // BESOIN RÉEL, MESURÉ : les marchands tchadiens paient comptant et ne
  // feront jamais les manipulations techniques (DNS, connexion de
  // domaine). Youssouf publie déjà pour eux (M2-212) ; sans ceci, la
  // moitié du parcours reste hors de portée de la clientèle visée — il
  // recevait « Accès refusé » sur le site d'un client qu'il accompagne.
  //
  // LA GARDE N'EST PAS AFFAIBLIE : la liste est NOMINATIVE, versionnée,
  // et identique à celle des routes admin existantes
  // (site-publish-override, site-archive-override, ai-usage, stats).
  // Un marchand ne gagne AUCUN droit sur le site d'un autre — seul
  // l'opérateur passe, et son passage est SIGNALÉ à l'appelant
  // (`viaAdmin`) pour qu'il le journalise.
  // ============================================================
  const ADMIN_EMAILS = ['issayamiyoussouf@gmail.com'];
  const isAdmin = !!user.email && ADMIN_EMAILS.includes(user.email);
  if (!isOwner && !isAdmin) {
    return { ok: false, response: NextResponse.json({ error: 'Acces refuse.' }, { status: 403 }) };
  }

  return { ok: true, site, email: user.email, viaAdmin: !isOwner && isAdmin };
}

/** Verifie la propriete d'un site identifie par son SLUG. */
export async function requireSiteOwner(
  req: Request,
  slug: string,
  columns = 'id'
): Promise<OwnerCheck> {
  return resolveOwnedSite(req, columns, (q) => q.eq('slug', slug));
}

/**
 * Verifie la propriete d'un site identifie par son ID.
 *
 * M2-02 -- necessaire pour `shop/products/[id]`, seule route du perimetre qui
 * part d'un identifiant de PRODUIT : elle resout `product.site_id`, puis doit
 * verifier ce site. La faire passer par le slug aurait exige une requete
 * supplementaire pour traduire l'id en slug, sans rien apporter.
 * Meme regle, meme code, seule la cle de recherche change.
 */
export async function requireSiteOwnerById(
  req: Request,
  siteId: string,
  columns = 'id'
): Promise<OwnerCheck> {
  return resolveOwnedSite(req, columns, (q) => q.eq('id', siteId));
}
