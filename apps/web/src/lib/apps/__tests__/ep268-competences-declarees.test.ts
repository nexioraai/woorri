/**
 * EP-268 · CE QUE L'APPLICATION SAURA FAIRE, DIT PENDANT QU'ELLE SE CONSTRUIT.
 *
 * ── LE DÉFAUT, MESURÉ.
 *
 * `packages/capability-registry` déclare VINGT ET UNE capacités, chacune avec
 * un `title` écrit en français par un humain. VINGT documents sur vingt-deux
 * en portent. Et AUCUN écran ne les montrait.
 *
 * Septième « machine posée, débranchée » de ce chantier. La forme ne change
 * pas : la donnée est là, et personne ne la regarde.
 *
 * Chez Bolt (C3), l'agent déclare ses compétences avant d'agir — c'est ce qui
 * transforme « ça travaille » en « voilà ce qu'il construit ».
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 * ① les mots viennent du REGISTRE, pas de ce code ;
 * ② un identifiant hors registre est TU, jamais affiché brut ;
 * ③ l'ordre est stable — deux rafraîchissements ne réordonnent pas la liste ;
 * ④ l'état REND la liste, et l'écran l'AFFICHE.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { competencesDeclarees } from '../competences'

const DOC = {
  capabilities: [
    { capability: 'push_notifications' },
    { capability: 'auth' },
    { capability: 'payments.psp' },
    // Un doublon : la liste ne doit pas le répéter.
    { capability: 'auth' },
  ],
}

describe('EP-268 · les compétences déclarées', () => {
  it('① LES MOTS VIENNENT DU REGISTRE — pas une phrase fabriquée ici', () => {
    const c = competencesDeclarees(DOC)
    expect(c.length, 'aucune compétence lue').toBeGreaterThan(2)
    // ── LE TITRE EST CELUI DU REGISTRE, VÉRIFIÉ À LA SOURCE.
    //
    // Recopier le titre attendu dans ce test le ferait diverger au premier
    // mot changé. On relit le registre — la seule vérité — et on exige
    // l'égalité.
    const defs = readFileSync(
      join(__dirname, '..', '..', '..', '..', '..', '..', 'packages', 'capability-registry', 'src', 'definitions.ts'),
      'utf8',
    )
    for (const x of c) {
      expect(defs, `le titre de ${x.id} n’est pas celui du registre`).toContain(x.titre)
      // ET CE N'EST PAS L'IDENTIFIANT RECOPIÉ : « payments.psp » sous les yeux
      // de quelqu'un qui attend son application ne lui apprend rien.
      expect(x.titre, `${x.id} s’affiche en code machine`).not.toBe(x.id)
    }
  })

  it('② UN IDENTIFIANT HORS REGISTRE EST TU, PAS AFFICHÉ BRUT', () => {
    // ── POURQUOI SE TAIRE.
    //
    // Le registre est une allowlist FERMÉE : une capacité hors registre ne
    // peut pas être implémentée, donc l'annoncer serait promettre ce qui
    // n'existe pas. Et afficher son identifiant rouvrirait le défaut que ce
    // dépôt vient de fermer sur l'agent — « AIR_AGENT_SANS_CERVEAU » lu par
    // une personne qui parlait à son application.
    const c = competencesDeclarees({ capabilities: [{ capability: 'telepathie_v2' }] })
    expect(c, 'un identifiant inconnu atteint l’écran').toEqual([])
    // ET UNE FORME ABERRANTE N'EMPORTE PAS LE SUIVI AVEC ELLE.
    expect(competencesDeclarees(null)).toEqual([])
    expect(competencesDeclarees({ capabilities: 'pas un tableau' })).toEqual([])
    expect(competencesDeclarees({ capabilities: [null, 42, { capability: 'auth' }] }).length).toBe(1)
  })

  it('③ L’ORDRE EST STABLE, ET PAS CELUI DU DOCUMENT', () => {
    // Deux rafraîchissements du suivi ne doivent pas réordonner la liste sous
    // les yeux de celui qui lit. L'ordre du document n'a aucun sens pour lui.
    const a = competencesDeclarees(DOC).map((x) => x.id)
    const b = competencesDeclarees({ capabilities: [...DOC.capabilities].reverse() }).map((x) => x.id)
    expect(a, 'l’ordre dépend du document : la liste bougera à chaque lecture').toEqual(b)
    // ET AUCUN DOUBLON : `auth` est déclaré deux fois dans le fixture.
    expect(new Set(a).size, 'un doublon est rendu deux fois').toBe(a.length)
  })

  it('④ L’ÉTAT REND LA LISTE, ET L’ÉCRAN L’AFFICHE', async () => {
    // ── MESURÉ, PAS LU DANS LA SOURCE.
    //
    // Trois fois aujourd'hui un contrôle a cherché une MENTION au lieu d'un
    // câblage, et trois fois il est resté vert sous mutation. On appelle donc
    // le service avec le double PostgREST du dépôt.
    const { creerFrom } = await import('@/lib/testing/postgrest')
    const { etatGeneration } = await import('../service-generations')
    const journal = { filtres: {}, projections: {}, ecritures: {} }
    const LIGNE = {
      id: 'gen-1',
      statut: 'en_cours',
      etape: 'reparation',
      nom: 'Essai',
      diagnostics: [],
      document: null,
      created_at: new Date(0).toISOString(),
      battement: null,
      // `acquis` DEVIENT le document quand P0 aboutit (`moteur.mjs`).
      sections_acquises: { phase: 'reparation', acquis: DOC },
      cout_usd: 0.5,
      jetons_entree: 1,
      jetons_sortie: 2,
      attente_validation: false,
    }
    const base = {
      from: creerFrom(
        {
          gen: { reponse: () => ({ data: LIGNE, error: null }) },
          app_generation_versions: { reponse: () => ({ data: [], error: null }) },
        },
        journal,
      ),
    }
    const etat = await etatGeneration({
      base: base as unknown as Parameters<typeof etatGeneration>[0]['base'],
      table: 'gen',
      id: 'gen-1',
      proprietaire: 'u-1',
    })
    expect(
      etat?.competences.length,
      'l’état ne porte pas les compétences : le registre reste lu et jamais rendu',
    ).toBe(3)
    expect(JSON.stringify(etat?.competences), 'un identifiant brut traverse l’état').not.toContain(
      '"titre":"auth"',
    )

    // ET L'ÉCRAN LES AFFICHE — le dernier maillon, celui qui a manqué sept fois.
    const ecran = readFileSync(
      join(__dirname, '..', '..', '..', 'components', 'onboarding', 'ConversationApplication.tsx'),
      'utf8',
    )
    const i = ecran.indexOf('<JournalGeneration')
    expect(i, 'le panneau a disparu').toBeGreaterThan(-1)
    const zone = ecran.slice(i, ecran.indexOf('/>', i))
    expect(
      zone,
      'les compétences ne sont pas passées au panneau : rendues par l’API et ' +
        'invisibles — le défaut déplacé d’un étage, pas fermé',
    ).toMatch(/competences=\{etatGen\?\.competences/u)
  })
})
