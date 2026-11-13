// ÉTAPE 1 · LE CATALOGUE — fermé, sans web, sans nom emprunté.
//
//   ① le schéma JSON du contrat : `additionalProperties: false` sur CHAQUE objet,
//      et aucune chaîne libre (chacune a un motif, une énumération ou une constante) ;
//   ② aucun nom de prop, de clé ni de valeur n'est un attribut DOM, un gestionnaire
//      d'événement ou une propriété CSS ; aucune direction physique (left/right) —
//      décision 3 : React Native sera une seconde sortie du MÊME contrat ;
//   ③ les noms des composants sont distincts de shadcn, MUI et React Native Paper
//      (casse, accents et « e » final ignorés : « Paragraphe » ≈ « Paragraph ») ;
//   ④ le schéma Zod porte exactement les composants et les actions du registre ;
//   ⑤ décision 2 : aucun formulaire natif — le catalogue n'en a pas, et un
//      `form` / `Formulaire` est refusé par sa classe FORMULAIRE_NATIF.
// Ces listes de référence sont écrites ICI, indépendamment du code jugé.
// Rouge-puis-vert : un z.strictObject passé en z.object → ① rouge ; une prop
// `style` ajoutée → ② rouge ; « Encart » renommé « Card » → ③ rouge ; la
// détection du formulaire retirée du validateur → ⑤ rouge.
import { describe, expect, it } from 'vitest'
import {
  ACTIONS, COMPOSANTS, EVENEMENTS, FAIRE, ICONES, JETONS, NATURES_ETAT, PROPS_COMMUNES, PROPS_ECRAN, PROPS_SPEC, VUES_TETRADE,
  schemaJsonDuContrat, type DefProp,
} from '../catalogue'
import { validerFragment } from '../validateur'
import { CTX } from './specs-synthetiques'

const DOM = [
  'accept', 'accesskey', 'action', 'align', 'allow', 'alt', 'autocomplete', 'autofocus', 'autoplay', 'checked', 'cite', 'class', 'classname',
  'cols', 'colspan', 'content', 'contenteditable', 'controls', 'coords', 'data', 'datetime', 'default', 'dir', 'disabled', 'download',
  'draggable', 'enctype', 'for', 'form', 'formaction', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'htmlfor', 'id',
  'inputmode', 'ismap', 'key', 'kind', 'label', 'lang', 'list', 'loop', 'low', 'max', 'maxlength', 'media', 'method', 'min', 'multiple',
  'muted', 'name', 'novalidate', 'open', 'optimum', 'pattern', 'placeholder', 'poster', 'preload', 'readonly', 'ref', 'rel', 'required',
  'reversed', 'role', 'rows', 'rowspan', 'sandbox', 'scope', 'selected', 'shape', 'size', 'sizes', 'span', 'spellcheck', 'src', 'srcdoc',
  'srclang', 'srcset', 'start', 'step', 'style', 'tabindex', 'target', 'title', 'translate', 'type', 'usemap', 'value', 'width', 'wrap',
  'children', 'dangerouslysetinnerhtml', 'testid', 'sx', 'variant',
  // propriétés CSS
  'margin', 'padding', 'color', 'background', 'backgroundcolor', 'border', 'borderradius', 'display', 'flex', 'flexdirection', 'gap',
  'fontsize', 'fontweight', 'textalign', 'justifycontent', 'alignitems', 'position', 'top', 'bottom', 'left', 'right', 'opacity',
  'overflow', 'zindex', 'boxshadow', 'transform', 'direction', 'float', 'cursor',
]
const PHYSIQUES = ['left', 'right', 'gauche', 'droite', 'top', 'bottom', 'haut', 'bas']
const BIBLIOTHEQUES = [
  // shadcn/ui
  'Accordion', 'Alert', 'AlertDialog', 'AspectRatio', 'Avatar', 'Badge', 'Breadcrumb', 'Button', 'Calendar', 'Card', 'Carousel', 'Chart',
  'Checkbox', 'Collapsible', 'Combobox', 'Command', 'ContextMenu', 'Table', 'Dialog', 'Drawer', 'DropdownMenu', 'Form', 'HoverCard', 'Input',
  'InputOTP', 'Label', 'Menubar', 'NavigationMenu', 'Pagination', 'Popover', 'Progress', 'RadioGroup', 'Resizable', 'ScrollArea', 'Select',
  'Separator', 'Sheet', 'Sidebar', 'Skeleton', 'Slider', 'Sonner', 'Switch', 'Tabs', 'Textarea', 'Toast', 'Toggle', 'ToggleGroup', 'Tooltip',
  // MUI
  'Box', 'Container', 'Grid', 'Stack', 'Typography', 'IconButton', 'ButtonGroup', 'Fab', 'Radio', 'Rating', 'TextField', 'TransferList',
  'ToggleButton', 'Chip', 'Divider', 'Icon', 'List', 'ListItem', 'ListItemText', 'Backdrop', 'CircularProgress', 'LinearProgress', 'Snackbar',
  'AppBar', 'CardContent', 'CardActions', 'CardHeader', 'CardMedia', 'Paper', 'BottomNavigation', 'Breadcrumbs', 'Link', 'Menu', 'SpeedDial',
  'Stepper', 'Tab', 'ImageList', 'Modal', 'Popper', 'Image', 'Masonry', 'Timeline',
  // React Native Paper
  'ActivityIndicator', 'Appbar', 'Banner', 'DataTable', 'FAB', 'HelperText', 'Portal', 'ProgressBar', 'RadioButton', 'Searchbar',
  'SegmentedButtons', 'Surface', 'Text', 'TextInput', 'Caption', 'Headline', 'Paragraph', 'Subheading', 'Title',
]
const net = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase().replace(/[^a-z0-9]/gu, '').replace(/e$/u, '')

