// ============================================================
// UN DOMAINE VÉRIFIÉ SANS CERTIFICAT EST UNE BOUTIQUE MORTE.
//
// DÉFAUT CONSTATÉ — alloufbusiness.com, 2026-09-27. Vercel répondait
// `verified: true`, le DNS était exact, `misconfigured: false`, et AUCUN
// certificat n'existait. Le marchand voyait « Domaine vérifié » ; ses
// clients trouvaient `https://` qui ne s'ouvre même pas et `http://` en 404.
//
// La cause n'était pas ce domaine-là. Vercel émet le certificat au
// rattachement — or à ce moment le DNS ne pointe pas encore, puisque le
// marchand ne voit les enregistrements à créer qu'APRÈS. L'émission échoue,
// Vercel ne la relance jamais, et le domaine devient « vérifié » plus tard
// sans que rien ne redemande le certificat. C'est l'ordre NORMAL du
// parcours : TOUT marchand apportant son domaine passait par là.
//
// Ces tests gardent le cliquet : que la vérification demande le certificat,
// qu'elle ne le redemande pas quand il existe, et qu'un refus ne fasse
// jamais passer un domaine vérifié pour non vérifié.
// ============================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CERTS = 'https://api.vercel.com/v7/certs';

beforeEach(() => {
  process.env.VERCEL_API_TOKEN = 'jeton-test';
  process.env.VERCEL_PROJECT_ID = 'projet-test';
  vi.resetModules();
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

/**
 * Un faux réseau Vercel. `certs` est la liste que renvoie la consultation ;
 * `verifie` ce que répond l'endpoint de vérification ; `emissionOk` si la
 * demande d'émission est acceptée. On enregistre tous les appels : c'est sur
 * eux que portent les assertions, pas sur une valeur de retour qui pourrait
 * être juste par hasard.
 */
function reseauVercel(opts: {
  certs?: unknown[];
  verifie?: boolean;
  emissionOk?: boolean;
  consultationOk?: boolean;
}) {
  const appels: { url: string; methode: string; corps: unknown }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const methode = init?.method ?? 'GET';
    appels.push({ url, methode, corps: init?.body ? JSON.parse(String(init.body)) : null });

    if (url.startsWith(CERTS) && methode === 'GET') {
      const ok = opts.consultationOk !== false;
      return { ok, status: ok ? 200 : 500, json: async () => ({ certs: opts.certs ?? [] }) } as Response;
    }
    if (url === CERTS && methode === 'POST') {
      const ok = opts.emissionOk !== false;
      return {
        ok, status: ok ? 200 : 429,
        json: async () => (ok ? { id: 'cert_x' } : { error: { message: 'trop de demandes' } }),
      } as Response;
    }
    if (url.endsWith('/verify')) {
      return { ok: true, status: 200, json: async () => ({ verified: opts.verifie !== false }) } as Response;
    }
    return { ok: true, status: 200, json: async () => ({}) } as Response;
  }));
  return appels;
}

const emissions = (appels: { url: string; methode: string; corps: unknown }[]) =>
  appels.filter((a) => a.url === CERTS && a.methode === 'POST');

describe('le certificat d’un domaine vérifié', () => {
  it('LE DÉFAUT EXACT D’ALLOUFBUSINESS — vérifié, aucun certificat : on le demande', async () => {
    const appels = reseauVercel({ certs: [], verifie: true });
    const { verifyVercelDomain } = await import('../vercel');

    expect(await verifyVercelDomain('alloufbusiness.com')).toBe(true);

    const posees = emissions(appels);
    expect(posees).toHaveLength(1);
    // Le certificat couvre les DEUX adresses : beaucoup de téléphones
    // ajoutent « www. » tout seuls, et un certificat sans www laisse la
    // moitié des visiteurs devant une page morte.
    expect(posees[0]!.corps).toEqual({
      cns: ['alloufbusiness.com', 'www.alloufbusiness.com'],
    });
  });

  it('UN CERTIFICAT DÉJÀ LÀ N’EST PAS REDEMANDÉ — le bouton est cliquable en boucle', async () => {
    const appels = reseauVercel({ certs: [{ id: 'cert_deja', cns: ['x.com'] }], verifie: true });
    const { verifyVercelDomain } = await import('../vercel');

    await verifyVercelDomain('x.com');
    await verifyVercelDomain('x.com');
    await verifyVercelDomain('x.com');

    // Trois clics, zéro émission : sans cette garde, Let's Encrypt finirait
    // par refuser le domaine pour dépassement de quota — et le marchand
    // serait bloqué par la correction elle-même.
    expect(emissions(appels)).toHaveLength(0);
  });

  it('UNE VÉRIFICATION QUI ÉCHOUE NE DEMANDE RIEN', async () => {
    const appels = reseauVercel({ certs: [], verifie: false });
    const { verifyVercelDomain } = await import('../vercel');

    expect(await verifyVercelDomain('pasencore.com')).toBe(false);
    // Demander un certificat pour un DNS qui ne pointe pas encore consomme
    // une tentative d’autorisation, et elles sont comptées.
    expect(emissions(appels)).toHaveLength(0);
  });

  it('UN CERTIFICAT REFUSÉ NE FAIT PAS PASSER UN DOMAINE VÉRIFIÉ POUR NON VÉRIFIÉ', async () => {
    reseauVercel({ certs: [], verifie: true, emissionOk: false });
    const { verifyVercelDomain } = await import('../vercel');

    // Le DNS du marchand est juste : lui afficher « non vérifié » l’enverrait
    // corriger un DNS qui n’a rien de faux, pendant que le vrai problème —
    // l’émission — resterait invisible.
    expect(await verifyVercelDomain('refus.com')).toBe(true);
  });

  it('LE RÉSEAU QUI TOMBE NE CASSE PAS LA VÉRIFICATION', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/verify')) {
        return { ok: true, status: 200, json: async () => ({ verified: true }) } as Response;
      }
      throw new Error('réseau coupé');
    }));
    const { verifyVercelDomain } = await import('../vercel');
    expect(await verifyVercelDomain('reseau.com')).toBe(true);
  });

  it('APPELÉ AVEC `www.`, ON NE DEMANDE PAS `www.www.`', async () => {
    const appels = reseauVercel({ certs: [], verifie: true });
    const { assurerCertificat } = await import('../vercel');

    expect(await assurerCertificat('www.double.com')).toBe('demande');
    expect(emissions(appels)[0]!.corps).toEqual({
      cns: ['double.com', 'www.double.com'],
    });
  });

  it('UNE CONSULTATION EN ERREUR NE FAIT PAS CONCLURE « CERTIFICAT PRÉSENT »', async () => {
    const appels = reseauVercel({ certs: [], verifie: true, consultationOk: false });
    const { assurerCertificat } = await import('../vercel');

    // Si l’on prenait une réponse en erreur pour « rien à faire », le défaut
    // resterait ouvert en silence exactement comme il l’était.
    expect(await assurerCertificat('erreur.com')).toBe('demande');
    expect(emissions(appels)).toHaveLength(1);
  });
});
