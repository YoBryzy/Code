/**
 * Server-side product-page extraction. Fetches a URL and pulls out the title,
 * description, price, brand, and product images from Open Graph tags and
 * JSON-LD Product schema. Dependency-free (regex over HTML) to keep the MVP
 * lean; swap in a real parser (cheerio) when you need resilience.
 *
 * Never throws — returns a partial result with an `error` note on failure.
 */

export interface ExtractedPage {
  url: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  brand: string | null;
  price: string | null;
  currency: string | null;
  images: string[];
  error?: string;
}

const META_TIMEOUT_MS = 12_000;
const MAX_IMAGES = 6;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function metaContent(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

function absolutize(src: string, base: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

export async function extractFromUrl(rawUrl: string): Promise<ExtractedPage> {
  const result: ExtractedPage = {
    url: rawUrl,
    title: null,
    description: null,
    siteName: null,
    brand: null,
    price: null,
    currency: null,
    images: [],
  };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    result.error = "Invalid URL.";
    return result;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), META_TIMEOUT_MS);
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Many sites gate on a browser-like UA.
        "user-agent":
          "Mozilla/5.0 (compatible; AdMagicBot/1.0; +https://admagic.app/bot)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      result.error = `Fetch failed with status ${res.status}.`;
      return result;
    }
    const html = (await res.text()).slice(0, 1_500_000); // cap to keep parsing bounded

    result.title =
      metaContent(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
        /<title[^>]*>([^<]+)<\/title>/i,
      ]) ?? null;

    result.description = metaContent(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    ]);

    result.siteName = metaContent(html, [
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    ]);

    result.price = metaContent(html, [
      /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i,
    ]);
    result.currency = metaContent(html, [
      /<meta[^>]+property=["']product:price:currency["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:price:currency["'][^>]+content=["']([^"']+)["']/i,
    ]);

    // Open Graph images (may repeat).
    const ogImages = [...html.matchAll(
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    )].map((m) => m[1]);

    // JSON-LD Product schema: brand, price, images.
    for (const block of html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    )) {
      try {
        const data = JSON.parse(block[1].trim());
        const nodes = Array.isArray(data) ? data : [data, ...(data["@graph"] ?? [])];
        for (const node of nodes) {
          const type = node?.["@type"];
          const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
          if (!isProduct) continue;
          if (!result.brand && node.brand)
            result.brand = typeof node.brand === "string" ? node.brand : node.brand?.name ?? null;
          const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
          if (offer) {
            result.price = result.price ?? (offer.price != null ? String(offer.price) : null);
            result.currency = result.currency ?? offer.priceCurrency ?? null;
          }
          const imgs = Array.isArray(node.image) ? node.image : node.image ? [node.image] : [];
          ogImages.push(...imgs.map((i: unknown) => (typeof i === "string" ? i : (i as { url?: string })?.url ?? "")));
          if (!result.title && node.name) result.title = node.name;
          if (!result.description && node.description) result.description = node.description;
        }
      } catch {
        /* ignore malformed JSON-LD blocks */
      }
    }

    const seen = new Set<string>();
    for (const src of ogImages) {
      if (!src) continue;
      const abs = absolutize(src, url.toString());
      if (abs && !seen.has(abs)) {
        seen.add(abs);
        result.images.push(abs);
        if (result.images.length >= MAX_IMAGES) break;
      }
    }
  } catch (err) {
    result.error =
      err instanceof Error && err.name === "AbortError"
        ? "The page took too long to respond."
        : "Could not fetch the page.";
  }

  return result;
}
