import type { MotsFil } from './FilMessages'
import { accorder, type Institution } from '@/lib/sites/institution'

// LES MOTS DU FIL DE MESSAGES ET DE LA PAGE « CLIENTS » (CPA, 2026-11-19).
export type MotsMessages = {
  titre: string; phrase: string; fil: MotsFil
  clients: { titre: string; phrase: string; recherche: string; tous: string; sante: string; ong: string; aucun: string; choisir: string
    onglets: { messages: string; commandes: string; infos: string }; suspendre: string; reactiver: string; actif: string; suspendu: string
    inscritLe: string; pasDeCommande: string; filCentrale: string; santeUn: string }
}

const FR: MotsMessages = {
  titre: 'Messages', phrase: 'Échangez directement avec {{la}}.',
  fil: { vide: 'Aucun message pour l’instant. Écrivez le premier !', placeholder: 'Écrire un message…', envoyer: 'Envoyer', ferme: 'La messagerie n’est pas encore ouverte sur ce site.', moi: 'Vous', eux: '{{nu}}', lu: 'lu' },
  clients: { titre: 'Clients', phrase: 'Tous les clients {{de}} : leurs messages, leurs commandes, leur compte.', recherche: 'Rechercher un client…', tous: 'Tous', sante: 'Structures sanitaires', ong: 'ONG', aucun: 'Aucun client ne correspond.', choisir: 'Choisissez un client pour voir vos échanges.',
    onglets: { messages: 'Messages', commandes: 'Commandes', infos: 'Infos' }, suspendre: 'Suspendre le compte', reactiver: 'Réactiver le compte', actif: 'Actif', suspendu: 'Suspendu', inscritLe: 'Inscrit le', pasDeCommande: 'Aucune commande.', filCentrale: '{{nu}}', santeUn: 'Structure sanitaire' },
}
const EN: MotsMessages = {
  titre: 'Messages', phrase: 'Talk directly with {{the}}.',
  fil: { vide: 'No message yet. Write the first one!', placeholder: 'Write a message…', envoyer: 'Send', ferme: 'Messaging is not open on this site yet.', moi: 'You', eux: '{{nu}}', lu: 'read' },
  clients: { titre: 'Clients', phrase: 'All {{the}}’s clients: their messages, orders and account.', recherche: 'Search a client…', tous: 'All', sante: 'Health facilities', ong: 'NGOs', aucun: 'No matching client.', choisir: 'Choose a client to see your conversation.',
    onglets: { messages: 'Messages', commandes: 'Orders', infos: 'Details' }, suspendre: 'Suspend account', reactiver: 'Reactivate account', actif: 'Active', suspendu: 'Suspended', inscritLe: 'Registered on', pasDeCommande: 'No order.', filCentrale: '{{nu}}', santeUn: 'Health facility' },
}
const AR: MotsMessages = {
  titre: 'الرسائل', phrase: 'تواصل مباشرة مع المركز.',
  fil: { vide: 'لا رسائل بعد. اكتب الرسالة الأولى!', placeholder: 'اكتب رسالة…', envoyer: 'إرسال', ferme: 'المراسلة غير مفتوحة بعد على هذا الموقع.', moi: 'أنت', eux: 'المركز', lu: 'مقروءة' },
  clients: { titre: 'العملاء', phrase: 'كل عملاء المركز: رسائلهم وطلبياتهم وحساباتهم.', recherche: 'ابحث عن عميل…', tous: 'الكل', sante: 'المنشآت الصحية', ong: 'المنظمات', aucun: 'لا يوجد عميل مطابق.', choisir: 'اختر عميلاً لرؤية المراسلات.',
    onglets: { messages: 'الرسائل', commandes: 'الطلبيات', infos: 'المعلومات' }, suspendre: 'تعليق الحساب', reactiver: 'إعادة تفعيل الحساب', actif: 'نشط', suspendu: 'معلّق', inscritLe: 'مسجّل منذ', pasDeCommande: 'لا طلبيات.', filCentrale: '{{al}}', santeUn: 'منشأة صحية' },
}
const ES: MotsMessages = {
  titre: 'Mensajes', phrase: 'Hable directamente con {{la}}.',
  fil: { vide: 'Todavía no hay mensajes. ¡Escriba el primero!', placeholder: 'Escribir un mensaje…', envoyer: 'Enviar', ferme: 'La mensajería aún no está abierta en este sitio.', moi: 'Usted', eux: '{{nu}}', lu: 'leído' },
  clients: { titre: 'Clientes', phrase: 'Todos los clientes {{de}}: sus mensajes, pedidos y cuenta.', recherche: 'Buscar un cliente…', tous: 'Todos', sante: 'Centros sanitarios', ong: 'ONG', aucun: 'Ningún cliente coincide.', choisir: 'Elija un cliente para ver sus intercambios.',
    onglets: { messages: 'Mensajes', commandes: 'Pedidos', infos: 'Datos' }, suspendre: 'Suspender la cuenta', reactiver: 'Reactivar la cuenta', actif: 'Activa', suspendu: 'Suspendida', inscritLe: 'Registrado el', pasDeCommande: 'Ningún pedido.', filCentrale: '{{nu}}', santeUn: 'Centro sanitario' },
}

function motsMessagesBrut(lang: string | null | undefined): MotsMessages {
  const l = (lang ?? 'fr').slice(0, 2).toLowerCase()
  return l === 'en' ? EN : l === 'ar' ? AR : l === 'es' ? ES : FR
}

/**
 * Les mots, avec le nom de l'institution DU SITE (lot 2 « textes neutres »,
 * 2026-11-26) : les jetons {{la}}, {{de}}… deviennent « la Centrale » pour la
 * CPA, la désignation du site ailleurs. Voir `@/lib/sites/institution`.
 */
export function motsMessages(lang: string | null | undefined, inst: Institution): ReturnType<typeof motsMessagesBrut> {
  return accorder(motsMessagesBrut(lang), inst)
}
