/**
 * LES EXEMPLES QUI DÉFILENT — ET ILS PARLENT DES QUATRE CHOIX.
 *
 * ── LE DÉFAUT, SIGNALÉ LE 2026-11-05.
 *
 * Les six phrases ne parlaient QUE de commerce : « Mes clients créent, je
 * vends… », « Vendre sans stock ni argent… ». Or « Application » est l'un
 * des quatre boutons, juste au-dessus.
 *
 * Quelqu'un qui veut une application ne voyait aucun exemple qui lui
 * ressemble, et se croyait au mauvais endroit. C'est le même défaut que
 * la question d'activité — l'écran dit implicitement « ce n'est pas pour
 * vous » — en plus discret, donc en plus difficile à nommer.
 *
 * ── ET CHAQUE PHRASE SAIT À QUI ELLE PARLE.
 *
 * `familles` porte les choix auxquels l'exemple appartient. ELLES NE SONT
 * PAS LES NUMÉROS DE `sites.mode` — réemployer ceux-là ferait de ce
 * fichier une surface de mode de plus, et le cliquet d'exhaustivité l'a
 * refusé à raison : un exemple appartient à un GENRE DE PROJET, pas à
 * une valeur de colonne. Une fois un type choisi, la
 * rotation ne montre que les siens — mélanger des exemples de boutique
 * pendant qu'« Application » est retenu reproduirait exactement la
 * confusion qu'on vient de fermer.
 *
 * Les exemples d'application viennent de ce que les gens demandent
 * vraiment : la facture d'électricité, la tontine de quartier, le suivi
 * des livraisons, les présences d'une équipe.
 */
export type Famille = 'site' | 'boutique' | 'dropship' | 'application'
export type Invite = { readonly texte: string; readonly familles: readonly Famille[] }

export const PLACEHOLDER_BY_LANG: Record<string, readonly Invite[]> = {
  fr: [
    { texte: 'Créer mon site web…', familles: ['site'] },
    { texte: 'Ma marque de vêtements, sans un sou…', familles: ['boutique', 'dropship'] },
    { texte: 'Vendre sans stock ni argent…', familles: ['dropship'] },
    { texte: 'Ma boutique, zéro risque…', familles: ['boutique', 'dropship'] },
    { texte: 'Vendre mes créations, sans avancer d\'argent…', familles: ['boutique', 'dropship'] },
    { texte: 'Mes clients créent, je vends…', familles: ['dropship'] },
    { texte: 'Calculer ma facture d\'électricité…', familles: ['application'] },
    { texte: 'Une tontine pour mon quartier…', familles: ['application'] },
    { texte: 'Suivre mes livraisons…', familles: ['application'] },
    { texte: 'Gérer les présences de mon équipe…', familles: ['application'] },
  ],
  en: [
    { texte: 'Build my website…', familles: ['site'] },
    { texte: 'My clothing brand, $0 down…', familles: ['boutique', 'dropship'] },
    { texte: 'Sell with no stock, no cash…', familles: ['dropship'] },
    { texte: 'My shop, zero risk…', familles: ['boutique', 'dropship'] },
    { texte: 'Sell my creations, nothing upfront…', familles: ['boutique', 'dropship'] },
    { texte: 'My customers design, I sell…', familles: ['dropship'] },
    { texte: 'Work out my electricity bill…', familles: ['application'] },
    { texte: 'A savings circle for my neighbourhood…', familles: ['application'] },
    { texte: 'Track my deliveries…', familles: ['application'] },
    { texte: 'Track my team\'s attendance…', familles: ['application'] },
  ],
  es: [
    { texte: 'Crear mi sitio web…', familles: ['site'] },
    { texte: 'Lanzar mi marca de ropa, sin un peso…', familles: ['boutique', 'dropship'] },
    { texte: 'Vender sin stock ni dinero…', familles: ['dropship'] },
    { texte: 'Abrir mi tienda, cero riesgo…', familles: ['boutique', 'dropship'] },
    { texte: 'Mi tienda, cero riesgo…', familles: ['boutique', 'dropship'] },
    { texte: 'Mis clientes crean, yo vendo…', familles: ['dropship'] },
    { texte: 'Calcular mi factura de luz…', familles: ['application'] },
    { texte: 'Una tanda para mi barrio…', familles: ['application'] },
    { texte: 'Seguir mis entregas…', familles: ['application'] },
    { texte: 'Controlar la asistencia de mi equipo…', familles: ['application'] },
  ],
  ar: [
    { texte: 'أنشئ موقعي الإلكتروني…', familles: ['site'] },
    { texte: 'أطلق علامة ملابسي، بدون أي مال…', familles: ['boutique', 'dropship'] },
    { texte: 'بِع بدون مخزون، بدون استثمار…', familles: ['dropship'] },
    { texte: 'افتح متجري، دون أي مخاطرة…', familles: ['boutique', 'dropship'] },
    { texte: 'بِع إبداعاتي، دون دفع مقدمًا…', familles: ['boutique', 'dropship'] },
    { texte: 'عملائي يصممون، وأنا أبيع…', familles: ['dropship'] },
    { texte: 'احسب فاتورة الكهرباء…', familles: ['application'] },
    { texte: 'جمعية ادخار لحيّي…', familles: ['application'] },
    { texte: 'تتبّع شحناتي…', familles: ['application'] },
    { texte: 'متابعة حضور فريقي…', familles: ['application'] },
  ],
};

/**
 * LES EXEMPLES DU TYPE CHOISI — tous tant qu'on n'a rien choisi.
 *
 * Rien de choisi sur l'accueil : la rotation montre alors les quatre
 * familles, et c'est ce qui dit « il y a une place pour vous ».
 */
export function invitesPour(
  toutes: readonly Invite[],
  famille: Famille | null,
): readonly string[] {
  const retenues =
    famille === null ? toutes : toutes.filter((i) => i.familles.includes(famille))
  // Un type sans exemple ne laisse pas un champ muet : on retombe sur
  // tout plutôt que sur rien.
  return (retenues.length > 0 ? retenues : toutes).map((i) => i.texte)
}
