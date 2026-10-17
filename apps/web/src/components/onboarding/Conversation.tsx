'use client';
// ============================================================
// LA CONVERSATION — UNE SEULE, PARTAGEE.
//
// ── POURQUOI CE FICHIER EXISTE.
//
// « Je t'ai explicitement demandé d'utiliser celui qui était là avant. »
//
// J'avais refait une bulle, un champ, un bouton « Envoyer ». Le resultat
// etait une SECONDE interface : des bulles d'une autre forme, un composeur
// d'une autre forme, et une section qui ne remplissait pas l'ecran — ce qui
// faisait remonter le pied de page en plein milieu.
//
// Les primitives vivent donc ICI, une fois, et les deux chemins — les trois
// modes de site et l'application — les utilisent. Le depot a vu quatre fois
// « une liste ecrite deux fois diverge » ; c'etait vrai d'une liste de
// gestes, c'est vrai d'une bulle de conversation.
//
// ── CE QUI N'A PAS BOUGE.
//
// Les classes sont celles de l'accueil, au caractere pres : c'est un
// DEPLACEMENT, pas un redessin. Un cliquet verifie que les deux fichiers
// passent bien par ici au lieu de redeclarer leurs propres bulles.
// ============================================================
import { ArrowUp, Monitor, Paperclip, Smartphone, Tablet } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

/** La hauteur de la conversation : elle REMPLIT l'ecran. Sans cela, une vue
 *  courte laisse le pied de page remonter au milieu de la page. */
export const CADRE_CONVERSATION =
  'max-w-2xl mx-auto px-4 sm:px-6 pb-10 flex flex-col h-[calc(100vh-120px)]';

/** LE VERRE D'UNE BULLE DE DERIBFY — une seule ecriture.
 *
 *  Le panneau de generation des trois modes porte exactement la meme
 *  surface. L'ecrire une troisieme fois la ferait diverger au premier
 *  ajustement ; il la PREND ici, sans changer d'un pixel. */
export const VERRE_BULLE =
  'bg-white/[0.06] border border-white/10 rounded-[22px] rounded-bl-md';

