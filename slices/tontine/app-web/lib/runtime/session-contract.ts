// RUNTIME COPIÉ — CONTRAT DE SESSION, TYPES PURS (Phase 4).
//
// Séparé de `session-provider.tsx` parce qu'un module `.ts` ne peut pas
// importer un module JSX : les implémentations (`session-locale`,
// `session-supabase`) sont du TypeScript pur et doivent pouvoir dépendre du
// contrat sans traîner React derrière elles. Le contexte React, lui, vit dans
// le `.tsx` et RÉ-EXPORTE ce contrat — un seul contrat, deux portes.
export interface SessionProvider {
  /** `true` si une identité est ÉTABLIE. Jamais une supposition. */
  estAuthentifie(): boolean;
  /** Identifiant de l'utilisateur courant — absent tant qu'aucune identité. */
  identifiant(): string | undefined;
  /** Abonnement aux changements d'état — rend la fonction de désabonnement. */
  abonner(ecouteur: () => void): () => void;
  /**
   * EN ATTENTE DE CONFIRMATION (1.14.0) — le serveur a ACCEPTÉ la création du
   * compte mais n'a ouvert AUCUNE session : il attend un clic dans un e-mail.
   *
   * Fait mesuré : sans ce troisième état, l'app n'avait que « anonyme » ou
   * « connecté ». Une inscription réussie retombait donc sur « anonyme » —
   * indiscernable d'un échec, et rien à l'écran ne bougeait. L'utilisateur
   * voyait « il ne se passe rien » alors que tout avait fonctionné.
   *
   * OPTIONNEL : une implémentation sans confirmation hors-bande (session
   * locale) ne le porte pas, et son comportement est inchangé.
   */
  enAttenteConfirmation?(): boolean;
  /**
   * CE QUE CETTE PERSONNE A LE DROIT D'OUVRIR (1.28.0 — émission du 2026-10-04).
   *
   * Rend les identifiants de droits accordés. `undefined` n'est PAS « aucun
   * droit » : c'est « cette session ne sait pas le dire » — un fournisseur qui
   * n'implémente pas cette méthode alors que le document déclare `access`.
   *
   * La distinction n'est pas théorique. « Aucun droit » envoie chercher la
   * cause dans les rôles ; « session muette » l'envoie chercher dans
   * l'intégration, et c'est là qu'elle est. Les deux produisent le même refus
   * — fermé par défaut — mais pas le même message.
   *
   * OPTIONNEL : une application sans employés ne déclare pas `access`, aucun
   * écran n'exige de droit, et ce fournisseur n'a rien à porter. Le
   * comportement des versions antérieures est donc inchangé.
   */
  droits?(): readonly string[];
  /**
   * LE JETON QUI PROUVE L'IDENTITE A UN AUTRE SERVEUR (2026-10-13).
   *
   * MESURE QUI A COMMANDE CETTE METHODE. Un document qui declare
   * `backend: genere` recoit un serveur Node emis. Ce serveur VERIFIE une
   * identite — six de ses routes l'exigent — en lisant un en-tete
   * `Authorization: Bearer`. L'application emise, elle, envoyait un COOKIE
   * (`credentials: "include"`) et, pour l'ecriture, RIEN DU TOUT. Les deux
   * bouts ne se rencontraient jamais : les filtres de visibilite, le
   * connecteur et l'agent etaient injoignables.
   *
   * CE QUE CETTE METHODE N'EST PAS. Ce n'est pas une facon d'OUVRIR une
   * session : le serveur emis ne delivre aucun jeton, et c'est volontaire —
   * il verifie, il n'emet pas. Le document declare OU l'identite est
   * verifiee ; ce jeton est celui que CE service a delivre, transporte tel
   * quel.
   *
   * `undefined` n'est PAS « pas de jeton » : c'est « cette session ne sait
   * pas le dire » — exactement comme `droits?()` juste au-dessus. Les deux
   * cas produisent le meme refus, ferme par defaut, mais pas la meme cause a
   * chercher : « aucun jeton » envoie vers la connexion, « session muette »
   * envoie vers l'integration.
   *
   * OPTIONNEL : une session locale n'a aucun serveur a convaincre et ne le
   * porte pas. Le comportement des versions anterieures est inchange.
   */
  jeton?(): string | undefined;
}
