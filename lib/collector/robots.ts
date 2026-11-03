/** robots.txt'ning minimal, standartga (RFC 9309) yaqin tahlilchisi. */

type Rule = { allow: boolean; path: string };
type Group = { agents: string[]; rules: Rule[]; crawlDelay?: number };

export type Robots = {
  isAllowed(path: string): boolean;
  crawlDelayMs?: number;
};

export function parseRobots(text: string, userAgent: string): Robots {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "allow" || field === "disallow") {
      if (field === "disallow" && value === "") continue; // bo'sh Disallow = hammasi ruxsat
      current.rules.push({ allow: field === "allow", path: value });
    } else if (field === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.crawlDelay = n;
    }
  }

  const ua = userAgent.toLowerCase();
  const token = ua.split(/[\/\s]/)[0];
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  const rules = chosen.flatMap((g) => g.rules);
  const delay = chosen.find((g) => g.crawlDelay !== undefined)?.crawlDelay;

  return {
    crawlDelayMs: delay !== undefined ? delay * 1000 : undefined,
    isAllowed(path: string) {
      let best: Rule | null = null;
      let bestLen = -1;
      for (const r of rules) {
        if (!matches(r.path, path)) continue;
        const len = r.path.length;
        // eng uzun mos qoida g'olib; teng bo'lsa Allow ustun
        if (len > bestLen || (len === bestLen && r.allow)) {
          best = r;
          bestLen = len;
        }
      }
      return best ? best.allow : true;
    },
  };
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = body
    .split("*")
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${re}${anchored ? "$" : ""}`).test(path);
}
