/**
 * LE MODÈLE SIMULÉ DE V4 (0 $) — un modèle « appliqué » qui ne lit QUE la
 * consigne qu'il reçoit : la passe A rend un brouillon, la passe B remplit
 * chaque slot REQUIS avec une valeur PERMISE par la consigne (routes,
 * colonnes, variantes), la traduction préfixe chaque texte de sa langue.
 * Il ne connaît ni la fiche ni le témoin : ce qu'il réussit, la consigne l'a
 * rendu possible. `echecB` force le repli d'écrans choisis.
 */
import type { AppelModele } from '../deux-passes'
import type { AppelerLeger } from '../../plan-ecrans'

export const USAGE_SIMULE = { entree: 1200, sortie: 400, reflexion: 0 }

function slotsDepuisConsigneB(user: string): Record<string, unknown> {
  const lignes = user.split('\n')
  const routes = (/^ROUTES PERMISES : (.*)$/mu.exec(user)?.[1] ?? 'accueil').split(', ').map((x) => x.trim())
  const tables = (/^COLONNES PERMISES — (.*)$/mu.exec(user)?.[1] ?? '').split(' ; ').filter(Boolean).map((t) => { const [nom, cols] = t.split(' : '); return { nom: nom!, colonnes: (cols ?? '').split(', ') } })
  const cols = tables[0]?.colonnes ?? []
  const slots: Record<string, unknown> = {}
  for (const l of lignes) {
    const m = /^"([a-zA-Z]+)": (.*?)\s{3}\((requis|facultatif)\)(?:\s{3}\((\d+) à (\d+|n)\))?$/u.exec(l)
    if (m === null || m[3] !== 'requis') continue
    const [, k, forme, , min] = m
    const n = Math.max(1, Math.min(3, Number(min ?? 1)))
    if (forme!.startsWith('"<texte>"')) slots[k!] = `Texte ${k!}`
    else if (forme!.startsWith('"<route>"')) slots[k!] = routes[0]
    else if (forme!.startsWith('"<colonne>"')) slots[k!] = (k!.startsWith('champ') ? tables[1]?.colonnes[0] : undefined) ?? cols[0]
    else if (/^"[a-z]+"( \|)?/u.test(forme!)) slots[k!] = /^"([a-z]+)"/u.exec(forme!)![1]
    else if (forme!.includes('"colonne"') && forme!.includes('"nature"')) slots[k!] = cols.slice(0, n).map((c) => ({ colonne: c, libelle: `Champ ${c}`, nature: 'texte' }))
    else if (forme!.includes('"colonne"')) slots[k!] = cols.slice(0, n).map((c) => ({ colonne: c, libelle: `Colonne ${c}` }))
    else if (forme!.includes('"route"') && forme!.includes('"libelle"') && !forme!.includes('composant')) slots[k!] = routes.slice(0, n).map((r) => ({ libelle: `Vers ${r}`, route: r }))
    else if (forme!.includes('"Encart"')) slots[k!] = [{ composant: 'Encart', enfants: [{ composant: 'Titre', texte: 'Étape', niveau: 'encart' }, { composant: 'Phrase', texte: 'Une étape.' }] }]
    else if (forme!.startsWith('["<texte>"]')) slots[k!] = ['Un texte']
  }
  return slots
}

export function modeleSimule(o: { echecB?: (user: string) => boolean } = {}): { appeler: AppelModele; appels: { passe: 'A' | 'B' | 'T'; reflexion: boolean | undefined; user: string }[] } {
  const appels: { passe: 'A' | 'B' | 'T'; reflexion: boolean | undefined; user: string }[] = []
  const appeler: AppelModele = (system, messages, options) => {
    const user = messages[0]!.content
    if (system.startsWith('Tu rédiges')) {
      appels.push({ passe: 'A', reflexion: options.reflexion, user })
      return Promise.resolve({ texte: '### titre\nUn titre rédigé\n### vide\nRien pour le moment.\n', tronquee: false, usage: USAGE_SIMULE })
    }
    if (system.startsWith('Tu convertis')) {
      appels.push({ passe: 'B', reflexion: options.reflexion, user })
      return Promise.resolve({ texte: o.echecB?.(user) === true ? '{ pas du json' : JSON.stringify({ slots: slotsDepuisConsigneB(user) }), tronquee: false, usage: USAGE_SIMULE })
    }
    if (system.startsWith('Tu traduis')) {
      appels.push({ passe: 'T', reflexion: options.reflexion, user })
      const code = /\(code ([a-z]+)\)/u.exec(system)?.[1] ?? 'xx'
      const textes = JSON.parse(user) as Record<string, string>
      return Promise.resolve({ texte: JSON.stringify(Object.fromEntries(Object.entries(textes).map(([k, v]) => [k, `[${code}] ${v}`]))), tronquee: false, usage: { entree: 3000, sortie: 3000, reflexion: 0 } })
    }
    throw new Error(`appel inattendu : ${system.slice(0, 60)}`)
  }
  return { appeler, appels }
}

/** Le plan flash simulé : il rend la réponse donnée, et compte ses appels. */
export function planSimule(reponse: unknown): { appeler: AppelerLeger; appels: number } {
  const r = { appels: 0, appeler: (() => { r.appels += 1; return Promise.resolve(JSON.stringify(reponse)) }) as AppelerLeger }
  return r
}
