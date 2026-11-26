import { accorder, type Institution } from '@/lib/sites/institution'
// ============================================================================
// LES MOTS DES COMMANDES (CPA, 2026-11-19), dans les quatre langues de
// l'espace. Les ÉTATS se disent du point de vue du client : « Reçue » veut
// dire « la Centrale l'a », pas « vous l'avez reçue ».
// ============================================================================

export type MotsCommandes = {
  titre: string; phrase: string; chargement: string; refus: string; pasOuvert: string
  nouvelle: string; produit: string; quantite: string; unite: string; unitePlaceholder: string
  ajouterLigne: string; retirer: string; note: string; notePlaceholder: string
  envoyer: string; envoi: string; envoyee: string; suggestions: string
  mesCommandes: string; vide: string; passeeLe: string; majLe: string; reponse: string
  etats: Record<string, string>
  /** Les étapes courtes de la frise de suivi. */
  etapes: Record<string, string>
  annulee: string
  /** Le tableau de bord du client (accueil de son espace). */
  tableau: { titre: string; enCours: string; livrees: string; total: string; dernieres: string; passer: string; toutes: string; aucune: string }
  /** Le tableau de bord complet (cartes, graphiques). */
  tdb: {
    unites: string; aTraiter: string; clients: string; total6: string; ceMois: string; moisPrecedent: string; lignes: string
    evolution: string; evolutionSous: string; parMois: string; parMoisSous: string; statuts: string; auTotal: string
    produits: string; produitsSous: string; topClients: string; topClientsSous: string; recentes: string; voirTout: string
    traiter: string; videProduits: string; videClients: string; commandesMois: string; toutes: string; videGraphique: string
  }
}

const FR: MotsCommandes = {
  titre: 'Mes commandes',
  phrase: 'Passez un bon de commande {{a}} et suivez où il en est. Aucun paiement en ligne : {{la}} traite chaque commande et vous répond ici.',
  chargement: 'Chargement…',
  refus: 'Les commandes sont réservées aux structures sanitaires dont le compte est actif. Connectez-vous depuis votre espace client.',
  pasOuvert: 'Les commandes ne sont pas encore ouvertes sur ce site.',
  nouvelle: 'Nouveau bon de commande', produit: 'Produit', quantite: 'Quantité', unite: 'Unité',
  unitePlaceholder: 'boîtes, flacons…', ajouterLigne: '+ Ajouter un produit', retirer: 'Retirer',
  note: 'Précisions (facultatif)', notePlaceholder: 'Lieu de livraison, urgence, contact…',
  envoyer: 'Envoyer la commande', envoi: 'Envoi…', envoyee: 'Commande envoyée. Référence :',
  suggestions: 'Choisissez dans le catalogue ou écrivez le nom du produit.',
  mesCommandes: 'Mes commandes passées', vide: 'Vous n’avez encore passé aucune commande.',
  passeeLe: 'Passée le', majLe: 'mise à jour le', reponse: 'Réponse {{de}}',
  etats: { recue: 'Reçue par {{la}}', en_cours: 'En cours de traitement', validee: 'Validée', livree: 'Livrée', annulee: 'Annulée' },
  etapes: { recue: 'Reçue', en_cours: 'En cours', validee: 'Validée', livree: 'Livrée' },
  annulee: 'Commande annulée par {{la}}.',
  tableau: { titre: 'Mon tableau de bord', enCours: 'Commandes en cours', livrees: 'Commandes livrées', total: 'Commandes passées', dernieres: 'Mes dernières commandes', passer: 'Passer une commande', toutes: 'Voir toutes mes commandes', aucune: 'Vous n’avez encore passé aucune commande. Commencez par votre premier bon de commande.' },
  tdb: { unites: 'Unités commandées', aTraiter: 'À traiter', clients: 'Clients', total6: 'Sur 6 mois', ceMois: 'Commandes du mois', moisPrecedent: 'Mois précédent', lignes: 'produits commandés ce mois', evolution: 'Évolution des commandes', evolutionSous: 'Nombre de commandes par mois', parMois: 'Unités par mois', parMoisSous: 'Quantités commandées', statuts: 'Répartition des statuts', auTotal: 'au total', produits: 'Produits les plus commandés', produitsSous: 'Quantités cumulées', topClients: 'Clients les plus actifs', topClientsSous: 'Nombre de commandes', recentes: 'Commandes récentes', voirTout: 'Tout voir', traiter: 'Traiter les commandes', videProduits: 'Aucun produit commandé pour l’instant.', videClients: 'Aucun client n’a encore commandé.', commandesMois: 'commandes ce mois', toutes: 'Toutes les commandes', videGraphique: 'Vos commandes apparaîtront ici.' },
}

