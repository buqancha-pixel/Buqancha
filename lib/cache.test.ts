import { test } from "node:test";
import assert from "node:assert/strict";

// encode/decode mantiqi (next/cache'siz) — lib/cache.ts bilan bir xil
const DATE = "__date";
const encode = (v: unknown) =>
  JSON.stringify(v, function (this: Record<string, unknown>, k, val) {
    const raw = this[k];
    return raw instanceof Date ? { [DATE]: raw.toISOString() } : val;
  });
const decode = (t: string) => JSON.parse(t, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) && DATE in v && Object.keys(v).length === 1 ? new Date(v[DATE]) : v));

test("kesh: sanalar tiklanadi", () => {
  const d = new Date("2026-11-04T05:00:00.000Z");
  const out = decode(encode({ a: d, list: [{ checkedAt: d, price: 1 }], s: "x", n: null }));
  assert.ok(out.a instanceof Date);
  assert.equal(out.a.getTime(), d.getTime());
  assert.ok(out.list[0].checkedAt instanceof Date);
  assert.equal(out.list[0].price, 1);
  assert.equal(out.n, null);
});
