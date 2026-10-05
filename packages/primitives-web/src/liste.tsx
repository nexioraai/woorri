// LA LISTE, POUR LE WEB — même contrat que la native, autre mécanisme.
//
// La native s'appuie sur `FlatList`, qui VIRTUALISE : seules les lignes
// visibles sont montées. Le web n'a pas d'équivalent fourni, et en écrire un
// serait un chantier à part — il faut mesurer la hauteur des lignes, écouter le
// défilement, et se tromper sur l'un des deux donne une liste qui saute.
//
// ⚠️ LIMITE DITE, ET MESURABLE : cette liste rend TOUTES ses lignes. Sur un
// catalogue de quelques centaines d'articles, c'est sans conséquence ; sur
// plusieurs milliers, la page devient lourde. La borne `pageSize` du bloc
// `list` (200 au plus, portée par le document) limite déjà ce que l'appelant
// transmet — c'est ce qui rend l'absence de virtualisation tenable aujourd'hui,
// et c'est ce qu'il faudra revoir si cette borne tombe.
import { Vue } from "./hotes.tsx";

export interface ProprietesListe<T> {
  donnees: readonly T[];
  clef: (item: T) => string;
  rendu: (item: T) => React.ReactElement | null;
  horizontal?: boolean;
  colonnes?: number;
  vide?: React.ReactElement | null;
  pied?: React.ComponentType;
  suitLeClavier?: boolean;
}

export function Liste<T>({
  donnees,
  clef,
  rendu,
  horizontal,
  colonnes,
  vide,
  pied: Pied,
  suitLeClavier,
}: ProprietesListe<T>) {
  // Le clavier d'un téléphone recouvre la page ; sur le web, le navigateur
  // s'en charge lui-même en faisant défiler le champ focalisé. Rien à faire,
  // et le dire vaut mieux que de laisser croire à un oubli.
  void suitLeClavier;
  const grille = colonnes !== undefined && colonnes > 1;
  return (
    <div
      style={
        {
          display: grille ? "grid" : "flex",
          ...(grille
            ? { gridTemplateColumns: "repeat(" + String(colonnes) + ", minmax(0, 1fr))" }
            : { flexDirection: horizontal === true ? "row" : "column" }),
          // Le défilement appartient à la liste, jamais à la page : c'est ce
          // qui garde l'en-tête et la barre de navigation en place.
          ...(horizontal === true ? { overflowX: "auto" } : { overflowY: "auto" }),
          minWidth: 0,
        }
      }
    >
      {donnees.length === 0 ? vide : donnees.map((item) => <Vue key={clef(item)}>{rendu(item)}</Vue>)}
      {Pied === undefined ? null : <Pied />}
    </div>
  );
}
