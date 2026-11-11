/**
 * Une adresse d'image RÉELLE — pas le gabarit `https://` que l'éditeur pose
 * en attendant le fichier (« Décrivez la photo »). Module neutre : importé
 * par BlocsDePage ET FicheResponsable, qui s'importent l'un l'autre.
 */
export function photoValable(u: unknown): u is string {
  // Absolue avec un vrai hôte, OU relative au site (`/x.jpg`, accepté par le contrat des blocs).
  return typeof u === 'string' && (/^https?:\/\/[^/\s]+\.[^/\s]+/.test(u) || /^\/(?!\/)\S/.test(u))
}
