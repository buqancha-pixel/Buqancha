import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPrice, formatDate } from "./format.ts";

test("formatPrice", () => {
  assert.equal(formatPrice(39000), "39 000 so'm");
  assert.equal(formatPrice(1250000), "1 250 000 so'm");
  assert.equal(formatPrice(900), "900 so'm");
});

test("formatDate", () => {
  assert.equal(formatDate(new Date(2026, 10, 3)), "3-noyabr, 2026");
});
