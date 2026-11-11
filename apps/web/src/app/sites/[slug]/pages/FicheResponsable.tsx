import Link from 'next/link'
import { Quote, Phone, Mail, MapPin, ChevronRight, ShieldCheck, Network, ArrowLeft, UserRound } from 'lucide-react'
import type { Bloc } from './blocs'
import BlocsDePage from './BlocsDePage'
import { photoValable } from './photoValable'
import type { EntreeMenu } from './fetchPage'

// ============================================================================
// LA FICHE D'UN RESPONSABLE (demande CPA, 2026-11-11).
//
// UNE IDENTITÉ, DEUX MODÈLES. La structure vient d'epss.gov.et (centrale
// pharmaceutique éthiopienne, l'analogue direct de la CPA) : une carte d'en-
// tête au portrait rond, le mot dans une carte à bandeau, une colonne latérale
// « contact » et « pages liées ». La typographie du mot vient d'anie.td : sur-
// titre au trait, grand titre, première phrase en avant, signature en italique.
//
// QUAND UNE PAGE EST-ELLE UNE FICHE ? Quand son PREMIER bloc est le mot d'un
// responsable, c'est-à-dire une citation qui porte une photo (`estUneFiche`).
// Aucune colonne ni aucun réglage neuf : l'informaticien en fait une fiche en
// posant ce bloc en tête, et la défait en le retirant. Toute autre page garde
// le rendu d'avant.
//
// TOUT RESTE DANS LES BLOCS. Les missions sont la première liste de la page,
// présentée en cartes ; le reste des blocs suit, rendu comme partout. Rien de
// ce que l'éditeur a posé n'est perdu ni dupliqué.
// ============================================================================

type Mot = Extract<Bloc, { type: 'citation' }> & { photo: string }