function noeudsJson(x: unknown, f: (o: Record<string, unknown>) => void) {
  if (Array.isArray(x)) for (const y of x) noeudsJson(y, f)
  else if (typeof x === 'object' && x !== null) {
    f(x as Record<string, unknown>)
    for (const v of Object.values(x)) noeudsJson(v, f)
  }
}

/** Tous les noms du contrat : props, clés, valeurs d'énumération. */
function nomsDuContrat(): { cles: string[]; valeurs: string[] } {
  const cles = new Set<string>([...Object.keys(PROPS_SPEC), ...Object.keys(PROPS_ECRAN), ...Object.keys(PROPS_COMMUNES), 'composant', 'faire'])
  const valeurs = new Set<string>([...ICONES, ...EVENEMENTS, ...VUES_TETRADE, ...NATURES_ETAT, ...FAIRE, ...Object.keys(JETONS), ...Object.values(JETONS).flat()])
  for (const def of Object.values(COMPOSANTS)) for (const [k, d] of Object.entries(def.props)) { cles.add(k); if (d.genre.g === 'variante') for (const v of d.genre.valeurs) valeurs.add(v) }
  for (const def of Object.values(ACTIONS)) for (const [k, d] of Object.entries(def.args as Readonly<Record<string, DefProp>>)) { cles.add(k); if (d.genre.g === 'variante') for (const v of d.genre.valeurs) valeurs.add(v) }
  // les clés imbriquées, lues dans le schéma JSON lui-même
  noeudsJson(schemaJsonDuContrat(), (o) => { if (typeof o.properties === 'object' && o.properties !== null) for (const k of Object.keys(o.properties)) cles.add(k) })
  return { cles: [...cles], valeurs: [...valeurs] }
}

describe('étape 1 · le catalogue', () => {
  it('① schéma JSON : additionalProperties false partout, aucune chaîne libre', () => {
    const objets: string[] = []
    const libres: string[] = []
    noeudsJson(schemaJsonDuContrat(), (o) => {
      if (o.type === 'object' && o.additionalProperties !== false) objets.push(JSON.stringify(o).slice(0, 80))
      if (o.type === 'string' && o.pattern === undefined && o.enum === undefined && o.const === undefined) libres.push(JSON.stringify(o).slice(0, 80))
    })
    expect(objets, 'objets ouverts').toEqual([])
    expect(libres, 'chaînes libres').toEqual([])
  })

  it('② aucun attribut DOM, gestionnaire, propriété CSS ni direction physique dans le contrat', () => {
    const { cles, valeurs } = nomsDuContrat()
    const dom = new Set(DOM.map((x) => x.toLowerCase()))
    expect(cles.filter((k) => dom.has(k.toLowerCase()) || /^on[A-Z]/u.test(k) || /^(aria|data)-/u.test(k))).toEqual([])
    expect(valeurs.filter((v) => dom.has(v.toLowerCase()))).toEqual([])
    expect([...cles, ...valeurs].filter((x) => PHYSIQUES.includes(x.toLowerCase()))).toEqual([])
    expect(cles.length).toBeGreaterThan(40)
  })

  it('③ des noms de composants à Deribfy, distincts de shadcn, MUI et Paper', () => {
    const emprunts = new Set(BIBLIOTHEQUES.map(net))
    expect(Object.keys(COMPOSANTS).filter((n) => emprunts.has(net(n)))).toEqual([])
  })

  it('④ le schéma Zod porte exactement les composants et les actions du registre', () => {
    const json = JSON.stringify(schemaJsonDuContrat())
    const composants = [...json.matchAll(/"composant":\{"type":"string","const":"([^"]+)"\}/gu)].map((m) => m[1])
    const faires = [...json.matchAll(/"faire":\{"type":"string","const":"([^"]+)"\}/gu)].map((m) => m[1])
    expect([...new Set(composants)].sort()).toEqual(Object.keys(COMPOSANTS).sort())
    expect([...new Set(faires)].sort()).toEqual([...FAIRE].sort())
    expect(FAIRE).toEqual(['navigate', 'submit', 'emit', 'setState'])
  })

  it('⑤ aucun formulaire natif : absent du catalogue, refusé par sa classe', () => {
    expect(Object.keys(COMPOSANTS).filter((n) => /form/iu.test(n))).toEqual([])
    for (const nom of ['form', 'Form', 'Formulaire']) {
      const v = validerFragment({ ecran: { route: 'detail', acces: 'visiteur', titre: { $t: 'a.b' }, corps: [{ composant: nom, enfants: [] }] }, traductions: [] }, CTX)
      expect(v.refus.map((r) => r.classe)).toEqual(['FORMULAIRE_NATIF'])
      expect(v.refus[0]!.proche).toBe('Bouton')
    }
  })
})
