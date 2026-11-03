/**
 * TIR — ON PROVOQUE UNE VRAIE PANNE ET ON VÉRIFIE QUE LE COURRIEL ARRIVE.
 *
 * ── POURQUOI CE TIR EXISTE.
 *
 * « Une alerte jamais déclenchée est une alerte non prouvée. » Le canal
 * avait été éprouvé par un appel HTTP direct à Resend — ça prouve Resend,
 * pas MON module. Ici c'est `alerter()` lui-même qui tourne, avec
 * l'environnement réel.
 *
 * ── CE QUE LE MODE DÉGRADÉ DOIT FAIRE, ET C'EST LE CŒUR DU CONTRÔLE.
 *
 * Tant que `alertes_generation.sql` n'est pas appliqué, la table n'existe
 * pas. L'écriture de la ligne DOIT donc échouer — bruyamment, dans la
 * console — et le courriel DOIT partir quand même.
 *
 * C'est la décision du propriétaire prise à l'envers : il voulait que la
 * ligne survive à un canal injoignable. Ici c'est la TABLE qui manque, et
 * le signal doit quand même passer. Les deux gestes sont indépendants, et
 * ce tir le démontre.
 *
 * IL NE DÉPENSE RIEN AU MODÈLE : un courriel, c'est tout.
 */
import { describe, expect, it } from 'vitest'
import { appendFileSync } from 'node:fs'
import { alerter, texteAlerte } from '@/lib/alertes'
import { DESTINATAIRE_ALERTES } from '@/lib/admin-emails'

describe('tir · l’alerte provoquée', () => {
  it('part vraiment, même quand la ligne ne peut pas s’écrire', async () => {
    const marque = `panne-de-verification-${String(Date.now()).slice(-6)}`
    const a = {
      sujet: 'boutique' as const,
      sujetId: marque,
      // L'ADRESSE NE S'ECRIT PAS ICI : un cliquet garde `admin-emails.ts`
      // comme source unique, et il m'a attrape sur cette ligne.
      ownerEmail: DESTINATAIRE_ALERTES,
      motif: 'ESSAI DÉLIBÉRÉ — génération refusée (HTTP 500)',
      etape: 'modele' as const,
      detail:
        'Panne provoquée le 2026-11-03 pour prouver que l’alerte arrive. Si la ' +
        'table alertes_generation n’est pas encore appliquée, la ligne échoue ' +
        'bruyamment et le courriel part quand même.',
      coutUsd: 0.0162,
    }

    // CE QUI PART, IMPRIMÉ AVANT L'ENVOI : un essai dont on ne lit pas le
    // contenu ne prouve que la plomberie, pas le message.
    const dire = (l: string) => { appendFileSync('/tmp/alerte.txt', l + '\n') }
    dire(texteAlerte(a))

    const t0 = Date.now()
    const id = await alerter(a)
    const ms = Date.now() - t0

    dire(`  identifiant de ligne : ${String(id)}  (null = table absente)`)
    dire(`  duree : ${(ms / 1000).toFixed(2)} s`)
    dire(`  marque a chercher dans la boite : ${marque}`)

    // ── ON N'EXIGE PAS LA LIGNE : la table peut légitimement ne pas être
    //    encore appliquée. On exige que l'appel N'AIT PAS LEVÉ et qu'il
    //    soit allé jusqu'au bout — une alerte qui casse son appelant est
    //    pire que pas d'alerte.
    expect(ms, 'l’alerte a bloqué plus longtemps que son propre délai').toBeLessThan(15_000)
  }, 60_000)
})
