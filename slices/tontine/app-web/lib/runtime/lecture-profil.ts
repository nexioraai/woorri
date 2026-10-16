// RUNTIME COPIÉ — RELECTURE DE LA LIGNE DE LA PERSONNE CONNECTÉE.
//
// Fait mesuré : l'écriture atteignait la base (`ecriture-supabase`), mais rien
// ne la RELISAIT. Un profil enregistré était bien conservé côté serveur et
// l'app rouvrait sur un formulaire vide — ce que l'utilisateur voit comme une
// perte de données alors que rien n'est perdu.
//
// PORTÉE VOLONTAIREMENT ÉTROITE : UNE entité, UNE ligne — celle dont l'`id`
// est l'identité courante. Relire des tables entières exigerait de décider qui
// possède quoi (billets, paiements), et leurs policies RLS sont FERMÉES
// exprès : ouvrir « au cas où » est la faute que RLS existe pour empêcher.
//
// Le port est FONCTIONNEL, comme pour l'écriture : ce module ne connaît ni
// Supabase ni PostgREST, et se teste sans réseau.
import type { MagasinDonnees } from "./magasin-donnees";
import type { SessionProvider } from "./session-contract";

export interface ReponseLecture {
  readonly data: Record<string, string> | null;
  readonly error: { readonly message: string } | null;
}

export interface PortLecture {
  lire(table: string, id: string): PromiseLike<ReponseLecture>;
}

/**
 * Arme la relecture : à chaque établissement d'identité, la ligne est relue et
 * l'instantané local mis à jour. Rend la fonction d'ARRÊT — sans elle, un
 * abonnement survivrait au démontage.
 */
export function armerLectureProfil(options: {
  readonly magasin: MagasinDonnees;
  readonly session: SessionProvider;
  readonly port: PortLecture;
  readonly entityId: string;
}): () => void {
  const { magasin, session, port, entityId } = options;
  let derniereIdentite: string | undefined;
  const relire = (): void => {
    const id = session.identifiant();
    // Rien à relire sans identité — et surtout : on ne relit pas deux fois la
    // même, sinon chaque notification déclencherait un appel réseau.
    if (id === undefined || id === derniereIdentite) return;
    derniereIdentite = id;
    void port.lire(entityId, id).then((r) => {
      if (r.error !== null) {
        console.warn(`AIR_PROFIL_LECTURE_REFUSEE:${entityId}:${r.error.message}`);
        return;
      }
      // Aucune ligne côté serveur n'est un FAIT, pas une erreur : la personne
      // n'a simplement rien enregistré. On n'invente aucune valeur.
      if (r.data === null) return;
      magasin.upsert(entityId, id, r.data);
    });
  };
  relire();
  return session.abonner(relire);
}
