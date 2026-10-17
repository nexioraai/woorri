// ════════════════════════════════════════════════════════════════════
//  CHARGER LES FACES EMBARQUÉES — CÔTÉ NATIF.
// ════════════════════════════════════════════════════════════════════
//
// ── LE MAILLON QUI A MANQUÉ QUATRE FOIS DANS CE DÉPÔT.
//
// `accroche`, `logoUri`, l'avatar à initiales, puis la famille de caractères :
// déclaré, porté, et JAMAIS transmis. Rien n'échoue, la chose rend sa forme
// d'avant. Un `.ttf` posé dans `assets/polices/` et jamais enregistré auprès
// du moteur natif serait le cinquième épisode — et le plus silencieux de tous,
// parce qu'une famille inconnue ne lève pas : elle retombe sur la police
// système.
//
// ── POURQUOI ON ATTEND, ET POURQUOI ON N'ATTEND PAS INDÉFINIMENT.
//
// Rendre avant que les faces soient enregistrées montrerait un premier écran
// en police système, puis un saut typographique. On attend donc.
//
// MAIS ON REND AUSSI EN CAS D'ÉCHEC, et c'est délibéré : une police est un
// agrément, pas une fonction. Bloquer l'application entière parce qu'un
// fichier de 42 Ko n'a pas pu s'enregistrer serait échanger un défaut cosmétique
// contre une panne totale. L'échec dégrade vers la police système — ce que
// faisait la version d'avant, et personne ne s'en plaignait.
import type { PropsWithChildren } from "react";
import { useFonts } from "expo-font";

// ── LES NOMS SONT CEUX QUE LA COUTURE DEMANDE, ET LE CLIQUET LES COMPARE.
//
// La clé d'enregistrement EST le nom qu'on passe à `fontFamily`. Une faute de
// frappe ici ne lèverait pas : la famille serait simplement introuvable. Le
// contrôle d'EP-263 confronte donc cette liste à ce que rend `styleDePolice`.
const FACES = {
  "DeribfySerif-Regular": require("../../public/polices/DeribfySerif-Regular.ttf"),
  "DeribfySerif-SemiBold": require("../../public/polices/DeribfySerif-SemiBold.ttf"),
  "DeribfySerif-Bold": require("../../public/polices/DeribfySerif-Bold.ttf"),
} as const;

export function PoliceRoot({ children }: PropsWithChildren) {
  const [pretes, erreur] = useFonts(FACES);
  if (!pretes && erreur === null) return null;
  return <>{children}</>;
}
