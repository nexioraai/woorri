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
}

const FR: MotsCommandes = {
  titre: 'Mes commandes',
  phrase: 'Passez un bon de commande à la Centrale et suivez où il en est. Aucun paiement en ligne : la Centrale traite chaque commande et vous répond ici.',
  chargement: 'Chargement…',
  refus: 'Les commandes sont réservées aux structures sanitaires dont le compte est actif. Connectez-vous depuis votre espace client.',
  pasOuvert: 'Les commandes ne sont pas encore ouvertes sur ce site.',
  nouvelle: 'Nouveau bon de commande', produit: 'Produit', quantite: 'Quantité', unite: 'Unité',
  unitePlaceholder: 'boîtes, flacons…', ajouterLigne: '+ Ajouter un produit', retirer: 'Retirer',
  note: 'Précisions (facultatif)', notePlaceholder: 'Lieu de livraison, urgence, contact…',
  envoyer: 'Envoyer la commande', envoi: 'Envoi…', envoyee: 'Commande envoyée. Référence :',
  suggestions: 'Choisissez dans le catalogue ou écrivez le nom du produit.',
  mesCommandes: 'Mes commandes passées', vide: 'Vous n’avez encore passé aucune commande.',
  passeeLe: 'Passée le', majLe: 'mise à jour le', reponse: 'Réponse de la Centrale',
  etats: { recue: 'Reçue par la Centrale', en_cours: 'En cours de traitement', validee: 'Validée', livree: 'Livrée', annulee: 'Annulée' },
}

const EN: MotsCommandes = {
  titre: 'My orders',
  phrase: 'Send a purchase order to the Centrale and follow its progress. No online payment: the Centrale processes each order and answers you here.',
  chargement: 'Loading…',
  refus: 'Orders are reserved for health facilities with an active account. Sign in from your client area.',
  pasOuvert: 'Orders are not open on this site yet.',
  nouvelle: 'New purchase order', produit: 'Product', quantite: 'Quantity', unite: 'Unit',
  unitePlaceholder: 'boxes, vials…', ajouterLigne: '+ Add a product', retirer: 'Remove',
  note: 'Details (optional)', notePlaceholder: 'Delivery place, urgency, contact…',
  envoyer: 'Send the order', envoi: 'Sending…', envoyee: 'Order sent. Reference:',
  suggestions: 'Pick from the catalogue or type the product name.',
  mesCommandes: 'My past orders', vide: 'You have not placed any order yet.',
  passeeLe: 'Placed on', majLe: 'updated on', reponse: 'Answer from the Centrale',
  etats: { recue: 'Received by the Centrale', en_cours: 'Being processed', validee: 'Approved', livree: 'Delivered', annulee: 'Cancelled' },
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
}

const ES: MotsCommandes = {
  titre: 'Mis pedidos',
  phrase: 'Envíe una orden de compra a la Central y siga su estado. Sin pago en línea: la Central tramita cada pedido y le responde aquí.',
  chargement: 'Cargando…',
  refus: 'Los pedidos están reservados a los establecimientos sanitarios con cuenta activa. Inicie sesión desde su espacio de cliente.',
  pasOuvert: 'Los pedidos aún no están abiertos en este sitio.',
  nouvelle: 'Nueva orden de compra', produit: 'Producto', quantite: 'Cantidad', unite: 'Unidad',
  unitePlaceholder: 'cajas, frascos…', ajouterLigne: '+ Añadir un producto', retirer: 'Quitar',
  note: 'Precisiones (opcional)', notePlaceholder: 'Lugar de entrega, urgencia, contacto…',
  envoyer: 'Enviar el pedido', envoi: 'Enviando…', envoyee: 'Pedido enviado. Referencia:',
  suggestions: 'Elija en el catálogo o escriba el nombre del producto.',
  mesCommandes: 'Mis pedidos anteriores', vide: 'Todavía no ha realizado ningún pedido.',
  passeeLe: 'Realizado el', majLe: 'actualizado el', reponse: 'Respuesta de la Central',
  etats: { recue: 'Recibido por la Central', en_cours: 'En tramitación', validee: 'Validado', livree: 'Entregado', annulee: 'Anulado' },
}

export function motsCommandes(lang: string | null | undefined): MotsCommandes {
  const l = (lang ?? 'fr').slice(0, 2).toLowerCase()
  return l === 'en' ? EN : l === 'ar' ? AR : l === 'es' ? ES : FR
}
