const VERCEL_API = 'https://api.vercel.com';

function vercelCreds() {
  const token = process.env.VERCEL_API_TOKEN || '';
  const projectId = process.env.VERCEL_PROJECT_ID || '';
  if (!token || !projectId) throw new Error('Identifiants Vercel absents');
  return { token, projectId };
}

export type VercelDomainResult = {
  ok: true;
  alreadyExists: boolean;
  /** M2-220 — le sous-domaine www est-il rattache lui aussi ? Faux = il ne
   *  repondra pas, et l appelant ne doit pas promettre le contraire. */
  wwwAttache: boolean;
  /** Enregistrements a poser dans la zone DNS pour que le domaine resolve. */
  dns: { type: 'A' | 'CNAME'; name: string; value: string }[];
  /**
   * TXT exiges par Vercel pour prouver la propriete du domaine. Tant qu'ils
   * ne sont pas dans la zone, Vercel refuse de servir le domaine et c'est
   * l'ancien hebergeur qui repond.
   */
  verification: { type: string; domain: string; value: string }[];
};

/** Cible Vercel pour la racine (A) et pour www (CNAME). */
export const VERCEL_A_RECORD = '76.76.21.21';
export const VERCEL_CNAME = 'cname.vercel-dns.com';

/**
 * Rattache un domaine au projet Vercel.
 * Partage par les deux parcours : domaine externe apporte par le marchand
 * (qui configure ensuite son DNS lui-meme) et domaine achete via Nexiora
 * (ou l'ecriture DNS est faite par API cote Porkbun).
 * Un domaine deja rattache n'est pas une erreur : l'operation est idempotente.
 */
export async function addDomainToVercel(domain: string): Promise<VercelDomainResult> {
  const { token, projectId } = vercelCreds();
  const res = await fetch(VERCEL_API + '/v10/projects/' + projectId + '/domains', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: domain }),
  });
  const data = await res.json().catch(() => null);

  // Vercel renvoie plusieurs codes pour un domaine deja rattache a CE projet
  // (domain_already_exists, domain_already_in_use...). Aucun n'est une erreur :
  // le domaine est la, il reste seulement a poser le DNS.
  const msg = String(data?.error?.message || '');
  const alreadyExists =
    data?.error?.code === 'domain_already_exists' ||
    data?.error?.code === 'domain_already_in_use' ||
    /already in use/i.test(msg);
  if (!res.ok && !alreadyExists) {
    throw new Error(data?.error?.message || 'Erreur Vercel ' + res.status);
  }

  // ============================================================
  // M2-220 — `www` EST RATTACHÉ AUSSI, ET C'ÉTAIT LA MOITIÉ MANQUANTE.
  //
  // DÉFAUT MESURÉ SUR DEUX BOUTIQUES RÉELLES (alloufshop.com ET
  // chanorfie.com, à l'identique) :
  //     https://<domaine>      → 200  ✅
  //     https://www.<domaine>  → 000  ❌ aucun certificat, connexion refusée
  //
  // La cause tenait en une incohérence interne : `dns` ci-dessous DEMANDE au
  // marchand de pointer `www` vers Vercel — et Vercel ne connaissait pas ce
  // nom, faute qu'on le lui ait déclaré. Le client faisait donc exactement ce
  // qu'on lui disait, et obtenait une adresse morte.
  //
  // POURQUOI PERSONNE NE L'AVAIT VU : le domaine nu marche, lui. Il faut
  // ouvrir l'adresse AVEC `www` pour tomber dessus — ce que font beaucoup de
  // navigateurs mobiles et les aperçus de liens partagés. Deux boutiques
  // livrées portaient le défaut.
  //
  // L'ÉCHEC DE CE SECOND RATTACHEMENT NE FAIT PAS ÉCHOUER LE PREMIER : le
  // domaine nu reste servi, et `wwwAttache` dit la vérité à l'appelant plutôt
  // que de promettre une adresse qui ne répondrait pas.
  // ============================================================
  let wwwAttache = false;
  if (!domain.startsWith('www.')) {
    try {
      const resWww = await fetch(VERCEL_API + '/v10/projects/' + projectId + '/domains', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'www.' + domain }),
      });
      const dataWww = await resWww.json().catch(() => null);
      const msgWww = String(dataWww?.error?.message || '');
      wwwAttache =
        resWww.ok ||
        dataWww?.error?.code === 'domain_already_exists' ||
        dataWww?.error?.code === 'domain_already_in_use' ||
        /already in use/i.test(msgWww);
    } catch {
      wwwAttache = false;
    }
  }

  return {
    ok: true,
    alreadyExists,
    wwwAttache,
    verification: Array.isArray(data?.verification) ? data.verification : [],
    dns: [
      { type: 'A', name: '@', value: VERCEL_A_RECORD },
      { type: 'CNAME', name: 'www', value: VERCEL_CNAME },
    ],
  };
}

