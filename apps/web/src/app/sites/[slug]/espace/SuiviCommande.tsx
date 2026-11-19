// ============================================================================
// LE SUIVI D'UNE COMMANDE, ÉTAPE PAR ÉTAPE (CPA, 2026-11-19).
//
// « Une fois commandé, ils peuvent suivre leur commande. » Quatre étapes :
// reçue → en cours → validée → livrée. Les étapes franchies sont pleines,
// l'étape actuelle est marquée, les suivantes sont grises. Une commande
// annulée ne montre pas une frise trompeuse : elle le dit.
//
// Sans état ni effet : un dessin de ce que la route a dit.
// ============================================================================

export const ETAPES_SUIVI = ['recue', 'en_cours', 'validee', 'livree'] as const

/** L'indice de l'étape atteinte, -1 si la commande est annulée ou inconnue. */
export function etapeAtteinte(etat: string): number {
  return (ETAPES_SUIVI as readonly string[]).indexOf(etat)
}

export default function SuiviCommande({
  etat, libelles, accent, annulee,
}: { etat: string; libelles: Record<string, string>; accent: string; annulee: string }) {
  const n = etapeAtteinte(etat)
  if (n < 0) {
    return (
      <p style={{ margin: '10px 0 0', padding: '8px 12px', borderRadius: 10, background: '#fdf2f2', color: '#9b1c1c', fontSize: 14, fontWeight: 600 }}>
        {annulee}
      </p>
    )
  }
  return (
    <ol className="suiviCmd" aria-label={libelles[etat] ?? etat}
      style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'grid', gridTemplateColumns: `repeat(${ETAPES_SUIVI.length}, 1fr)`, gap: 0 }}>
      {ETAPES_SUIVI.map((e, i) => {
        const fait = i <= n
        return (
          <li key={e} aria-current={i === n ? 'step' : undefined}
            style={{ position: 'relative', textAlign: 'center', fontSize: 12, lineHeight: 1.3, color: fait ? '#111' : '#9ca3af', fontWeight: i === n ? 700 : 500 }}>
            {/* Le trait vers l'étape précédente. */}
            {i > 0 && (
              <span aria-hidden style={{ position: 'absolute', top: 9, right: '50%', width: '100%', height: 3,
                background: i <= n ? accent : '#e5e7eb', borderRadius: 3 }} />
            )}
            <span aria-hidden style={{
              position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 21, height: 21, borderRadius: '50%', marginBottom: 6,
              background: fait ? accent : '#fff', border: `2px solid ${fait ? accent : '#d1d5db'}`,
              color: '#fff', fontSize: 12, fontWeight: 800,
              boxShadow: i === n ? `0 0 0 4px color-mix(in srgb, ${accent} 22%, transparent)` : 'none',
            }}>{fait ? '✓' : ''}</span>
            <span style={{ display: 'block', padding: '0 2px' }}>{libelles[e] ?? e}</span>
          </li>
        )
      })}
    </ol>
  )
}
