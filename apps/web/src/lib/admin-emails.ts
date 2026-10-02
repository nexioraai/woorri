// ============================================================
// QUI EST ADMINISTRATEUR DE LA PLATEFORME — UNE SEULE LISTE.
//
// ── LE DÉFAUT QU'ELLE FERME, relevé le 2026-10-02.
//
// La même liste était recopiée dans SIX routes : `stats`, `ai-usage`,
// `cron-runs`, `system-health`, `site-archive-override`,
// `site-publish-override`. Six copies d'une règle d'autorisation, c'est six
// occasions de diverger — et la divergence ne se voit pas : chaque fichier
// pris séparément est correct.
//
// CE QUE ÇA COÛTERAIT CONCRÈTEMENT : le jour où un second administrateur est
// ajouté, en oublier une seule laisse une route qui lui répond 403 (gênant),
// ou — si quelqu'un retire un e-mail d'une copie sans toucher aux autres —
// une route qui autorise encore (grave). La bonne forme d'une règle
// d'autorisation est d'avoir UN endroit où elle s'écrit.
//
// ── CE QUI N'EST PAS CHANGÉ, ET POURQUOI.
//
// La COMPARAISON reste exactement celle d'avant : égalité stricte, sensible à
// la casse. Élargir une vérification d'autorisation — même pour « être plus
// tolérant » — se décide avec une preuve, pas en passant. Supabase normalise
// les adresses en minuscules à l'inscription ; si cela devait changer un jour,
// la question se traite ici, en un seul endroit, et c'est précisément
// l'intérêt de ce fichier.
// ============================================================

/** Les comptes autorisés sur l'administration de la plateforme. */
export const ADMIN_EMAILS: readonly string[] = ['issayamiyoussouf@gmail.com']

/**
 * Cette adresse a-t-elle accès à l'administration ?
 *
 * Même règle que les six routes appliquaient chacune de leur côté : une
 * adresse absente ou vide n'est jamais administratrice.
 */
export function estAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email)
}
