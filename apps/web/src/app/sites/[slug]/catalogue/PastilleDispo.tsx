import { LIBELLE_DISPO, TEINTE_DISPO, type Disponibilite } from './disponibilite'

// Une pastille : un point, un mot. Lisible sans la couleur (le mot suffit).
export default function PastilleDispo({ d, grande = false }: { d: Disponibilite; grande?: boolean }) {
  const t = TEINTE_DISPO[d]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', fontWeight: 700,
      fontSize: grande ? 14 : 12.5, padding: grande ? '6px 12px' : '3px 10px', borderRadius: 999, color: t.texte, background: t.fond }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: t.point, boxShadow: `0 0 0 3px ${t.fond}` }} />
      {LIBELLE_DISPO[d]}
    </span>
  )
}
