/**
 * LA BOÎTE NOIRE COMPLÉTÉE (2026-11-23) — les quatre défauts reconnus après
 * la lecture de la boîte 1a4298f8 :
 *
 *   ① l'analyse attribuait « au moule » ce que le code livré contenait : elle
 *      distingue maintenant « écrite mais inutilisable une fois publiée » de
 *      « absente du code » ;
 *   ② elle dit les CONSTATS du livrable : mot de passe en clair, table lisible
 *      en entier, lignes cachées à l'écran seulement ;
 *   ③ le message montré est celui de l'écran, calculé par la même fonction ;
 *   ④ (dans boite-noire-retouche.test.ts) les contrôles d'une modification.
 *
 * Le cas ① ② reprend, RÉDUITES aux lignes qui comptent, les traces mesurées
 * dans la place de marché (b21c548a, version 2) : la vérification sur la
 * vraie boîte a été faite hors du dépôt (données d'un client).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyserDemande, constatsDuLivre } from '../analyse-demande'
import { messageDeCreation } from '../message-de-creation'
import { messageDeRetouche, suffixeCompteur } from '../message-de-retouche'
import type { EntiteDeclaree } from '../entites-declarees'
import { motifTexte } from './motif-texte'

const DEMANDE =
  'Place de marché pour tout le Tchad. Des vendeurs créent un compte et publient leurs produits : nom, photo, prix en FCFA, catégorie, ville, quartier, numéro WhatsApp. ' +
  'Chaque vendeur ne peut modifier ou supprimer que ses propres produits. Un administrateur peut masquer un produit, bloquer un vendeur et ajouter des villes et des catégories.'
const champ = (n: string, type = 'text') => ({ id: `fld_${n}`, name: n, type, required: false })
const ENTITES: EntiteDeclaree[] = [
  { id: 'ent_vendeur', name: 'vendeur', fields: [champ('nom'), champ('telephone'), champ('motdepasse'), champ('bloque', 'boolean')] },
  { id: 'ent_produit', name: 'produit', lecturePublique: true, fields: ['nom', 'photo', 'prix', 'categorie', 'ville', 'quartier', 'whatsapp'].map((n) => champ(n)).concat([champ('masque', 'boolean')]) },
]
/** Les lignes mesurées dans index.tsx de la version 2 (517, 724, 460, 317). */
const CODE = [
  "const { data, error } = await base.auth.signUp({ email: `${tel}@tchad.local`, password: mdp })",
  'const mesProduits = produits.filter(p => p.whatsapp === vendeurActuel?.telephone)',
  'const estAdmin = !enBase || vendeurActuel?.id === premierVendeurId || (!vendeurActuel && !!session)',
  'setProduits(p.filter(x => !x.masque))',
  "await base.from('produit').select('*').order('id', { ascending: true })",
  'vendeurs produits publient nom prix fcfa categorie ville quartier numero whatsapp masquer bloquer ajouter villes categories modifier supprimer propres https://wa.me/235',
].join('\n')
/** La porte émise AVANT le 2026-11-23 : la table entière au visiteur. */
const POLITIQUES_D_AVANT = [
  'create policy produit_lecture_publique on produit for select to anon',
  '  using (true);',
  'grant select on produit to anon;',
].join('\n')
const LIVRE = { entites: ENTITES, fichiers: new Map([['index.tsx', CODE]]), politiques: POLITIQUES_D_AVANT }
const analyse = analyserDemande({ demande: DEMANDE, entites: ENTITES, roles: ['vendeur', 'administrateur'], code: CODE, schema: '', livre: LIVRE })
const phrase = (debut: string) => analyse.phrases.find((p) => p.phrase.startsWith(debut))

describe('① écrite mais inutilisable ≠ absente', () => {
  it('l’inscription : ÉCRITE par le modèle, inutilisable une fois publiée — et dit pourquoi', () => {
    const p = phrase('Des vendeurs')
    expect(p?.raison).toMatch(motifTexte('inscription libre des utilisateurs : écrite par le modèle, inutilisable une fois publiée'))
    expect(p?.raison).toMatch(motifTexte('confirmation par courriel obligatoire'))
    // La photo, elle, est absente : la pire des deux décide du verdict.
    expect(p?.raison).toMatch(motifTexte('envoi de photos ou de fichiers : aucune trace dans le code'))
    expect(p?.raison).not.toMatch(/^moule/u)
  })
  it('« que ses propres produits » : écrite (filtre à l’écran), inutilisable une fois publiée', () => {
    expect(phrase('Chaque vendeur')).toMatchObject({ verdict: 'écrite mais inutilisable une fois publiée', methode: 'brique' })
    expect(phrase('Chaque vendeur')?.etape).toMatch(/^publication\s:\s/u)
  })
  it('l’administrateur : un rôle écrit à l’écran, que la base ne connaît pas', () => {
    expect(phrase('Un administrateur')?.verdict).toBe('écrite mais inutilisable une fois publiée')
  })
  it('SANS la trace, la même phrase est ABSENTE du code — génération, pas publication', () => {
    const sans = analyserDemande({ demande: DEMANDE, entites: ENTITES, roles: [], code: 'vendeurs produits modifier supprimer propres', schema: '' })
    const p = sans.phrases.find((x) => x.phrase.startsWith('Chaque vendeur'))
    expect(p?.verdict).toBe('perdue')
    expect(p?.etape).toMatch(/^génération\s:\sabsente\sdu\scode\slivré/u)
    expect(p?.etape).toContain('politiques-donnees.ts')
  })
  it('une capacité écrite dont l’échec n’est PAS mesuré se dit « non éprouvée », jamais « inutilisable »', () => {
    const a = analyserDemande({ demande: 'Chaque colis porte un code QR.', entites: [], roles: [], code: "import QRCode from 'x'; colis porte code", schema: '' })
    expect(a.phrases[0]?.verdict).toBe('écrite, non éprouvée une fois publiée')
  })
})

