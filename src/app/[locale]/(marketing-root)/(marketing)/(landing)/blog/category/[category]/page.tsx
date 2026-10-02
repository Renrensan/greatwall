import Link from "next/link";
import Image from "next/image";

import { Icon } from "@iconify/react";
import { getMediumPosts } from "@/lib/blog";
import VideoBgFixed from "@/marketing-components/VideoBgFixed";


export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  const posts = await getMediumPosts();


  const filteredPosts = posts.filter(
    (post: any) =>
      post.categories.some(
        (cat: string) => cat.toLowerCase() === category.toLowerCase()
      ) || post.category.toLowerCase() === category.toLowerCase()
  );

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 max-w-7xl mx-auto relative overflow-hidden">
      <VideoBgFixed/>
      <div className="relative z-10">
        <Link
          href={`/${locale}/blog`}
          className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-12 group"
        >
          <div className="w-8 h-8 rounded-full border border-foreground/10 flex items-center justify-center mr-3 group-hover:border-primary/50 transition-colors">
            <Icon icon="ph:arrow-left-bold" className="w-4 h-4" />
          </div>
          Kembali ke Blog
        </Link>


        <div className="mb-16">
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            Kategori:{" "}
            <span className="capitalize text-primary">{category}</span>
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl">
            Menjelajahi artikel-artikel terbaik dalam kategori{" "}
            <span className="text-foreground font-semibold">{category}</span>.
          </p>
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post: any) => (
              <a
                key={post.id}
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-3xl overflow-hidden glass-card hover:translate-y-[-8px] transition-all duration-500 border-white/10"
              >
                <div className="relative h-60 w-full overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="p-8">
                  <span className="text-xs font-medium text-muted-foreground mb-3 block uppercase tracking-wider">
                    {post.date}
                  </span>
                  <h3 className="text-2xl font-bold mb-3 leading-tight group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                    {post.description}
                  </p>
                </div>
              </a>
            ))
          ) : (
            <div className="col-span-full py-32 text-center glass-card rounded-[2.5rem] border-white/10">
              <h1 className="text-6xl mb-6">📂</h1>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Belum ada artikel
              </h3>
              <p className="text-muted-foreground">
                Kami sedang menyiapkan konten menarik untuk kategori ini.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