const EN: MotsCommandes = {
  titre: 'My orders',
  phrase: 'Send a purchase order to {{the}} and follow its progress. No online payment: {{the}} processes each order and answers you here.',
  chargement: 'Loading…',
  refus: 'Orders are reserved for health facilities with an active account. Sign in from your client area.',
  pasOuvert: 'Orders are not open on this site yet.',
  nouvelle: 'New purchase order', produit: 'Product', quantite: 'Quantity', unite: 'Unit',
  unitePlaceholder: 'boxes, vials…', ajouterLigne: '+ Add a product', retirer: 'Remove',
  note: 'Details (optional)', notePlaceholder: 'Delivery place, urgency, contact…',
  envoyer: 'Send the order', envoi: 'Sending…', envoyee: 'Order sent. Reference:',
  suggestions: 'Pick from the catalogue or type the product name.',
  mesCommandes: 'My past orders', vide: 'You have not placed any order yet.',
  passeeLe: 'Placed on', majLe: 'updated on', reponse: 'Answer from {{the}}',
  etats: { recue: 'Received by {{the}}', en_cours: 'Being processed', validee: 'Approved', livree: 'Delivered', annulee: 'Cancelled' },
  etapes: { recue: 'Received', en_cours: 'Processing', validee: 'Approved', livree: 'Delivered' },
  annulee: 'Order cancelled by {{the}}.',
  tableau: { titre: 'My dashboard', enCours: 'Orders in progress', livrees: 'Delivered orders', total: 'Orders placed', dernieres: 'My latest orders', passer: 'Place an order', toutes: 'See all my orders', aucune: 'You have not placed any order yet. Start with your first purchase order.' },
  tdb: { unites: 'Units ordered', aTraiter: 'To process', clients: 'Clients', total6: 'Last 6 months', ceMois: 'Orders this month', moisPrecedent: 'Previous month', lignes: 'products ordered this month', evolution: 'Orders over time', evolutionSous: 'Orders per month', parMois: 'Units per month', parMoisSous: 'Quantities ordered', statuts: 'Status breakdown', auTotal: 'in total', produits: 'Most ordered products', produitsSous: 'Total quantities', topClients: 'Most active clients', topClientsSous: 'Number of orders', recentes: 'Recent orders', voirTout: 'See all', traiter: 'Process orders', videProduits: 'No product ordered yet.', videClients: 'No client has ordered yet.', commandesMois: 'orders this month', toutes: 'All orders', videGraphique: 'Your orders will appear here.' },
}

const AR: MotsCommandes = {
  titre: 'طلبياتي',
  phrase: 'أرسل طلب شراء إلى المركز وتابع حالته. لا دفع عبر الإنترنت: يعالج المركز كل طلبية ويجيبك هنا.',
  chargement: 'جارٍ التحميل…',
  refus: 'الطلبيات مخصّصة للمنشآت الصحية ذات الحساب النشط. سجّل الدخول من فضاء العميل.',
  pasOuvert: 'الطلبيات غير مفتوحة بعد على هذا الموقع.',
  nouvelle: 'طلب شراء جديد', produit: 'المنتج', quantite: 'الكمية', unite: 'الوحدة',
  unitePlaceholder: 'علب، قوارير…', ajouterLigne: '+ إضافة منتج', retirer: 'حذف',
  note: 'تفاصيل (اختياري)', notePlaceholder: 'مكان التسليم، الاستعجال، جهة الاتصال…',
  envoyer: 'إرسال الطلبية', envoi: 'جارٍ الإرسال…', envoyee: 'تم إرسال الطلبية. المرجع:',
  suggestions: 'اختر من الكتالوج أو اكتب اسم المنتج.',
  mesCommandes: 'طلبياتي السابقة', vide: 'لم تقدّم أي طلبية بعد.',
  passeeLe: 'بتاريخ', majLe: 'حُدّثت في', reponse: 'ردّ المركز',
  etats: { recue: 'استلمها المركز', en_cours: 'قيد المعالجة', validee: 'مقبولة', livree: 'مُسلَّمة', annulee: 'ملغاة' },
  etapes: { recue: 'مُستلمة', en_cours: 'قيد المعالجة', validee: 'مقبولة', livree: 'مُسلَّمة' },
  annulee: 'ألغى المركز هذه الطلبية.',
  tableau: { titre: 'لوحة القيادة', enCours: 'طلبيات قيد المعالجة', livrees: 'طلبيات مُسلَّمة', total: 'الطلبيات المقدّمة', dernieres: 'آخر طلبياتي', passer: 'تقديم طلبية', toutes: 'عرض كل طلبياتي', aucune: 'لم تقدّم أي طلبية بعد. ابدأ بأول طلب شراء.' },
  tdb: { unites: 'الوحدات المطلوبة', aTraiter: 'للمعالجة', clients: 'العملاء', total6: 'خلال 6 أشهر', ceMois: 'طلبيات هذا الشهر', moisPrecedent: 'الشهر السابق', lignes: 'منتجات مطلوبة هذا الشهر', evolution: 'تطور الطلبيات', evolutionSous: 'عدد الطلبيات شهرياً', parMois: 'الوحدات شهرياً', parMoisSous: 'الكميات المطلوبة', statuts: 'توزيع الحالات', auTotal: 'المجموع', produits: 'أكثر المنتجات طلباً', produitsSous: 'الكميات الإجمالية', topClients: 'أنشط العملاء', topClientsSous: 'عدد الطلبيات', recentes: 'آخر الطلبيات', voirTout: 'عرض الكل', traiter: 'معالجة الطلبيات', videProduits: 'لا منتجات مطلوبة بعد.', videClients: 'لم يطلب أي عميل بعد.', commandesMois: 'طلبيات هذا الشهر', toutes: 'كل الطلبيات', videGraphique: 'ستظهر طلبياتك هنا.' },
}

