// ============================================================================
// LA RÈGLE DU MOT DE PASSE (CPA, 2026-11-19).
//
// « Exiger un mot de passe de 10 caractères minimum, mélange de chiffres,
// lettres, signes, au moins une majuscule et une minuscule — pour les
// clients, les fournisseurs et la DDM. »
//
// UNE SEULE RÈGLE, lue par le serveur (inscription) ET par les écrans
// (inscription, nouveau mot de passe) : deux copies divergeraient au premier
// changement. La CONNEXION, elle, ne l'applique pas : un compte créé avant
// la règle doit pouvoir entrer, puis choisir un mot de passe conforme.
// ============================================================================

export const CRITERES = ['longueur', 'majuscule', 'minuscule', 'chiffre', 'signe'] as const
export type Critere = (typeof CRITERES)[number]

export const LONGUEUR_MIN = 10
export const LONGUEUR_MAX = 72

const TESTS: Record<Critere, (m: string) => boolean> = {
  longueur: (m) => m.length >= LONGUEUR_MIN && m.length <= LONGUEUR_MAX,
  majuscule: (m) => /\p{Lu}/u.test(m),
  minuscule: (m) => /\p{Ll}/u.test(m),
  chiffre: (m) => /\d/.test(m),
  // Un signe : tout ce qui n'est ni lettre, ni chiffre, ni espace.
  signe: (m) => /[^\p{L}\p{N}\s]/u.test(m),
}

/** Chaque critère, tenu ou non — pour la liste qui se coche à l'écran. */
export function criteresMotDePasse(m: string): { cle: Critere; ok: boolean }[] {
  return CRITERES.map((cle) => ({ cle, ok: TESTS[cle](m) }))
}

export function motDePasseFort(m: string): boolean {
  return CRITERES.every((c) => TESTS[c](m))
}

/** Les mots des critères, dans les quatre langues des sites. */
export function libellesCriteres(lang: string | null | undefined): Record<Critere, string> & { regle: string } {
  const l = (lang ?? 'fr').slice(0, 2).toLowerCase()
  if (l === 'en') return { longueur: `At least ${LONGUEUR_MIN} characters`, majuscule: 'One capital letter', minuscule: 'One lowercase letter', chiffre: 'One digit', signe: 'One symbol (! ? @ # …)', regle: `The password needs at least ${LONGUEUR_MIN} characters, with a capital letter, a lowercase letter, a digit and a symbol.` }
  if (l === 'ar') return { longueur: `${LONGUEUR_MIN} أحرف على الأقل`, majuscule: 'حرف كبير واحد', minuscule: 'حرف صغير واحد', chiffre: 'رقم واحد', signe: 'رمز واحد (! ? @ # …)', regle: `يجب أن تتكون كلمة المرور من ${LONGUEUR_MIN} أحرف على الأقل، مع حرف كبير وحرف صغير ورقم ورمز.` }
  if (l === 'es') return { longueur: `Al menos ${LONGUEUR_MIN} caracteres`, majuscule: 'Una mayúscula', minuscule: 'Una minúscula', chiffre: 'Un número', signe: 'Un símbolo (! ? @ # …)', regle: `La contraseña debe tener al menos ${LONGUEUR_MIN} caracteres, con una mayúscula, una minúscula, un número y un símbolo.` }
  return { longueur: `${LONGUEUR_MIN} caractères minimum`, majuscule: 'Une lettre majuscule', minuscule: 'Une lettre minuscule', chiffre: 'Un chiffre', signe: 'Un signe (! ? @ # …)', regle: `Le mot de passe doit contenir au moins ${LONGUEUR_MIN} caractères, avec une majuscule, une minuscule, un chiffre et un signe.` }
}
