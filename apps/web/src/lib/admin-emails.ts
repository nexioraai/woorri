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

// ── TROIS RÔLES, TROIS LISTES — JAMAIS UNE SEULE.
//
// Le 2026-10-02, la même adresse vivait sous TROIS formes dans neuf fichiers
// de plus : `ADMIN_EMAIL` (destinataire des alertes), `UNLIMITED_EMAILS`
// (comptes hors quota) et une comparaison écrite en clair dans la barre
// latérale. Les réunir ici ne veut PAS dire les confondre : ce sont trois
// autorisations différentes, et les fondre en une seule ouvrirait un droit
// que personne n'a demandé.
//
//   ADMIN_EMAILS       → qui ENTRE dans l'administration
//   DESTINATAIRE_ALERTES → qui REÇOIT les alertes techniques
//   EMAILS_SANS_QUOTA  → qui n'est pas limité en génération
//
// Elles se trouvent aujourd'hui partager une adresse. Elles n'ont aucune
// raison de rester identiques demain.

/** Qui reçoit les alertes techniques (anomalies, crons, veille). */
export const DESTINATAIRE_ALERTES = 'issayamiyoussouf@gmail.com'

/**
 * Comptes exemptés des quotas de génération.
 *
 * Volontairement une liste à part : elle contient une adresse de PLUS que
 * l'administration — être hors quota n'est pas être administrateur.
 */
export const EMAILS_SANS_QUOTA: readonly string[] = [
  'issayamiyoussouf@gmail.com',
  'abbasissay@gmail.com',
]

/** Ce compte est-il exempté de quota ? */
export function sansQuota(email: string | null | undefined): boolean {
  return !!email && EMAILS_SANS_QUOTA.includes(email)
}
