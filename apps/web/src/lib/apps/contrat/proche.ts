/**
 * APPELÉ PAR LES TESTS, PAR CONSTRUCTION — à l’étape 1 seulement (EP-365) : branché par l’étape 4.
 *
 * LE NOM VALIDE LE PLUS PROCHE — chaque refus du validateur le donne.
 *
 * Mesuré sur 5b1c20bc : l'ancien juge proposait « ROLE_VISITEUR » pour
 * « Reservation » et « FONDS » pour « JETONS » — une distance d'édition nue
 * sur des noms sans rapport. Ici : on traduit d'abord les noms que les
 * modèles empruntent aux autres bibliothèques (Button, Card, primary…), on
 * cherche ensuite le dernier segment (`var(--espace-m)` → `m`,
 * `JETONS.ESPACE.s` → `s`), et la distance ne départage qu'en dernier.
 * Aucune proposition n'est rendue si rien n'est raisonnablement proche.
 */
const SYNONYMES: Readonly<Record<string, readonly string[]>> = {
  button: ['Bouton'], pressable: ['Bouton'], touchable: ['Bouton'], iconbutton: ['Bouton'], fab: ['Bouton'],
  card: ['Encart', 'surface'], carte: ['Encart'], cartevedette: ['Encart'], paper: ['Encart'], surface: ['Encart', 'surface'],
  view: ['Pile'], stack: ['Pile'], box: ['Pile'], div: ['Pile'], container: ['Pile'], grid: ['Pile'], row: ['Pile', 'ligne'], column: ['Pile', 'colonne'],
  text: ['Phrase', 'texte'], typography: ['Phrase'], paragraph: ['Phrase'], paragraphe: ['Phrase'], span: ['Phrase'], p: ['Phrase'],
  title: ['Titre'], heading: ['Titre'], headline: ['Titre'], h1: ['Titre', 'page'], h2: ['Titre', 'section'], entetedesection: ['Titre'],
  input: ['Champ'], textinput: ['Champ'], textfield: ['Champ'], select: ['Champ', 'choix'], checkbox: ['Champ'], searchbar: ['Champ'],
  list: ['Lignes'], liste: ['Lignes'], flatlist: ['Lignes'], table: ['Lignes'], datatable: ['Lignes'], grilletableau: ['Lignes'], listerecente: ['Lignes'],
  badge: ['Pastille'], chip: ['Pastille'], tag: ['Pastille'],
  divider: ['Trait'], separator: ['Trait'], hr: ['Trait'],
  image: ['Illustration'], img: ['Illustration'], avatar: ['Illustration'],
  alert: ['Message'], etatvide: ['Message'], snackbar: ['Message'], banner: ['Message'], toast: ['Message'], spinner: ['Message', 'horloge'],
  icon: ['Pictogramme', 'icone'], icone: ['Pictogramme', 'icone'],
  // variantes
  outline: ['secondaire', 'discret'], ghost: ['discret'], gauche: ['debut'], left: ['debut'], start: ['debut'], droite: ['fin'], right: ['fin'],
  end: ['fin'], horizontal: ['ligne'], vertical: ['colonne'], currency: ['montant'], prix: ['montant'], price: ['montant'],
  email: ['courriel'], mail: ['courriel'], password: ['secret'], motdepasse: ['secret'], dropdown: ['choix'],
  h3: ['encart'], empty: ['vide'], loading: ['chargement', 'horloge'], error: ['erreur', 'danger'], create: ['creer'], update: ['modifier'],
  // jetons
  primary: ['principal', 'accent'], primaire: ['principal', 'accent'], rounded: ['m'], textxs: ['legende'], textsm: ['legende'], textbase: ['corps'],
  textlg: ['sousTitre'], textxl: ['titre'], text2xl: ['grandTitre'], shadow: ['leve', 'elevation'], shadowlg: ['flottant'], shadowsm: ['leve'],
  gris: ['texteDiscret'], grey: ['texteDiscret'], gray: ['texteDiscret'], destructive: ['danger'], erreur: ['danger'], background: ['fond'],
  foreground: ['texte'], muted: ['texteDiscret'], mutedforeground: ['texteDiscret'], discret: ['texteDiscret'], border: ['bordure'],
  success: ['succes'], warning: ['alerte'], attention: ['alerte'], radius: ['rayon'], md: ['m'], sm: ['s'], lg: ['l'], xxl: ['xl'],
  ombre: ['leve', 'elevation'],
  // icônes
  search: ['recherche'], home: ['accueil'], user: ['utilisateur'], settings: ['reglages'], chargement: ['horloge'],
  info: ['information'], close: ['fermer'], back: ['retour', 'navigate'], edit: ['modifier'], delete: ['supprimer'], add: ['ajouter'],
  loader: ['horloge'], trash: ['supprimer'], poubelle: ['supprimer'], arrowleft: ['retour'], creditcard: ['paiement'],
  phone: ['telephone'], calendar: ['calendrier'], clock: ['horloge'], bell: ['message'], goback: ['navigate'],
  // actions et événements
  naviguer: ['navigate'], goto: ['navigate'], ouvrirurl: ['navigate'], lien: ['navigate'], link: ['navigate'],
  enregistrer: ['submit'], ajouter: ['submit', 'ajouter'], save: ['submit'], envoyer: ['submit'], poser: ['setState'], set: ['setState'],
  recharger: ['rafraichir', 'emit'], reload: ['rafraichir', 'emit'], refresh: ['rafraichir', 'emit'],
  logout: ['deconnexion'], sedeconnecter: ['deconnexion'], login: ['connexion'], seconnecter: ['connexion'], share: ['partager'],
  // A3 (2026-11-13) : les six réparables du jeu de mesure
  '1': ['page'], '2': ['section'], '3': ['encart'], windowlocation: ['navigate'], appeler: ['contacter'], telephoner: ['contacter'],
}

