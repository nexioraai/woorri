import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { metadataPublique } from "@/lib/seo/metadata";

export const revalidate = 3600;

export const metadata: Metadata = metadataPublique("/blog");

// ── POURQUOI CE CACHE EXISTE, ET CE QU'IL RÉPARE PRÉCISÉMENT.
//
// Le layout racine lit désormais un en-tête (langue du site marchand servi),
// ce qui rend TOUTE la plateforme dynamique — `revalidate` ci-dessus ne met
// donc plus la ROUTE en cache. Les autres pages perdues n'ont aucune
// entrée-sortie : les rendre à la demande revient à assembler du JSX. Celle-ci
// interroge la base, et passerait sans cela d'une requête par HEURE à une
// requête par VISITE.
//
// `unstable_cache` rétablit exactement ce que `revalidate` assurait : la
// DONNÉE est mise en cache une heure, quel que soit le mode de rendu.
const articlesEnCache = unstable_cache(
  async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("title, slug, cover_image, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false });
    return data ?? [];
  },
  ["blog-articles-publies"],
  { revalidate: 3600, tags: ["blog"] },
);

export default async function BlogPage() {
  const posts = await articlesEnCache();

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-8">Blog</h1>
      <div className="space-y-8">
        {posts?.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
            <h2 className="text-xl font-semibold group-hover:underline">{post.title}</h2>
            <p className="text-sm text-gray-400">
              {new Date(post.created_at).toLocaleDateString("fr-CA")}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
