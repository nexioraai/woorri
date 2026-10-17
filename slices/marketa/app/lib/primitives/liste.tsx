// LA LISTE — la seule primitive STRUCTURELLE, et la frontière de plateforme.
//
// Voir la note de `index.ts` : elle existe pour que `blocks/components.tsx`
// n'importe plus rien de React Native, et devienne donc partageable avec une
// cible web.
import { FlatList } from "react-native";

export interface ProprietesListe<T> {
  /** Les lignes à rendre. */
  donnees: readonly T[];
  /** L'identité STABLE d'une ligne — jamais son indice. */
  clef: (item: T) => string;
  rendu: (item: T) => React.ReactElement | null;
  /** Défilement horizontal, pour une rangée de cartes. */
  horizontal?: boolean;
  /** Nombre de colonnes. Deux pour un catalogue en grille. */
  colonnes?: number;
  /** Ce qu'on montre quand il n'y a rien. */
  vide?: React.ReactElement | null;
  /**
   * Ce qui ferme la liste — un compte, une respiration.
   *
   * Un COMPOSANT, pas un élément, et la nuance n'est pas cosmétique : passé en
   * élément, l'arbre rendu devenait circulaire à la sérialisation et le gate
   * des contrôles fantômes tombait. Le port doit être fidèle à l'appel
   * d'origine, pas seulement équivalent à la lecture.
   */
  pied?: React.ComponentType;
  /**
   * AJUSTEMENT AU CLAVIER (DET-016). Vérifié sur RN 0.86.3 : déclaré dans
   * `ScrollViewPropsIOS`, sans implémentation Android — il agit sur iOS et
   * reste INERTE sur Android, couvert par le mode de redimensionnement déclaré
   * au manifeste. Aucun test de plateforme n'est écrit ici.
   */
  suitLeClavier?: boolean;
}

export function Liste<T>({
  donnees,
  clef,
  rendu,
  horizontal,
  colonnes,
  vide,
  pied,
  suitLeClavier,
}: ProprietesListe<T>) {
  return (
    <FlatList
      data={donnees}
      keyExtractor={clef}
      renderItem={({ item }) => rendu(item)}
      {...(horizontal === true
        ? { horizontal: true, showsHorizontalScrollIndicator: false }
        : {})}
      {...(colonnes === undefined ? {} : { numColumns: colonnes })}
      {...(vide === undefined ? {} : { ListEmptyComponent: vide })}
      {...(pied === undefined ? {} : { ListFooterComponent: pied })}
      // Un appui sur une ligne ne doit pas se perdre à refermer le clavier.
      keyboardShouldPersistTaps="handled"
      {...(suitLeClavier === true ? { automaticallyAdjustKeyboardInsets: true } : {})}
    />
  );
}
