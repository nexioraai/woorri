/**
 * TIR — LE TABLEAU DE BORD ENSEIGNÉ (2026-11-12).
 *
 * Ordre du propriétaire : « il faut apprendre à Deribfy à faire ce genre de
 * dashboard », puis « lance une génération avant de mettre en ligne ».
 *
 * Ce tir mesure UNE chose : une vraie génération (moteur direct, le modèle
 * écrit l'application) s'ouvre-t-elle sur un tableau de bord composé selon
 * ses données, avec les pièces fournies (CoqueGestion, CarteDeChiffre,
 * CarteVedette, Courbe, Anneau…) et des chiffres CALCULÉS par
 * ./systeme/donnees — et non écrits en dur ?
 *
 * IL NE TOUCHE À AUCUNE BASE. Il sauvegarde les fichiers et la page dans
 * /tmp/tir-tableau-de-bord ; l'écran se juge ensuite GRATUITEMENT, autant
 * de fois qu'il faut, sans repayer.
 *
 *   TIR_PAYANT=oui npx vitest run -c vitest.tir.config.ts src/tirs/tableau-de-bord.tir.ts
 */
import { describe, expect, it } from 'vitest'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { exigerFeuVert } from '../../vitest.tir.setup'
import { CONFIGS, fournisseurChoisi, tarifDe, appelerFournisseur } from '@/lib/apps/fournisseur'
import { boucleEcriture, consignePour, pageAutonome } from '@/lib/apps/boucle-directe'
import { resumeEntites } from '@/lib/apps/entites-declarees'

const DOSSIER = '/tmp/tir-tableau-de-bord'
const trace = (l: string) => appendFileSync(`${DOSSIER}/journal.txt`, l + '\n')

const ENTITES = [
  {
    id: 'ent_membre', name: 'membre',
    fields: [
      { id: 'fld_nom', name: 'nom', type: 'text' as const, required: true },
      { id: 'fld_telephone', name: 'telephone', type: 'text' as const, required: true },
      { id: 'fld_quartier', name: 'quartier', type: 'text' as const, required: true },
      { id: 'fld_inscription', name: 'date_inscription', type: 'date' as const, required: true },
    ],
  },
  {
    id: 'ent_cotisation', name: 'cotisation',
    fields: [
      { id: 'fld_membre', name: 'membre', type: 'text' as const, required: true },
      { id: 'fld_montant', name: 'montant', type: 'number' as const, required: true },
      { id: 'fld_date', name: 'date', type: 'date' as const, required: true },
      { id: 'fld_payee', name: 'payee', type: 'boolean' as const, required: true },
    ],
  },
  {
    id: 'ent_annonce', name: 'annonce', lecturePublique: true,
    fields: [
      { id: 'fld_titre', name: 'titre', type: 'text' as const, required: true },
      { id: 'fld_texte', name: 'texte', type: 'text' as const, required: true },
      { id: 'fld_publiee', name: 'publiee', type: 'boolean' as const, required: true },
      { id: 'fld_date_pub', name: 'date_publication', type: 'date' as const, required: true },
    ],
  },
]

const DEMANDE =
  "Je veux une application pour gérer notre association de quartier à N'Djamena. " +
  'Un espace de gestion, derrière connexion, pour les responsables : les membres (nom, téléphone, quartier, ' +
  "date d'inscription), les cotisations mensuelles (membre, montant, date, payée ou non) et les annonces. " +
  'Une page publique qui montre les annonces publiées.'

describe('TIR · le tableau de bord enseigné', () => {
  it('génère une application et la sauvegarde pour l’écran', async () => {
    exigerFeuVert('génération de contrôle — tableau de bord enseigné')
    mkdirSync(DOSSIER, { recursive: true })
    writeFileSync(`${DOSSIER}/journal.txt`, '')

    const fournisseur = fournisseurChoisi(process.env.GENERATEUR_FOURNISSEUR)
    const config = CONFIGS[fournisseur]
    const cle = fournisseur === 'deepseek' ? (process.env.DEEPSEEK_API_KEY ?? '') : (process.env.ANTHROPIC_API_KEY ?? '')
    expect(cle, 'aucune clef pour le fournisseur choisi').not.toBe('')
    trace(`-- FOURNISSEUR ${fournisseur} · ENTITÉS ${resumeEntites(ENTITES)}`)

    const consigne = consignePour(ENTITES)
    trace(`-- CONSIGNE ${String(consigne.length)} signes · règle du tableau de bord : ${String(consigne.includes('UN ESPACE DE GESTION = <CoqueGestion>'))}`)

    let entree = 0, sortie = 0
    const t0 = Date.now()
    const r = await boucleEcriture({
      demande: DEMANDE,
      entites: ENTITES,
      configuration: { currency: 'XAF' },
      appeler: async (messages) => {
        const rep = await appelerFournisseur(fournisseur, cle, consigne, messages)
        entree += rep.usage.entree
        sortie += rep.usage.sortie
        return { texte: rep.texte, tronquee: rep.tronquee }
      },
    })
    const tarif = tarifDe(config.prix, new Date())
    const usd = (entree * tarif.entree + sortie * tarif.sortie) / 1e6
    trace(`-- ${String(entree)} jetons d’entrée · ${String(sortie)} de sortie · ${((Date.now() - t0) / 1000).toFixed(1)} s · ${usd.toFixed(5)} $`)
    for (const t of r.tours) trace(`   tour ${String(t.rang)} : ${t.ok ? 'accepté' : 'renvoyé — ' + String(t.motif ?? '').split('\n')[0]?.slice(0, 140)}`)
    expect(r.ok, r.ok ? '' : `refusé : ${String(r.motif).slice(0, 400)}`).toBe(true)
    if (!r.ok) return

    mkdirSync(`${DOSSIER}/fichiers`, { recursive: true })
    for (const [chemin, contenu] of r.fichiers) writeFileSync(`${DOSSIER}/fichiers/${chemin.replace(/\//g, '__')}`, contenu)
    writeFileSync(`${DOSSIER}/page.html`, pageAutonome(r.code, 'Association du quartier'))

    // CE QUE LE MODÈLE A EMPLOYÉ — lu dans ses fichiers, pas supposé.
    const sienne = [...r.fichiers].filter(([c]) => !c.startsWith('systeme/')).map(([, s]) => s).join('\n')
    for (const piece of ['CoqueGestion', 'CarteDeChiffre', 'CarteVedette', 'Courbe', 'Barres', 'Anneau', 'Classement', 'ListeRecente', 'ChoixApparence', 'parMois', 'sommeParMois', 'compterPar', 'tendance']) {
      trace(`   ${sienne.includes(piece) ? '✓' : '·'} ${piece}`)
    }
  })
})
