// STUB DE NAVIGATION — enregistre les appels au lieu de naviguer.
// C'est l'INSTRUMENT : il rend la transition OBSERVABLE.
export const journal: { name: string; params?: unknown }[] = [];
export const reset = (): void => { journal.length = 0; };
// La racine du contrat : inerte ici, puisque le stub EST le navigateur. Elle
// existe pour que le module remplace le contrat sans trou d'export.
export const NavigationRoot = ({ children }: { children?: unknown }): unknown => children;
export const useNavigation = () => ({
  navigate: (name: string, params?: unknown) => { journal.push({ name, params }); },
  goBack: () => { journal.push({ name: "«retour»" }); },
});
