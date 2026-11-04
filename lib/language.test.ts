import { test } from "node:test";
import assert from "node:assert/strict";
import { looksEnglish } from "./language.ts";

test("inglizcha nomni aniqlash", () => {
  assert.equal(looksEnglish("Get Ready for IELTS listening"), true);
  assert.equal(looksEnglish("And then there were none"), true);
  assert.equal(looksEnglish("O'tkan kunlar"), false);
  assert.equal(looksEnglish("Dunyoning ishlari"), false);
  assert.equal(looksEnglish("Самурай без меча"), false);
});
