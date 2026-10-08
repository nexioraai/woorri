// ============================================================
// CLIQUET — CE QU ON A COMPRIS COMMANDE CE QU ON CONSTRUIT.
//
// ── LE DEFAUT QUE CES TESTS FERMENT.
//
// P0 comprenait deja, et sa comprehension NE SERVAIT A RIEN : le document
// etait bati sur un squelette fige — « une liste de 8 elements » — identique
// qu on demande une tontine ou une place de marche. Le proprietaire l a dit en
// une phrase : « on peut pas construire un truc qu on a pas compris ».
//
// Ces tests tiennent la propriete inverse : deux metiers differents donnent
// deux applications differentes, et la STRUCTURE vient du metier.
// ============================================================
import { describe, expect, it } from 'vitest'
import { projectAirSchema } from '@deribfy/air-schema'
import { compileWeb } from '@deribfy/compiler'
import { documentDepuisModele, type ModeleMetier, type TableGestes } from '../derivation'

/** La table du depot, reduite a ce que la derivation lit. */
const TABLE: TableGestes = {
  decouvrir: { bloc: 'list' },
  consulter: { bloc: 'list' },
  consulter_historique: { bloc: 'list' },
  saisir: { bloc: 'form' },
  confirmer: { bloc: null },
  contacter: { bloc: null },
}

const TONTINE: ModeleMetier = {
  acteurs: [{ id: 'membre', nom: 'membre' }, { id: 'president', nom: 'président' }],
  concepts: [
    { id: 'membre_tontine', nom: 'membre de la tontine', donnees: true,
      attributs: [{ id: 'telephone', nature: 'texte', requis: true }, { id: 'ordre_de_passage', nature: 'nombre', requis: true }] },
    { id: 'cotisation', nom: 'cotisation', donnees: true,
      attributs: [{ id: 'montant', nature: 'nombre', requis: true }, { id: 'recue', nature: 'booleen', requis: true }] },
  ],
  parcours: [
    { id: 'voir_les_membres', besoin: 'voir les membres et leur ordre de passage', acteur: 'membre',
      etapes: [{ concept: 'membre_tontine', geste: 'decouvrir' }] },
    { id: 'cotiser', besoin: 'enregistrer une cotisation', acteur: 'membre',
      etapes: [{ concept: 'cotisation', geste: 'saisir' }] },
  ],
}

const CLINIQUE: ModeleMetier = {
  acteurs: [{ id: 'patient', nom: 'patient' }],
  concepts: [
    { id: 'rendez_vous', nom: 'rendez-vous', donnees: true,
      attributs: [{ id: 'creneau', nature: 'intervalle', requis: true }] },
  ],
  parcours: [
    { id: 'prendre_rdv', besoin: 'prendre un rendez-vous', acteur: 'patient',
      etapes: [{ concept: 'rendez_vous', geste: 'saisir' }] },
  ],
}

const derive = (m: ModeleMetier, nom: string) =>
  documentDepuisModele(m, TABLE, { nom, description: null })

