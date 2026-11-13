// 3c-2 · CORRECTION 4 — LE JUGE D'EXPÉRIENCE, DANS CHROMIUM, SUR LA PAGE SERVIE.
//
// Hors de la gate vitest (un vrai navigateur : ~30 s) : config
// `vitest.navigateur.config.ts`, étape CI « juge navigateur ».
//
//   ① 94cf0489, telle que LIVRÉE (fixture intacte, jamais réparée) est REFUSÉE,
//      avec ce que le propriétaire a vu : l'accueil « À compléter », des boutons
//      qui mènent à « À compléter » (accueil, confirmation), « arabe » qui ne
//      change ni dir ni lang, le parcours qui n'aboutit pas ;
//   ② un témoin SAIN, bâti sur le squelette de 3c-2 (accueil, langue et gestion
//      écrits par Deribfy, quatre écrans de parcours), est ACCEPTÉ : chaque
//      contrôle mène à un écran nommé ou change l'écran, fr/en/ar appliquées
//      (dir="rtl" pour l'arabe, textes du squelette traduits), parcours
//      recherche → détail → paiement → confirmation traversé jusqu'au bout.
// Rouge-puis-vert : la détection de « À compléter » retirée du script → ① rouge.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assembler } from '../bac-a-sable'
import { fichiersSysteme } from '../bibliotheque-ui'
import { pageAutonome } from '../boucle-directe'
import { jugerExperience } from '../juge-experience'
import { validerPlan } from '../plan-ecrans'
import { fichiersSquelette } from '../squelette'

const F = join(__dirname, 'fixtures')
const LANGUES = [
  { code: 'fr', dir: 'ltr' as const, libelles: ['Français', 'FR'] },
  { code: 'en', dir: 'ltr' as const, libelles: ['English', 'Anglais', 'EN'] },
  { code: 'ar', dir: 'rtl' as const, libelles: ['العربية', 'Arabe', 'AR'] },
]

