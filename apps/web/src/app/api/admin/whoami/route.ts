import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAnon } from '@/lib/supabase';
import { estAdmin } from '@/lib/admin-emails';

// ============================================================
// « SUIS-JE ADMINISTRATEUR ? » — LA SEULE RÉPONSE EST OUI OU NON.
//
// ── LE DÉFAUT QU'ELLE FERME, mesuré le 2026-10-02 dans le bundle livré.
//
// `Sidebar.tsx` est un composant CLIENT, et il décidait d'afficher le lien
// vers l'administration en comparant l'adresse connectée à une adresse écrite
// EN CLAIR dans le code. Résultat : l'adresse personnelle du propriétaire
// partait dans le JavaScript de CHAQUE visiteur — retrouvée dans dix fichiers
// du bundle.
//
// CE QUE ÇA DONNAIT À UN ATTAQUANT : pas un accès — les six routes
// d'administration vérifient l'autorisation côté serveur et répondent 403.
// Mais la CIBLE : savoir quel compte précis possède la plateforme, c'est
// l'ingrédient qui manque à un hameçonnage réussi.
//
// ── POURQUOI UNE ROUTE PLUTÔT QU'UNE AUTRE ASTUCE.
//
// Masquer l'adresse (hachage, variable d'environnement publique) n'aurait rien
// fermé : ce qui part au navigateur est public, par définition. La seule
// réponse honnête est de NE PAS l'envoyer et de laisser le serveur trancher.
//
// Cette route ne rend donc qu'un booléen. Elle ne dit pas qui est
// administrateur, ni combien ils sont : elle répond à la question « moi, avec
// CE jeton, est-ce que j'en suis un ? ».
// ============================================================

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
  if (!token) return NextResponse.json({ admin: false });

  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  // Un jeton illisible n'est pas une erreur à signaler : c'est simplement
  // quelqu'un qui n'est pas administrateur. On ne donne aucun indice de plus.
  if (error || !user?.email) return NextResponse.json({ admin: false });

  return NextResponse.json({ admin: estAdmin(user.email) });
}
