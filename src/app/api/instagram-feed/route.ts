import { NextResponse } from "next/server";

// Uses Meta's "Business Discovery" Graph API field — this lets OUR OWN Instagram Business
// account look up the recent public media of any other public Business/Creator account
// (here, @cryptosiastbali) without needing that account's cooperation or access token. The
// only requirement is that Paradapp has its own connected IG Business account + token, and
// that the target account is public and set to Business/Creator (not a personal profile).
// Free — Meta doesn't charge for this. No token configured, or the target isn't a
// discoverable business account -> empty list, and the page falls back to its static grid.
const ACCESS_TOKEN = process.env.PARADAPP_IG_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.PARADAPP_IG_BUSINESS_ACCOUNT_ID;
const TARGET_USERNAME = "cryptosiastbali";
const GRAPH_API_VERSION = "v21.0";

export async function GET() {
  if (!ACCESS_TOKEN || !IG_BUSINESS_ACCOUNT_ID) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const mediaFields =
      "media.limit(6){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp}";
    const fields = `business_discovery.username(${TARGET_USERNAME}){${mediaFields}}`;

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${IG_BUSINESS_ACCOUNT_ID}?fields=${encodeURIComponent(fields)}&access_token=${ACCESS_TOKEN}`,
      // Revalidate hourly so the gallery stays fresh without hitting Meta on every page view.
      { next: { revalidate: 3600 } },
    );

    if (!res.ok) {
      console.error("Instagram Business Discovery error:", res.status, await res.text());
      return NextResponse.json({ posts: [] });
    }

    const data = await res.json();
    const media = data.business_discovery?.media?.data || [];
    const posts = media
      .filter((post: any) => post.media_type !== "VIDEO" || post.thumbnail_url)
      .map((post: any) => ({
        id: post.id,
        caption: post.caption || "",
        permalink: post.permalink,
        image: post.media_type === "VIDEO" ? post.thumbnail_url : post.media_url,
      }));

    return NextResponse.json({ posts });
  } catch (err) {
    console.error("Failed to fetch Instagram feed:", err);
    return NextResponse.json({ posts: [] });
  }
}