const ES: MotsCommandes = {
  titre: 'Mis pedidos',
  phrase: 'Envíe una orden de compra {{a}} y siga su estado. Sin pago en línea: {{la}} tramita cada pedido y le responde aquí.',
  chargement: 'Cargando…',
  refus: 'Los pedidos están reservados a los establecimientos sanitarios con cuenta activa. Inicie sesión desde su espacio de cliente.',
  pasOuvert: 'Los pedidos aún no están abiertos en este sitio.',
  nouvelle: 'Nueva orden de compra', produit: 'Producto', quantite: 'Cantidad', unite: 'Unidad',
  unitePlaceholder: 'cajas, frascos…', ajouterLigne: '+ Añadir un producto', retirer: 'Quitar',
  note: 'Precisiones (opcional)', notePlaceholder: 'Lugar de entrega, urgencia, contacto…',
  envoyer: 'Enviar el pedido', envoi: 'Enviando…', envoyee: 'Pedido enviado. Referencia:',
  suggestions: 'Elija en el catálogo o escriba el nombre del producto.',
  mesCommandes: 'Mis pedidos anteriores', vide: 'Todavía no ha realizado ningún pedido.',
  passeeLe: 'Realizado el', majLe: 'actualizado el', reponse: 'Respuesta {{de}}',
  etats: { recue: 'Recibido por {{la}}', en_cours: 'En tramitación', validee: 'Validado', livree: 'Entregado', annulee: 'Anulado' },
  etapes: { recue: 'Recibido', en_cours: 'En curso', validee: 'Validado', livree: 'Entregado' },
  annulee: 'Pedido anulado por {{la}}.',
  tableau: { titre: 'Mi panel', enCours: 'Pedidos en curso', livrees: 'Pedidos entregados', total: 'Pedidos realizados', dernieres: 'Mis últimos pedidos', passer: 'Realizar un pedido', toutes: 'Ver todos mis pedidos', aucune: 'Todavía no ha realizado ningún pedido. Empiece por su primera orden de compra.' },
  tdb: { unites: 'Unidades pedidas', aTraiter: 'Por tramitar', clients: 'Clientes', total6: 'En 6 meses', ceMois: 'Pedidos del mes', moisPrecedent: 'Mes anterior', lignes: 'productos pedidos este mes', evolution: 'Evolución de los pedidos', evolutionSous: 'Pedidos por mes', parMois: 'Unidades por mes', parMoisSous: 'Cantidades pedidas', statuts: 'Distribución de estados', auTotal: 'en total', produits: 'Productos más pedidos', produitsSous: 'Cantidades acumuladas', topClients: 'Clientes más activos', topClientsSous: 'Número de pedidos', recentes: 'Pedidos recientes', voirTout: 'Ver todo', traiter: 'Tramitar los pedidos', videProduits: 'Ningún producto pedido todavía.', videClients: 'Ningún cliente ha pedido todavía.', commandesMois: 'pedidos este mes', toutes: 'Todos los pedidos', videGraphique: 'Sus pedidos aparecerán aquí.' },
}

function motsCommandesBrut(lang: string | null | undefined): MotsCommandes {
  const l = (lang ?? 'fr').slice(0, 2).toLowerCase()
  return l === 'en' ? EN : l === 'ar' ? AR : l === 'es' ? ES : FR
}

/**
 * Les mots, avec le nom de l'institution DU SITE (lot 2 « textes neutres »,
 * 2026-11-26) : les jetons {{la}}, {{de}}… deviennent « la Centrale » pour la
 * CPA, la désignation du site ailleurs. Voir `@/lib/sites/institution`.
 */
export function motsCommandes(lang: string | null | undefined, inst: Institution): ReturnType<typeof motsCommandesBrut> {
  return accorder(motsCommandesBrut(lang), inst)
}
