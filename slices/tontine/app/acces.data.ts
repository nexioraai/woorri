// GÉNÉRÉ — NE PAS ÉDITER (modèle d'accès canonique).
export const accesData = {"defaultRoleId":"role_membre","droits":["right_bureau","right_registre","right_tresorerie","right_discipline","right_encaisser_cash"],"parAction":{},"parEcran":{"scr_annuaire":"right_registre","scr_discipline":"right_discipline","scr_encaissement":"right_encaisser_cash","scr_seance":"right_bureau","scr_transactions":"right_tresorerie","scr_verification":"right_bureau"},"roles":[{"grantsAllRights":true,"id":"role_president","rightIds":[]},{"id":"role_secretaire","rightIds":["right_registre"]},{"id":"role_tresorier","rightIds":["right_tresorerie","right_encaisser_cash"]},{"id":"role_censeur","rightIds":["right_discipline"]},{"id":"role_membre","rightIds":[]}]} as const;

// Où chercher la porte de quelqu'un, DANS L'ORDRE : destinations
// principales (l'ordre du document), puis les autres routes.
export const candidatsEntree = ["scr_mon_tableau","scr_tontines","scr_membres","scr_transactions","scr_annuaire","scr_verification","scr_discipline","scr_encaissement","scr_seance","scr_parametres"] as const;
