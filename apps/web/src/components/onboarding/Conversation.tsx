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
import { ArrowUp, Paperclip } from 'lucide-react';
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

/** Les trois points — la meme attente, des deux cotes. */
export function Attente() {
  return (
    <div className="flex justify-start">
      <div className={`${VERRE_BULLE} px-5 py-4`}>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
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
    <div className="relative mt-4">
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
        className="w-full bg-black/40 border border-white/10 rounded-[24px] pl-6 pr-16 py-4 text-white text-[15px] placeholder-slate-500 resize-none focus:outline-none transition shadow-xl min-h-[56px] max-h-40"
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