describe('② les constats du livrable', () => {
  const quoi = analyse.constats.map((c) => c.quoi)
  it('mot de passe stocké en clair', () => {
    expect(quoi.includes('mot de passe stocké en clair : « vendeur.motdepasse »'), 'mot de passe stocké en clair : « vendeur.motdepasse »').toBe(true)
  })
  it('produits masqués lisibles : la table entière ET le tri à l’écran seulement', () => {
    expect(quoi.includes('table « produit » lisible EN ENTIER par tout visiteur sans compte'), 'table « produit » lisible EN ENTIER par tout visiteur sans compte').toBe(true)
    expect(quoi.includes('lignes de « produit » cachées à l’écran seulement (« masque ») : lisibles par tout visiteur'), 'lignes de « produit » cachées à l’écran seulement (« masque ») : lisibles par tout visiteur').toBe(true)
  })
  it('un champ sensible n’est pas un mot de passe en clair ; une table privée n’est pas lisible en entier', () => {
    const c = constatsDuLivre({
      entites: [{ id: 'ent_compte', name: 'compte', fields: [{ ...champ('motdepasse'), sensitive: true } as never] }],
      fichiers: new Map(),
      politiques: 'grant select, insert, update, delete on compte to authenticated;',
    })
    expect(c).toEqual([])
  })
  it('la porte d’aujourd’hui (colonnes nommées) : plus de « table entière »', () => {
    const c = constatsDuLivre({ ...LIVRE, politiques: 'grant select (id, nom) on produit to anon;' })
    expect(c.map((x) => x.quoi).join('\n')).not.toMatch(motifTexte('EN ENTIER'))
  })
  it('la fiabilité est redite : ce qui est fiable, ce qui est présomption, l’angle mort', () => {
    expect(analyse.fiabilite).toContain('FIABLE')
    expect(analyse.fiabilite).toMatch(motifTexte('PRÉSOMPTION FAIBLE'))
    expect(analyse.fiabilite).toMatch(motifTexte('ANGLE MORT'))
  })
})

describe('③ le message montré est celui de l’écran', () => {
  const lire = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
  it('création : l’écran et la boîte noire emploient la MÊME fonction', () => {
    expect(lire('src/components/onboarding/ConversationApplication.tsx')).toMatch(motifTexte('compris: messageDeCreation(d)'))
    expect(lire('src/app/api/generateur/direct/route.ts')).toContain('messageDeCreation(')
    const m = messageDeCreation({ dureeMs: 41_000, tours: [1, 2], execution: { monteDansSimulateur: true, ecransVisites: 24, ecransDecouverts: 80, ecransDistincts: 5, erreurs: [] } })
    expect(m[0]).toBe('Votre application est prête en 41 secondes (2 essai(s)).')
    expect(m.join('\n')).toMatch(motifTexte('24 sur 80'))
  })
  it('modification : l’écran et la boîte noire emploient la MÊME fonction', () => {
    expect(lire('src/app/atelier/[id]/page.tsx')).toContain('messageDeRetouche(')
    expect(lire('src/app/api/generateur/retoucher/route.ts')).toContain('messageDeRetouche(')
  })
  it('les trois genres, et le suffixe du compteur', () => {
    const paye = suffixeCompteur({ compteur: { exempte: false, formule: 'abonnee', restantes: 3, payeJusquAu: null, actif: true } as never, livree: true, aConfirmer: false, coutUsd: 0.03, modificationsRestantes: 36 })
    expect(paye).toBe(' Il vous en reste 36.')
    const avis = messageDeRetouche({ ok: true, fichiers: ['index.tsx'] }, true, paye)
    expect(avis.genre).toBe('avis')
    // 2026-11-23 : la phrase se ferme AVANT le compteur — plus de « touché(s) Il vous en reste 36.. ».
    expect(avis.texte).toBe('Modifié — 1 fichier(s) touché(s). Il vous en reste 36.')
    expect(messageDeRetouche({ ok: true, fichiers: ['APPARENCE.json'], couleur: '#2f7d4f' }, true, paye).texte).toBe('Couleur principale appliquée. Il vous en reste 36.')
    expect(messageDeRetouche({ ok: true, fichiers: ['index.tsx'] }, true, ' (0.028 $ dépensés)').texte, 'le fondateur').toBe('Modifié — 1 fichier(s) touché(s) (0.028 $ dépensés).')
    expect(messageDeRetouche({ ok: true, fichiers: ['index.tsx'] }, true, '').texte, 'aucun compteur').toBe('Modifié — 1 fichier(s) touché(s).')
    expect(messageDeRetouche({ error: 'Je ne l’ai pas appliquée.' }, false, ' Non décomptée.')).toEqual({ genre: 'erreur', texte: 'Je ne l’ai pas appliquée. Non décomptée.' })
    expect(messageDeRetouche({ aConfirmer: true, message: 'Retire 2 éléments.' }, false, '').genre).toBe('confirmation')
    expect(suffixeCompteur({ compteur: { exempte: true }, livree: true, aConfirmer: false, coutUsd: 0.028, modificationsRestantes: undefined })).toBe(' (0.028 $ dépensés)')
  })
})
