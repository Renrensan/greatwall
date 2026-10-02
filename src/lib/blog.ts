export interface MediumPost {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  categories: string[];
  slug: string;
  date: string;
  image: string;
  link: string;
}

export async function getMediumPosts(): Promise<MediumPost[]> {
  try {
    const res = await fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=https://medium.com/feed/@paradapp",
      {
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();

    return data.items.map((item: any) => {
      const imgMatches = Array.from(
        item.description.matchAll(/<img[^>]+src="([^">]+)"/g)
      );
      let thumbnail =
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800";

      for (const match of imgMatches) {
        const src = (match as any)[1];
        if (!src.includes("stat?event") && !src.includes("/_/stat")) {
          thumbnail = src;
          break;
        }
      }

      const urlMatch = item.link.split("?")[0].split("/");
      const slug = urlMatch[urlMatch.length - 1] || item.guid.split("/").pop();

      return {
        id: item.guid,
        title: item.title,
        description:
          item.description
            .replace(/<[^>]*>?/gm, "")
            .substring(0, 150)
            .replace(/&nbsp;/g, " ")
            .trim() + "...",
        content: item.content || item.description,
        category: item.categories[0] || "Blog",
        categories: item.categories,
        slug: slug,
        date: new Date(item.pubDate).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        image: thumbnail,
        link: item.link,
      };
    });
  } catch (error) {
    console.error("Error in getMediumPosts:", error);
    return [];
  }
}
