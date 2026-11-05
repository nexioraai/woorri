/**
 * EP-357 · TENTER N'EST PAS RÉUSSIR — l'exposition se relit.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-11-05 SUR `snenak`.
 *
 *   le schéma oeuvre_15158240_… EXISTE, avec sa table `releve`
 *   la publication a RÉUSSI, la page est SERVIE, elle DÉMARRE
 *   et le schéma N'EST PAS dans la liste exposée à PostgREST
 *
 *     anon         → PGRST106 — Invalid schema: oeuvre_15158240_…
 *     service_role → PGRST106 — le MÊME
 *     témoin `public` → PGRST205, erreur DIFFÉRENTE : l'instrument est bon
 *
 * L'application affiche son écran de connexion et ne pourra JAMAIS lire
 * une ligne. Rien, nulle part, ne l'a dit — et le propriétaire a cru
 * pendant trois jours que le défaut venait de son code.
 *
 * ── CE QUE LA MESURE A ÉCARTÉ, ET CE QU'ELLE N'A PAS TROUVÉ.
 *
 * Écarté : le code d'exposition manquait (il date du 11-02, l'œuvre du
 * 11-04) · deux poses successives s'évincent (reproduit sur la vraie
 * base : A reste, B s'ajoute, aucun élagage) · l'œuvre n'avait pas de
 * table (son document porte `create table` ×1, donc `poserOeuvre` a bien
 * été appelé).
 *
 * NON TROUVÉ : la cause exacte. L'état d'alors a été réécrit depuis, et
 * je ne la devinerai pas. Ce cliquet ne ferme donc pas la CAUSE, il ferme
 * la CLASSE — quelle qu'elle soit, une exposition qui n'aboutit pas cesse
 * de passer pour un succès.
 *
 * ── POURQUOI UN CLIQUET EN PLUS DU TIR.
 *
 * `src/tirs/exposition-verifiee.tir.ts` prouve que la garde MORD : une
 * écriture qui n'aboutit pas y fait rougir. Mais RETIRER la garde ne fait
 * rien rougir quand tout marche — c'est la nature d'une garde. Seul un
 * contrôle qui exige sa PRÉSENCE voit sa disparition.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'

const APPS = join(__dirname, '..')
const POSE = join(APPS, 'poser-oeuvre.ts')
const PUBLIER = join(APPS, '..', '..', 'app', 'api', 'generateur', 'publier', 'route.ts')

describe('EP-357 · l’exposition se relit', () => {
  it('① LA LISTE EST RELUE APRÈS AVOIR ÉTÉ ÉCRITE', () => {
    const src = lireSource(POSE)
    expect(src, 'la vérification a disparu').toMatch(/const verifier = async \(\)/u)
    // Elle relit la MÊME source que l'écriture, pas une variable gardée
    // en mémoire : relire ce qu'on a en main ne prouve rien.
    expect(src, 'la vérification ne relit pas la base').toMatch(
      /verifier[\s\S]{0,400}select rolconfig from pg_roles/u,
    )
    expect(src, 'la vérification ne cherche pas CE schéma').toMatch(
      /verifier[\s\S]{0,700}liste\.includes\(schema\)/u,
    )
  })

  it('② UN ÉCHEC REND `ok: false` — jamais un succès silencieux', () => {
    const src = lireSource(POSE)
    const refus = src.match(/etape: 'exposition'/gu) ?? []
    // DEUX chemins mènent à la fin : « j'ai écrit » et « rien à écrire ».
    // Les deux doivent refuser, sinon le plus silencieux des deux reste
    // ouvert — et c'est justement celui qui ne laisse aucune trace.
    expect(refus.length, 'un seul chemin refuse, ou aucun').toBe(2)
    expect(src, 'le refus ne dit pas la conséquence').toMatch(/PGRST106/u)
    expect(src, 'le refus ne dit pas ce que ça fait à l’œuvre').toMatch(
      /incapable de lire ses données/u,
    )
  })

  it('③ ET ELLE PASSE AVANT LE `notify` ET AVANT LE `commit`', () => {
    // ── L'ORDRE EST LA GARDE, encore.
    //
    // Notifier PostgREST d'une liste qu'on n'a pas vérifiée, c'est lui
    // demander de recharger une panne. Et commettre d'abord laisserait
    // l'œuvre posée — donc le défaut DANS la base — pendant qu'on rend
    // une erreur.
    const src = lireSource(POSE)
    const i = src.lastIndexOf('await verifier()')
    const notify = src.indexOf("notify pgrst, 'reload config'", i)
    const commit = src.indexOf("client.query('commit')", i)
    expect(i, 'la vérification a disparu').toBeGreaterThan(0)
    expect(notify, 'le notify a disparu').toBeGreaterThan(i)
    expect(commit, 'le commit a disparu').toBeGreaterThan(i)
    // ── ET L'ÉCHEC SE DÉFAIT, il ne se laisse pas en place.
    expect(src, 'un échec d’exposition ne défait rien').toMatch(
      /await verifier\(\)\)\) \{[\s\S]{0,80}rollback/u,
    )
  })

  it('④ ET LA PUBLICATION S’ARRÊTE DESSUS', () => {
    // Une garde dans `poserOeuvre` que l'appelant ignorerait ne garderait
    // rien : c'est la famille « un contrôle qui ne fait que signaler ».
    const src = lireSource(PUBLIER)
    expect(src, 'la publication ignore l’échec de pose').toMatch(
      /if \(!pose\.ok\) \{[\s\S]{0,200}status: 500/u,
    )
    expect(src, 'la publication continue après un échec de pose').toMatch(
      /if \(!pose\.ok\) \{[\s\S]{0,160}return NextResponse\.json/u,
    )
  })
})
