/**
 * TIR ④ — UNE ŒUVRE QUI SE SOUVIENT. Première moitié : la génération.
 *
 * ── LA SEULE PREUVE QUI COMPTE, dans les mots du propriétaire.
 *
 * « On inscrit un membre, on recharge, il est encore là. »
 *
 * Tout ce qui précède — la consigne qui s'échange, le juge qui voit
 * l'hybride, le paquet embarqué, la clé qui se remplit — n'est qu'une
 * plomberie. Rien ne prouve encore qu'une seule œuvre fonctionne de bout en
 * bout, et l'échange de la règle 6 change le comportement de TOUTE
 * génération à données au moment du déploiement.
 *
 * ── POURQUOI CE TIR S'ARRÊTE AU MILIEU, ET C'EST VOULU.
 *
 * Il DÉPENSE. Si la preuve en navigateur échouait pour une raison mécanique
 * — un sélecteur, un délai, une faute de mon harnais — il faudrait
 * régénérer, donc repayer. Il SAUVEGARDE donc ce qu'il a produit, et
 * `oeuvre-qui-se-souvient-ecran.tir.ts` le rejoue GRATUITEMENT autant de
 * fois qu'il faut.
 *
 * Un tir payant doit être rejouable sans l'être.
 *
 * ── ET IL NE NETTOIE PAS.
 *
 * Le schéma et le compte doivent SURVIVRE à ce tir : la seconde moitié en a
 * besoin. C'est elle qui nettoie. Un tir qui nettoie ce que le suivant
 * attend force une seconde dépense.
 */
import { describe, expect, it } from 'vitest'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { emettreSchemaSql, emettrePolitiquesSql } from '@deribfy/compiler'
import { exigerFeuVert } from '../../vitest.tir.setup'
import { CONFIGS, fournisseurChoisi, tarifDe, appelerFournisseur } from '@/lib/apps/fournisseur'
import { boucleEcriture, consignePour, pageAutonome } from '@/lib/apps/boucle-directe'
import { phraseTable, resumeEntites } from '@/lib/apps/entites-declarees'
import { configBaseOeuvres } from '@/lib/apps/base-oeuvres'
import { nomSchemaOeuvre, poserOeuvre } from '@/lib/apps/poser-oeuvre'

const DOSSIER = '/tmp/tir-gestion'
const trace = (l: string) => appendFileSync(`${DOSSIER}/journal.txt`, l + '\n')

/**
 * LES ENTITÉS, FOURNIES DIRECTEMENT — et c'est fidèle, pas un raccourci.
 *
 * Dans le produit, l'écran de conversation lit le cahier (route `lire-brief`,
 * un appel payant à part), montre les tables à la personne, et les transmet
 * à la génération. Les fournir ici mesure LA GÉNÉRATION, qui est ce que D5
 * change — et évite de payer deux fois pour éprouver une étape déjà mesurée
 * par le tir des entités du 2026-11-02.
 */
const ENTITES = [
  {
    // LA FACE PUBLIQUE : n'importe qui la lit, sans compte.
    id: 'ent_annonce',
    name: 'annonce',
    lecturePublique: true,
    fields: [
      { id: 'fld_titre', name: 'titre', type: 'text' as const, required: true },
      { id: 'fld_texte', name: 'texte', type: 'text' as const, required: true },
      { id: 'fld_date', name: 'date', type: 'date' as const, required: true },
    ],
  },
  {
    // TENUE PAR LE PROPRIETAIRE : les quatre gestes sont attendus ici.
    id: 'ent_membre',
    name: 'membre',
    fields: [
      { id: 'fld_nom', name: 'nom', type: 'text' as const, required: true },
      { id: 'fld_telephone', name: 'telephone', type: 'text' as const, required: true },
    ],
  },
  {
    // L'EXCEPTION NOMMEE : un journal ne se reecrit ni ne s'efface.
    id: 'ent_versement',
    name: 'versement',
    appendOnly: true,
    fields: [
      { id: 'fld_montant', name: 'montant', type: 'number' as const, required: true },
      { id: 'fld_membre', name: 'membre', type: 'text' as const, required: true },
    ],
  },
]

