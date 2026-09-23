import { canTransact } from '@/lib/commerce-admission/canTransact';
import { consommerJeton } from '@/lib/rate-limit/rateLimit';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { nettoyerPourImpression } from '@/lib/images/traitement';
import { randomUUID } from 'crypto';

// LOT J (Mode 3 global, F-CUSTOM-01/F-CUSTOM-04) :
//
// 1. SVG retire des types autorises -- un SVG peut embarquer un <script>
//    executable si l'URL publique est un jour ouverte directement (pas via
//    <img>, qui neutralise le scripting SVG dans tous les navigateurs
//    modernes, mais via une navigation directe ou un <object>/<embed> futur).
//    Aucun rendu direct de design_url n'existe aujourd'hui dans l'app (verifie
//    par recherche exhaustive), mais accepter un type de fichier capable
//    d'executer du code pour un usage qui n'en a jamais eu besoin (impression
//    d'image) est un risque sans contrepartie.
//
// 2. `slug` desormais obligatoire : lie chaque upload a un site reel des la
//    creation (design_uploads.site_id), condition necessaire pour que
//    checkout/route.ts puisse verifier l'appartenance tenant (site_id) avant
//    d'accepter un design a la commande -- cause racine de F-CUSTOM-01
//    (checkout faisait jusqu'ici confiance a l'URL du client sans aucune
//    verification d'origine, cf. design_uploads.sql).
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const slug = formData.get('slug');
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (typeof slug !== 'string' || !slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

    // ============================================================
    // LOT 5 / P5-01 -- CETTE ROUTE REFUSAIT TOUT LE MONDE.
    //
    // La projection ne demandait que `id`, et la garde juste en dessous lit
    // `site.mode`. PostgREST ne renvoie QUE les colonnes demandees : `mode`
    // valait donc toujours `undefined`, et `canTransact` -- allowlist
    // POSITIVE, correcte -- rendait `false`. Resultat : 403 « Ce site est une
    // vitrine » pour un site Mode 3 parfaitement legitime, donc TOUTE la
    // chaine de design de `pod_custom` etait morte. Corrobore par la
    // production : `design_uploads` compte 0 ligne dans toute la base.
    //
    // LE TEST NE POUVAIT PAS LE VOIR : son harnais faisait `b.select = () => b`,
    // ignorait la liste de colonnes et rendait `{ id, mode: 2 }`. Un mock plus
    // permissif que le vrai systeme -- il est corrige avec ce lot.
    //
    // `canTransact` n'est PAS modifiee : l'autorite etait juste, c'est son
    // appelant qui ne lui donnait pas la donnee.
    // ============================================================
    const { data: site } = await supabaseAdmin
      .from('sites')
      .select('id, mode')
      .eq('slug', slug)
      .is('archived_at', null)
      .maybeSingle();
    if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 });

    // M1-5 — un design televerse n'existe que pour etre imprime sur un produit
    // vendu : c'est un artefact du parcours commercial, pas un media de
    // vitrine. Garde posee avant tout stockage et toute ecriture.
    if (!canTransact((site as { mode?: unknown }).mode)) {
      return NextResponse.json(
        { error: 'Ce site est une vitrine : il ne peut pas exercer d’activité commerciale.' },
        { status: 403 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });

    // ============================================================
    // AUDIT GLOBAL — LA SEULE ECRITURE NON AUTHENTIFIEE ET NON BORNEE.
    //
    // Recensement des 68 routes : deux seulement ecrivent sans identite --
    // `contact`, qui est borne depuis M1-02, et celle-ci, qui ne l'etait pas.
    // Or elle ecrit DEUX fois : une ligne `design_uploads` ET un objet de
    // 10 Mo dans le bucket. Un visiteur anonyme disposant d'un slug public
    // (trivialement enumerable) pouvait donc faire croitre le storage sans
    // aucune borne, pour le compte d'un marchand tiers.
    //
    // `canTransact` juste au-dessus repond « ce site vend-il ? », jamais
    // « combien de fois ». La borne se pose APRES les controles gratuits
    // (taille, type MIME) et AVANT toute ecriture -- un fichier refuse pour
    // son type ne consomme aucun jeton.
    //
    // Meme autorite et meme direction de panne que les six autres surfaces
    // bornees : le compteur qui ne repond pas REFUSE.
    // ============================================================
    const jeton = await consommerJeton({
      type: 'design_upload_request',
      siteId: (site as { id: string }).id,
      fenetreMs: 60_000,
      plafond: 10,
      message: 'Trop de televersements, reessayez dans une minute.',
      details: { slug },
    });
    if (!jeton.ok) return NextResponse.json({ error: jeton.erreur }, { status: jeton.statut });

    // ============================================================
    // MEME DEFAUT QUE L ENVOI DES PHOTOS PRODUIT, AUTRE PARCOURS.
    //
    // Cette route deposait le fichier BRUT. Les metadonnees partaient donc
    // avec lui -- dont les coordonnees GPS du lieu de prise de vue quand le
    // design est une photo prise au telephone. Ces fichiers sont deposes dans
    // un seau PUBLIC (`getPublicUrl` juste en dessous) : la position etait
    // lisible par quiconque obtenait l URL.
    //
    // ET IL EST PIRE ICI QUE SUR UNE PHOTO DE VITRINE, sur un point :
    // l orientation EXIF n etait pas appliquee non plus. Un design envoye
    // depuis un telephone partait COUCHE chez l imprimeur, et personne ne s en
    // apercevait avant la livraison du vetement.
    //
    // CE QUI SURVIT, PARCE QUE C EST UN FICHIER D IMPRESSION ET NON UNE
    // VIGNETTE : le format d entree (un PNG transparent reste transparent),
    // la definition (aucun redimensionnement), et le profil colorimetrique
    // (sans lui les couleurs derivent a l impression). Voir
    // `nettoyerPourImpression`.
    // ============================================================
    const brut = Buffer.from(await file.arrayBuffer());
    let buffer: Buffer = brut;
    let typeStocke: string = file.type;
    let exifRetire = false;
    try {
      const propre = await nettoyerPourImpression(brut);
      buffer = propre.donnees;
      typeStocke = propre.type;
      exifRetire = propre.exifRetire;
    } catch {
      // Un fichier illisible par le decodeur : on REFUSE plutot que de
      // deposer un binaire non verifie dans un seau public. Le controle de
      // type MIME plus haut se fie a ce que declare le navigateur ; celui-ci
      // se fie a ce que le fichier EST.
      return NextResponse.json({ error: 'Fichier illisible comme image.' }, { status: 415 });
    }

    // L extension suit le format REELLEMENT stocke, jamais celle du nom
    // d origine : un fichier nomme `.jpg` mais encode en PNG sortait avec la
    // mauvaise extension, et certains imprimeurs s y fient.
    const ext = typeStocke === 'image/png' ? 'png' : typeStocke === 'image/webp' ? 'webp' : 'jpg';
    const path = `${randomUUID()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from('custom-designs')
      .upload(path, buffer, { contentType: typeStocke, upsert: false });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('custom-designs')
      .getPublicUrl(path);

    const { error: designError } = await supabaseAdmin.from('design_uploads').insert({
      site_id: site.id,
      storage_path: path,
      public_url: urlData.publicUrl,
      // Le type REELLEMENT stocke, pas celui declare par le navigateur : c est
      // lui que liront le checkout et l imprimeur.
      mime_type: typeStocke,
    });
    if (designError) {
      // Le fichier est deja dans le bucket mais sans reference tracee --
      // checkout/route.ts rejettera cette URL (aucune ligne design_uploads
      // correspondante), comportement sur, pas un faux-positif de securite.
      // Signale pour intervention (bucket contient un fichier orphelin).
      console.error('design_uploads insert error:', designError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // `metadonneesRetirees` est une PREUVE, pas une promesse : il dit que ce
    // fichier PORTAIT de l'EXIF et qu'il n'en porte plus. L'interface peut
    // alors le signaler au marchand, au lieu de nettoyer en silence.
    return NextResponse.json({ url: urlData.publicUrl, metadonneesRetirees: exifRetire });
  } catch (e: any) {
    console.error('upload-design error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
