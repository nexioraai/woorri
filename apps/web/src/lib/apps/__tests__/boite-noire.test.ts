/**
 * LA BOÎTE NOIRE (2026-11-23) — ce que ces tests tiennent :
 *   ① aucun secret n'y entre, ni par le nom du champ ni par la forme de la valeur ;
 *   ② sa taille est bornée, et une coupe se dit ;
 *   ③ elle ne fait JAMAIS échouer le travail (noter et enregistrer ne lèvent pas) ;
 *   ④ l'analyse phrase par phrase rend, sur la vraie demande de la place de
 *      marché, ce que le diagnostic manuel du 2026-11-22 avait établi ;
 *   ⑤ seul le fondateur la lit — un client, même propriétaire de l'appli, non.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const etat = vi.hoisted(() => ({
  email: 'issayamiyoussouf@gmail.com' as string | null,
  ligne: null as null | Record<string, unknown>,
  journal: { filtres: {}, projections: {}, ecritures: {} } as import('@/lib/testing/postgrest').JournalPostgrest,
}))
vi.mock('@/lib/auth/require-authenticated-user', () => ({
  requireAuthenticatedUser: async () => (etat.email === null
    ? { ok: false, response: new Response(JSON.stringify({ error: 'non connecté' }), { status: 401 }) }
    : { ok: true, userId: 'u-1', email: etat.email }),
}))
vi.mock('@/lib/supabase-admin', async () => {
  const { creerFrom } = await import('@/lib/testing/postgrest')
  const { TABLE_GENERATIONS } = await import('@/lib/apps/journal')
  return { supabaseAdmin: { from: creerFrom({
    app_boite_noire: { reponse: (f) => (f.at(-1)?.[0] === 'limit' ? { data: [etat.ligne], error: null } : { data: etat.ligne, error: null }) },
    [TABLE_GENERATIONS]: { reponse: (f) => (f.at(-1)?.[0] === 'in' ? { data: [{ id: 'g-1', nom: 'Place de marché Tchad' }], error: null } : { data: { nom: 'Place de marché Tchad' }, error: null }) },
  }, etat.journal) } }
})

import { BoiteNoire, bornerEtapes, RETIRE, sansSecrets, TAILLE_MAX_LIGNE, TAILLE_MAX_TEXTE, type Etape } from '../boite-noire'
import { analyserDemande } from '../analyse-demande'
import { GET as LISTE } from '@/app/api/admin/boite-noire/route'
import { GET as UNE } from '@/app/api/admin/boite-noire/[id]/route'
import { GET as TELECHARGER } from '@/app/api/admin/boite-noire/[id]/telecharger/route'

// Des formes de secrets FABRIQUÉES (aucune n'est une vraie clé).
const FAUX = {
  deepseek: 'sk-' + 'a'.repeat(32),
  stripe: 'sk_' + 'live_' + 'B'.repeat(24),
  webhook: 'whsec_' + 'C'.repeat(24),
  supabase: 'sb_' + 'secret_' + 'D'.repeat(24),
  jwt: 'eyJ' + 'h'.repeat(20) + '.' + 'p'.repeat(20) + '.' + 's'.repeat(20),
  base: 'postgresql://postgres:' + 'motdepasse123' + '@db.exemple.co:5432/postgres',
  bearer: 'Bearer ' + 'E'.repeat(30),
}
const TOUTES = Object.values(FAUX).filter((v) => !v.startsWith('postgresql')).concat(['motdepasse123'])

beforeEach(() => {
  etat.email = 'issayamiyoussouf@gmail.com'
  etat.ligne = null
  etat.journal.filtres = {}; etat.journal.projections = {}; etat.journal.ecritures = {}
})

describe('① aucun secret n’entre dans la boîte noire', () => {
  it('par la forme de la valeur, partout dans un texte (consigne, réponse brute)', () => {
    const texte = `Voici : ${Object.values(FAUX).join(' | ')}`
    const propre = JSON.stringify(sansSecrets({ texte }))
    for (const s of TOUTES) expect(propre, `secret resté : ${s.slice(0, 12)}…`).not.toContain(s)
    expect(propre).toContain('postgresql://postgres:[retiré]@db.exemple.co')
  })
  it('par le nom du champ — et les compteurs de jetons restent', () => {
    const v = sansSecrets({ cle: 'x-123', motdepasse: 'abc', publication_jeton: 'tok', clesecrete: 'z', jetonsEntree: 1200, nom: 'Stock' }) as Record<string, unknown>
    expect(v).toEqual({ cle: RETIRE, motdepasse: RETIRE, publication_jeton: RETIRE, clesecrete: RETIRE, jetonsEntree: 1200, nom: 'Stock' })
  })
  it('ce qui part en base ne porte aucun secret, quelle que soit l’étape', async () => {
    const b = new BoiteNoire({ nature: 'generation', compte: 'u-1' })
    b.noter('consigne', 'consigne', { consigneSysteme: `clé ${FAUX.deepseek}`, configuration: { cle: 'abc' } })
    b.noter('reponse_brute', 'réponse', { texte: `const k = "${FAUX.stripe}"; ${FAUX.jwt}` })
    const ecrites: unknown[] = []
    await b.enregistrer({ from: () => ({ insert: async (l) => { ecrites.push(l); return { error: null } } }) }, { generationId: 'g-1', issue: 'livree', analyse: { note: FAUX.bearer } })
    const tout = JSON.stringify(ecrites)
    for (const s of TOUTES) expect(tout, `secret resté : ${s.slice(0, 12)}…`).not.toContain(s)
  })
})

describe('② la taille est bornée, et la coupe se dit', () => {
  const etape = (n: number, type: Etape['type'], texte: string): Etape => ({ n, quand: '', type, titre: '', donnees: { texte } })
  it('un texte au-delà de TAILLE_MAX_TEXTE est coupé et marqué', () => {
    const r = bornerEtapes([etape(1, 'reponse_brute', 'x'.repeat(TAILLE_MAX_TEXTE + 10))])
    expect(r.tronquee).toBe(true)
    expect(String((r.etapes[0]?.donnees as { texte: string }).texte)).toContain('[… coupé : 10 signes de plus]')
  })
  it('une ligne trop grosse : les réponses du MILIEU d’abord, le premier et le dernier tour gardés entiers', () => {
    const gros = 'y'.repeat(TAILLE_MAX_TEXTE)
    const etapes = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => etape(n, 'reponse_brute', gros))
    const r = bornerEtapes(etapes)
    expect(Buffer.byteLength(JSON.stringify(r.etapes))).toBeLessThanOrEqual(TAILLE_MAX_LIGNE)
    expect(r.tronquee).toBe(true)
    expect((r.etapes[0]?.donnees as { texte: string }).texte.length).toBe(TAILLE_MAX_TEXTE)
    expect((r.etapes[8]?.donnees as { texte: string }).texte.length).toBe(TAILLE_MAX_TEXTE)
  })
  it('une petite boîte n’est pas marquée coupée', () => {
    expect(bornerEtapes([etape(1, 'demande', 'court')]).tronquee).toBe(false)
  })
})

describe('③ elle ne fait JAMAIS échouer le travail', () => {
  it('une base qui refuse : enregistrer rend ok:false, sans lever', async () => {
    const b = new BoiteNoire({ nature: 'retouche', compte: null })
    b.noter('demande', 'd', { demande: 'x' })
    const r = await b.enregistrer({ from: () => ({ insert: async () => ({ error: { message: 'table absente' } }) }) }, { generationId: null, issue: 'livree', analyse: null })
    expect(r).toEqual({ ok: false, erreur: 'table absente' })
  })
  it('une base qui JETTE : pareil', async () => {
    const b = new BoiteNoire({ nature: 'generation', compte: null })
    const r = await b.enregistrer({ from: () => { throw new Error('réseau coupé') } }, { generationId: null, issue: 'echec', analyse: null })
    expect(r.ok).toBe(false)
  })
  it('une donnée impossible à copier : noter ne lève pas, l’étape est simplement omise', () => {
    const b = new BoiteNoire({ nature: 'generation', compte: null })
    expect(() => { b.noter('decisions', 'x', { f: () => 1 }) }).not.toThrow()
    expect(b.lire()).toHaveLength(0)
  })
})

describe('④ l’analyse phrase par phrase, sur la vraie demande de la place de marché', () => {
  const DEMANDE = 'Place de marché pour tout le Tchad. Des vendeurs créent un compte et publient leurs produits : nom, photo, prix en FCFA, catégorie, ville, quartier, numéro WhatsApp. Les visiteurs voient tous les produits sans compte, peuvent chercher par nom, filtrer par catégorie et par ville (N\'Djamena, Moundou, Sarh, Abéché, Doba, Bongor et les autres), et contacter le vendeur sur WhatsApp. Chaque vendeur ne peut modifier ou supprimer que ses propres produits. Un administrateur peut masquer un produit, bloquer un vendeur et ajouter des villes et des catégories.'
  const ENTITES = [
    { id: 'ent_vendeur', name: 'vendeur', fields: [{ name: 'nom' }, { name: 'telephone' }, { name: 'motdepasse' }, { name: 'bloque' }] },
    { id: 'ent_produit', name: 'produit', fields: ['nom', 'photo', 'prix', 'categorie', 'ville', 'quartier', 'whatsapp', 'masque'].map((name) => ({ name })) },
    { id: 'ent_ville', name: 'ville', fields: [{ name: 'nom' }] },
    { id: 'ent_categorie', name: 'categorie', fields: [{ name: 'nom' }] },
  ]
  const CODE = 'Place de marché Tchad. vendeurs produits publier publient nom photo prix fcfa categorie ville quartier numero whatsapp visiteurs voient chercher filtrer contacter https://wa.me/235 masquer bloquer ajouter villes categories administrateur modifier supprimer'
  const a = analyserDemande({ demande: DEMANDE, entites: ENTITES, roles: ['vendeur', 'visiteur', 'administrateur'], code: CODE, schema: 'create table produit (nom text)' })
  const statut = (debut: string) => a.phrases.find((p) => p.phrase.startsWith(debut))
  it('cinq phrases, et la couverture par tables (100 %) ne peut plus mentir', () => {
    expect(a.phrases).toHaveLength(5)
    expect(a.resume).toEqual({ faite: 1, 'faite en partie': 3, perdue: 1, 'indéterminée': 0 })
  })
  it('« que ses propres produits » : PERDUE, dans le moule (une seule porte)', () => {
    expect(statut('Chaque vendeur')).toMatchObject({ verdict: 'perdue', methode: 'brique' })
    expect(statut('Chaque vendeur')?.etape).toContain('politiques-donnees.ts')
  })
  it('« créent un compte … photo » : en partie — l’inscription et l’envoi de photos manquent', () => {
    const p = statut('Des vendeurs')
    expect(p?.verdict).toBe('faite en partie')
    expect(p?.raison).toContain('inscription libre')
    expect(p?.raison).toContain('envoi de photos')
  })
  it('la liste des villes : en partie, perdue à l’étape « données pré-remplies »', () => {
    expect(statut('Les visiteurs')).toMatchObject({ verdict: 'faite en partie', etape: 'données pré-remplies' })
  })
  it('WhatsApp : une trace précise (wa.me) — sans elle, la phrase le dit', () => {
    const sans = analyserDemande({ demande: 'Contacter le vendeur sur WhatsApp.', entites: [], roles: [], code: 'contacter vendeur whatsapp', schema: '' })
    expect(sans.phrases[0]).toMatchObject({ verdict: 'faite en partie', etape: 'génération' })
  })
  it('elle dit sa fiabilité', () => {
    expect(a.fiabilite).toMatch(/présomption/u)
  })
})

describe('⑤ seul le fondateur lit une boîte noire', () => {
  const req = new Request('https://www.deribfy.com/api/admin/boite-noire', { headers: { Authorization: 'Bearer x' } })
  const ctx = { params: Promise.resolve({ id: 'b-1' }) }
  const LIGNE = {
    id: 'b-1', cree_le: '2026-11-23T00:00:00Z', generation_id: 'g-1', nature: 'generation', issue: 'livree', tronquee: false, taille_octets: 100,
    etapes: [{ n: 1, quand: 'q', type: 'demande', titre: 'La demande du client, mot pour mot', donnees: { demande: 'Place de marché pour tout le Tchad.' } },
      { n: 2, quand: 'q', type: 'reponse_brute', titre: 'Tour 1 — la réponse brute du modèle', donnees: { texte: '=== index.tsx ===\nexport const a = 1\n```code```' } }],
    analyse_phrases: { phrases: [{ phrase: 'Chaque vendeur…', verdict: 'perdue', etape: 'moule', raison: 'brique absente', methode: 'brique' }], fiabilite: 'f' },
  }
  it('un CLIENT — même propriétaire de l’appli — reçoit 403 partout ; sans connexion, 401', async () => {
    etat.ligne = LIGNE
    etat.email = 'contact@deribfy.com'
    for (const r of [await LISTE(req), await UNE(req, ctx), await TELECHARGER(req, ctx)]) expect(r.status).toBe(403)
    etat.email = null
    expect((await LISTE(req)).status).toBe(401)
    // Le refus vient AVANT toute lecture : la table n'a pas été touchée.
    expect(etat.journal.projections.app_boite_noire).toBeUndefined()
  })
  it('le fondateur : la liste (avec le nom de l’appli), une boîte entière', async () => {
    etat.ligne = LIGNE
    const l = (await (await LISTE(req)).json()) as { boites: { nom: string }[] }
    expect(l.boites[0]?.nom).toBe('Place de marché Tchad')
    expect(etat.journal.projections.app_boite_noire, 'la liste charge les étapes').not.toContain('etapes')
    const u = (await (await UNE(req, ctx)).json()) as { boite: { etapes: unknown[] } }
    expect(u.boite.etapes).toHaveLength(2)
  })
  it('« Télécharger » : UN fichier Markdown lisible, analyse puis étapes dans l’ordre, la réponse brute en bloc intact', async () => {
    etat.ligne = LIGNE
    const r = await TELECHARGER(req, ctx)
    expect(r.headers.get('content-type')).toContain('text/markdown')
    expect(r.headers.get('content-disposition')).toContain('attachment; filename="boite-noire-b-1.md"')
    const t = await r.text()
    expect(t).toContain('# Boîte noire — Place de marché Tchad (generation)')
    expect(t.indexOf('## Analyse phrase par phrase')).toBeLessThan(t.indexOf('## Les étapes'))
    expect(t).toContain('**[perdue]** Chaque vendeur…')
    expect(t.indexOf('### 1. La demande')).toBeLessThan(t.indexOf('### 2. Tour 1'))
    // Un ``` DANS la réponse brute ne casse pas le bloc : la clôture est plus longue.
    expect(t).toContain('````\n=== index.tsx ===\nexport const a = 1\n```code```\n````')
  })
})

