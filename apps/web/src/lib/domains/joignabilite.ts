// ============================================================
// M2-221 — LE DOMAINE RÉPOND-IL VRAIMENT ? LA SEULE QUESTION QUI COMPTE.
//
// DÉFAUT PAYÉ DEUX FOIS (alloufshop.com, chanorfie.com) : Vercel disait
// `attached: true, verified: true`, la base disait `custom_domain` posé, et
// pourtant `https://www.<domaine>` ne répondait PAS — aucun certificat, la
// connexion échouait. Le marchand voyait « connecté » et ses visiteurs une
// page morte. C'est la classe de défaut « vérité de moteur contre vérité
// d'écran » : tous les indicateurs internes étaient au vert.
//
// AUCUN ÉTAT INTERNE NE REMPLACE L'ESSAI. Ce module OUVRE les quatre
// adresses qu'un visiteur peut taper, et rapporte ce qu'elles répondent —
// rien d'autre. C'est ce qui aurait nommé le défaut le premier jour.
//
// Les quatre, parce que chacune tombe en panne pour une raison différente :
//   http://<d>        → redirection vers https
//   http://www.<d>    → redirection, puis www doit exister
//   https://<d>       → le domaine nu, rattaché en premier
//   https://www.<d>   → CELUI QUI MANQUAIT, et que les mobiles ajoutent seuls
// ============================================================

export type EtatAdresse = {
  url: string;
  /** Code HTTP final après redirections. 0 = injoignable (pas de réponse). */
  code: number;
  /** `true` si un visiteur atteint bien une page. */
  ok: boolean;
};

export type Joignabilite = {
  adresses: EtatAdresse[];
  /** Toutes les adresses répondent. */
  complet: boolean;
  /** Celles qui ne répondent pas — vides quand tout va bien. */
  enPanne: string[];
};

async function essayer(url: string, timeoutMs: number): Promise<EtatAdresse> {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // `redirect: follow` : on veut ce que le VISITEUR obtient au bout, pas la
    // première réponse — une redirection vers une adresse morte est un échec.
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
    return { url, code: res.status, ok: res.status >= 200 && res.status < 400 };
  } catch {
    // Pas de réponse du tout : certificat absent, DNS non résolu, refus de
    // connexion. Du point de vue du visiteur, c'est la même chose — rien.
    return { url, code: 0, ok: false };
  } finally {
    clearTimeout(minuteur);
  }
}

/**
 * Teste les quatre adresses d'un domaine, en parallèle.
 *
 * `timeoutMs` court par adresse : ce diagnostic accompagne un écran, il ne
 * doit jamais le faire attendre. Une adresse lente est comptée en panne —
 * pour un visiteur, elle l'est.
 */
export async function verifierJoignabilite(
  domaine: string,
  timeoutMs = 8000,
): Promise<Joignabilite> {
  const d = domaine.trim().toLowerCase().replace(/^www\./, '');
  if (!d) return { adresses: [], complet: false, enPanne: [] };
  const urls = [`https://${d}`, `https://www.${d}`, `http://${d}`, `http://www.${d}`];
  const adresses = await Promise.all(urls.map((u) => essayer(u, timeoutMs)));
  const enPanne = adresses.filter((a) => !a.ok).map((a) => a.url);
  return { adresses, complet: enPanne.length === 0, enPanne };
}
