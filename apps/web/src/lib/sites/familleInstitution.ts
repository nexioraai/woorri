// RECONNAÎTRE UNE INSTITUTION (lot 3 des sites institutionnels, 2026-11-26).
//
// Le générateur ne connaissait que des commerces : « ministère au Tchad » ou
// « ONG à N'Djamena » tombaient en `general`, puis en commerce local
// (prix, témoignages de clients, adresse inventée). Cette règle PURE dit si
// une demande — ou le `type` d'un site — décrit une institution, et laquelle.
//
// VOLONTAIREMENT ÉTROITE : « agence » seule est une agence de voyage, une
// « clinique » est un cabinet privé, une « école de danse » un commerce. Seuls
// des termes sans ambiguïté publique ou associative comptent. Limites de mot
// UNICODE (`\p{L}`) : `\b` ignore les lettres accentuées (« école »).

export type FamilleInstitution = 'ministere' | 'mairie' | 'ong' | 'ecole' | 'hopital' | 'agence_publique'

const REGLES: readonly (readonly [FamilleInstitution, RegExp])[] = [
  ['ministere', /(?<!\p{L})(minist[èe]re|ministry|secr[ée]tariat\s+d['’]?\s*[ée]tat|pr[ée]sidence\s+de\s+la\s+r[ée]publique|primature)(?!\p{L})/iu],
  ['mairie', /(?<!\p{L})(mairie|commune\s+de|municipalit[ée]|h[ôo]tel\s+de\s+ville|collectivit[ée]\s+(territoriale|locale)|pr[ée]fecture|city\s+hall|municipality)(?!\p{L})/iu],
  ['ong', /(?<!\p{L})(ong|ngo|association\s+(humanitaire|caritative|à\s+but\s+non\s+lucratif|sans\s+but\s+lucratif)|organisation\s+non\s+gouvernementale|non[-\s]?profit)(?!\p{L})/iu],
  ['hopital', /(?<!\p{L})(h[ôo]pital|hospital|centre\s+hospitalier|chu|centre\s+de\s+sant[ée]|district\s+sanitaire|d[ée]l[ée]gation\s+sanitaire)(?!\p{L})/iu],
  ['ecole', /(?<!\p{L})(lyc[ée]e|coll[èe]ge\s+(public|d['’]enseignement)|[ée]cole\s+(publique|primaire|normale|nationale|sup[ée]rieure)|universit[ée]|university|institut\s+universitaire)(?!\p{L})/iu],
  ['agence_publique', /(?<!\p{L})(institution\s+publique|[ée]tablissement\s+public|organisme\s+public|service\s+public|agence\s+(nationale|publique|de\s+r[ée]gulation)|office\s+national|direction\s+g[ée]n[ée]rale|autorit[ée]\s+de\s+r[ée]gulation|centrale\s+(pharmaceutique|d['’]achats?)|caisse\s+nationale|fonds\s+national)(?!\p{L})/iu],
]

/** Le PREMIER terme d'institution du texte (famille et position), ou `null`. */
export function reperageInstitution(texte: string | null | undefined): { readonly famille: FamilleInstitution; readonly index: number } | null {
  const t = (texte ?? '').toLowerCase()
  let meilleur: { famille: FamilleInstitution; index: number } | null = null
  for (const [famille, motif] of REGLES) {
    const m = motif.exec(t)
    if (m !== null && (meilleur === null || m.index < meilleur.index)) meilleur = { famille, index: m.index }
  }
  return meilleur
}

/** La famille d'institution décrite par ce texte, ou `null` (commerce, service privé…). */
export function familleInstitution(texte: string | null | undefined): FamilleInstitution | null {
  return reperageInstitution(texte)?.famille ?? null
}

/**
 * Institution OU commerce ? Le terme qui vient LE PREMIER l'emporte :
 * « Restaurant près de l'hôpital » est un restaurant, « École publique avec
 * cantine » une école. `commerce` : les motifs de commerce du générateur.
 */
export function institutionAvantCommerce(texte: string, commerce: readonly RegExp[]): FamilleInstitution | null {
  const r = reperageInstitution(texte)
  if (r === null) return null
  const t = texte.toLowerCase()
  const premierCommerce = Math.min(...commerce.map((m) => { const x = new RegExp(m.source, m.flags.replace('g', '')).exec(t); return x === null ? Infinity : x.index }))
  return r.index < premierCommerce ? r.famille : null
}

/** Le type schema.org d'une institution (balisage Google). */
export const SCHEMA_INSTITUTION: Readonly<Record<FamilleInstitution, string>> = {
  ministere: 'GovernmentOrganization',
  mairie: 'GovernmentOrganization',
  agence_publique: 'GovernmentOrganization',
  ong: 'NGO',
  hopital: 'Hospital',
  ecole: 'EducationalOrganization',
}

/** La désignation proposée par le générateur : article compris, 2 à 120 caractères ; sinon `null`. */
export function designationValable(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().replace(/\s+/gu, ' ')
  if (t.length < 2 || t.length > 120) return null
  return /^(la|le|les|l['’])\s?\S/iu.test(t) ? t : null
}