/** Une bulle. `moi` a droite en orange, Deribfy a gauche en verre. */
export function Bulle({ moi, children }: { moi: boolean; children: ReactNode }) {
  return (
    <div className={`flex ${moi ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] px-5 py-3 text-[15px] leading-relaxed shadow-lg whitespace-pre-wrap ${
          moi
            ? 'bg-gradient-to-br from-[#FA5D1E] to-[#FA5D1E] text-white rounded-[22px] rounded-br-md'
            : `${VERRE_BULLE} text-slate-100`
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * LES CHOIX FERMES DU PRE-VOL (LOT 5) — ET POURQUOI C'EST UN COMPOSANT.
 *
 * ── CE QU'IL REND, ET D'OU VIENT LA FORME.
 *
 * Replit pose sa question a treize secondes, AVANT de coder : trois boutons
 * radio, un clic. L'option cochee disait « releves seulement » ; c'est le
 * champ libre, a cote, qui a transforme l'application en reconnaissance
 * d'image. Les deux ont leur place ; celui-ci rend les boutons.
 *
 * ── POURQUOI IL N'EST PAS RESTE DANS LA PAGE.
 *
 * J'avais d'abord ecrit le `.map()` des choix DANS le rendu de la
 * conversation, avec `onClick={() => repondreAvant(...)}`. `react-hooks/purity`
 * a alors suivi la chaine rendu → gestionnaire → `Date.now()` et refuse le
 * fichier, qui lintait propre avant moi. Desactiver la regle aurait masque un
 * vrai signal.
 *
 * Le fichier portait deja la reponse : `Composeur` recoit `onEnvoyer` en
 * PROP. Un gestionnaire passe n'est pas un gestionnaire appele. On suit son
 * idiome, et les primitives restent ici — comme l'exige l'en-tete de ce
 * fichier, parce qu'une bulle ecrite deux fois diverge.
 */
export function ChoixFermes({
  choix,
  actif,
  onChoisir,
}: {
  choix: readonly { valeur: string; texte: string }[];
  /** `false` pendant un tour en cours, ou sur une question deja repondue :
   *  sans cela, un double clic enverrait deux reponses. */
  actif: boolean;
  onChoisir: (valeur: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {choix.map((c) => (
        <button
          key={c.valeur}
          type="button"
          disabled={!actif}
          onClick={() => { onChoisir(c.valeur); }}
          className={`text-left rounded-lg border px-3 py-2 text-sm transition ${
            actif
              ? 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-[#FA5D1E]/50 hover:bg-white/[0.06]'
              : 'border-white/5 bg-white/[0.02] text-slate-500'
          } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA5D1E]`}
        >
          {c.texte}
        </button>
      ))}
    </div>
  );
}

/**
 * L'APERÇU À LA TAILLE D'UN APPAREIL — et pourquoi ce n'est pas décoratif.
 *
 * ── D'OÙ VIENT L'IDÉE.
 *
 * Le propriétaire a entouré cette icône dans une capture de v0 (2026-10-17) :
 * un sélecteur téléphone / tablette / bureau, posé dans la barre de l'aperçu.
 *
 * ── CE QUE ÇA MONTRE ICI, ET C'EST MESURÉ, PAS SUPPOSÉ.
 *
 * L'aperçu est bâti par `compileWeb` : c'est la cible WEB. Deux mécanismes y
 * dépendent de la largeur, et TOUS DEUX lisent la fenêtre — donc, dans un
 * `iframe`, la largeur de l'IFRAME :
 *
 *   • les ruptures CSS du document émis : `@media (min-width: 400|600|1024)` ;
 *   • la disposition de la navigation : `useLargeurDeFenetre()` rend
 *     `window.innerWidth` via `useSyncExternalStore`, avec un écouteur
 *     `resize` — au-delà de `SEUIL_LATERALE = 840`, la barre du bas devient
 *     un RAIL latéral.
 *
 * Cet écouteur `resize` est ce qui rend le sélecteur vivant : changer la
 * largeur refait basculer la navigation sous les yeux, sans recharger.
 *
 * Jusqu'ici l'`iframe` était figé en pleine largeur : ces quatre seuils
 * existaient et PERSONNE ne pouvait les voir.
 *
 * ── POURQUOI CES TROIS LARGEURS.
 *
 * Elles traversent les quatre seuils, vérifié :
 *   390  → aucun seuil franchi            → barre du bas
 *   768  → 400 et 600 franchis            → barre du bas
 *   1280 → les quatre franchis            → RAIL latéral
 *
 * Deux largeurs auraient laissé un seuil sans témoin.
 */
const APPAREILS = [
  { cle: 'telephone', libelle: 'Téléphone', largeur: 390, note: 'barre du bas', Icone: Smartphone },
  { cle: 'tablette', libelle: 'Tablette', largeur: 768, note: 'barre du bas', Icone: Tablet },
  { cle: 'bureau', libelle: 'Bureau', largeur: 1280, note: 'rail latéral', Icone: Monitor },
] as const;

export function ApercuAppareil({
  titre,
  srcDoc,
  hauteur = 420,
  children,
}: {
  titre: string;
  srcDoc: string;
  /** Hauteur du cadre. L'aperçu en cours est plus court que le final. */
  hauteur?: number;
  /** Ce qui s'affiche SOUS le cadre — le téléchargement partiel, par exemple. */
  children?: ReactNode;
}) {
  const [largeur, setLargeur] = useState<number>(390);
  const courant = APPAREILS.find((a) => a.largeur === largeur) ?? APPAREILS[0];
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="min-w-0 truncate text-xs text-slate-400">{titre}</p>
        {/* ── LE SÉLECTEUR EST DANS LA BARRE DE L'APERÇU, au-dessus du cadre :
            la place de la capture, et la seule qui se lise comme « ceci règle
            ce que je vois dessous ».

            L'ICÔNE PORTE LE SENS, le libellé reste pour qui ne la lit pas —
            un bouton d'icône seule est un mot de passe visuel. En dessous de
            `sm`, le libellé s'efface et l'icône suffit : la barre ne doit pas
            pousser le titre hors du cadre. */}
        {/* ── LE LANGAGE VISUEL VIENT DE LA CONCURRENCE, ET LE PROPRIETAIRE
            L'A DESIGNE (capture de bolt.new, 2026-10-17) : « les icones en
            bas sont vraiment claires ».

            CE QU'ON EN REPREND : une TUILE par choix — icone en grand,
            libelle dessous —, et la selection marquee par une BORDURE plus
            un fond teinte, pas par une simple couleur de texte. Une pastille
            textuelle se lit de pres ; une tuile se reconnait d'un coup d'oeil.

            CE QU'ON N'EN REPREND PAS : la taille. Chez Bolt ces tuiles sont
            l'element central d'une page d'accueil ; ici elles vivent dans la
            barre d'un apercu et ne doivent pas chasser le titre. */}
        <div
          role="group"
          aria-label="Taille de l’aperçu"
          className="flex shrink-0 items-stretch gap-1.5"
        >
          {APPAREILS.map((a) => {
            const actif = a.largeur === largeur;
            return (
              <button
                key={a.cle}
                type="button"
                aria-pressed={actif}
                title={`${a.libelle} — ${String(a.largeur)} px · ${a.note}`}
                onClick={() => { setLargeur(a.largeur); }}
                className={`group flex w-[58px] flex-col items-center gap-1 rounded-xl border px-1 py-1.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA5D1E] ${
                  actif
                    ? 'border-[#FA5D1E]/70 bg-[#FA5D1E]/[0.14] shadow-[0_0_18px_-6px_rgba(250,93,30,0.7)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.07]'
                }`}
              >
                <a.Icone
                  size={20}
                  strokeWidth={1.75}
                  aria-hidden
                  className={actif ? 'text-[#FA5D1E]' : 'text-slate-400 group-hover:text-slate-200'}
                />
                <span
                  className={`text-[10px] font-medium leading-none ${
                    actif ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >{a.libelle}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* LA LARGEUR EST CELLE DU CADRE, pas une mise à l'échelle : c'est ce
          que l'application LIT. Une transformation `scale` tromperait —
          `window.innerWidth` resterait celui du conteneur. */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-black/25 p-2.5">
        <iframe
          title={titre}
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          style={{ width: `${String(largeur)}px`, height: `${String(hauteur)}px` }}
          className="mx-auto block max-w-full rounded-xl border border-white/10 bg-white shadow-2xl shadow-black/40"
        />
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
        <courant.Icone size={12} strokeWidth={2} aria-hidden />
        <span className="tabular-nums">{courant.largeur} px</span>
        <span className="text-slate-600">·</span>
        <span>{courant.note}</span>
      </p>
      {children}
    </div>
  );
}

/** Les trois points — la meme attente, des deux cotes. */
export function Attente({ libelle }: { libelle?: ReactNode } = {}) {
  return (
    <div className="flex justify-start">
      <div className={`${VERRE_BULLE} px-5 py-4`}>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        {/* LA PHRASE HONNETE SOUS LES POINTS — optionnelle, et ABSENTE pour
            les trois modes, dont l'attente reste exactement ce qu'elle etait.
            Elle dit ce qu'on lit et depuis combien de temps : jamais un
            pourcentage, jamais un compte a rebours qu'on serait incapable de
            tenir. Voir `attente-comprehension.ts`. */}
        {libelle !== undefined && (
          <p className="mt-2 text-xs text-slate-400">{libelle}</p>
        )}
      </div>
    </div>
  );
}

/** Le composeur : la zone de saisie et sa fleche ronde. Un seul des deux
 *  chemins pouvait l'avoir « presque » pareil — c'est ce qui se voyait. */
export function Composeur({
  valeur,
  onChange,
  onEnvoyer,
  invite,
  desactive = false,
  bloque = false,
  etiquette,
  joindre,
  longueurMax = 1000,
  note,
}: {
  valeur: string;
  onChange: (v: string) => void;
  onEnvoyer: () => void;
  invite: string;
  /** Le bouton seul est inactif (rien a envoyer, ou envoi en cours). */
  desactive?: boolean;
  /** Le champ entier est fige (une generation est en cours). */
  bloque?: boolean;
  etiquette: string;
  /**
   * LE CAHIER DES CHARGES JOINT (2026-10-10) — OPTIONNEL.
   *
   * « Beaucoup d'utilisateurs serieux arrivent avec un document — les faire
   * re-taper est penible et appauvrit le resultat. » Les trois modes ne
   * passent PAS cette prop : leur rendu reste AU CARACTERE PRES celui
   * d'avant (test-or epingle). Meme discipline que l'Escalier.
   */
  joindre?: (fichier: File) => void;
  /** La borne de saisie. 1000 par defaut — celle des trois modes, inchangee.
   *  Un cahier des charges entier exige davantage, et seul le chemin
   *  application le demande. */
  longueurMax?: number;
  /** Ce qu'on DIT sous le champ : le cout estime, ou le refus d'un format,
   *  ou un PDF scanne. Jamais une injection muette. */
  note?: ReactNode;
}) {
  return (
    // LE CADRE « relative » NE CONTIENT QUE LE CHAMP ET SES DEUX BOUTONS.
    // Les boutons sont posés depuis le BAS de ce cadre (`bottom-3`) : tout
    // ce qu'on y ajoute l'agrandit et les fait DESCENDRE d'autant. La note
    // vivait dedans — le trombone se posait donc sur son propre texte
    // (vu à l'écran le 2026-10-10). La note est maintenant une SŒUR du
    // cadre, pas une fille : elle peut grandir sans rien déplacer.
    <div className="mt-4">
      <div className="relative">
        <textarea
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onEnvoyer();
            }
          }}
          placeholder={invite}
          aria-label={etiquette}
          maxLength={longueurMax}
          disabled={bloque}
          rows={1}
          className={`w-full bg-black/40 border border-white/10 rounded-[24px] ${joindre !== undefined ? 'pl-14' : 'pl-6'} pr-16 py-4 text-white text-[15px] placeholder-slate-500 resize-none focus:outline-none transition shadow-xl min-h-[56px] max-h-40`}
        />
        {joindre !== undefined && (
          <label
            className="absolute bottom-3 left-4 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
            title="Joindre un cahier des charges (PDF avec texte, .txt, .md)"
          >
            <input
              type="file"
              accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
              className="hidden"
              disabled={bloque}
              aria-label="Joindre un cahier des charges"
              onChange={(e) => {
                const f = e.target.files?.[0];
                // Le champ est VIDÉ : rejoindre le même fichier doit relancer
                // la lecture, sinon « rien ne se passe » au second essai.
                e.target.value = '';
                if (f !== undefined) joindre(f);
              }}
            />
            <Paperclip size={18} aria-hidden="true" />
          </label>
        )}
        <button
          onClick={onEnvoyer}
          disabled={desactive}
          aria-label="Envoyer"
          className="absolute bottom-3 right-3 w-11 h-11 rounded-full flex items-center justify-center bg-white border-2 border-[#FA5D1E] shadow-lg transition disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
        >
          <ArrowUp size={22} strokeWidth={2.5} className="text-[#FA5D1E]" />
        </button>
      </div>
      {note !== undefined && <div className="mt-2 px-2 text-xs text-slate-400">{note}</div>}
    </div>
  );
}