// PHOTO VIDE = PHOTO À VENIR (CPA, 2026-11-11). Une citation dont le champ
// `photo` EXISTE mais est vide est aussi une fiche : la mise en page est là,
// un médaillon d'attente tient la place, et l'équipe pose sa photo dans /edit.
// Le bloc citation par défaut de l'éditeur ne porte PAS de champ `photo` :
// une citation ordinaire reste une citation ordinaire.
export function estUneFiche(blocs: Bloc[]): boolean {
  const b = blocs[0]
  return !!b && b.type === 'citation' && typeof b.photo === 'string' && (b.photo.trim() === '' || /^https?:\/\//.test(b.photo))
}

export default function FicheResponsable({
  site, titre, chapeau, blocs, base, accent, parent, freres, cheminCourant,
}: {
  site: { name: string; contact?: { email?: string; phone?: string; address?: string } }
  titre: string
  chapeau?: string | null
  blocs: Bloc[]
  base: string
  accent: string
  parent: { chemin: string; titre: string } | null
  freres: EntreeMenu[]
  cheminCourant: string
}) {
  const mot = blocs[0] as Mot
  // Les missions : la PREMIÈRE liste, et le sous-titre qui la précède s'il y en a un.
  const iListe = blocs.findIndex((b) => b.type === 'liste')
  const liste = iListe >= 0 ? (blocs[iListe] as Extract<Bloc, { type: 'liste' }>) : null
  const titreListe = iListe > 0 && blocs[iListe - 1].type === 'titre' ? (blocs[iListe - 1] as Extract<Bloc, { type: 'titre' }>) : null
  const consommes = new Set<number>([0, ...(liste ? [iListe] : []), ...(titreListe ? [iListe - 1] : [])])
  const reste = blocs.filter((_, i) => !consommes.has(i))

  const [premier, ...suite] = mot.texte.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const c = site.contact ?? {}
  const autres = freres.filter((f) => f.chemin !== cheminCourant)

  return (
    <div className="ficheResp">
      <style>{`
        .ficheResp { --acc: ${accent}; }
        .ficheResp .grille { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 28px; align-items: start }
        .ficheResp .carte { background: #fff; border: 1px solid #e8ebe9; border-radius: 22px; box-shadow: 0 10px 30px -22px rgba(0,0,0,.35) }
        .ficheResp .entete { display: grid; grid-template-columns: 210px 1fr; gap: 36px; align-items: center; padding: 40px;
          background: linear-gradient(135deg, color-mix(in srgb, var(--acc) 7%, #fff), #fff 70%); border-radius: 22px 22px 0 0 }
        .ficheResp .portrait { width: 210px; height: 210px; border-radius: 50%; object-fit: cover; display: block;
          border: 6px solid #fff; box-shadow: 0 0 0 2px color-mix(in srgb, var(--acc) 25%, #fff), 0 18px 36px -18px rgba(0,0,0,.5) }
        .ficheResp .missions { display: grid; grid-template-columns: 1fr 1fr; gap: 14px }
        .ficheResp .mission { display: flex; gap: 14px; align-items: flex-start; padding: 18px; border: 1px solid #e8ebe9; border-radius: 16px; background: #fbfcfb }
        .ficheResp .lien { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; color: #111; text-decoration: none }
        .ficheResp .lien:hover { background: color-mix(in srgb, var(--acc) 7%, #fff) }
        .ficheResp .lien:focus-visible { outline: 3px solid var(--acc); outline-offset: 2px }
        @media (max-width: 960px) { .ficheResp .grille { grid-template-columns: 1fr } }
        @media (max-width: 640px) {
          .ficheResp .entete { grid-template-columns: 1fr; padding: 28px 22px; text-align: center; justify-items: center }
          .ficheResp .portrait { width: 170px; height: 170px }
          .ficheResp .missions { grid-template-columns: 1fr }
          .ficheResp .corpsMot { padding: 26px 22px !important }
        }
      `}</style>

      <div className="grille">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
          {/* ── L'EN-TÊTE (epss) : portrait rond, badge, fonction, établissement. */}
          <section className="carte">
            <div className="entete">
              {photoValable(mot.photo) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="portrait" src={mot.photo} alt={mot.auteur ? `Portrait — ${mot.auteur}` : `Portrait — ${titre}`} />
              ) : (
                <div className="portrait" role="img" aria-label="Photo à venir"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--acc) 10%, #fff)', color: 'var(--acc)' }}>
                  <UserRound size={96} strokeWidth={1.4} aria-hidden />
                </div>
              )}
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 999,
                  background: 'color-mix(in srgb, var(--acc) 12%, #fff)', color: 'var(--acc)', fontSize: 14, fontWeight: 600 }}>
                  <ShieldCheck size={16} aria-hidden /> Équipe de direction
                </span>
                <h1 style={{ fontSize: 40, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.02em', margin: '16px 0 8px', textWrap: 'balance' }}>{titre}</h1>
                <div style={{ fontSize: 19, color: 'var(--acc)', fontWeight: 600 }}>{site.name}</div>
                {chapeau && <p style={{ fontSize: 16.5, lineHeight: 1.6, color: '#5b5f5c', margin: '14px 0 0' }}>{chapeau}</p>}
              </div>
            </div>
          </section>

          {/* ── LE MOT : la carte à bandeau (epss), la typographie (anie). */}
          <section className="carte" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 30px', color: '#fff',
              background: 'linear-gradient(120deg, var(--acc), color-mix(in srgb, var(--acc) 70%, #3aa57a))' }}>
              <span style={{ width: 46, height: 46, borderRadius: 999, background: '#fff', color: 'var(--acc)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Quote size={22} aria-hidden />
              </span>
              <div>
                <div style={{ fontSize: 21, fontWeight: 700 }}>{mot.titre || 'Le mot du responsable'}</div>
                {mot.auteur && <div style={{ fontSize: 14, opacity: 0.85 }}>{mot.auteur}</div>}
              </div>
            </div>
            <div className="corpsMot" style={{ padding: '34px 40px 38px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--acc)', fontSize: 13, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>
                <span aria-hidden style={{ width: 36, height: 2, background: 'var(--acc)' }} /> Message officiel
              </div>
              <blockquote style={{ margin: '18px 0 0' }}>
                <p style={{ fontSize: 21, lineHeight: 1.6, color: '#111', margin: 0 }}>« {premier} »</p>
                {suite.map((p, i) => <p key={i} style={{ fontSize: 17, lineHeight: 1.75, color: '#4d524f', margin: '16px 0 0' }}>{p}</p>)}
                {mot.auteur && <footer style={{ marginTop: 24, fontSize: 17, fontStyle: 'italic', color: 'var(--acc)' }}>— {mot.auteur}</footer>}
              </blockquote>
            </div>
          </section>

          {/* ── LES MISSIONS (epss « Key Leadership Priorities ») : la première liste, en cartes. */}
          {liste && (
            <section className="carte" style={{ padding: '30px 32px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 700, color: 'var(--acc)', margin: '0 0 18px' }}>
                <Network size={20} aria-hidden /> {titreListe?.texte || 'Ses missions'}
              </h2>
              <ul className="missions" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {liste.items.map((m, i) => (
                  <li key={i} className="mission">
                    <span aria-hidden style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center',
                      background: 'color-mix(in srgb, var(--acc) 12%, #fff)', color: 'var(--acc)', fontWeight: 800, fontSize: 15 }}>{i + 1}</span>
                    <span style={{ fontSize: 16, lineHeight: 1.5, fontWeight: 600, color: '#1b1f1c' }}>{m}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── LE RESTE des blocs, rendu comme partout. */}
          {reste.length > 0 && <BlocsDePage blocs={reste} base={base} primary={accent} />}
        </div>

        {/* ── LA COLONNE LATÉRALE (epss) : contact, pages liées. */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {(c.phone || c.email || c.address) && (
            <section className="carte" style={{ padding: 24 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>
                <Phone size={18} color={accent} aria-hidden /> Contact du bureau
              </h2>
              {[
                c.address && { icone: <MapPin size={18} aria-hidden />, libelle: 'Adresse', valeur: c.address },
                c.phone && { icone: <Phone size={18} aria-hidden />, libelle: 'Téléphone', valeur: c.phone, href: `tel:${c.phone.replace(/\s+/g, '')}` },
                c.email && { icone: <Mail size={18} aria-hidden />, libelle: 'Courriel', valeur: c.email, href: `mailto:${c.email}` },
              ].filter(Boolean).map((l) => {
                const x = l as { icone: React.ReactNode; libelle: string; valeur: string; href?: string }
                return (
                  <div key={x.libelle} style={{ display: 'flex', gap: 14, padding: '12px 0', borderTop: '1px solid #eef0ef' }}>
                    <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center', background: '#f3f5f4', color: accent }}>{x.icone}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#6b706d' }}>{x.libelle}</div>
                      {x.href
                        ? <a href={x.href} style={{ fontSize: 15.5, fontWeight: 600, color: '#111', textDecoration: 'none', overflowWrap: 'anywhere' }}>{x.valeur}</a>
                        : <div style={{ fontSize: 15.5, fontWeight: 600, overflowWrap: 'anywhere' }}>{x.valeur}</div>}
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          {(parent || autres.length > 0) && (
            <nav className="carte" aria-label="Pages liées" style={{ padding: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '6px 6px 8px' }}>Pages liées</h2>
              {parent && (
                <Link className="lien" href={`${base}/${parent.chemin}`} style={{ fontWeight: 700 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: accent, color: '#fff', flexShrink: 0 }}><ArrowLeft size={18} aria-hidden /></span>
                  <span style={{ flex: 1 }}>{parent.titre}</span>
                </Link>
              )}
              {autres.map((f) => (
                <Link key={f.chemin} className="lien" href={`${base}/${f.chemin}`}>
                  <span style={{ flex: 1, fontSize: 15.5 }}>{f.titre}</span>
                  <ChevronRight size={18} color="#9aa09c" aria-hidden />
                </Link>
              ))}
            </nav>
          )}
        </aside>
      </div>
    </div>
  )
}