/**
 * Etat de verification cote Vercel.
 * verified passe a true quand les enregistrements DNS pointent correctement.
 * L'endpoint /domains/{domain} du projet est le seul fiable : la variante
 * /config renvoie 404 sur cette version d'API.
 */
export async function getVercelDomainStatus(domain: string): Promise<{
  attached: boolean;
  verified: boolean;
  verification: { type: string; domain: string; value: string }[];
}> {
  const { token, projectId } = vercelCreds();
  const res = await fetch(
    VERCEL_API + '/v9/projects/' + projectId + '/domains/' + encodeURIComponent(domain),
    { headers: { Authorization: 'Bearer ' + token } }
  );
  const data = await res.json().catch(() => null);
  if (res.status === 404) return { attached: false, verified: false, verification: [] };
  if (!res.ok) throw new Error(data?.error?.message || 'Erreur Vercel ' + res.status);
  return {
    attached: true,
    verified: data?.verified === true,
    verification: Array.isArray(data?.verification) ? data.verification : [],
  };
}

/**
 * Demande a Vercel de relire le DNS et de valider la propriete du domaine.
 * Sans cet appel, le TXT _vercel peut etre en place sans que Vercel le sache :
 * le domaine reste non verifie et l'ancien hebergeur continue de repondre.
 */
export async function verifyVercelDomain(domain: string): Promise<boolean> {
  const { token, projectId } = vercelCreds();
  const res = await fetch(
    VERCEL_API + '/v9/projects/' + projectId + '/domains/' + encodeURIComponent(domain) + '/verify',
    { method: 'POST', headers: { Authorization: 'Bearer ' + token } }
  );
  const data = await res.json().catch(() => null);
  return res.ok && data?.verified === true;
}

/**
 * Detache un domaine du projet d'hebergement.
 *
 * IDEMPOTENT PAR CONSTRUCTION : un domaine deja absent (404) n'est pas une
 * erreur -- le resultat vise est « ce domaine n'est plus rattache », et il est
 * atteint. Sans cela, un second detachement ou une reprise apres panne
 * echouerait sur un etat pourtant correct.
 */
export async function removeDomainFromVercel(domain: string): Promise<{ ok: true; dejaAbsent: boolean }> {
  const { token, projectId } = vercelCreds();
  const res = await fetch(
    VERCEL_API + '/v9/projects/' + projectId + '/domains/' + encodeURIComponent(domain),
    { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }
  );
  // M2-220 — SYMÉTRIE DU RATTACHEMENT : `addDomainToVercel` attache aussi
  // `www.<domaine>` ; le détacher sans lui laisserait un sous-domaine
  // orphelin sur le projet, qui bloquerait sa reprise par un autre site.
  // Son échec n'empêche pas le détachement principal, déjà acquis.
  if (!domain.startsWith('www.')) {
    try {
      await fetch(
        VERCEL_API + '/v9/projects/' + projectId + '/domains/' + encodeURIComponent('www.' + domain),
        { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }
      );
    } catch {
      /* le domaine nu est détaché : c'est le résultat qui compte */
    }
  }
  if (res.status === 404) return { ok: true, dejaAbsent: true };
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message || 'Erreur Vercel ' + res.status);
  }
  return { ok: true, dejaAbsent: false };
}