describe('CLIQUET — la structure vient du metier', () => {
  it('LE SCHEMA STRICT ACCEPTE le document derive', () => {
    const d = derive(TONTINE, 'Tontine du quartier')
    expect(d).not.toBeNull()
    const r = projectAirSchema.safeParse(d!.document)
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues.slice(0, 2))).toBe(true)
  })

  it('les CONCEPTS du metier deviennent les entites — pas un catalogue', () => {
    const d = derive(TONTINE, 'Tontine')!
    expect(d.document.entities.map((e) => e.name)).toEqual(['membre_de_la_tontine', 'cotisation'])
    // Le defaut d avant : une entite `article`, toujours la meme.
    expect(JSON.stringify(d.document)).not.toMatch(/ent_article/u)
  })

  it('les BESOINS deviennent les ecrans — un par parcours', () => {
    const d = derive(TONTINE, 'Tontine')!
    expect(d.document.screens).toHaveLength(2)
    expect(d.document.screens[0]?.id).toBe('scr_voir_les_membres')
    expect(d.document.screens[1]?.id).toBe('scr_cotiser')
  })

  it('LE GESTE COMMANDE LE BLOC, et c est la table qui le dit', () => {
    const d = derive(TONTINE, 'Tontine')!
    const types = (i: number) => d.document.screens[i]?.blocks.map((b) => b.blockType)
    // `decouvrir` -> liste ; `saisir` -> formulaire.
    expect(types(0)).toEqual(['header', 'list'])
    expect(types(1)).toEqual(['header', 'form'])
  })

  it('un geste SANS bloc ne produit rien — on n invente pas d ecran', () => {
    const d = derive(
      { ...TONTINE, parcours: [{ id: 'p', besoin: 'confirmer', acteur: 'membre', etapes: [{ concept: 'cotisation', geste: 'confirmer' }] }] },
      'X',
    )!
    expect(d.document.screens[0]?.blocks.map((b) => b.blockType)).toEqual(['header'])
  })

  it('DEUX METIERS DONNENT DEUX APPLICATIONS — c etait tout le probleme', () => {
    const a = derive(TONTINE, 'Tontine')!
    const b = derive(CLINIQUE, 'Clinique')!
    expect(a.document.entities.map((e) => e.name)).not.toEqual(b.document.entities.map((e) => e.name))
    expect(a.document.screens.map((s) => s.id)).not.toEqual(b.document.screens.map((s) => s.id))
  })

  it('les NATURES deviennent des types reels, sans en inventer', () => {
    const d = derive(CLINIQUE, 'Clinique')!
    const champs = d.document.entities[0]?.fields ?? []
    // `intervalle` tombe sur `datetime` : un creneau est une date. Pretendre
    // autrement exigerait un type que le moteur ne sait pas rendre.
    expect(champs.find((f) => f.name === 'creneau')?.type).toBe('datetime')
  })

  it('LES RELATIONS DU METIER DEVIENNENT DES REFERENCES', () => {
    // P0 les produit, et je les jetais. Une application ou rien ne pointe
    // vers rien n est pas un modele de donnees : c est une pile de listes
    // independantes, et le lien que l utilisateur a enonce disparait.
    const d = derive(
      { ...TONTINE, relations: [{ de: 'cotisation', vers: 'membre_tontine', nature: 'reference' }] },
      'Tontine',
    )!
    const cotisation = d.document.entities.find((e) => e.name === 'cotisation')!
    const ref = cotisation.fields.find((f) => f.type === 'reference')
    expect(ref, 'la cotisation doit referencer le membre').toBeDefined()
    expect((ref as { referencesEntityId?: string }).referencesEntityId).toBe('ent_membre_de_la_tontine')
    // CE QU ON MONTRE : le nom de la cible, jamais son identifiant. Une fiche
    // qui affiche `ent_membre_row_3` ne dit rien a personne.
    expect((ref as { referenceDisplayFieldId?: string }).referenceDisplayFieldId).toMatch(/_nom$/u)
    expect(d.document.relations).toHaveLength(1)
  })

  it('`possede` dit un rattachement : un parent, plusieurs enfants', () => {
    const d = derive(
      { ...TONTINE, relations: [{ de: 'cotisation', vers: 'membre_tontine', nature: 'possede' }] },
      'Tontine',
    )!
    expect((d.document.relations[0] as { kind?: string }).kind).toBe('one_to_many')
  })

  it('une relation vers un concept INCONNU est ignoree, pas inventee', () => {
    const d = derive(
      { ...TONTINE, relations: [{ de: 'cotisation', vers: 'fantome', nature: 'reference' }] },
      'Tontine',
    )!
    expect(d.document.relations).toHaveLength(0)
    expect(d.document.entities.flatMap((e) => e.fields).some((f) => f.type === 'reference')).toBe(false)
  })

  it('une relation d un concept VERS LUI-MEME est ignoree', () => {
    const d = derive(
      { ...TONTINE, relations: [{ de: 'cotisation', vers: 'cotisation', nature: 'reference' }] },
      'Tontine',
    )!
    expect(d.document.relations).toHaveLength(0)
  })

  it('AVEC RELATIONS, le document reste valide ET compile', () => {
    const d = derive(
      { ...TONTINE, relations: [{ de: 'cotisation', vers: 'membre_tontine', nature: 'possede' }] },
      'Tontine',
    )!
    expect(projectAirSchema.safeParse(d.document).success).toBe(true)
    expect(compileWeb(d.document).files.size).toBeGreaterThan(40)
  })

  it('un modele SANS concept de donnees ne produit rien plutot qu un faux', () => {
    expect(derive({ concepts: [{ nom: 'idee', donnees: false }], parcours: [] }, 'X')).toBeNull()
    expect(derive({}, 'X')).toBeNull()
  })

  it('ET LE DOCUMENT COMPILE', () => {
    const d = derive(TONTINE, 'Tontine du quartier')!
    const projet = compileWeb(d.document)
    expect(projet.files.size).toBeGreaterThan(40)
    expect(projet.files.get('index.html')).toContain('Tontine du quartier')
  })

  it('il DIT ce qu il a compris, en francais', () => {
    const d = derive(TONTINE, 'Tontine')!
    const texte = d.compris.join(' ')
    expect(texte).toContain('membre')
    expect(texte).toContain('cotisation')
    expect(texte).toMatch(/Un écran pour : voir les membres/u)
  })
})
