/**
 * EP-327 · LE CLIENT DE LA BASE VIT DANS LE BUNDLE LIVRÉ.
 *
 * ── LE DÉFAUT GARDÉ, ET IL AURAIT COÛTÉ DE L'ARGENT AU PREMIER TIR.
 *
 * `@supabase/supabase-js` était AUTORISÉ à l'import depuis longtemps et
 * EMBARQUÉ nulle part. Inoffensif tant qu'aucune œuvre ne s'en servait.
 * Depuis que la consigne de D5 l'emploie, chaque œuvre à données aurait
 * bouclé sur « paquet non embarqué » jusqu'à épuiser ses tours — et payé
 * chacun d'eux.
 *
 * ── TROIS ÉCHECS MESURÉS LE 2026-11-03, dans cet ordre.
 *
 * · servi sous son propre nom → `MISSING_EXPORT: « createClient »`. Le
 *   fichier ne déclare aucun export : il remplit un objet à l'exécution.
 * · pont par `import umd from …` → `MISSING_EXPORT: « default »`. Pas de
 *   défaut CommonJS non plus : il n'écrit pas dans `module.exports`.
 * · pont déclarant `exports`/`module` → COMPILE, puis `createClient is not
 *   a function` à l'exécution. LE PIRE DES TROIS : vert à l'assemblage,
 *   mort au chargement — exactement le profil qu'un cliquet de texte ne
 *   voit pas.
 *
 * Ce n'est pas un paquet UMD : c'est une IIFE qui fait
 * `var supabase = (function(e){…})({})`. Le pont lit donc LA LIAISON QUE LE
 * FICHIER CRÉE — un nom supposé sur du code tiers, d'où ce cliquet qui
 * l'EXÉCUTE : une montée de version qui le renomme rougit ici au lieu de
 * livrer une application morte.
 *
 * ── ET ON EXÉCUTE CE QUI PART.
 *
 * Aucune assertion de ce fichier ne lit une source. Tout sort du bundle
 * assemblé par le vrai assembleur, importé et appelé.
 */
import { describe, expect, it } from 'vitest'
import { assembler } from '../bac-a-sable'

/** Importe et exécute le bundle — pas le paquet installé. */
async function executer<T>(code: string): Promise<T> {
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
  return (await import(/* @vite-ignore */ url)) as T
}

const OEUVRE = `import { createClient } from '@supabase/supabase-js'
export function faire(f) {
  const base = createClient('https://exemple.supabase.co', 'sb_publishable_sonde', {
    db: { schema: 'oeuvre_x' },
    global: { fetch: f },
  })
  return {
    formes: {
      from: typeof base.from,
      lecture: typeof base.from('membre').select('*').then,
      ecriture: typeof base.from('membre').insert({ nom: 'x' }).then,
      connexion: typeof base.auth.signInWithPassword,
      session: typeof base.auth.getSession,
    },
    lire: () => base.from('membre').select('*'),
    ecrire: () => base.from('membre').insert({ nom: 'x' }),
  }
}
export function App() { return <div>ok</div> }`

type Api = {
  readonly faire: (f: unknown) => {
    readonly formes: Record<string, string>
    readonly lire: () => Promise<unknown>
    readonly ecrire: () => Promise<unknown>
  }
}