/** Les échelles des jetons, en pixels : une valeur brute (`16px`, `2rem`) va au pas le plus proche. */
const ECHELLES: readonly Readonly<Record<string, number>>[] = [
  { aucun: 0, xs: 4, s: 8, m: 16, l: 24, xl: 32 },
  { legende: 12, corps: 14, sousTitre: 18, titre: 24, grandTitre: 32 },
]
function auPasLePlusProche(brut: string, connus: readonly string[]): string | null {
  const m = /^(\d+(?:\.\d+)?)(px|rem)$/u.exec(brut.trim())
  if (m === null) return null
  const px = Number(m[1]) * (m[2] === 'rem' ? 16 : 1)
  const echelle = ECHELLES.find((e) => Object.keys(e).every((k) => connus.includes(k)))
  if (echelle === undefined) return null
  return Object.entries(echelle).sort((a, b) => Math.abs(a[1] - px) - Math.abs(b[1] - px))[0]![0]
}

export const normaliser = (x: string): string =>
  x.normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase().replace(/[^a-z0-9]/gu, '')

function distance(x: string, y: string): number {
  const d = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array<number>(y.length).fill(0)])
  for (let j = 1; j <= y.length; j += 1) d[0]![j] = j
  for (let i = 1; i <= x.length; i += 1) {
    for (let j = 1; j <= y.length; j += 1) {
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1))
    }
  }
  return d[x.length]![y.length]!
}

export function lePlusProche(invente: string, connus: readonly string[]): string | null {
  if (connus.length === 0) return null
  // Une couleur brute n'a pas de « plus proche » honnête : refus sec (A3).
  if (/^\s*(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/iu.test(invente)) return null
  const pas = auPasLePlusProche(invente, connus)
  if (pas !== null) return pas
  const brut = invente.replace(/^var\(|\)$/gu, '').replace(/^-+/u, '')
  const segments = brut.split(/[.\-_:/ ]+/u).filter((s) => s !== '')
  // Le nom entier d'abord, puis ses segments dans l'ordre : « offre_id » → « offre », « var(--espace-m) » → « m ».
  const candidats = [...new Set([normaliser(brut), ...segments.map(normaliser)])].filter((c) => c !== '')
  const parNorme = new Map(connus.map((c) => [normaliser(c), c]))
  for (const c of candidats) {
    const exact = parNorme.get(c)
    if (exact !== undefined) return exact
    for (const s of SYNONYMES[c] ?? []) if (connus.includes(s)) return s
  }
  // Un nom contenu dans un nom connu (« devise » ⊂ « devise_debitee ») : le plus court qui le contient.
  for (const c of candidats.slice(0, 1)) {
    const contenants = [...parNorme].filter(([n]) => c.length > 3 && n.includes(c)).sort((x, y) => x[0].length - y[0].length)
    if (contenants[0] !== undefined) return contenants[0][1]
  }
  let meilleur: string | null = null
  let score = Number.POSITIVE_INFINITY
  for (const c of candidats) {
    for (const [n, k] of parNorme) {
      const s = distance(c, n) - (c.length > 2 && n.length > 2 && (c.includes(n) || n.includes(c)) ? Math.min(c.length, n.length) / 2 : 0)
      if (s < score) { score = s; meilleur = k }
    }
  }
  // Trop loin : mieux vaut ne rien proposer que proposer « ROLE_VISITEUR » pour « Reservation ».
  const reference = Math.max(...candidats.map((c) => c.length))
  // Mesuré : au-delà d'un tiers du nom, la « proximité » proposait « choisirLangue » pour « choisirTheme ».
  return score <= Math.max(1, Math.floor(reference / 3)) ? meilleur : null
}