describe('le juge d’expérience, dans Chromium', () => {
  it('① 94cf0489, telle que livrée, est REFUSÉE — avec ce que le propriétaire a vu', async () => {
    const fichiers = new Map(Object.entries(JSON.parse(gunzipSync(readFileSync(join(F, 'oeuvre-94cf0489.json.gz'))).toString('utf8')) as Record<string, string>))
    const plan = JSON.parse(readFileSync(join(F, 'plan-94cf0489.json'), 'utf8')) as { ecrans: { nom: string; slug: string; role: string }[] }
    const v = await assembler(fichiers)
    expect(v.ok).toBe(true)
    if (!v.ok) return
    const r = await jugerExperience(pageAutonome(v.code, 'Hayine'), {
      ecrans: plan.ecrans.map((e) => ({ nom: e.nom, slug: e.slug, role: e.role === 'visiteur' ? '' : e.role })),
      langues: LANGUES,
      parcours: ['recherche', 'resultats', 'detail', 'recapitulatif-paiement', 'confirmation'],
      mode: 'application',
    })
    expect(r.aTourne, r.motif ?? '').toBe(true)
    const lignes = r.refus.map((x) => `${x.ecran} · ${x.controle} · ${x.quoi}`)
    process.stdout.write(`\n  94cf0489 — ${String(r.refus.length)} refus :\n${lignes.map((l) => '    ' + l).join('\n')}\n`)
    // « Accueil mène à une page vide »
    expect(lignes).toContain('accueil · (écran) · est « À compléter »')
    expect(lignes.some((l) => /Retour à l.accueil · mène à « À compléter » \(accueil\)/u.test(l))).toBe(true)
    // « le choix arabe ne change rien »
    expect(r.langues.find((l) => l.code === 'ar')).toMatchObject({ ok: false, dir: 'ltr' })
    // « des boutons mènent à des écrans sans sens »
    expect(lignes.some((l) => /mène à « À compléter » \(confirmation\)/u.test(l))).toBe(true)
    expect(lignes.some((l) => /ne change rien/u.test(l))).toBe(true)
    expect(r.parcours?.ok).toBe(false)
  }, 300_000)

  it('② un témoin sain, sur le squelette 3c-2, est ACCEPTÉ : contrôles, langues, parcours', async () => {
    const entites = [{ id: 'ent_reservation', name: 'reservation', fields: [{ id: 'fld_chambre', name: 'chambre', type: 'text', required: true }, { id: 'fld_montant', name: 'montant', type: 'number', required: true }] }]
    const plan = validerPlan({ ECRANS: [
      { nom: 'démarrage/langue', role: 'visiteur' },
      { nom: 'recherche', role: 'visiteur' },
      { nom: 'détail', role: 'visiteur' },
      { nom: 'paiement', role: 'Particulier', lit: ['reservation'], ecrit: ['reservation'] },
      { nom: 'confirmation', role: 'Particulier', lit: ['reservation'] },
    ] }, { ecrans: ['démarrage/langue', 'accueil', 'recherche', 'détail', 'paiement', 'confirmation'], roles: ['Particulier', 'Administrateur'], parcours: ['recherche', 'détail', 'paiement', 'confirmation'] }, entites, 'cahier')
    const carte = new Map<string, string>([...fichiersSquelette({ plan, entites, nom: 'Témoin', roles: ['Particulier', 'Administrateur'], langues: ['fr', 'en', 'ar'] }), ...fichiersSysteme('XAF')])
    carte.set('ecrans/recherche.tsx', `import React, { useState } from 'react'
import { naviguer } from '../systeme/navigation'
import { Bouton } from '../systeme/ui'
export default function Ecran() {
  const [vu, poser] = useState(false)
  return <section><h1>Recherche</h1>{vu && <p>3 chambres libres</p>}<Bouton texte="Chercher" surClic={() => { poser(true) }} /><Bouton texte="Voir la chambre 12" surClic={() => { naviguer('détail') }} /></section>
}`)
    carte.set('ecrans/detail.tsx', `import React from 'react'
import { naviguer } from '../systeme/navigation'
import { Bouton } from '../systeme/ui'
export default function Ecran() { return <section><h1>Chambre 12</h1><p>12 000 FCFA la nuit.</p><Bouton texte="Réserver" surClic={() => { naviguer('paiement') }} /><Bouton texte="Revenir à la recherche" surClic={() => { naviguer('recherche') }} /></section> }`)
    carte.set('ecrans/paiement.tsx', `import React from 'react'
import { useTable } from '../systeme/base'
import { useParcours } from '../systeme/etat'
import { naviguer } from '../systeme/navigation'
import { Bouton } from '../systeme/ui'
import type { Reservation } from '../systeme/types'
export default function Ecran() {
  const t = useTable<Reservation>('reservation')
  const [, poser] = useParcours<Reservation>('reservation')
  return <section><h1>Paiement</h1><p>Total : 12 000 FCFA</p><Bouton texte="Payer" surClic={() => { void t.ajouter({ chambre: '12', montant: 12000 }).then((l) => { poser(l); naviguer('confirmation') }) }} /></section>
}`)
    carte.set('ecrans/confirmation.tsx', `import React from 'react'
import { useParcours } from '../systeme/etat'
import type { Reservation } from '../systeme/types'
export default function Ecran() {
  const [r] = useParcours<Reservation>('reservation')
  return <section><h1>Confirmation</h1><p>{r === null ? 'Aucune réservation en cours.' : 'Chambre ' + r.chambre + ' réservée.'}</p></section>
}`)
    const v = await assembler(carte)
    expect(v.ok, v.ok ? '' : v.erreur).toBe(true)
    if (!v.ok) return
    const r = await jugerExperience(pageAutonome(v.code, 'Témoin'), {
      ecrans: plan.ecrans.map((e) => ({ nom: e.nom, slug: e.slug, role: e.role === 'visiteur' ? '' : e.role })),
      langues: LANGUES,
      parcours: plan.parcours ?? [],
      mode: 'application',
    })
    expect(r.aTourne, r.motif ?? '').toBe(true)
    expect(r.refus.map((x) => `${x.ecran} · ${x.controle} · ${x.quoi}`)).toEqual([])
    expect(r.langues.map((l) => `${l.code}:${String(l.ok)}:${l.dir}`)).toEqual(['fr:true:ltr', 'en:true:ltr', 'ar:true:rtl'])
    expect(r.parcours).toMatchObject({ ok: true, atteint: ['recherche', 'detail', 'paiement', 'confirmation'] })
    expect(r.controlesEssayes).toBeGreaterThan(8)
  }, 300_000)
})
