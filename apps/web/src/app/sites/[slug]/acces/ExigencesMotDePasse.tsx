import { criteresMotDePasse, libellesCriteres } from '@/lib/auth/motDePasseFort'

// LA LISTE QUI SE COCHE PENDANT LA SAISIE (CPA, 2026-11-19) : chaque critère
// passe au vert dès qu'il est tenu. La règle elle-même vit dans
// `motDePasseFort` ; cet écran ne fait que la montrer.
export default function ExigencesMotDePasse({ motDePasse, lang }: { motDePasse: string; lang?: string | null }) {
  const L = libellesCriteres(lang)
  return (
    <ul aria-label={L.regle} style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '4px 12px' }}>
      {criteresMotDePasse(motDePasse).map(({ cle, ok }) => (
        <li key={cle} data-ok={ok} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: ok ? '#15803d' : '#6b7280', transition: 'color .2s ease' }}>
          <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', fontSize: 10.5, fontWeight: 800,
            color: '#fff', background: ok ? '#22c55e' : '#d1d5db', transition: 'background .2s ease, transform .25s cubic-bezier(.34,1.56,.64,1)', transform: ok ? 'scale(1.1)' : 'scale(1)' }}>{ok ? '✓' : ''}</span>
          {L[cle]}
        </li>
      ))}
    </ul>
  )
}
