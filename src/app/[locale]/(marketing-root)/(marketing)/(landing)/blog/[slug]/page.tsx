import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { logos } from "@/index";

import { BLOG_POSTS } from "@/constants/blog";

export default async function SingleBlogPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  const defaultContent = `
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    <h2>Mulai Perjalanan Web3 Kamu</h2>
    <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
    <div class="my-8 p-6 glass-card rounded-2xl border-l-4 border-l-primary quotes">
      <p class="italic text-xl text-foreground font-medium">"Masa depan internet adalah tentang desentralisasi dan kepemilikan data."</p>
    </div>
    <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.</p>
  `;

  // In real app, you would fetch blog data by slug
  const matchedPost = BLOG_POSTS.find((p) => p.slug === slug);
  const post = matchedPost
    ? {
        ...matchedPost,
        content: (matchedPost as any).content || defaultContent,
      }
    : {
        id: 0,
        title: slug
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        description: "Panduan lengkap seputar Web3.",
        category: "Tutorial",
        date: "7 Maret 2026",
        image:
          "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=1200",
        content: defaultContent,
      };

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Back Link */}
        <Link
          href={`/${locale}/blog`}
          className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-12 group"
        >
          <div className="w-8 h-8 rounded-full border border-foreground/10 flex items-center justify-center mr-3 group-hover:border-primary/50 transition-colors">
            <Icon icon="ph:arrow-left-bold" className="w-4 h-4" />
          </div>
          Kembali ke Blog
        </Link>

        {/* Article Header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-8 text-sm">
            <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full font-bold uppercase tracking-wider">
              {post.category}
            </span>
            <span className="text-muted-foreground font-medium">
              {post.date}
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-10 leading-[1.1] tracking-tight">
            {post.title}
          </h1>
          <div className="relative w-full h-[450px] md:h-[600px] rounded-[2.5rem] overflow-hidden shadow-2xl">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        <article className="prose prose-lg dark:prose-invert max-w-none">
          <div
            dangerouslySetInnerHTML={{
              __html: (post as any).content,
            }}
            className="flex flex-col gap-8 text-muted-foreground text-xl leading-relaxed"
          />
        </article>


        <div className="mt-20 p-8 md:p-10 rounded-[2.5rem] glass-card flex flex-col md:flex-row items-center gap-8 border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 blur-[80px] -z-10" />

          <div className="shrink-0 w-28 h-28 rounded-full  border-white/20 p-0 shadow-2xl flex items-center justify-center overflow-hidden bg-background/20">
            <Image
              src={logos}
              alt="Paradapp"
              className="w-full h-auto object-contain"
            />
          </div>

          <div className="text-center md:text-left flex-1">
            <div className="mb-2 flex flex-wrap justify-center md:justify-start gap-2">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary/80 bg-primary/5 px-2 py-1 rounded-md">
                Official Team
              </span>
            </div>
            <h4 className="font-black text-2xl text-foreground mb-3 tracking-tight">
              Paradapp Team
            </h4>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
              Tim ahli di balik Paradapp yang berdedikasi untuk memberikan
              edukasi dan solusi terbaik di ekosistem Web3. Kami berkomitmen
              membangun jembatan pengetahuan untuk semua.
            </p>
          </div>
        </div>


        <div className="mt-32">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-black tracking-tight">
              Postingan Terkait
            </h2>
            <Link
              href={`/${locale}/blog`}
              className="text-primary font-bold hover:underline underline-offset-4"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {relatedPosts.map((post) => (
              <Link
                key={post.id}
                href={`/${locale}/blog/${post.slug}`}
                className="group block rounded-3xl overflow-hidden glass-card hover:translate-y-[-8px] transition-all duration-500 border-white/10"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4 px-4 py-1.5 bg-background/60 backdrop-blur-md border border-white/10 text-foreground text-xs font-bold rounded-full">
                    {post.category}
                  </div>
                </div>
                <div className="p-6">
                  <span className="text-[10px] font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
                    {post.date}
                  </span>
                  <h3 className="text-xl font-bold mb-3 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <div className="mt-4 flex items-center text-primary font-bold text-xs">
                    Baca Selengkapnya
                    <svg
                      className="w-3 h-3 ml-2 group-hover:translate-x-2 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
