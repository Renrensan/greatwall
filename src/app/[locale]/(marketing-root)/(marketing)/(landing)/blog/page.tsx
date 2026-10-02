import Image from "next/image";
import { getMediumPosts } from "@/lib/blog";

// const CATEGORIES = ["All", "Tutorial", "News", "Market", "Community"];

const BLOG_CONTENT: any = {
  id: {
    title: "Paradapp Blog",
    description:
      "Temukan info terbaru, tips, dan update seputar dunia Web3 langsung dari tim Paradapp.",
    readMore: "Baca di Medium",
  },
  en: {
    title: "Paradapp Blog",
    description:
      "Discover the latest info, tips, and updates about the Web3 world directly from the Paradapp team.",
    readMore: "Read on Medium",
  },
};

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = BLOG_CONTENT[locale] || BLOG_CONTENT.en;
  const posts = await getMediumPosts();

  return (
    <main className="min-h-screen pt-32 pb-20 px-4 max-w-7xl mx-auto relative overflow-hidden">
      {/* Header Section */}
      <div className="text-center mb-16 relative z-10">
        <h1 className="text-5xl md:text-7xl font-black mb-6 bg-linear-to-b from-foreground to-foreground/50 bg-clip-text text-current">
          {t.title}
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {t.description}
        </p>
      </div>

      <hr className="border-none h-10" />
      {/* Categories Filter */}
      {/* <div className="flex flex-wrap justify-center gap-3 mb-12 relative z-10">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={
              cat === "All"
                ? `/${locale}/blog`
                : `/${locale}/blog/category/${cat.toLowerCase()}`
            }
            className="px-6 py-2 rounded-full border border-foreground/10 hover:border-primary/50 hover:bg-primary/5 transition-all bg-background/40 backdrop-blur-xl"
          >
            {cat}
          </Link>
        ))}
      </div> */}

      {/* Blog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
        {posts.map((post) => (
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
              <div className="absolute top-4 left-4 px-4 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-bold rounded-full shadow-sm">
                {post.category}
              </div>
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
              <div className="mt-6 flex items-center text-primary font-bold text-sm">
                {t.readMore}
                <svg
                  className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform"
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
          </a>
        ))}
      </div>
    </main>
  );
}
