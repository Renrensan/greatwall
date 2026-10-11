import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import {routing} from './i18n/routing';

const intl = createMiddleware(routing);
const MARK = "x-greatwall-index";

// Indexes have their own addresses; the pages behind them are the "beta"
// app's (src/app/[locale]/[network]/[app]/…), kept as they are:
//   /{locale}/{network}/index            the indexes (Explore)
//   /{locale}/{network}/index/create     create one
//   /{locale}/{network}/index/{id}       one index
// The old addresses (/beta/explore, /beta/create, /beta/transaction/{id},
// /beta/baskets) redirect to these, so links already shared keep working.
const INDEX = /^\/en\/([a-z]+)\/index(?:\/([^/]+))?\/?$/;
const LOCK = /^\/en\/([a-z]+)\/(lock|unlock)(?:\/(history|transaction\/[^/]+))?\/?$/;
const OLD_BRIDGE = /^\/en\/([a-z]+)\/bridge(?:\/(lock|unlock|send|history|transaction\/[^/]+))?\/?$/;
const OLD = /^\/en\/([a-z]+)\/beta(?:\/(explore|create|baskets|transaction)(?:\/([^/]+))?)?\/?$/;

export default function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // A request this proxy rewrote comes back through it: leave it be.
  if (req.headers.get(MARK) === "1") return intl(req);

  // Greatwall opens on the About page; "Launch App" there asks for a network.
  if (pathname === "/" || pathname === "/en" || pathname === "/en/") {
    return NextResponse.redirect(new URL(`/en/about${search}`, req.url), 307);
  }

  // The pages of no network (About, docs, legal): an old /en/<network>/<page> link lands on /en/<page>.
  const general = pathname.match(/^\/en\/[a-z]+\/(about|docs|terms|privacy|cookies)\/?$/);
  if (general) {
    return NextResponse.redirect(new URL(`/en/${general[1]}${search}`, req.url), 308);
  }

  // Greatwall is English only; old /id/ links land on the same page in /en/.
  if (pathname === "/id" || pathname.startsWith("/id/")) {
    return NextResponse.redirect(new URL(`/en${pathname.slice(3)}${search}`, req.url), 308);
  }

  const old = pathname.match(OLD);
  if (old) {
    const [, network, section, id] = old;
    const to = section === "create" ? "/index/create" : section === "transaction" && id ? `/index/${id}` : "/index";
    return NextResponse.redirect(new URL(`/en/${network}${to}${search}`, req.url), 308);
  }

  // Lock has its own addresses (lockPaths.ts); the bridge's old ones lead there.
  const oldBridge = pathname.match(OLD_BRIDGE);
  if (oldBridge) {
    const [, network, section] = oldBridge;
    const to =
      section === "unlock" || section === "send" ? "/unlock" : section === "history" ? "/lock/history" : section?.startsWith("transaction/") ? `/lock/${section}` : "/lock";
    return NextResponse.redirect(new URL(`/en/${network}${to}${search}`, req.url), 308);
  }
  const lock = pathname.match(LOCK);
  if (lock) {
    const [, network, page, rest] = lock;
    const inner = rest === "history" ? "bridge/history" : rest ? `bridge/${rest}` : `bridge/${page}`;
    const headers = new Headers(req.headers);
    headers.set(MARK, "1");
    return NextResponse.rewrite(new URL(`/en/${network}/${inner}${search}`, req.url), { request: { headers } });
  }

  const m = pathname.match(INDEX);
  if (m) {
    const [, network, rest] = m;
    const inner = !rest || rest === "explore" ? "beta/explore" : rest === "create" ? "beta/create" : `beta/transaction/${rest}`;
    const headers = new Headers(req.headers);
    headers.set(MARK, "1");
    return NextResponse.rewrite(new URL(`/en/${network}/${inner}${search}`, req.url), { request: { headers } });
  }

  return intl(req);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
};
