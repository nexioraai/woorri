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
 * S'assurer qu'un certificat TLS existe pour ce domaine, et le demander sinon.
 *
 * ============================================================
 * SANS CERTIFICAT, LE DOMAINE EST VERIFIE ET LA BOUTIQUE EST MORTE.
 *
 * DEFAUT CONSTATE SUR alloufbusiness.com, 2026-09-27. Vercel repondait
 * `verified: true`, le DNS etait exact, `misconfigured: false` — et AUCUN
 * certificat n'existait. Consequence pour le visiteur :
 *   https://domaine       ne s'ouvre pas du tout (pas de poignee de main TLS)
 *   http://domaine        404
 * Le marchand voyait « Domaine verifie » et ses clients une page morte.
 *
 * POURQUOI CA ARRIVE, ET POURQUOI CA SE REPETERAIT.
 *
 * Vercel emet le certificat automatiquement au rattachement. Mais au moment
 * du rattachement, le DNS ne pointe pas encore : le marchand ne voit les
 * enregistrements a creer qu'APRES. L'emission echoue donc, et Vercel ne
 * la relance jamais. Le domaine devient « verifie » une heure plus tard,
 * sans que rien ne redemande le certificat.
 *
 * C'est l'ordre NORMAL du parcours : tout marchand apportant son domaine
 * passait par la. Corriger un domaine a la main n'aurait ferme que celui-la.
 *
 * POURQUOI ICI, ET NON CHEZ LES APPELANTS.
 *
 * Deux parcours verifient aujourd'hui — le bouton « Verifier maintenant »
 * (BYOD) et le provisioning d'un domaine achete. Poser l'appel dans chacun
 * laisserait le troisieme, celui qui n'existe pas encore, retomber dans le
 * defaut. La verification est le seul passage oblige : c'est la que le
 * cliquet tient.
 *
 * ON REGARDE AVANT DE DEMANDER. Let's Encrypt limite les emissions ; le
 * bouton « Verifier maintenant » est clicable en boucle. Un certificat deja
 * present sort immediatement, sans rien demander.
 * ============================================================
 *
 * @returns `existant` si un certificat couvre deja le domaine, `demande` si
 *   l'emission vient d'etre lancee, `echec` si Vercel a refuse. L'echec n'est
 *   jamais propage : la verification, elle, a reussi.
 */
export async function assurerCertificat(domain: string): Promise<'existant' | 'demande' | 'echec'> {
  const { token } = vercelCreds();
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  // Un certificat couvre le nu ET le www : appele avec `www.x.com`, on ne
  // doit pas aller demander `www.www.x.com`.
  const nu = domain.replace(/^www\./, '');

  try {
    const existants = await fetch(VERCEL_API + '/v7/certs?domain=' + encodeURIComponent(nu), { headers });
    const data = await existants.json().catch(() => null);
    if (existants.ok && Array.isArray(data?.certs) && data.certs.length > 0) return 'existant';

    const emission = await fetch(VERCEL_API + '/v7/certs', {
      method: 'POST',
      headers,
      body: JSON.stringify({ cns: [nu, 'www.' + nu] }),
    });
    if (!emission.ok) {
      const err = await emission.json().catch(() => null);
      console.warn('[vercel] certificat refuse pour', nu, err?.error?.message || emission.status);
      return 'echec';
    }
    return 'demande';
  } catch (e) {
    // Le reseau peut tomber. La verification a deja reussi : on ne transforme
    // pas un certificat manquant en echec de verification, sinon le marchand
    // verrait « non verifie » alors que son DNS est juste.
    console.warn('[vercel] certificat impossible pour', nu, e instanceof Error ? e.message : e);
    return 'echec';
  }
}

/**
 * Demande a Vercel de relire le DNS et de valider la propriete du domaine.
 * Sans cet appel, le TXT _vercel peut etre en place sans que Vercel le sache :
 * le domaine reste non verifie et l'ancien hebergeur continue de repondre.
 *
 * Une verification reussie declenche `assurerCertificat` : voir la-bas
 * pourquoi un domaine verifie pouvait rester sans certificat, donc mort.
 */
export async function verifyVercelDomain(domain: string): Promise<boolean> {
  const { token, projectId } = vercelCreds();
  const res = await fetch(
    VERCEL_API + '/v9/projects/' + projectId + '/domains/' + encodeURIComponent(domain) + '/verify',
    { method: 'POST', headers: { Authorization: 'Bearer ' + token } }
  );
  const data = await res.json().catch(() => null);
  const verifie = res.ok && data?.verified === true;
  if (verifie) await assurerCertificat(domain);
  return verifie;
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
