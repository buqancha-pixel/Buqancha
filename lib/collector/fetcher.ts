import { parseRobots, type Robots } from "./robots.ts";

export const USER_AGENT =
  process.env.COLLECTOR_USER_AGENT ||
  `BuqanchaBot/1.0 (+${(process.env.NEXT_PUBLIC_SITE_URL || "https://buqancha.uz").replace(/\/$/, "")}/bot)`;

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 20_000;

export class BlockedByRobotsError extends Error {
  constructor(url: string, reason?: string) {
    super(reason ? `${reason}, sahifa yuklanmadi: ${url}` : `robots.txt ruxsat bermaydi: ${url}`);
  }
}

export class TooLargeError extends Error {}

type FetchImpl = typeof fetch;

export type FetcherOptions = {
  minDelayMs?: number;
  retries?: number;
  fetchImpl?: FetchImpl;
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Xushmuomala yuklovchi:
 *  - robots.txt'ni hurmat qiladi (Disallow, Crawl-delay);
 *  - bir hostga so'rovlar orasida kamida `minDelayMs` kutadi;
 *  - timeout, javob hajmi chegarasi, 429/5xx da qayta urinish.
 */
export class PoliteFetcher {
  private robots = new Map<string, Promise<Robots & { unavailable?: string }>>();
  private lastHit = new Map<string, number>();

  private opts: FetcherOptions;

  constructor(opts: FetcherOptions = {}) {
    this.opts = opts;
  }

  private get fetchImpl(): FetchImpl {
    return this.opts.fetchImpl ?? fetch;
  }

  private sleep(ms: number) {
    return this.opts.sleep ? this.opts.sleep(ms) : new Promise<void>((r) => setTimeout(r, ms));
  }

  private robotsFor(origin: string): Promise<Robots & { unavailable?: string }> {
    let p = this.robots.get(origin);
    if (!p) {
      p = this.fetchImpl(`${origin}/robots.txt`, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
        .then(async (res) => {
          if (res.status >= 400 && res.status < 500) return parseRobots("", USER_AGENT); // yo'q — hammasi ruxsat
          // server xatosi — ehtiyot bo'lamiz, hech narsa yuklamaymiz
          if (!res.ok) return { ...parseRobots("User-agent: *\nDisallow: /", USER_AGENT), unavailable: `robots.txt HTTP ${res.status}` };
          return parseRobots(await res.text(), USER_AGENT);
        })
        .catch((e: Error) => ({
          ...parseRobots("User-agent: *\nDisallow: /", USER_AGENT),
          unavailable: `robots.txt ochilmadi (${e.cause instanceof Error ? e.cause.message : e.message})`,
        }));
      this.robots.set(origin, p);
    }
    return p;
  }

  async get(url: string): Promise<{ status: number; body: string; contentType: string }> {
    const u = new URL(url);
    const robots = await this.robotsFor(u.origin);
    if (!robots.isAllowed(u.pathname + u.search)) throw new BlockedByRobotsError(url, robots.unavailable);

    const delay = Math.max(this.opts.minDelayMs ?? 3000, robots.crawlDelayMs ?? 0);
    const retries = this.opts.retries ?? 2;

    for (let attempt = 0; ; attempt++) {
      const last = this.lastHit.get(u.host) ?? 0;
      const wait = last + delay - Date.now();
      if (wait > 0) await this.sleep(wait);
      this.lastHit.set(u.host, Date.now());

      try {
        const res = await this.fetchImpl(url, {
          headers: { "user-agent": USER_AGENT, accept: "text/html,application/json,text/csv;q=0.9,*/*;q=0.5" },
          redirect: "follow",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          const retryAfter = Number(res.headers.get("retry-after"));
          await this.sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : delay * 2 ** (attempt + 1));
          continue;
        }
        const len = Number(res.headers.get("content-length"));
        if (len > MAX_BYTES) throw new TooLargeError(`javob juda katta (${len} bayt): ${url}`);
        const body = await res.text();
        if (body.length > MAX_BYTES) throw new TooLargeError(`javob juda katta: ${url}`);
        return { status: res.status, body, contentType: res.headers.get("content-type") ?? "" };
      } catch (e) {
        if (attempt >= retries || e instanceof TooLargeError) throw e;
        await this.sleep(delay * 2 ** (attempt + 1));
      }
    }
  }
}