describe('EP-327 · la base dans le bundle', () => {
  it('① UNE ŒUVRE QUI IMPORTE LA BASE S’ASSEMBLE', async () => {
    const v = await assembler(new Map([['index.tsx', OEUVRE]]))
    expect(v.ok, v.ok ? '' : `refusé : ${'erreur' in v ? String(v.erreur).slice(0, 300) : ''}`).toBe(
      true,
    )
    if (!v.ok) return
    // ── ET TOUT EST DEDANS : les cinq dépendances de supabase fondues.
    //
    // Un bundle autonome n'importe personne. Le poids est la mesure du
    // 2026-11-03 : il dit aussi que rien n'est resté dehors.
    expect(v.code.length / 1024, 'le bundle est trop léger : la base n’y est pas')
      .toBeGreaterThan(200)
    expect(/GoTrueClient/u.test(v.code), 'le cœur de l’authentification n’est pas fondu').toBe(true)
  })

  it('② UN PAQUET RÉELLEMENT HORS LISTE EST TOUJOURS REFUSÉ', async () => {
    // CONTRÔLE NÉGATIF : repointer la garde sur l'empaqueteur ne devait pas
    // l'ouvrir. Mesuré : rolldown déclare « lodash », la garde refuse.
    const v = await assembler(new Map([['index.tsx', "import x from 'lodash'\nexport const y = x"]]))
    expect(v.ok, 'un paquet non fourni passe : l’application mourrait au chargement').toBe(false)
    if (!v.ok) expect(String(v.erreur)).toMatch(/non embarqué/u)
  })

  it('③ UNE LIGNE D’IMPORT ÉCRITE DANS UNE CHAÎNE NE FAIT PAS REFUSER L’ŒUVRE', async () => {
    // ── LE DÉFAUT DE LA GARDE, et il venait d'une chaîne de caractères.
    //
    // `bac-a-sable` regexait le texte du bundle pour trouver les imports
    // restés externes. Le paquet de supabase écrivait, DANS UN MESSAGE
    // D'ERREUR, « Install and provide the "ws" package » suivi d'une ligne
    // d'import donnée en exemple. La garde a refusé une œuvre dont tout
    // était embarqué, en citant `ws`.
    //
    // ── ET CE CONTRÔLE FOURNIT SON PROPRE PIÈGE, depuis le 2026-11-03.
    //
    // Ma première forme vérifiait que la phrase de supabase était TOUJOURS
    // dans le bundle, pour prouver qu'on avait cessé de l'écouter. Mesuré
    // sur la montée 2.106 → 2.118 : la phrase a DISPARU (2 occurrences puis
    // 0), et mon contrôle a rougi alors que rien de ce qu'il garde n'avait
    // bougé.
    //
    // Un cliquet dont le dénominateur dépend de la PROSE D'UN TIERS casse
    // le jour où ce tiers reformule un message d'erreur. Le piège est donc
    // écrit ici, et il ne peut plus s'évaporer.
    const PIEGE = [
      'export const aide = `',
      'Pour le temps réel hors navigateur, installez le paquet :',
      "import ws from 'ws'",
      "import quelqueChose from '@paquet/inexistant'",
      '`',
      'export function App() { return <div>{aide}</div> }',
    ].join('\n')
    const v = await assembler(new Map([['index.tsx', PIEGE]]))
    expect(
      v.ok,
      `une ligne d’import écrite DANS une chaîne fait refuser l’œuvre : ${
        v.ok ? '' : String('erreur' in v ? v.erreur : '').slice(0, 200)
      }`,
    ).toBe(true)
    if (!v.ok) return
    // LE DÉNOMINATEUR EST À NOUS : le piège est forcément dans le bundle,
    // puisque c'est notre propre source qui le porte.
    expect(v.code, 'le piège n’a pas survécu à l’assemblage : ce contrôle ne mesure rien')
      .toMatch(/import ws from/u)
  })

  it('④ LE BUNDLE, EXÉCUTÉ, REND UN CLIENT QUI FONCTIONNE', async () => {
    const v = await assembler(new Map([['index.tsx', OEUVRE]]))
    expect(v.ok).toBe(true)
    if (!v.ok) return
    const mod = await executer<Api>(v.code)
    // Si le fichier tiers renomme sa liaison globale, c'est ICI que ça
    // rougit — et non en production, sur l'écran de quelqu'un.
    expect(mod.faire, 'le bundle n’exporte rien : le pont a échoué').toBeTypeOf('function')
    expect(mod.faire(fetch).formes).toEqual({
      from: 'function',
      lecture: 'function',
      ecriture: 'function',
      connexion: 'function',
      session: 'function',
    })
  })

  it('⑤ LES DEUX EN-TÊTES DE SCHÉMA PARTENT SUR LE RÉSEAU', async () => {
    // ── CE QUE LE PROPRIÉTAIRE A TROUVÉ AVANT MOI, mesuré d'un bout à
    //    l'autre : `Accept-Profile` ne couvre que la LECTURE. Une œuvre
    //    dont seule la lecture porte le schéma marche à l'écran et meurt à
    //    la première écriture, en cherchant dans `public`.
    //
    //    D4 l'a prouvé sur la vraie base. Ici on le prouve sur CE QUI PART :
    //    le bundle livré, son client, son `fetch`.
    const v = await assembler(new Map([['index.tsx', OEUVRE]]))
    expect(v.ok).toBe(true)
    if (!v.ok) return
    const vus: { methode: string; entetes: Record<string, string> }[] = []
    const faux = async (_u: string | URL, init?: { method?: string; headers?: HeadersInit }) => {
      const h: Record<string, string> = {}
      new Headers(init?.headers).forEach((val, k) => {
        h[k] = val
      })
      vus.push({ methode: init?.method ?? 'GET', entetes: h })
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const api = (await executer<Api>(v.code)).faire(faux)
    await api.lire()
    await api.ecrire()
    expect(vus.map((x) => x.methode), 'les deux sens n’ont pas été exercés').toEqual(['GET', 'POST'])
    expect(vus[0]?.entetes['accept-profile'], 'la LECTURE ne porte pas le schéma de l’œuvre').toBe(
      'oeuvre_x',
    )
    expect(
      vus[1]?.entetes['content-profile'],
      'l’ÉCRITURE ne porte pas le schéma : elle irait chercher dans `public`',
    ).toBe('oeuvre_x')
  })
})