const DEMANDE = [
  'Le site d’une association de quartier à N’Djamena.',
  '',
  'Une partie que TOUT LE MONDE peut lire sans compte : les annonces de',
  'l’association, avec leur titre, leur texte et leur date.',
  '',
  'Et une partie réservée au responsable, qui se connecte : il y tient la',
  'liste des membres (nom et téléphone) et il y publie les annonces. Il',
  'doit pouvoir corriger une faute de frappe et retirer ce qui ne sert',
  'plus.',
  '',
  'Il enregistre aussi les versements reçus : le montant et de quel membre.',
].join('\n')

describe('TIR A1 · une œuvre avec son espace de gestion', () => {
  it('génère les deux faces, et la pose', async () => {
    exigerFeuVert('génération de contrôle du lot A1 — espace de gestion')
    mkdirSync(DOSSIER, { recursive: true })
    writeFileSync(`${DOSSIER}/journal.txt`, '')

    const fournisseur = fournisseurChoisi(process.env.GENERATEUR_FOURNISSEUR)
    const config = CONFIGS[fournisseur]
    const cle =
      fournisseur === 'deepseek'
        ? (process.env.DEEPSEEK_API_KEY ?? '')
        : (process.env.ANTHROPIC_API_KEY ?? '')
    expect(cle, 'aucune clef pour le fournisseur choisi').not.toBe('')

    trace(`-- FOURNISSEUR ${fournisseur}`)
    trace(`-- ENTITÉS DÉCLARÉES : ${resumeEntites(ENTITES)}`)
    for (const e of ENTITES) trace(`     · ${phraseTable(e)}`)
    const consigne = consignePour(ENTITES)
    trace(`-- CONSIGNE : ${String(consigne.length)} signes · bloc de base présent : ${String(consigne.includes('TES DONNÉES VIVENT EN BASE'))}`)
    trace(`-- règle 6 (valeurs d’exemple) encore là : ${String(consigne.includes('valeurs d’exemple PLAUSIBLES'))}`)

    let entree = 0
    let sortie = 0
    const t0 = Date.now()
    const r = await boucleEcriture({
      demande: DEMANDE,
      entites: ENTITES,
      appeler: async (messages) => {
        const rep = await appelerFournisseur(fournisseur, cle, consigne, messages)
        entree += rep.usage.entree
        sortie += rep.usage.sortie
        return { texte: rep.texte, tronquee: rep.tronquee }
      },
    })
    const ms = Date.now() - t0
    const tarif = tarifDe(config.prix, new Date()) // modèle LOURD : `prixLeger` sous-estimerait
    const usd = (entree * tarif.entree + sortie * tarif.sortie) / 1e6

    trace('')
    trace(`-- ${String(entree)} jetons d’entrée · ${String(sortie)} de sortie · ${(ms / 1000).toFixed(1)} s · ${usd.toFixed(5)} $`)
    trace(`-- TOURS : ${String(r.tours.length)}`)
    for (const t of r.tours) {
      trace(`     tour ${String(t.rang)} : ${t.ok ? 'accepté' : 'renvoyé'}${t.ok ? '' : ` — ${String(t.motif ?? '').split('\n')[0]?.slice(0, 110) ?? ''}`}`)
    }
    expect(r.ok, r.ok ? '' : `refusé : ${String(r.motif).slice(0, 400)}`).toBe(true)
    if (!r.ok) return

    // ── LE VERDICT DU JUGE DE PERSISTANCE — la raison d'être du lot.
    trace('')
    trace(`-- JUGE DE PERSISTANCE : ${r.persistance.length === 0 ? 'AUCUN DÉFAUT — chaque table est lue ET écrite' : 'DÉFAUTS'}`)
    for (const d of r.persistance) {
      trace(`     × ${d.table} — ${d.lue ? 'lue, jamais écrite' : d.ecrite ? 'écrite, jamais lue' : 'ni lue ni écrite'}`)
    }
    trace(`-- autres juges : jetons ${String(r.jetons.length)} · vivacité ${String(r.vivacite.length)} · couverture absente ${String(r.couverture.absentes.length)}`)

    // ── CE QUE LE MODÈLE A ÉCRIT, et où il touche la base.
    trace('')
    trace(`-- FICHIERS : ${String(r.fichiers.size)}`)
    for (const [nom, contenu] of r.fichiers) {
      const lectures = [...contenu.matchAll(/\.from\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\n?\s*\.select/gu)].map((m) => m[1])
      const ecritures = [...contenu.matchAll(/\.from\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\n?\s*\.(insert|update|upsert|delete)/gu)].map((m) => m[1])
      trace(`     ${nom.padEnd(26)} ${String(contenu.length).padStart(6)} signes${lectures.length + ecritures.length > 0 ? ` · lit [${[...new Set(lectures)].join(', ')}] · écrit [${[...new Set(ecritures)].join(', ')}]` : ''}`)
    }
    trace(`-- écran de connexion : ${String(r.code.includes('signInWithPassword'))}`)
    trace(`-- valeurs en dur suspectes : ${String(/const\s+\w+\s*=\s*\[\s*\{[^}]*nom\s*:/u.test(r.code))}`)

    // ── LA POSE, et le compte, exactement comme la publication les fait.
    const cfg = configBaseOeuvres(process.env)
    expect(cfg.ok, 'base des œuvres indisponible').toBe(true)
    if (!cfg.ok) return
    const connexion = process.env.OEUVRES_DATABASE_URL_POOLER_SESSION ?? ''
    const ID = `tira1${String(Date.now()).slice(-9)}`
    const schema = nomSchemaOeuvre(ID)
    const pose = await poserOeuvre({
      id: ID,
      schemaSql: emettreSchemaSql(ENTITES),
      politiquesSql: emettrePolitiquesSql(ENTITES, ID),
      connexion,
    })
    expect(pose.ok, pose.ok ? '' : `pose refusée : ${JSON.stringify(pose)}`).toBe(true)

    const admin = createClient(cfg.config.url, cfg.config.cleSecrete, {
      auth: { persistSession: false },
    })
    const adresse = `tira1.${ID}@apps.deribfy.app`
    const motDePasse = `A1-${ID}-xZ`
    const cree = await admin.auth.admin.createUser({
      email: adresse,
      password: motDePasse,
      email_confirm: true,
      app_metadata: { oeuvre: ID },
    })
    expect(cree.error, `création du compte : ${cree.error?.message ?? ''}`).toBeNull()

    // ── LE DOCUMENT SERVI, avec la base de l'œuvre injectée — exactement
    //    ce que le navigateur recevrait de `/p/<jeton>`.
    const document = pageAutonome(r.code, 'Association du quartier', {
      url: cfg.config.url,
      clePubliable: cfg.config.clePubliable,
      schema,
    })

    // ── ON SAUVEGARDE, pour que la preuve d'écran ne coûte rien à rejouer.
    //
    // Le mot de passe est un secret de mesure, jetable, hors du dépôt.
    writeFileSync(`${DOSSIER}/document.html`, document)
    writeFileSync(`${DOSSIER}/bundle.js`, r.code)
    writeFileSync(
      `${DOSSIER}/oeuvre.json`,
      JSON.stringify(
        { id: ID, schema, adresse, motDePasse, url: cfg.config.url, cleCompte: cree.data.user?.id ?? '' },
        null,
        1,
      ),
    )
    trace('')
    trace(`-- POSÉ : schéma ${schema} · exposé ${String(pose.ok && pose.expose)}`)
    trace(`-- COMPTE : ${adresse}`)
    trace(`-- DOCUMENT : ${String(document.length)} signes → ${DOSSIER}/document.html`)
    trace('-- NON NETTOYÉ : la seconde moitié en a besoin, et c’est elle qui nettoie.')
  }, 600_000)
})