/**
 * L'ESCALIER — la progression par marches des trois modes, DEPLACEE ici
 * (verbatim, classes au caractere pres) depuis OnboardingChat pour que le
 * suivi de generation (etage 4) REUTILISE la meme marche au lieu d'en
 * redessiner une : la lecon de ce fichier, appliquee une primitive de plus.
 */
export function Escalier({
  etapes,
  courante,
  fraction,
  compteur,
  panneau,
}: {
  etapes: string[];
  courante: number;
  /** ENRICHISSEMENTS DES APPLIS (2026-10-10) — OPTIONNELS : les trois modes
   *  ne les passent pas et leur rendu reste AU CARACTERE PRES celui d'avant
   *  (test-or epingle). Tout ce qui suit s'AJOUTE apres les marches. */
  fraction?: { faites: number; total: number; libelle: string };
  compteur?: { restants: number; libelle: string };
  panneau?: React.ReactNode;
}) {
  return (
    <>
      {etapes.map((label, i) => {
        const done = i < courante;
        const active = i === courante;
        return (
          <div key={i} className="flex items-center gap-3 transition-all duration-500" style={{ opacity: i <= courante ? 1 : 0.35 }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500" style={{ background: done ? '#FA5D1E' : active ? 'rgba(224,112,64,0.2)' : 'rgba(255,255,255,0.06)', border: active ? '2px solid #FA5D1E' : '2px solid transparent' }}>
              {done ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
              ) : active ? (
                <div className="w-2 h-2 rounded-full bg-[#FA5D1E] animate-pulse" />
              ) : null}
            </div>
            <span className="text-sm transition-colors duration-500" style={{ color: active ? '#fff' : done ? '#cbbfae' : '#6f6456' }}>{label}</span>
          </div>
        );
      })}
      {fraction !== undefined && (
        <div className="mt-1">
          <p className="text-xs text-slate-400 mb-1">
            {fraction.libelle} — {fraction.faites}/{fraction.total}
          </p>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#FA5D1E] transition-all duration-700"
              style={{ width: `${String(Math.min(100, Math.round((fraction.faites / Math.max(1, fraction.total)) * 100)))}%` }}
            />
          </div>
        </div>
      )}
      {compteur !== undefined && (
        <p className="text-xs text-slate-400 mt-1">
          {compteur.libelle} — <span className="text-white">{compteur.restants}</span> restant{compteur.restants > 1 ? 's' : ''}
        </p>
      )}
      {panneau}
    </>
  );
}
