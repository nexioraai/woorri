// ============================================================================
// LE NOM D'UN FICHIER DÉPOSÉ, RENDU SÛR.
//
// ── POURQUOI IL EST ICI ET PLUS DANS UNE ROUTE.
//
// Il vivait dans `/api/sites/[slug]/fichiers`. Le lot 12 a besoin du MÊME
// nettoyage pour les documents d'un compte : le recopier aurait créé deux
// vérités sur « ce qu'est un nom acceptable », et c'est toujours celle qu'on
// ne regarde pas qui laisse passer quelque chose.
//
// ── CE QU'IL EMPÊCHE, CONCRÈTEMENT.
//
// Un nom reçu d'un navigateur peut contenir des barres obliques, des points
// successifs, des octets nuls, de l'arabe, des espaces. Posé tel quel dans
// une clé de stockage, il change de DOSSIER (`../`), casse l'URL, ou devient
// introuvable. On ne refuse pas le fichier — on renomme : refuser ferait
// perdre un document à quelqu'un qui n'y est pour rien.
// ============================================================================

export function nomPropre(nom: string): string {
  const pt = nom.lastIndexOf('.')
  const base = (pt > 0 ? nom.slice(0, pt) : nom)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
  const ext = (pt > 0 ? nom.slice(pt + 1) : '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
  return `${base || 'fichier'}${ext ? '.' + ext : ''}`
}
