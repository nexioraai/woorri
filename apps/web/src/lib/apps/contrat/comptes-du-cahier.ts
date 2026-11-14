/**
 * T2b · LES COMPTES QUE LE CAHIER DEMANDE (2026-11-14).
 *
 * Règle du propriétaire : « la demande des utilisateurs de Deribfy prime sur
 * tout ». Le compte unique partagé par œuvre (`compte-oeuvre.ts`) n'est plus
 * qu'un REPLI quand le cahier ne dit rien ; dès qu'il demande que chacun crée
 * son compte, Deribfy génère des comptes INDIVIDUELS, avec ce qu'il précise :
 *   · l'identifiant : courriel, téléphone, ou l'un ou l'autre ;
 *   · le secret : un mot de passe, ou un code personnel de N chiffres ;
 *   · la vérification des coordonnées : exigée, facultative, ou aucune.
 *
 * Une lecture DÉTERMINISTE du texte (aucun appel, aucun coût) : le même cahier
 * donne toujours les mêmes comptes, et le motif est consigné.
 */

export type Comptes =
  | { readonly sorte: 'partage'; readonly motif: string }
  | {
      readonly sorte: 'individuels'
      readonly identifiant: 'courriel' | 'telephone' | 'courriel-ou-telephone'
      readonly secret: { readonly nature: 'mot-de-passe' } | { readonly nature: 'code'; readonly chiffres: number }
      readonly verification: 'exigee' | 'facultative' | 'aucune'
      readonly motif: string
    }

const sansAccents = (x: string) => x.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** L'indicatif téléphonique d'un pays lu (nom en français ou en anglais) ; absent s'il n'est pas connu. */
const INDICATIFS: Readonly<Record<string, string>> = {
  tchad: '+235', chad: '+235', cameroun: '+237', cameroon: '+237', niger: '+227', nigeria: '+234', senegal: '+221', mali: '+223',
  'burkina faso': '+226', burkina: '+226', "cote d'ivoire": '+225', 'cote d’ivoire': '+225', 'ivory coast': '+225', gabon: '+241',
  centrafrique: '+236', 'republique centrafricaine': '+236', 'central african republic': '+236', congo: '+242', 'republique du congo': '+242',
  'republique democratique du congo': '+243', rdc: '+243', benin: '+229', togo: '+228', guinee: '+224', guinea: '+224', mauritanie: '+222',
  maroc: '+212', morocco: '+212', algerie: '+213', algeria: '+213', tunisie: '+216', tunisia: '+216', libye: '+218', libya: '+218',
  soudan: '+249', sudan: '+249', egypte: '+20', egypt: '+20', ghana: '+233', kenya: '+254', rwanda: '+250', madagascar: '+261',
  france: '+33', belgique: '+32', belgium: '+32', suisse: '+41', switzerland: '+41', canada: '+1', 'etats-unis': '+1', 'united states': '+1',
}
export function indicatifDuPays(pays: readonly string[]): string | undefined {
  for (const p of pays) { const i = INDICATIFS[sansAccents(p).trim()]; if (i !== undefined) return i }
  return undefined
}

/** Ce qui dit qu'une personne CRÉE son compte (et pas seulement qu'un compte existe). */
const INSCRIPTION = /(s['’ ]?inscri|inscription|creer (un |son |votre |leur )?compte|creation (de |du |des )?compte|ouvrir (un |son )?compte|sign ?up|register|mot de passe oublie)/u
const COURRIEL = /(e-?mail|courriel|adresse electronique)/u
const TELEPHONE = /(telephone|numero de portable|portable|mobile money|\bsms\b|whatsapp|\+\d{3})/u
const CODE = /(code (personnel|secret|pin)|\bpin\b)[^.\n]{0,40}?(\d)\s*chiffres|(\d)\s*chiffres[^.\n]{0,40}?(code|pin)/u
const VERIFICATION = /(verification|verifier|code (sms|otp|de verification|recu)|\botp\b|confirmation (du|de l['’])?(numero|e-?mail|courriel|adresse))/u
const FACULTATIVE = /(pas obligatoire|facultati|peut etre propose|optionnel|si possible)/u

/** Les phrases du cahier qui parlent du compte (inscription, identifiant, secret, vérification). */
function phrasesDuCompte(cahier: string): string[] {
  return sansAccents(cahier).split(/[.\n;•]/u).map((p) => p.trim()).filter((p) => p !== '' && /(compte|inscri|identifi|connexion|connecter|mot de passe|code personnel|\bpin\b|verification)/u.test(p))
}

export function comptesDuCahier(cahier: string): Comptes {
  const texte = sansAccents(cahier)
  const inscription = INSCRIPTION.exec(texte)
  if (inscription === null) return { sorte: 'partage', motif: 'le cahier ne demande pas que chacun crée son compte : un accès partagé par l’application' }
  const compte = phrasesDuCompte(cahier).join(' . ')
  const courriel = COURRIEL.test(compte)
  const telephone = TELEPHONE.test(compte)
  const identifiant = courriel && telephone ? 'courriel-ou-telephone' : telephone ? 'telephone' : 'courriel'
  const code = CODE.exec(compte)
  const chiffres = code === null ? null : Number(code[3] ?? code[4])
  const secret = chiffres !== null && chiffres >= 4 && chiffres <= 8 ? { nature: 'code' as const, chiffres } : { nature: 'mot-de-passe' as const }
  const phrasesVerif = compte.split(' . ').filter((p) => VERIFICATION.test(p))
  const verification = phrasesVerif.length === 0 ? 'aucune' : phrasesVerif.some((p) => FACULTATIVE.test(p)) ? 'facultative' : 'exigee'
  return {
    sorte: 'individuels', identifiant, secret, verification,
    motif: `le cahier demande que chacun crée son compte (« ${inscription[0]} ») : identifiant ${identifiant}, ${secret.nature === 'code' ? `code de ${String(secret.chiffres)} chiffres` : 'mot de passe'}, vérification ${verification}`,
  }
}
