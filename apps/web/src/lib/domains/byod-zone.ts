import { resolveTxt } from 'node:dns/promises';

// ============================================================
// LA ZONE DNS DU MARCHAND, LUE ET COMPRISE — AU LIEU D'ATTENDRE EN AVEUGLE.
//
// ── LE CAS RÉEL QUI A IMPOSÉ CE MODULE (audit du 2026-10-02).
//
// `logonemoteurfils.com` : le marchand a vérifié sa propriété Google
// LUI-MÊME, avec SON jeton, dans SA Search Console. La zone porte donc un
// `google-site-verification=…` — mais pas le nôtre. Le robot, aveugle à
// cette nuance, comptait ses essais « TXT jamais vu » jusqu'à l'échec
// terminal à 20 — le scénario exact d'`alloufbusiness.com` une semaine
// plus tôt.
//
// Le robot ne peut PAS s'approprier une vérification faite par un tiers :
// l'API Google ne valide que le jeton émis pour NOTRE compte de service.
// Mais il peut LIRE la zone et DIRE ce qu'il voit : « ton jeton est là,
// c'est de la propagation » n'est pas « il y a un jeton étranger, ajoute le
// nôtre », qui n'est pas « la zone est vide ». Trois attentes, trois
// messages, zéro mystère.
// ============================================================

export const SEUIL_ALERTE_BYOD = 10;

export type AnalyseZone = {
  notrePresent: boolean;
  jetonsExternes: string[];
  zoneLisible: boolean;
};

/** Lit les TXT de la racine du domaine. Réseau — jamais appelé par un test. */
export async function lireJetonsZone(domain: string, notreJeton: string | null): Promise<AnalyseZone> {
  try {
    const enregistrements = await resolveTxt(domain);
    return analyserJetonsZone(enregistrements, notreJeton);
  } catch {
    return { notrePresent: false, jetonsExternes: [], zoneLisible: false };
  }
}

/**
 * La part PURE : que contient la zone, comparé à ce qu'on attend ?
 * `resolveTxt` rend des tableaux de fragments — un TXT long arrive découpé,
 * il se recolle par simple jointure.
 */
export function analyserJetonsZone(enregistrements: string[][], notreJeton: string | null): AnalyseZone {
  const txts = (enregistrements ?? []).map((morceaux) => morceaux.join(''));
  const jetons = txts.filter((t) => t.startsWith('google-site-verification='));
  const notre = notreJeton ? jetons.includes(notreJeton) : false;
  return {
    notrePresent: notre,
    jetonsExternes: jetons.filter((j) => j !== notreJeton),
    zoneLisible: true,
  };
}

/** Le diagnostic en français — celui que l'admin lira, pas un code d'erreur. */
export function diagnosticZone(a: AnalyseZone): string {
  if (!a.zoneLisible) return 'Zone DNS illisible (domaine sans TXT ou résolution en échec).';
  if (a.notrePresent) {
    return 'Notre jeton est posé dans la zone — Google ne l’a pas encore constaté, c’est de la propagation.';
  }
  if (a.jetonsExternes.length > 0) {
    return `Vérification Google faite HORS Deribfy détectée (${a.jetonsExternes.length} jeton(s) tiers dans la zone) — notre jeton MANQUE. Le marchand doit l’AJOUTER : plusieurs jetons cohabitent sans conflit.`;
  }
  return 'Aucun jeton google-site-verification dans la zone : le marchand n’a pas posé le TXT demandé.';
}

/** L'alerte de mi-parcours : à l'essai 10, pas à l'autopsie de l'essai 20. */
export function construireAlerteMiParcours(args: {
  domain: string; slug: string; attempts: number; max: number;
  diagnostic: string; token: string | null;
}): { subject: string; html: string } {
  const heuresRestantes = (args.max - args.attempts) * 2;
  return {
    subject: `⏳ BYOD à mi-parcours : ${args.domain} (${args.attempts}/${args.max})`,
    html: [
      `<p><strong>${args.domain}</strong> (site ${args.slug}) n’est toujours pas vérifié par Google après ${args.attempts} tentatives sur ${args.max}.</p>`,
      `<p><strong>Diagnostic de la zone DNS :</strong> ${args.diagnostic}</p>`,
      args.token ? `<p>Jeton attendu : <code>${args.token}</code></p>` : '',
      `<p>Sans action, l’échec terminal tombera dans ~${heuresRestantes} h. Ce courriel part une seule fois, à l’essai ${SEUIL_ALERTE_BYOD}.</p>`,
    ].join('\n'),
  };
}
