// ════════════════════════════════════════════════════════════════════
//  CHARGER LES FACES EMBARQUÉES — CÔTÉ WEB : RIEN À FAIRE, ET C'EST JUSTE.
// ════════════════════════════════════════════════════════════════════
//
// Le web n'enregistre pas une police par du code : les trois faces sont
// déclarées en `@font-face` dans la feuille émise, et le navigateur les charge
// quand il en a besoin. Il n'y a donc rien à attendre et rien à bloquer.
//
// Cette racine n'est pas vide de sens pour autant : c'est elle qui permet à
// `App.tsx` — le MÊME fichier pour les deux cibles — de l'envelopper sans
// savoir laquelle il sert. Même patron que `creerFeuille`, dont la version web
// est l'identité.
//
// Et c'est ce qui rend la dégradation du web supérieure à celle du natif : une
// pile CSS se replie sur Georgia puis sur n'importe quel serif, donc le
// CARACTÈRE survit même sans la face. Côté natif, `fontFamily` prend un seul
// nom — d'où le fichier embarqué et son enregistrement explicite.
import type { PropsWithChildren } from "react";

export function PoliceRoot({ children }: PropsWithChildren) {
  return <>{children}</>;
}
