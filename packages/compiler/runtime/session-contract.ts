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
}
